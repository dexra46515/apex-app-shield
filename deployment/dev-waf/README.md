# ANA WAF Developer Container

A complete standalone Docker WAF container for local development with real-time debugging, policy management, and traffic analysis.

## 🚀 Quick Start

### 1. Start the WAF Container

```bash
# Clone or download the dev-waf directory
cd deployment/dev-waf

# Start the WAF with default settings
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps
```

### 2. Configure Your Development App

Point your development application through the WAF:
- **Development app**: Continue running on `localhost:3000`
- **WAF proxy**: Access your app via `localhost:8080`
- **WAF management**: `localhost:9090`

### 3. Test the WAF

```bash
# Test legitimate request
curl http://localhost:8080/

# Test attack (should be blocked)
curl "http://localhost:8080/login?user=admin' OR '1'='1' --"

# Check WAF status
curl http://localhost:9090/waf/status
```

## 📁 Directory Structure

```
deployment/dev-waf/
├── Dockerfile              # WAF container definition
├── docker-compose.dev.yml  # Complete dev environment
├── nginx.conf              # WAF proxy configuration
├── waf-engine.lua          # Core WAF logic
├── entrypoint.sh           # Container startup script
├── health-check.sh         # Health monitoring
├── policies/               # Security policies directory
│   └── default.yaml        # Default security rules
├── logs/                   # WAF logs (auto-created)
└── example-app/            # Sample app for testing
```

## 🛡️ Features

### Real WAF Protection
- **SQL Injection Detection**: Blocks common injection patterns
- **XSS Protection**: Detects script injection attempts
- **Path Traversal Prevention**: Stops directory climbing attacks
- **Rate Limiting**: Configurable per-IP rate limits
- **Real-time Threat Scoring**: Dynamic risk assessment

### Developer-Friendly
- **Live Policy Reloading**: Update rules without restart
- **Debug Mode**: Detailed processing information
- **Request Replay**: Re-run requests with debugging enabled
- **Metrics & Monitoring**: Prometheus-compatible metrics
- **Visual Dashboard**: Grafana integration included

### Production-Ready
- **Health Checks**: Built-in monitoring endpoints
- **Log Management**: Structured logging with rotation
- **Performance Optimized**: Minimal latency impact
- **Configurable**: Environment-based configuration

## ⚙️ Configuration

### Environment Variables

```bash
# Core settings
WAF_DEBUG=true                    # Enable debug mode
WAF_ENABLE_REPLAY=true           # Enable request replay
WAF_UPSTREAM=host.docker.internal:3000  # Your dev app
WAF_LOG_LEVEL=info               # Log level (debug|info|warn|error)

# Docker Compose example
environment:
  - WAF_DEBUG=true
  - WAF_UPSTREAM=your-app:3000
  - WAF_LOG_LEVEL=debug
```

### Custom Policies

Create YAML files in the `policies/` directory:

```yaml
# policies/custom-rules.yaml
rules:
  - id: "CUSTOM_SQL_001"
    name: "Advanced SQL Injection"
    pattern: "(union.*select|exec\\s+xp_|sp_executesql)"
    flags: "i"
    severity: "critical"
    action: "block"
    status_code: 403

  - id: "CUSTOM_RATE_001"
    name: "API Rate Limit"
    type: "rate_limit"
    limit: 60
    window: 60
    action: "challenge"
    status_code: 429
```

### Upstream Configuration

Configure your development application as the upstream:

```yaml
# For a Next.js app running on localhost:3000
environment:
  - WAF_UPSTREAM=host.docker.internal:3000

# For a Docker container named 'api-server'
environment:
  - WAF_UPSTREAM=api-server:8080
```

## 🔧 Management API

### WAF Status
```bash
curl http://localhost:9090/waf/status
```

### Reload Policies
```bash
curl -X POST http://localhost:9090/waf/reload
```

