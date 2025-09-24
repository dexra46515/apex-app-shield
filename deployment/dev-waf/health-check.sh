#!/bin/bash

# Health check script for Developer WAF

# Check if nginx is running
if ! pgrep -f "nginx: master process" > /dev/null; then
    echo "ERROR: Nginx master process not running"
    exit 1
fi

# Check if WAF status endpoint responds
if ! curl -f -s http://localhost:9090/waf/status > /dev/null; then
    echo "ERROR: WAF status endpoint not responding"
    exit 1
fi

# Check if main proxy is responding
if ! curl -f -s -H "User-Agent: HealthCheck" http://localhost:80/health > /dev/null 2>&1; then
    echo "WARNING: Main proxy endpoint may not be responding (this is normal if no upstream is configured)"
fi

# Get WAF status
WAF_STATUS=$(curl -s http://localhost:9090/waf/status)
if [ $? -eq 0 ]; then
    echo "WAF Status: $WAF_STATUS"
else
    echo "ERROR: Cannot retrieve WAF status"
    exit 1
fi

echo "Health check passed"
exit 0