
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load .env.local manually to ensure we have the secrets
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/whatsapp';
const CONCURRENCY = 5;
const TOTAL_REQUESTS = 20;

if (!WHATSAPP_APP_SECRET) {
    console.warn("⚠️ WHATSAPP_APP_SECRET not found in .env.local. Signature verification might fail on server if enabled.");
}

function generateSignature(payload: string): string {
    if (!WHATSAPP_APP_SECRET) return '';
    const hmac = crypto.createHmac('sha256', WHATSAPP_APP_SECRET);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
}

function generatePayload(i: number) {
    const uniqueId = Date.now().toString() + i;
    return JSON.stringify({
        object: "whatsapp_business_account",
        entry: [{
            id: "123456789",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: {
                        display_phone_number: "15555555555",
                        phone_number_id: "100000000000001" // Must match a resolved org if mapped, or default
                    },
                    contacts: [{
                        profile: { name: `Test User ${i}` },
                        wa_id: `57300000${1000 + i}`
                    }],
                    messages: [{
                        from: `57300000${1000 + i}`,
                        id: `wamid.${uniqueId}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: "text",
                        text: { body: `Hola, quisiera agendar una cita de prueba ${i}` }
                    }]
                },
                field: "messages"
            }]
        }]
    });
}

async function sendRequest(i: number) {
    const payload = generatePayload(i);
    const signature = generateSignature(payload);

    const start = Date.now();
    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hub-signature-256': signature,
                'User-Agent': 'StressTest/1.0'
            },
            body: payload
        });

        const duration = Date.now() - start;
        return {
            id: i,
            status: res.status,
            duration,
            ok: res.ok
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            id: i,
            status: 0,
            duration: Date.now() - start,
            ok: false,
            error: errorMessage
        };
    }
}

async function runBatch(startIdx: number, count: number) {
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(sendRequest(startIdx + i));
    }
    return Promise.all(promises);
}

async function run() {
    console.log(`🚀 Starting AI Stress Test`);
    console.log(`Target: ${WEBHOOK_URL}`);
    console.log(`Total Requests: ${TOTAL_REQUESTS}`);
    console.log(`Concurrency: ${CONCURRENCY}`);
    console.log('-----------------------------------');

    const results = [];

    for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
        const count = Math.min(CONCURRENCY, TOTAL_REQUESTS - i);
        console.log(`Processing batch ${Math.floor(i / CONCURRENCY) + 1}... (${count} reqs)`);
        const batchResults = await runBatch(i, count);
        results.push(...batchResults);
    }

    console.log('-----------------------------------');
    console.log('📊 Stress Test Results:');

    const successful = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length || 0;
    const maxDuration = Math.max(...durations, 0);
    const minDuration = Math.min(...durations, 999999);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    if (failed.length > 0) {
        console.log('Sample errors:', failed.slice(0, 3).map(f => `${f.status} ${f.error || ''}`));
    }
    console.log(`⏱️  Avg Latency: ${avgDuration.toFixed(0)}ms`);
    console.log(`⏱️  Min Latency: ${minDuration}ms`);
    console.log(`⏱️  Max Latency: ${maxDuration}ms`);

    if (maxDuration > 15000) {
        console.warn("\n⚠️  WARNING: Max latency exceeded 15s. Meta may timeout these requests.");
    }

    if (failed.length === 0 && successful.length > 0) {
        console.log("\n✅ AI Brain successfully handled load.");
        process.exit(0);
    } else {
        console.error("\n❌ Stress test failed.");
        process.exit(1);
    }
}

run().catch(console.error);