### Request Replay
```bash
curl -X POST http://localhost:9090/waf/replay \
  -H "Content-Type: application/json" \
  -d '{"request_id": "123456789", "debug_enabled": true}'
```

### Metrics (Prometheus Format)
```bash
curl http://localhost:9090/metrics
```

## 📊 Monitoring & Debugging

### View Real-time Logs
```bash
# WAF access logs
docker-compose -f docker-compose.dev.yml logs -f ana-waf-dev

# Specific log files
tail -f logs/access.log
tail -f logs/error.log
```

### Grafana Dashboard
Access Grafana at `http://localhost:3001` (admin/admin)

Pre-configured dashboards show:
- Request rates and response times
- Threat detection metrics
- Block/allow ratios
- Top attacked endpoints

### Debug Mode
When `WAF_DEBUG=true`, each request includes detailed processing information:

```json
{
  "request_id": "req_123456",
  "processing_time_ms": 2.5,
  "rules_evaluated": 15,
  "threat_score": 85,
  "action": "block",
  "rule_matches": ["SQL_INJECTION_001", "HIGH_RISK_IP"],
  "debug_info": {
    "matched_patterns": [...],
    "processing_stack": [...]
  }
}
```

## 🧪 Testing

### Manual Testing
```bash
# Test different attack types
curl "http://localhost:8080/search?q=<script>alert('xss')</script>"
curl "http://localhost:8080/api/users?id=1' OR '1'='1"
curl "http://localhost:8080/files?path=../../../etc/passwd"

# Test rate limiting
for i in {1..200}; do curl http://localhost:8080/ & done
```

### Automated Testing with CLI
```bash
# Install CLI tool
cd cli && npm install -g .

# Run comprehensive security tests
ana-waf test -u http://localhost:8080 --suite comprehensive

# Simulate realistic traffic
ana-waf simulate -u http://localhost:8080 -c 50 --pattern mixed

# Test with OpenAPI spec
ana-waf test -u http://localhost:8080 --openapi api-spec.yaml
```

## 🔄 Request Replay Feature

The WAF automatically stores request data for replay debugging:

```bash
# Get request ID from logs or status endpoint
REQUEST_ID="req_123456789"

# Replay with debugging
ana-waf replay $REQUEST_ID --debug

# Or via API
curl -X POST http://localhost:9090/waf/replay \
  -H "Content-Type: application/json" \
  -d "{\"request_id\": \"$REQUEST_ID\", \"debug_enabled\": true}"
```

Replay provides:
- Original request details
- WAF processing decision
- Rule-by-rule evaluation
- Performance metrics
- Suggested improvements

## 🚨 Common Issues

### WAF Not Blocking Attacks
1. Check if debug mode is enabled: `WAF_DEBUG=true`
2. Verify policies are loaded: `curl http://localhost:9090/waf/status`
3. Review logs: `tail -f logs/error.log`

### High Latency
1. Reduce rule complexity
2. Optimize regex patterns
3. Enable rule caching
4. Check upstream health

### Policy Changes Not Applied
1. Restart container: `docker-compose restart ana-waf-dev`
2. Or reload policies: `curl -X POST http://localhost:9090/waf/reload`

## 🔗 Integration Examples

### CI/CD Pipeline
```yaml
# .github/workflows/security-test.yml
- name: Start WAF for testing
  run: |
    docker-compose -f deployment/dev-waf/docker-compose.dev.yml up -d
    sleep 10

- name: Run security tests
  run: |
    ana-waf test -u http://localhost:8080 --strict --min-score 80
```

### Development Workflow
```bash
# 1. Start your app
npm run dev  # runs on localhost:3000

# 2. Start WAF proxy
docker-compose -f deployment/dev-waf/docker-compose.dev.yml up -d

# 3. Access your app through WAF
open http://localhost:8080

# 4. Monitor security events
ana-waf status
tail -f deployment/dev-waf/logs/access.log
```

This container provides production-grade WAF protection for your development environment with full debugging capabilities and real-time policy management.