#!/bin/bash

# ANA WAF - System Status Check
# Quick health check for all WAF components

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo "🔍 ANA WAF - System Status Check"
echo "================================"
echo ""

# Check Docker containers
echo "📦 Container Status:"
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep ana-waf-dev > /dev/null; then
    STATUS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep ana-waf-dev | awk '{print $2}')
    print_status "ana-waf-dev: $STATUS"
else
    print_error "ana-waf-dev: Not running"
    echo ""
    print_info "To start: cd deployment/dev-waf && docker-compose -f docker-compose.dev.yml up -d"
    exit 1
fi

# Check WAF endpoints
echo ""
echo "🌐 Endpoint Connectivity:"

# WAF Management API
if curl -s -f http://localhost:9090/waf/status > /dev/null; then
    WAF_STATUS=$(curl -s http://localhost:9090/waf/status | jq -r '.status' 2>/dev/null || echo "active")
    print_status "Management API (9090): $WAF_STATUS"
    
    # Get detailed status
    RESPONSE=$(curl -s http://localhost:9090/waf/status 2>/dev/null || echo "{}")
    REQUESTS=$(echo "$RESPONSE" | jq -r '.requests_processed' 2>/dev/null || echo "N/A")
    THREATS=$(echo "$RESPONSE" | jq -r '.threats_blocked' 2>/dev/null || echo "N/A")
    print_info "  Requests processed: $REQUESTS"
    print_info "  Threats blocked: $THREATS"
else
    print_error "Management API (9090): Unreachable"
fi

# WAF Proxy
if curl -s -f -m 5 http://localhost:8081/ > /dev/null 2>&1; then
    print_status "WAF Proxy (8081): Responding"
elif curl -s -m 5 http://localhost:8081/ 2>&1 | grep -q "502\|Bad Gateway\|Connection refused"; then
    print_warning "WAF Proxy (8081): Running but upstream not configured"
    print_info "  Configure WAF_UPSTREAM in .env file"
else
    print_error "WAF Proxy (8081): Not responding"
fi

# Test WAF Protection
echo ""
echo "🛡️  Security Testing:"
ATTACK_RESPONSE=$(curl -s -w "%{http_code}" -H "User-Agent: Attacker" "http://localhost:8081/test?q=<script>alert(1)</script>" -o /dev/null 2>/dev/null || echo "000")

if [ "$ATTACK_RESPONSE" = "403" ]; then
    print_status "Threat blocking: Working (403 Forbidden)"
elif [ "$ATTACK_RESPONSE" = "502" ]; then
    print_warning "Threat blocking: WAF active but upstream not configured"
else
    print_warning "Threat blocking: Unexpected response ($ATTACK_RESPONSE)"
fi

# Check Grafana
echo ""
echo "📊 Monitoring Stack:"
if curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
    print_status "Grafana (3001): Running"
    print_info "  Login: admin/admin"
else
    if docker ps | grep -q grafana; then
        print_warning "Grafana (3001): Container running but not responding"
    else
        print_warning "Grafana (3001): Not running"
        print_info "  Start with: docker-compose -f docker-compose.dev.yml up -d grafana"
    fi
fi

# Check Prometheus
if curl -s -f http://localhost:9091/-/healthy > /dev/null 2>&1; then
    print_status "Prometheus (9091): Running"
else
    if docker ps | grep -q prometheus; then
        print_warning "Prometheus (9091): Container running but not responding"
    else
        print_warning "Prometheus (9091): Not running"
    fi
fi

# Check CLI tools
echo ""
echo "🛠️  CLI Tools:"
if command -v ana-waf > /dev/null; then
    CLI_VERSION=$(ana-waf --version 2>/dev/null || echo "unknown")
    print_status "ana-waf CLI: Installed ($CLI_VERSION)"
    
    # Test CLI connectivity
    if ana-waf status > /dev/null 2>&1; then
        print_status "CLI configuration: Working"
    else
        print_warning "CLI configuration: Not configured"
        print_info "  Run: ana-waf configure"
    fi
else
    print_warning "ana-waf CLI: Not installed"
    print_info "  Install: cd cli && npm install -g ."
fi

# System resources
echo ""
echo "💻 System Resources:"
if command -v docker > /dev/null; then
    CPU_USAGE=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" | grep ana-waf-dev | awk '{print $2}' 2>/dev/null || echo "N/A")
    MEM_USAGE=$(docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | grep ana-waf-dev | awk '{print $2}' 2>/dev/null || echo "N/A")
    
    print_info "WAF Container CPU: $CPU_USAGE"
    print_info "WAF Container Memory: $MEM_USAGE"
fi

# Port conflicts check
echo ""
echo "🔌 Port Status:"
REQUIRED_PORTS=("8081" "9090" "3001" "9091")
for port in "${REQUIRED_PORTS[@]}"; do
    if netstat -ln 2>/dev/null | grep -q ":$port " || ss -ln 2>/dev/null | grep -q ":$port "; then
        print_status "Port $port: Available"
    else
        print_error "Port $port: May be in use or blocked"
    fi
done

# Configuration check
echo ""
echo "⚙️  Configuration:"
if [ -f "deployment/dev-waf/.env" ]; then
    print_status "Environment file: Found"
    
    # Check key settings
    if grep -q "WAF_UPSTREAM=" deployment/dev-waf/.env; then
        UPSTREAM=$(grep "WAF_UPSTREAM=" deployment/dev-waf/.env | cut -d'=' -f2)
        print_info "Upstream configured: $UPSTREAM"
    fi
    
    if grep -q "SUPABASE_URL=" deployment/dev-waf/.env; then
        print_status "Supabase integration: Configured"
    else
        print_warning "Supabase integration: Not configured"
    fi
else
    print_warning "Environment file: Not found"
    print_info "Copy deployment/dev-waf/.env.example to .env"
fi

# Summary
echo ""
echo "📋 Summary:"
WAF_HEALTH="❓"
if docker ps | grep -q ana-waf-dev && curl -s -f http://localhost:9090/waf/status > /dev/null; then
    WAF_HEALTH="✅"
    print_status "Overall WAF Status: HEALTHY"
    echo ""
    print_info "Your WAF is running and protecting your applications!"
    print_info "Access dashboard: http://localhost:3000"
    print_info "WAF management: http://localhost:9090/waf/status"
else
    WAF_HEALTH="❌"
    print_error "Overall WAF Status: ISSUES DETECTED"
    echo ""
    print_info "Run the following to diagnose:"
    print_info "docker-compose -f deployment/dev-waf/docker-compose.dev.yml logs ana-waf-dev"
    print_info "Or restart with: ./scripts/developer-onboard.sh"
fi

echo ""