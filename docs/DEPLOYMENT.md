# LuxuryDental v2.0 - Deployment Guide

This document outlines the steps to deploy the LuxuryDental v2.0 application to production (Vercel) and configure all necessary services.

## 1. Prerequisites

- **Vercel Account** (Pro plan recommended for higher timeout limits, though Hobby works).
- **Supabase Project** (Production instance).
- **Meta/Facebook Developer App** (WhatsApp Business API enabled).
- **OpenAI & DeepSeek Keys**.

## 2. Environment Variables

Configure the following environment variables in your Vercel Project Settings:

### Core & Database
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g., `https://luxurydental.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon (Public) Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role (Secret) Key |
| `DATABASE_URL` | Supabase Transaction Pool Connection String |
| `DIRECT_URL` | Supabase Session Connection String |

### AI Services
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Used for Whisper (Audio Transcription) |
| `DEEPSEEK_API_KEY` | Used for "Luxe" Brain Logic |

### WhatsApp Integration
| Variable | Description |
|----------|-------------|
| `WHATSAPP_ACCESS_TOKEN` | Permament System User Token |
| `WHATSAPP_PHONE_NUMBER_ID` | From WhatsApp API Manager |
| `WHATSAPP_APP_SECRET` | Meta App Secret (for HMAC verification) |
| `WHATSAPP_VERIFY_TOKEN` | Arbitrary string used during webhook setup |

### System
| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Secure random string (at least 32 chars) to protect cron jobs |

## 3. Database Deployment

1.  **Generate Schema Script**:
    Run `npm run build:db` (or `./build_db.sh`) locally. This concatenates all SQL files in `database/`.
2.  **Execute in Production**:
    Copy the content of `database/schema.sql` and run it in the **Supabase SQL Editor** of your production project.
3.  **Verify**:
    Check that all tables (`patients`, `appointments`, etc.) AND RLS policies exists.
    *Important: Ensure the `pg_cron` and `vector` extensions are enabled if used.*

## 4. WhatsApp Webhook Setup

1.  **Callback URL**: `https://<YOUR_DEPLOYMENT_URL>/api/webhooks/whatsapp`
2.  **Verify Token**: Must match the `WHATSAPP_VERIFY_TOKEN` env var.
3.  **Fields**: Subscribe to `messages`.

*Note: You must set the environment variable `WHATSAPP_APP_SECRET` for security. The application will reject requests without a valid signature.*

## 5. Cron Jobs (Automation)

**Important**: We removed the `vercel.json` configuration because Vercel requires a paid Pro plan for frequent cron jobs (every minute).

To run your automation for free:

1.  **Deploy the App** first.
2.  Use a free external service like **[Cron-Job.org](https://cron-job.org/)** or **GitHub Actions**.
3.  Create two jobs in that external service:
    *   **Job 1 (Smart Monitor)**: Call `https://<YOUR_APP_URL>/api/cron/smart-monitor` every **1 minute** (or 5 mins).
    *   **Job 2 (Marketing)**: Call `https://<YOUR_APP_URL>/api/cron/marketing` once **daily**.
4.  **Header Requirement**: Ensure the external service sends the header: `Authorization: Bearer <YOUR_CRON_SECRET>`.

*If you don't set this up, the app works fine, but reminders and auto-cancellations won't run automatically.*

## 6. Verification Checklist

After deployment, perform these checks:

- [ ] **Health Check**: Visit `/login` and verify it loads.
- **Admin Access**: Log in with a user (create one manually in Supabase `auth.users` table first or use registration if enabled).
- **WhatsApp Test**: Send "Hola" to the business number. Verify the AI responds.
- **Stress Test**: Run `scripts/test-ai-stress.ts` against the **Production URL** (edit the `WEBHOOK_URL` constant).
- **Cron Logs**: Check Vercel Logs for `[smart-monitor]` output.

## 7. Troubleshooting

- **504 Gateway Timeout**: If AI responds too slowly (>10s), Vercel Hobby plan might time out. Switch to Pro or optimize AI latency.
- **401 Unauthorized (Webhooks)**: Check `WHATSAPP_APP_SECRET`.
- **401 Unauthorized (Crons)**: Check `CRON_SECRET`.
