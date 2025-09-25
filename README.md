# ANA WAF - Enterprise Web Application Firewall Platform

🚀 **Production-ready WAF with 5-minute setup** | Real-time security monitoring | Docker-based deployment

## ⚡ Quick Start (5 minutes)

```bash
# 1. Clone and setup
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. One-command setup
chmod +x scripts/developer-onboard.sh
./scripts/developer-onboard.sh

# 3. Access your protected application
# • Dashboard: http://localhost:3000
# • WAF Proxy: http://localhost:8081 (routes to your app)
# • Management: http://localhost:9090/waf/status
```

**✅ Your application is now protected by enterprise-grade WAF!**

---

## 🛡️ What You Get

- **Real WAF Protection**: Blocks SQL injection, XSS, path traversal, DDoS
- **Live Security Dashboard**: Real-time threat monitoring and analytics  
- **Docker Container**: Production-ready OpenResty-based WAF engine
- **CLI Tools**: Command-line security testing and management
- **Monitoring Stack**: Prometheus + Grafana with security metrics
- **Request Replay**: Debug blocked requests with full logging
- **Hot Policy Reload**: Update security rules without restart

---

## 📚 Documentation

| Guide | Description | Time |
|-------|-------------|------|
| **[Quick Start](DEVELOPER_QUICK_START.md)** | 5-minute setup guide | 5 min |
| **[Supabase Setup](SUPABASE_SETUP_GUIDE.md)** | API keys and backend configuration | Reference |
| **[Technical Architecture](DEVELOPER_CENTRIC_WAF.md)** | Complete feature overview | 15 min |
| **[Integration Guide](deployment/customer-integration-guide.md)** | Production deployment | 30 min |
| **[Onboarding Checklist](DEVELOPER_ONBOARDING_CHECKLIST.md)** | Implementation status | Reference |

---

## 🎯 Common Use Cases

### Protect Existing Application
```bash
# Point WAF to your app
export WAF_UPSTREAM=localhost:3000
docker compose -f deployment/dev-waf/docker-compose.dev.yml restart ana-waf-dev

# Your app: localhost:3000 → Protected: localhost:8081
```

### Security Testing
```bash
# Install CLI tools
cd cli && npm install -g .

# Run security tests
ana-waf test -u http://localhost:8081 --strict
ana-waf simulate -u http://localhost:8081 --pattern attacks
```

### Production Deployment
```bash
# Kubernetes
kubectl apply -f deployment/kubernetes/

# Docker Compose  
docker-compose -f docker-compose.yml up -d
```

---

## ✅ Proven Working

This WAF platform is **production-ready** with:
- ✅ Real threat blocking (SQL injection, XSS, etc.)
- ✅ Live database integration with Supabase
- ✅ Complete monitoring stack  
- ✅ CLI tooling for automation
- ✅ Docker containerization
- ✅ Comprehensive documentation

**Ready for immediate use!** 🚀

---

## 🏗️ Development Setup

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access dashboard: http://localhost:3000
```

### WAF Development
```bash
# Start WAF container
cd deployment/dev-waf
./dev-waf-up.sh

# Monitor logs
docker compose -f docker-compose.dev.yml logs -f ana-waf-dev
```

### Technologies Used
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Real-time)
- **WAF Engine**: OpenResty (Nginx + Lua), Docker
- **Monitoring**: Prometheus, Grafana
- **CLI**: Node.js, TypeScript

---

## 🚀 Deployment Options

- **Lovable Cloud**: Click Share → Publish in [Lovable](https://lovable.dev/projects/dd76e9b5-90df-4c3b-8bb8-d3c2f29ae164)
- **Docker**: Use provided docker-compose files
- **Kubernetes**: Apply manifests in `/deployment/kubernetes/`
- **Custom Domain**: Project > Settings > Domains in Lovable

---

## 📞 Support

- **Documentation**: Complete guides in this repository
- **Issues**: Create GitHub issues for bugs/features
- **Community**: Join developer discussions
- **Status**: Monitor at [Lovable Project](https://lovable.dev/projects/dd76e9b5-90df-4c3b-8bb8-d3c2f29ae164)

---

**Ready to secure your applications?** Start with the [Quick Start Guide](DEVELOPER_QUICK_START.md)! 🔒
