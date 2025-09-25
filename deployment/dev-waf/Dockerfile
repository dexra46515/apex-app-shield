# Standalone Developer WAF Container
FROM openresty/openresty:alpine

# Install additional packages for WAF functionality
RUN apk add --no-cache \
    curl \
    jq \
    bash \
    ca-certificates \
    openssl

# Skip Lua dependencies for now - using built-in OpenResty modules

# Create WAF directories
RUN mkdir -p /usr/local/openresty/waf \
    && mkdir -p /usr/local/openresty/waf/rules \
    && mkdir -p /usr/local/openresty/waf/logs \
    && mkdir -p /usr/local/openresty/waf/policies

# Copy WAF configuration and scripts
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY waf-engine.lua /usr/local/openresty/waf/waf-engine.lua
COPY waf-rules.lua /usr/local/openresty/waf/waf-rules.lua
COPY policy-loader.lua /usr/local/openresty/waf/policy-loader.lua
COPY health-check.sh /usr/local/bin/health-check.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# No dynamic injection needed; vars are defined in nginx.conf at http level

# Make scripts executable
RUN chmod +x /usr/local/bin/health-check.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

# Expose ports
EXPOSE 80 443 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]