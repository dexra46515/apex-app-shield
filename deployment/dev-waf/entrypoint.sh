#!/bin/bash
set -e

echo "Starting Developer WAF Container..."

# Set default environment variables
export WAF_DEBUG=${WAF_DEBUG:-false}
export WAF_ENABLE_REPLAY=${WAF_ENABLE_REPLAY:-true}
export WAF_UPSTREAM=${WAF_UPSTREAM:-host.docker.internal:3000}
export WAF_LOG_LEVEL=${WAF_LOG_LEVEL:-info}

# Create required directories
mkdir -p /usr/local/openresty/waf/logs
mkdir -p /usr/local/openresty/waf/policies

# Check if custom policies are mounted
if [ -d "/usr/local/openresty/waf/policies" ]; then
    echo "Custom policies directory found, checking for policy files..."
    ls -la /usr/local/openresty/waf/policies/
fi

# Create default policy if none exist
if [ ! "$(ls -A /usr/local/openresty/waf/policies)" ]; then
    echo "No policies found, creating default policy..."
    cat > /usr/local/openresty/waf/policies/default.yaml << 'EOF'
# Default WAF Policy for Development
rules:
  - id: "DEV_SQL_INJECTION"
    name: "SQL Injection Detection"
    pattern: "(union.*select|or\\s+1\\s*=\\s*1|drop\\s+table)"
    flags: "i"
    severity: "high"
    action: "block"
    status_code: 403

  - id: "DEV_XSS_PROTECTION"
    name: "XSS Attack Detection"
    pattern: "(<script|javascript:|on\\w+\\s*=)"
    flags: "i"
    severity: "high"
    action: "block"
    status_code: 403

  - id: "DEV_PATH_TRAVERSAL"
    name: "Path Traversal Detection"
    pattern: "\\.\\./|\\.\\.\\\\"
    flags: ""
    severity: "high"
    action: "block"
    status_code: 403

  - id: "DEV_RATE_LIMIT"
    name: "Development Rate Limiting"
    type: "rate_limit"
    limit: 100
    window: 60
    action: "challenge"
    status_code: 429
EOF
fi

# Update nginx configuration with runtime values
if [ -f /usr/local/openresty/nginx/conf/nginx.conf ]; then
    echo "Updating nginx.conf with runtime values..."
    # Create backup
    cp /usr/local/openresty/nginx/conf/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf.backup
    
    # Update upstream with proper escaping
    sed -i.tmp "s|host\.docker\.internal:3000|$WAF_UPSTREAM|g" /usr/local/openresty/nginx/conf/nginx.conf
    
    # Update log level with proper escaping
    sed -i.tmp "s|error_log /usr/local/openresty/waf/logs/error.log info;|error_log /usr/local/openresty/waf/logs/error.log $WAF_LOG_LEVEL;|g" /usr/local/openresty/nginx/conf/nginx.conf
    
    # Remove temp files
    rm -f /usr/local/openresty/nginx/conf/nginx.conf.tmp
else
    echo "ERROR: nginx.conf not found!"
    exit 1
fi

# WAF variables are already defined in nginx.conf via map directives
echo "WAF variables already defined in nginx.conf"

echo "WAF Configuration:"
echo "  Debug Mode: $WAF_DEBUG"
echo "  Replay Enabled: $WAF_ENABLE_REPLAY"
echo "  Upstream: $WAF_UPSTREAM"
echo "  Log Level: $WAF_LOG_LEVEL"

# Show effective nginx.conf for debugging before test
echo "--- Effective nginx.conf (first 220 lines) ---"
nl -ba /usr/local/openresty/nginx/conf/nginx.conf | sed -n "1,220p" || true

echo "--- grep for ALL waf variables ---"
grep -n "waf_action\|waf_reason\|waf_processing_time\|waf_rule\|waf_threat_score" /usr/local/openresty/nginx/conf/nginx.conf || true
echo "--- grep for variable references ---"
grep -n '\$waf_' /usr/local/openresty/nginx/conf/nginx.conf || true

# Test nginx configuration
/usr/local/openresty/bin/openresty -t

echo "Starting OpenResty with WAF protection..."
exec "$@"