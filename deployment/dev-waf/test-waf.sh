#!/bin/bash

echo "🧪 Testing Developer WAF Container..."

# Change to the correct directory  
cd "$(dirname "$0")"

echo ""
echo "📦 Step 1: Building WAF container..."
docker-compose -f docker-compose.dev.yml build --no-cache ana-waf-dev

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo ""
echo "🚀 Step 2: Starting WAF container..."
docker-compose -f docker-compose.dev.yml up -d ana-waf-dev

sleep 5

echo ""
echo "🔍 Step 3: Testing WAF status endpoint..."
curl -f http://localhost:9090/waf/status

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ WAF container is working!"
else
    echo ""
    echo "❌ WAF status endpoint failed"
    echo "📋 Container logs:"
    docker-compose -f docker-compose.dev.yml logs ana-waf-dev
fi

echo ""
echo "🔍 Step 4: Testing a malicious request..."
curl -H "User-Agent: Attacker" "http://localhost:8081/test?q=<script>alert('xss')</script>"

echo ""
echo "📊 Step 5: Final WAF status..."
curl -s http://localhost:9090/waf/status | jq . 2>/dev/null || curl -s http://localhost:9090/waf/status

echo ""
echo "🧹 Cleanup..."
docker-compose -f docker-compose.dev.yml down

echo "✅ Test complete!"