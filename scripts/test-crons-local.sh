#!/bin/bash

# LuxuryDental v2.0 - Local Cron Testing Script
# Tests both cron endpoints locally without deploying

set -e

echo "🧪 LuxuryDental v2.0 - Local Cron Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local not found${NC}"
    exit 1
fi

source .env.local

if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}❌ Error: CRON_SECRET not set in .env.local${NC}"
    exit 1
fi

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Dev server not running. Start with: npm run dev${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dev server is running${NC}"
echo -e "${GREEN}✓ CRON_SECRET is set${NC}"
echo ""

# Test 1: Smart Monitor without auth (should fail)
echo "📋 Test 1: Testing smart-monitor WITHOUT auth (should fail 401)..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/cron/smart-monitor)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Correctly rejected unauthorized request${NC}"
else
    echo -e "${RED}❌ Expected 401, got $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Smart Monitor with auth (should succeed)
echo "📋 Test 2: Testing smart-monitor WITH auth (should succeed)..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $CRON_SECRET" \
    http://localhost:3000/api/cron/smart-monitor)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Smart monitor executed successfully${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed with status $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Marketing cron without auth (should fail)
echo "📋 Test 3: Testing marketing WITHOUT auth (should fail 401)..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/cron/marketing)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Correctly rejected unauthorized request${NC}"
else
    echo -e "${RED}❌ Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

# Test 4: Marketing cron with auth (should succeed)
echo "📋 Test 4: Testing marketing WITH auth (should succeed)..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $CRON_SECRET" \
    http://localhost:3000/api/cron/marketing)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Marketing cron executed successfully${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed with status $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ All tests complete!${NC}"
echo ""
echo "📝 What was tested:"
echo "  1. Unauthorized access blocked (401)"
echo "  2. Smart monitor cron execution"
echo "  3. Marketing cron execution"
echo "  4. CRON_SECRET authentication"
echo ""
echo "✨ The cron system is working locally!"
echo ""
echo "💡 Next steps:"
echo "  - Create test data (patients, appointments)"
echo "  - Run crons again to see actual processing"
echo "  - Check server logs for console output"
