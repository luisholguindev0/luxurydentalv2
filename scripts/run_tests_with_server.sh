#!/bin/bash
set -e

# Cleanup function to kill the server on exit
cleanup() {
    if [ -f server.pid ]; then
        echo "🛑 Stopping test server (PID: $(<server.pid))..."
        kill $(<server.pid) || true
        rm server.pid
    fi
}
trap cleanup EXIT

echo "🚀 Starting Test Server..."
npm run dev > server.log 2>&1 &
echo $! > server.pid

echo "⏳ Waiting for localhost:3000..."
MAX_RETRIES=30
count=0
while ! nc -z localhost 3000; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $MAX_RETRIES ]; then
        echo "❌ Server failed to start within $MAX_RETRIES seconds."
        cat server.log
        exit 1
    fi
    echo -n "."
done
echo "✅ Server up!"

# Give it a moment to stabilize
sleep 2

# Run the suite
chmod +x scripts/test-e2e-full.sh
./scripts/test-e2e-full.sh
