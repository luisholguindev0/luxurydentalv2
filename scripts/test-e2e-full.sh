#!/bin/bash
set -e

echo "🚀 Starting Full E2E & Stress Test Suite"
echo "=========================================="

# 1. Verification of Environment
echo "🔍 Checking Environment..."
if ! nc -z localhost 3000; then
  echo "❌ Error: Application is not running on localhost:3000"
  echo "👉 Please run 'npm run dev' in a separate terminal and retry."
  exit 1
fi
echo "✅ Server is up."

# 2. Linting & Static Analysis
echo ""
echo "🧹 Running Lint & TODO Check..."
npm run lint

# Check for TODOs (Warn but don't fail, as per some workflows)
if grep -r "TODO" src/ | grep -v "node_modules"; then
    echo "⚠️  WARNING: Found TODOs in source code."
else
    echo "✅ No TODOs found."
fi

# 3. Unit & Integration Tests (Jest)
echo ""
echo "🧪 Running Jest Tests (Appointments, Logic)..."
npm test

# 4. Cron Job Tests
echo ""
echo "🕰️ Running Cron Job Tests..."
# Ensure execution permissions
chmod +x ./scripts/test-crons-local.sh
./scripts/test-crons-local.sh

# 5. AI Stress Test
echo ""
echo "🧠 Running AI Stress Test (Simulating WhatsApp Load)..."
npx tsx scripts/test-ai-stress.ts

# 6. Production Build Verification
echo ""
echo "🏗️ Verifying Production Build..."
npm run build

echo ""
echo "=========================================="
echo "✅ ALL SYSTEMS GO! Ready for Deployment."
echo "=========================================="
