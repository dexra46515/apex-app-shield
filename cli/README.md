# ANA WAF CLI Tool

A comprehensive command-line interface for managing and testing the ANA WAF (Web Application Firewall) in development and CI/CD environments.

## 🚀 Installation

### Install Globally
```bash
cd cli
npm install -g .
```

### Or Run Directly
```bash
cd cli
npm install
./ana-waf --help
```

## ⚙️ Configuration

Configure the CLI on first use:

```bash
ana-waf configure
```

This will prompt for:
- **Supabase URL**: Your Supabase project URL
- **Supabase Anon Key**: Your Supabase anonymous key
- **WAF Endpoint**: Local WAF proxy (default: http://localhost:8080)
- **WAF Management**: Management API (default: http://localhost:9090)

Configuration is stored in `~/.ana-waf-config.json`.

## 🛡️ Commands

### Security Testing

#### Basic Security Test
```bash
ana-waf test -u https://your-app.com
```

#### Comprehensive Testing with OpenAPI
```bash
ana-waf test -u https://api.example.com \
  --openapi api-spec.yaml \
  --suite comprehensive \
  --strict \
  --min-score 80
```

#### Custom Payload Testing
```bash
ana-waf test -u https://your-app.com \
  --payloads custom-attacks.json \
  --suite custom
```

### Traffic Simulation

#### Mixed Traffic Simulation
```bash
ana-waf simulate -u https://your-app.com \
  --pattern mixed \
  --count 100 \
  --verbose
```

#### OpenAPI-Driven Traffic
```bash
ana-waf simulate -u https://api.example.com \
  --openapi api-spec.yaml \
  --count 50 \
  --pattern mixed
```

#### Attack-Only Simulation
```bash
ana-waf simulate -u https://your-app.com \
  --pattern attack \
  --count 25
```

### WAF Management

#### Get WAF Status
```bash
ana-waf status
```

#### Replay Specific Request
```bash
ana-waf replay req_123456789 --debug
```

#### Reload Policies
```bash
ana-waf reload
```

## 📊 Test Results

### Security Test Output
```
🔍 Security Test Results:
  Overall Score: 85/100
  Vulnerabilities Found: 2
  Test Duration: 15420ms

📋 Test Categories:
  SSL/TLS SECURITY: 95/100
  SECURITY HEADERS: 80/100
  XSS PROTECTION: 90/100
  SQL INJECTION: 70/100
    🚨 HIGH: Potential SQL injection in /api/search
  CSRF PROTECTION: 85/100

💡 Recommendations:
  • Implement parameterized queries for database access
  • Add Content Security Policy headers
  • Enable CSRF token validation
```

### Traffic Simulation Output
```
📊 Traffic Simulation Results:
  Total Requests: 100
  Successful: 75
  Failed: 5
  Attacks: 30
  Blocked: 25

📋 Detailed Results:
  1. 200 GET https://example.com/ (150ms)
  2. 403 GET https://example.com/admin?id=1' OR '1'='1 (45ms)
     🚨 Attack payload: ' OR '1'='1
  3. 200 POST https://example.com/api/users (200ms)
```

## 🔧 Command Reference

### `ana-waf test`
Run comprehensive security tests against a target URL.

**Options:**
- `-u, --url <url>` - Target URL to test (required)
- `-s, --suite <suite>` - Test suite: basic|comprehensive|custom (default: comprehensive)
- `--openapi <file>` - OpenAPI specification file for guided testing
- `--payloads <file>` - Custom payload file (JSON/YAML)
- `--strict` - Exit with error code if vulnerabilities found
- `--min-score <score>` - Minimum security score required (0-100)

**Examples:**
```bash
# Basic test
ana-waf test -u https://example.com

# Comprehensive test with OpenAPI
ana-waf test -u https://api.example.com --openapi swagger.yaml --strict

# Custom payloads with minimum score
ana-waf test -u https://app.com --payloads attacks.json --min-score 90
```

### `ana-waf simulate`
Simulate realistic or attack traffic against a target.

**Options:**
- `-u, --url <url>` - Target URL (required)
- `-p, --pattern <pattern>` - Traffic pattern: mixed|attack|legitimate (default: mixed)
- `-c, --count <count>` - Number of requests (default: 10)
- `--openapi <file>` - OpenAPI spec for realistic traffic generation
- `-v, --verbose` - Show detailed results

**Examples:**
```bash
# Mixed traffic simulation
ana-waf simulate -u https://example.com --count 50 --verbose

# Attack-only simulation
ana-waf simulate -u https://api.com --pattern attack --count 20

#OpenAPI-driven realistic traffic
ana-waf simulate -u https://api.com --openapi spec.yaml --count 100
```

### `ana-waf status`
Get current WAF status and metrics.

**Example Output:**
```
🛡️  WAF Status:
  Status: Active
  Version: 1.0.0-dev
  Policies Loaded: 5
  Active Rules: 23
  Requests Processed: 1,247
  Threats Blocked: 156
  Last Updated: 2024-01-15 14:30:22
```

### `ana-waf replay`
Replay a specific request with debugging information.

**Options:**
- `<requestId>` - Request ID to replay (required)
- `-d, --debug` - Enable detailed debug output

**Example:**
```bash
ana-waf replay req_123456789 --debug
```

### `ana-waf reload`
Reload WAF security policies without restarting.

```bash
ana-waf reload
```

## 📄 Configuration Files

### Custom Payloads (JSON)
```json
{
  "sql_injection": [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1 UNION SELECT password FROM admin"
  ],
  "xss": [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img onerror='alert(1)' src='x'>"
  ],
  "command_injection": [
    "; cat /etc/passwd",
    "| whoami",
    "&& dir"
  ]
}
```

### Custom Payloads (YAML)
```yaml
sql_injection:
  - "' OR '1'='1"
  - "'; DROP TABLE users; --"
  - "1 UNION SELECT password FROM admin"

xss:
  - "<script>alert('XSS')</script>"
  - "javascript:alert('XSS')"
  - "<img onerror='alert(1)' src='x'>"

path_traversal:
  - "../../../etc/passwd"
  - "..\\..\\..\\windows\\system32\\config\\sam"
```

### OpenAPI Specification
The CLI can consume OpenAPI 3.0 specifications to generate realistic test traffic:

```yaml
openapi: 3.0.0
info:
  title: Example API
  version: 1.0.0
servers:
  - url: https://api.example.com
paths:
  /users:
    get:
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            example: 10
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  example: "John Doe"
                email:
                  type: string
                  format: email
```

## 🚀 CI/CD Integration

### GitHub Actions
```yaml
name: Security Testing
on: [push, pull_request]

jobs:
  security-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install ANA WAF CLI
        run: |
          cd cli
          npm install -g .
      
      - name: Configure CLI
        run: |
          ana-waf configure --non-interactive \
            --supabase-url ${{ secrets.SUPABASE_URL }} \
            --supabase-key ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Start application
        run: |
          npm start &
          sleep 10
      
      - name: Run security tests
        run: |
          ana-waf test -u http://localhost:3000 \
            --openapi api-spec.yaml \
            --strict \
            --min-score 80
      
      - name: Simulate attack traffic
        run: |
          ana-waf simulate -u http://localhost:3000 \
            --pattern attack \
            --count 25
```

### GitLab CI
```yaml
security_test:
  stage: test
  script:
    - cd cli && npm install -g .
    - ana-waf configure --non-interactive --supabase-url $SUPABASE_URL --supabase-key $SUPABASE_ANON_KEY
    - npm start &
    - sleep 10
    - ana-waf test -u http://localhost:3000 --strict --min-score 80
  only:
    - merge_requests
    - main
```

## 💡 Best Practices

### Development Workflow
1. **Start with status check**: `ana-waf status`
2. **Run basic tests**: `ana-waf test -u http://localhost:3000`
3. **Simulate realistic traffic**: `ana-waf simulate --openapi spec.yaml`
4. **Debug specific issues**: `ana-waf replay <request-id> --debug`

### CI/CD Pipeline
1. **Use strict mode**: `--strict` flag fails builds on vulnerabilities
2. **Set score thresholds**: `--min-score 80` ensures quality gates
3. **Test with real specs**: Use `--openapi` for comprehensive coverage
4. **Store results**: Results are automatically stored in Supabase

### Security Testing
1. **Test early and often**: Run tests on every commit
2. **Use realistic payloads**: Custom payloads match your threat model
3. **Monitor trends**: Track security scores over time
4. **Fix incrementally**: Use replay to debug specific vulnerabilities

## 🐛 Troubleshooting

### Connection Issues
```bash
# Check WAF container status
docker ps | grep waf

# Verify endpoints are accessible
curl http://localhost:9090/waf/status

# Check configuration
cat ~/.ana-waf-config.json
```

### Authentication Errors
```bash
# Reconfigure with correct credentials
ana-waf configure

# Test Supabase connection
curl -H "Authorization: Bearer YOUR_KEY" YOUR_SUPABASE_URL/rest/v1/
```

### Test Failures
```bash
# Run with verbose output
ana-waf test -u https://example.com --verbose

# Check for specific error patterns
ana-waf test -u https://example.com 2>&1 | grep -i error

# Simulate traffic first to warm up
ana-waf simulate -u https://example.com --count 5
```

The ANA WAF CLI provides comprehensive security testing capabilities with seamless integration into development workflows and CI/CD pipelines.