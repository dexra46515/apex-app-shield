# WAF Integration Guide for Customers

## Overview

This guide helps you integrate our advanced WAF (Web Application Firewall) solution with your existing infrastructure. Our WAF provides real-time protection against OWASP Top 10 threats, bot attacks, DDoS, and advanced security threats using AI-powered analysis.

## Quick Start Options

### Option 1: Docker Compose (Recommended for Testing)

1. **Download the WAF package:**
```bash
curl -O https://your-waf-service.com/waf-deployment.zip
unzip waf-deployment.zip
cd waf-deployment
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your application details
```

3. **Start the WAF:**
```bash
docker-compose up -d
```

4. **Update your DNS** to point to the WAF proxy IP.

### Option 2: Kubernetes Deployment (Production)

1. **Apply WAF manifests:**
```bash
kubectl apply -f kubernetes/
```

2. **Configure your ingress** to route through WAF.

3. **Update monitoring** to include WAF metrics.

### Option 3: Nginx Integration (Existing Infrastructure)

1. **Install OpenResty** (Nginx with Lua support):
```bash
# Ubuntu/Debian
sudo apt-get install openresty

# CentOS/RHEL
sudo yum install openresty
```

2. **Replace your nginx configuration** with our WAF-enabled config.

3. **Restart nginx** and monitor logs.

## Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your WAF service URL | Yes |
| `SUPABASE_ANON_KEY` | WAF service authentication | Yes |
| `BACKEND_HOST` | Your application backend | Yes |
| `BACKEND_PORT` | Backend port | Yes |
| `WAF_MODE` | `monitor` or `protect` | No (default: protect) |
| `RATE_LIMIT` | Requests per minute | No (default: 100) |

### WAF Modes

1. **Monitor Mode**: WAF analyzes traffic but doesn't block
2. **Protect Mode**: WAF actively blocks malicious traffic

### Custom Rules

Add custom security rules via the management API:

```bash
curl -X POST "https://your-waf-api.com/rules" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Block Specific User Agent",
    "pattern": "badbot",
    "action": "block",
    "enabled": true
  }'
```

## Integration Patterns

### 1. Reverse Proxy Integration
```
Internet → WAF Proxy → Your Application
```

### 2. Sidecar Pattern (Kubernetes)
```
Pod: [WAF Sidecar] [Your App Container]
```

### 3. API Gateway Integration
```
Internet → API Gateway → WAF → Your Application
```

## Monitoring and Alerting

### Grafana Dashboard

Access your WAF dashboard at: `http://your-waf-host:3000`

Default credentials:
- Username: `admin`
- Password: `admin` (change immediately)

### Key Metrics

- **Requests per second**
- **Blocked requests**
- **Threat detection rate**
- **Processing latency**
- **False positive rate**

### Alerting Rules

Configure alerts for:
- High threat detection (>10 threats/min)
- WAF service downtime
- High processing latency (>100ms)
- Rate limit violations

## Security Best Practices

### 1. SSL/TLS Configuration

Always use HTTPS:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
```

### 2. Rate Limiting

Configure appropriate rate limits:
```yaml
rate_limits:
  global: 100/minute
  per_ip: 10/minute
  api_endpoints: 50/minute
```

### 3. Geo-blocking

Block traffic from high-risk countries:
```yaml
geo_blocking:
  block_countries: ["CN", "RU", "KP"]
  allow_countries: ["US", "CA", "GB", "EU"]
```

## Troubleshooting

### Common Issues

1. **High Latency**
   - Increase WAF timeout settings
   - Scale WAF proxy instances
   - Enable caching

2. **False Positives**
   - Review and tune security rules
   - Add whitelist patterns
   - Enable learning mode

3. **WAF Bypass**
   - Check all traffic routes through WAF
   - Verify backend is not directly accessible
   - Enable strict mode

### Debug Mode

Enable debug logging:
```bash
export WAF_DEBUG=true
docker-compose up -d
```

### Log Analysis

Check WAF logs:
```bash
# Docker
docker logs waf-proxy

# Kubernetes
kubectl logs -n waf-system deployment/waf-proxy
```

## API Reference

### WAF Management API

Base URL: `https://your-waf-api.com/v1`

#### Get WAF Status
```bash
GET /status
```

#### Update Security Rules
```bash
POST /rules
Content-Type: application/json

{
  "name": "Custom Rule",
  "pattern": "malicious-pattern",
  "action": "block"
}
```

#### Get Security Events
```bash
GET /events?limit=100&severity=high
```

## Support and Documentation

- **Documentation**: https://docs.your-waf-service.com
- **Support**: support@your-waf-service.com
- **Status Page**: https://status.your-waf-service.com
- **Community**: https://community.your-waf-service.com

## Pricing and Plans

| Plan | Requests/Month | Features | Price |
|------|----------------|----------|-------|
| Starter | 1M | Basic protection | $49/mo |
| Professional | 10M | Advanced features | $199/mo |
| Enterprise | Unlimited | Custom rules, SLA | Contact us |

## Getting Started Checklist

- [ ] Choose deployment option
- [ ] Configure environment variables
- [ ] Deploy WAF infrastructure
- [ ] Update DNS/routing
- [ ] Configure monitoring
- [ ] Test security rules
- [ ] Set up alerting
- [ ] Train your team
- [ ] Go live with monitoring
- [ ] Enable protection mode

## Migration from Other WAF Solutions

### From Cloudflare
1. Export existing rules
2. Convert to our rule format
3. Test in monitor mode
4. Gradually migrate traffic

### From AWS WAF
1. Export CloudFormation templates
2. Map rules to our system
3. Update application load balancer
4. Monitor and adjust

### From F5/Imperva
1. Export security policies
2. Convert rule syntax
3. Deploy in parallel
4. Perform A/B testing

Ready to get started? Contact our team for a personalized onboarding session!