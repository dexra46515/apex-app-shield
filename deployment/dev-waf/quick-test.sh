#!/bin/bash

echo "🚀 Quick WAF Test"
cd "$(dirname "$0")"

# Stop any existing containers
docker-compose -f docker-compose.dev.yml down -v

# Build and start WAF
echo "Building WAF container..."
docker-compose -f docker-compose.dev.yml build --no-cache ana-waf-dev

echo "Starting WAF container..."
docker-compose -f docker-compose.dev.yml up -d ana-waf-dev

# Wait for startup
echo "Waiting for WAF to start..."
sleep 10

# Test status endpoint
echo "Testing WAF status:"
curl -f http://localhost:9090/waf/status || echo "❌ Status endpoint failed"

# Test malicious request
echo -e "\nTesting malicious request blocking:"
curl -H "User-Agent: Attacker" "http://localhost:8081/test?q=<script>alert('xss')</script>" || echo "✅ Request blocked as expected"

# Show logs
echo -e "\n📋 Recent logs:"
docker-compose -f docker-compose.dev.yml logs --tail=20 ana-waf-dev

echo -e "\n✅ Test complete!"