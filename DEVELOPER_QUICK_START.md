# 🚀 Developer Quick Start - ANA WAF Platform

## 5-Minute Setup Guide

### Prerequisites
- Docker & Docker Compose installed
- Node.js 16+ (for CLI tool)
- Git access to this repository
- Basic knowledge of web security concepts

### Step 1: Get Your WAF Running (2 minutes)

```bash
# 1. Clone/download this repository
git clone [your-repo-url]
cd your-project-name

# 2. Start the WAF container
cd deployment/dev-waf
chmod +x *.sh
./quick-test.sh

# 3. Verify it's working
curl http://localhost:9090/waf/status
# Expected: {"status":"active",...}

curl -H "User-Agent: Attacker" "http://localhost:8081/test?q=<script>alert(1)</script>"
# Expected: 403 Forbidden (blocked by WAF)
```

### Step 2: Access Your Dashboard (30 seconds)

1. **Main Dashboard**: http://localhost:3000
   - Click "Developer-Centric WAF" button
   - View real-time security events

2. **WAF Management**: http://localhost:9090/waf/status
   - Direct API access to WAF container

3. **Monitoring**: http://localhost:3001 (admin/admin)
   - Grafana dashboards with security metrics

### Step 3: Integrate Your Application (1 minute)

**Option A: Proxy Existing App**
```bash
# Update WAF to proxy to your app
export WAF_UPSTREAM=localhost:3000  # Your app port
docker compose -f docker-compose.dev.yml restart ana-waf-dev

# Your app now protected: localhost:8081 → (WAF) → localhost:3000
```

**Option B: Direct Integration**
```bash
# Point your traffic to WAF proxy
# Before: http://localhost:3000/api
# After:  http://localhost:8081/api (protected by WAF)
```

### Step 4: Install CLI Tools (1 minute)

```bash
cd cli
npm install -g .

# Configure CLI (one-time setup)
ana-waf configure
# Enter: Supabase URL, API Key, WAF endpoint

# Test CLI
ana-waf status
ana-waf test -u http://localhost:8081 --quick
```

### Step 5: Run Security Tests (30 seconds)

```bash
# Quick security scan
ana-waf test -u http://localhost:8081 --strict

# Generate attack traffic for testing
ana-waf simulate -u http://localhost:8081 --pattern attacks --count 10

# View results in dashboard: http://localhost:3000
```

## What You Get Immediately

✅ **Real WAF Protection**: SQL injection, XSS, path traversal blocking  
✅ **Live Security Dashboard**: View attacks in real-time  
✅ **API Integration**: RESTful API for custom integrations  
✅ **Monitoring Stack**: Prometheus + Grafana metrics  
✅ **CLI Tooling**: Command-line security testing  
✅ **Request Replay**: Debug blocked requests  
✅ **Policy Management**: Hot-reload security rules  

## Integration Examples

### Express.js App
```javascript
// Before: app runs on :3000
// After: WAF proxy on :8081 → app on :3000

// Update your frontend to call:
const API_BASE = 'http://localhost:8081/api';  // Protected by WAF
```

### React App
```javascript
// .env.local
REACT_APP_API_URL=http://localhost:8081

// All API calls now go through WAF protection
```

### Production Deployment
```bash
# Kubernetes
kubectl apply -f deployment/kubernetes/

# Docker Compose
docker-compose -f docker-compose.yml up -d

# Nginx Integration
cp deployment/nginx.conf /etc/nginx/sites-available/
```

## Troubleshooting

**Port Conflicts:**
```bash
# Change WAF ports if needed
# Edit docker-compose.dev.yml:
# - "8082:80"     # WAF proxy
# - "9091:9090"   # Management
```

**Can't Access Dashboard:**
```bash
# Check all services are running
docker compose -f docker-compose.dev.yml ps

# View logs
docker compose -f docker-compose.dev.yml logs ana-waf-dev
```

**CLI Issues:**
```bash
# Reconfigure CLI
ana-waf configure

# Test connection
ana-waf status --debug
```

## Next Steps

1. **Configure Custom Rules**: Add your application-specific security rules
2. **Set Up Alerts**: Configure notifications for security events  
3. **Production Deploy**: Move to production with Kubernetes/Docker
4. **Team Training**: Share dashboard access with your team
5. **CI/CD Integration**: Add security testing to your pipeline

## Support

- 📚 **Full Docs**: [DEVELOPER_CENTRIC_WAF.md](./DEVELOPER_CENTRIC_WAF.md)
- 🛠️ **Integration Guide**: [deployment/customer-integration-guide.md](./deployment/customer-integration-guide.md)
- 🎯 **Feature Guide**: [WAF_FEATURES_GUIDE.md](./WAF_FEATURES_GUIDE.md)
- 💬 **Support**: Create an issue in this repository

**Ready to go? Run the quick start and you'll have enterprise-grade WAF protection in under 5 minutes!**