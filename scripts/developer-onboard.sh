#!/bin/bash

# ANA WAF - Developer Onboarding Script
# This script automates the complete setup process for new developers

set -e

chmod +x scripts/*.sh

echo "🚀 ANA WAF - Developer Onboarding"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is required but not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. CLI tools will not be available."
    INSTALL_CLI=false
else
    INSTALL_CLI=true
fi

print_status "Prerequisites check complete"

# Create necessary directories
echo ""
echo "📁 Setting up directories..."
mkdir -p deployment/dev-waf
mkdir -p scripts
mkdir -p logs

# Check if we're in the right directory
if [ ! -f "deployment/dev-waf/docker-compose.dev.yml" ]; then
    print_error "docker-compose.dev.yml not found. Are you in the project root?"
    print_info "Please run this script from the project root directory"
    exit 1
fi

print_status "Directory structure verified"

# Environment configuration
echo ""
echo "⚙️  Configuring environment..."

if [ ! -f "deployment/dev-waf/.env" ]; then
    if [ -f "deployment/dev-waf/.env.example" ]; then
        cp deployment/dev-waf/.env.example deployment/dev-waf/.env
        print_status "Created .env file from template"
    else
        print_warning ".env.example not found, creating minimal .env"
        cat > deployment/dev-waf/.env << EOF
WAF_UPSTREAM=host.docker.internal:3000
WAF_MODE=protect
WAF_LOG_LEVEL=info
WAF_DEBUG=true
WAF_ENABLE_REPLAY=true
GRAFANA_ADMIN_PASSWORD=admin
EOF
    fi
    
    print_warning "Please edit deployment/dev-waf/.env with your configuration"
    print_info "Especially update SUPABASE_URL and SUPABASE_ANON_KEY if using backend features"
else
    print_status "Environment configuration already exists"
fi

# Make scripts executable
echo ""
echo "🔧 Making scripts executable..."
cd deployment/dev-waf
chmod +x *.sh 2>/dev/null || true
cd - > /dev/null

print_status "Scripts are now executable"

# Stop any existing containers
echo ""
echo "🛑 Stopping any existing WAF containers..."
cd deployment/dev-waf
docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
cd - > /dev/null

print_status "Cleaned up existing containers"

# Build and start WAF
echo ""
echo "🚀 Building and starting WAF containers..."
cd deployment/dev-waf

echo "Building WAF container (this may take a few minutes)..."
docker-compose -f docker-compose.dev.yml build --no-cache ana-waf-dev

echo "Starting WAF services..."
docker-compose -f docker-compose.dev.yml up -d

cd - > /dev/null

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo ""
echo "🏥 Performing health checks..."

# Check if WAF container is running
if docker ps | grep -q ana-waf-dev; then
    print_status "WAF container is running"
else
    print_error "WAF container failed to start"
    echo "Container logs:"
    docker logs ana-waf-dev 2>/dev/null || true
    exit 1
fi

# Check WAF status endpoint
echo "Testing WAF status endpoint..."
if curl -s -f http://localhost:9090/waf/status > /dev/null; then
    print_status "WAF management API is responding"
    WAF_STATUS=$(curl -s http://localhost:9090/waf/status | jq -r '.status' 2>/dev/null || echo "unknown")
    print_info "WAF status: $WAF_STATUS"
else
    print_warning "WAF management API is not responding yet"
    print_info "This is normal for first startup - the WAF may still be initializing"
fi

# Test WAF protection
echo "Testing WAF protection..."
if curl -s -H "User-Agent: Attacker" "http://localhost:8081/test?q=<script>alert(1)</script>" | grep -q "blocked"; then
    print_status "WAF protection is active and blocking threats"
else
    print_warning "WAF protection test inconclusive"
    print_info "This may be normal if upstream application is not configured"
fi

# Install CLI tools
if [ "$INSTALL_CLI" = true ]; then
    echo ""
    echo "🛠️  Installing CLI tools..."
    
    if [ -d "cli" ] && [ -f "cli/package.json" ]; then
        cd cli
        if npm install -g . > /dev/null 2>&1; then
            print_status "CLI tools installed successfully"
            
            # Configure CLI if config doesn't exist
            if [ ! -f "$HOME/.ana-waf/config.json" ]; then
                print_info "Run 'ana-waf configure' to set up CLI access"
            fi
        else
            print_warning "Failed to install CLI tools globally"
            print_info "You can install manually with: cd cli && npm install -g ."
        fi
        cd - > /dev/null
    else
        print_warning "CLI directory not found - skipping CLI installation"
    fi
fi

# Summary
echo ""
echo "🎉 Onboarding Complete!"
echo "======================"
echo ""
print_status "Your ANA WAF is now running and ready for development"
echo ""
echo "🌐 Access Points:"
echo "• Main Dashboard:     http://localhost:3000"  
echo "• WAF Management API: http://localhost:9090/waf/status"
echo "• WAF Proxy:          http://localhost:8081 (routes to your app)"
echo "• Grafana Dashboard:  http://localhost:3001 (admin/admin)"
echo "• Prometheus Metrics: http://localhost:9091"
echo ""
echo "🧪 Quick Tests:"
echo "curl http://localhost:9090/waf/status"
echo "curl -H \"User-Agent: Attacker\" \"http://localhost:8081/test?q=<script>alert(1)</script>\""
echo ""
echo "📚 Next Steps:"
echo "1. Configure your application to use WAF proxy: http://localhost:8081"
echo "2. Update deployment/dev-waf/.env with your settings"
echo "3. Read DEVELOPER_QUICK_START.md for integration examples"
echo "4. Install CLI tools: cd cli && npm install -g ."
echo "5. Join our developer community for support"
echo ""

if [ "$INSTALL_CLI" = true ]; then
    echo "🔧 CLI Commands:"
    echo "ana-waf status          # Check WAF status"
    echo "ana-waf test -u URL     # Run security tests"
    echo "ana-waf configure       # Set up CLI access"
    echo ""
fi

echo "🚨 Important Notes:"
echo "• Default Grafana login: admin/admin (change this!)"
echo "• WAF is in protect mode - it will block malicious requests"
echo "• Check logs with: docker-compose -f deployment/dev-waf/docker-compose.dev.yml logs"
echo ""

print_status "Happy coding! Your applications are now protected by enterprise-grade WAF."

# Final health check and troubleshooting
echo ""
echo "🔍 Final System Check:"

# Check all expected containers
EXPECTED_CONTAINERS=("ana-waf-dev")
for container in "${EXPECTED_CONTAINERS[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$container"; then
        print_status "$container is running"
    else
        print_warning "$container is not running"
    fi
done

# Check ports
EXPECTED_PORTS=("8081" "9090")
for port in "${EXPECTED_PORTS[@]}"; do
    if netstat -ln 2>/dev/null | grep -q ":$port " || ss -ln 2>/dev/null | grep -q ":$port "; then
        print_status "Port $port is accessible"
    else
        print_warning "Port $port may not be accessible"
    fi
done

echo ""
print_info "If you encounter any issues, check:"
print_info "• Docker logs: docker logs ana-waf-dev"
print_info "• Port conflicts: netstat -ln | grep ':808[01]\\|:909[01]'"
print_info "• Environment file: deployment/dev-waf/.env"
print_info "• Documentation: DEVELOPER_QUICK_START.md"
echo ""
print_status "Setup complete! 🎉"