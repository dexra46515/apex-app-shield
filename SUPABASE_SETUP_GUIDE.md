# 🔧 Supabase Setup Guide for ANA WAF

## Overview

Your ANA WAF platform is already connected to Supabase and configured! This guide explains how everything works and what you need to know.

## ✅ **Already Configured (No Action Needed)**

Your Lovable project is **already connected** to Supabase with:
- ✅ **Database**: All WAF tables and schemas are set up
- ✅ **Edge Functions**: Security processing functions are deployed
- ✅ **API Keys**: Configured and stored securely in Lovable
- ✅ **Real-time Integration**: Live data flow between WAF and dashboard

## 🔍 **How to Find Your Supabase Details**

Since you're connected to Supabase through Lovable, your API keys are automatically managed. You can find them at:

**Supabase Dashboard**: https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi

- **Project URL**: `https://kgazsoccrtmhturhxggi.supabase.co`
- **Anon Key**: Already configured in your project
- **Service Role Key**: Securely stored and managed by Lovable

## 🚨 **Important: API Key Security**

### ✅ **What's Safe (Already Done)**
- **Anon Key**: Safe to use in frontend code - already in your project
- **Project URL**: Public and safe to share
- **Edge Functions**: Use service role key securely on server-side

### ❌ **What to Never Do**
- **Don't share Service Role Key publicly** - it has admin access
- **Don't put sensitive keys in .env files** - they're managed by Lovable
- **Don't commit secrets to Git** - use Lovable's secrets management

## 🔐 **Adding Additional Secrets (If Needed)**

If you need to add additional API keys or secrets for other services:

### For Supabase Edge Functions (Server-side)
Since you're connected to Supabase, use the **Supabase Secrets** feature:

1. Go to: [Supabase Edge Functions Secrets](https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi/settings/functions)
2. Add your secret (e.g., `THIRD_PARTY_API_KEY`)
3. Use in edge functions:
```typescript
const apiKey = Deno.env.get('THIRD_PARTY_API_KEY');
```

### For Frontend Code (Client-side)
**Only for publishable/public keys** - these are safe in your codebase:
```typescript
// ✅ Safe - public keys
const STRIPE_PUBLISHABLE_KEY = "pk_test_...";
const GOOGLE_MAPS_API_KEY = "AIza...";
```

## 📊 **Verify Your Connection**

Test that everything is working:

```bash
# 1. Check WAF dashboard shows live data
curl http://localhost:3000  # Should show real security events

# 2. Check Supabase integration
curl https://kgazsoccrtmhturhxggi.supabase.co/rest/v1/waf_requests \
  -H "apikey: [your-anon-key]" \
  -H "Authorization: Bearer [your-anon-key]"

# 3. Test edge functions
curl https://kgazsoccrtmhturhxggi.supabase.co/functions/v1/waf-monitor \
  -H "apikey: [your-anon-key]"
```

## 🏗️ **Database Schema (Already Created)**

Your Supabase project includes these tables:
- `waf_requests` - All HTTP requests processed by WAF
- `security_events` - Detected threats and security events  
- `debug_sessions` - Request debugging and analysis
- `gitops_security_policies` - Git-synced security policies
- `customer_deployments` - WAF deployment configurations

## 🔄 **Real-time Features**

Your setup includes:
- ✅ **Live Security Dashboard** - Real-time threat monitoring
- ✅ **Auto-refreshing Data** - Dashboard updates every 10-30 seconds
- ✅ **Event Streaming** - Security events appear immediately
- ✅ **Request Logging** - All WAF decisions stored in database

## 🚀 **For Production Deployment**

When deploying to production, you'll need:

### Environment Variables (Docker/Kubernetes)
```bash
# These are already configured in your development environment
SUPABASE_URL=https://kgazsoccrtmhturhxggi.supabase.co
SUPABASE_ANON_KEY=[from-supabase-dashboard]
SUPABASE_SERVICE_ROLE_KEY=[from-supabase-dashboard-settings]
```

### CI/CD Pipeline
```yaml
# GitHub Actions example
env:
  SUPABASE_URL: https://kgazsoccrtmhturhxggi.supabase.co
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## 🆘 **Troubleshooting**

### Connection Issues
```bash
# Test Supabase connectivity
curl -f https://kgazsoccrtmhturhxggi.supabase.co/rest/v1/ \
  -H "apikey: [your-anon-key]"
```

### API Key Issues
- ✅ **Check**: Supabase dashboard → Settings → API
- ✅ **Verify**: Keys match your project ID (`kgazsoccrtmhturhxggi`)
- ✅ **Test**: API calls return data (not auth errors)

### Dashboard Not Showing Data
1. **Check WAF container**: `docker ps | grep ana-waf`
2. **Check API connectivity**: `curl http://localhost:9090/waf/status`
3. **Check Supabase logs**: [Edge Function Logs](https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi/functions/waf-monitor/logs)

## 📚 **Additional Resources**

- **Supabase Dashboard**: https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi
- **Edge Functions**: https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi/functions
- **Database**: https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi/editor
- **API Settings**: https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi/settings/api

## ✅ **Ready to Go!**

Your Supabase integration is complete and working. You can:
- Start developing immediately with `./scripts/developer-onboard.sh`
- View live security data in your dashboard
- Add additional secrets through Supabase as needed
- Deploy to production with existing configuration

**No additional Supabase setup required!** 🎉