import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, customerId, domain, apiKey, customerName, config } = await req.json();

    console.log('Generating deployment artifacts for:', model, customerName);

    let artifacts: any = {};

    switch (model) {
      case 'reverse-proxy':
        artifacts = generateReverseProxyArtifacts(domain, apiKey, customerName, config);
        break;
      case 'kubernetes':
        artifacts = generateKubernetesArtifacts(domain, apiKey, customerName, config);
        break;
      case 'on-premise':
        artifacts = generateOnPremiseArtifacts(domain, apiKey, customerName, config);
        break;
      case 'hybrid-cloud':
        artifacts = generateHybridCloudArtifacts(domain, apiKey, customerName, config);
        break;
      default:
        throw new Error(`Unsupported deployment model: ${model}`);
    }

    return new Response(
      JSON.stringify(artifacts),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating deployment artifacts:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to generate deployment artifacts'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateReverseProxyArtifacts(domain: string, apiKey: string, customerName: string, config: any) {
  const nginxConfig = `# WAF-Enabled Nginx Configuration for ${customerName}
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

upstream backend_${customerName.replace(/[^a-zA-Z0-9]/g, '_')} {
    least_conn;
    server backend1.internal:8080 max_fails=3 fail_timeout=30s;
    server backend2.internal:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_conn:10m;

# Real IP detection
real_ip_header X-Forwarded-For;
real_ip_recursive on;
set_real_ip_from 10.0.0.0/8;
set_real_ip_from 172.16.0.0/12;
set_real_ip_from 192.168.0.0/16;

server {
    listen 80;
    listen 443 ssl http2;
    server_name ${domain};
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/${domain}.crt;
    ssl_certificate_key /etc/ssl/private/${domain}.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-WAF-Protected "WAF-${customerName}" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate Limiting
    limit_req zone=${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_limit burst=20 nodelay;
    limit_conn ${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_conn 10;
    
    # WAF Integration
    location / {
        # Pre-flight WAF validation
        access_by_lua_block {
            local http = require "resty.http"
            local cjson = require "cjson"
            
            local httpc = http.new()
            httpc:set_timeout(5000)
            
            -- Prepare WAF request
            local waf_request = {
                method = ngx.var.request_method,
                url = ngx.var.request_uri,
                headers = ngx.req.get_headers(),
                source_ip = ngx.var.remote_addr,
                user_agent = ngx.var.http_user_agent,
                api_key = "${apiKey}",
                customer_domain = "${domain}"
            }
            
            -- Read request body for analysis
            if ngx.var.request_method == "POST" or ngx.var.request_method == "PUT" then
                ngx.req.read_body()
                waf_request.body = ngx.req.get_body_data()
            end
            
            -- Call WAF engine
            local res, err = httpc:request_uri("https://kgazsoccrtmhturhxggi.supabase.co/functions/v1/inline-waf", {
                method = "POST",
                body = cjson.encode(waf_request),
                headers = {
                    ["Content-Type"] = "application/json",
                    ["Authorization"] = "Bearer ${apiKey}",
                    ["User-Agent"] = "WAF-Proxy/2.0"
                }
            })
            
            if res and res.status == 200 and res.body then
                local waf_response = cjson.decode(res.body)
                
                if waf_response.action == "block" then
                    ngx.status = 403
                    ngx.header["X-WAF-Blocked"] = "true"
                    ngx.header["X-WAF-Reason"] = waf_response.reason or "Security violation"
                    ngx.header["X-WAF-Rule-ID"] = waf_response.rule_id or "unknown"
                    ngx.say(cjson.encode({
                        error = "Request blocked by WAF",
                        reason = waf_response.reason or "Security policy violation",
                        reference = waf_response.incident_id or "none"
                    }))
                    ngx.exit(403)
                elseif waf_response.action == "challenge" then
                    -- Implement challenge logic here
                    ngx.header["X-WAF-Challenge"] = "true"
                end
                
                -- Add WAF headers to request
                ngx.req.set_header("X-WAF-Decision", waf_response.action)
                ngx.req.set_header("X-WAF-Score", waf_response.threat_score or "0")
                
                ngx.log(ngx.INFO, "WAF Decision: " .. waf_response.action .. " for " .. ngx.var.remote_addr)
            else
                -- WAF engine unavailable - log and continue (fail open)
                ngx.log(ngx.ERR, "WAF engine unavailable: " .. (err or "timeout"))
                ngx.req.set_header("X-WAF-Status", "unavailable")
            end
        }
        
        # Proxy to backend
        proxy_pass http://backend_${customerName.replace(/[^a-zA-Z0-9]/g, '_')};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # WAF status endpoint
    location /waf-status {
        access_log off;
        return 200 "WAF Active - ${customerName}\\n";
        add_header Content-Type text/plain;
        add_header X-WAF-Customer "${customerName}";
    }
}`;

  const envoyConfig = `# Envoy WAF Configuration for ${customerName}
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        protocol: TCP
        address: 0.0.0.0
        port_value: 80
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          access_log:
          - name: envoy.access_loggers.stdout
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
          http_filters:
          - name: envoy.filters.http.waf
            typed_config:
              "@type": type.googleapis.com/udpa.type.v1.TypedStruct
              type_url: type.googleapis.com/envoy.extensions.filters.http.waf.v3.Waf
              value:
                config:
                  waf_endpoint: "https://kgazsoccrtmhturhxggi.supabase.co/functions/v1/inline-waf"
                  api_key: "${apiKey}"
                  customer_domain: "${domain}"
                  timeout: 5s
                  fail_mode: "open"
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
          route_config:
            name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["${domain}", "*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: backend_cluster
                  timeout: 30s

  clusters:
  - name: backend_cluster
    connect_timeout: 5s
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    lb_policy: LEAST_REQUEST
    load_assignment:
      cluster_name: backend_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend1.internal
                port_value: 8080
        - endpoint:
            address:
              socket_address:
                address: backend2.internal
                port_value: 8080
    health_checks:
    - timeout: 5s
      interval: 10s
      unhealthy_threshold: 2
      healthy_threshold: 2
      http_health_check:
        path: "/health"

admin:
  address:
    socket_address:
      protocol: TCP
      address: 0.0.0.0
      port_value: 9901`;

  const dockerCompose = `# Docker Compose for ${customerName} WAF Deployment
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

version: '3.8'

services:
  nginx-waf:
    image: openresty/openresty:alpine
    container_name: ${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_nginx_waf
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - ./logs:/var/log/nginx
    environment:
      - CUSTOMER_NAME=${customerName}
      - DOMAIN=${domain}
      - API_KEY=${apiKey}
    restart: unless-stopped
    networks:
      - waf-network
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: your-app:latest
    container_name: ${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_backend
    expose:
      - "8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    restart: unless-stopped
    networks:
      - waf-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    container_name: ${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped
    networks:
      - waf-network

volumes:
  prometheus_data:

networks:
  waf-network:
    driver: bridge`;

  return {
    nginx_config: nginxConfig,
    envoy_config: envoyConfig,
    docker_compose: dockerCompose
  };
}

function generateKubernetesArtifacts(domain: string, apiKey: string, customerName: string, config: any) {
  const namespace = config?.namespace || 'waf-system';
  const ingressClass = config?.ingressClass || 'nginx';
  
  const deployment = `# Kubernetes Deployment for ${customerName}
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
  labels:
    customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
    managed-by: "waf-system"

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf
  namespace: ${namespace}
  labels:
    app: waf-proxy
    customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: waf-proxy
      customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
  template:
    metadata:
      labels:
        app: waf-proxy
        customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
    spec:
      containers:
      - name: waf-proxy
        image: nginx:alpine
        ports:
        - containerPort: 80
        - containerPort: 443
        env:
        - name: CUSTOMER_NAME
          value: "${customerName}"
        - name: DOMAIN
          value: "${domain}"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: waf-secrets
              key: api-key
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        - name: ssl-certs
          mountPath: /etc/ssl
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: nginx-config
        configMap:
          name: waf-config
      - name: ssl-certs
        secret:
          secretName: ssl-certificates

---

apiVersion: v1
kind: Service
metadata:
  name: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf-service
  namespace: ${namespace}
  labels:
    app: waf-proxy
    customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
spec:
  selector:
    app: waf-proxy
    customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https
    port: 443
    targetPort: 443
  type: ClusterIP

---

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-ingress
  namespace: ${namespace}
  annotations:
    kubernetes.io/ingress.class: ${ingressClass}
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  labels:
    customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
spec:
  tls:
  - hosts:
    - ${domain}
    secretName: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-tls
  rules:
  - host: ${domain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf-service
            port:
              number: 80

---

apiVersion: v1
kind: Secret
metadata:
  name: waf-secrets
  namespace: ${namespace}
type: Opaque
data:
  api-key: ${btoa(apiKey)}

---

apiVersion: v1
kind: ConfigMap
metadata:
  name: waf-config
  namespace: ${namespace}
data:
  nginx.conf: |
    events {
        worker_connections 1024;
    }
    
    http {
        upstream backend {
            server backend-service.default.svc.cluster.local:8080;
        }
        
        server {
            listen 80;
            server_name ${domain};
            
            location / {
                proxy_pass http://backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            }
            
            location /health {
                return 200 "healthy";
                add_header Content-Type text/plain;
            }
        }
    }`;

  const hpa = `# Horizontal Pod Autoscaler for ${customerName}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf-hpa
  namespace: ${namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80`;

  const networkPolicy = `# Network Policy for ${customerName}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf-netpol
  namespace: ${namespace}
spec:
  podSelector:
    matchLabels:
      app: waf-proxy
      customer: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}"
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS to WAF API
    - protocol: TCP
      port: 8080 # Backend services`;

  return {
    deployment_yaml: deployment,
    hpa_yaml: hpa,
    network_policy_yaml: networkPolicy
  };
}

function generateOnPremiseArtifacts(domain: string, apiKey: string, customerName: string, config: any) {
  const applianceIP = config?.applianceIP || '192.168.1.100';
  const managementPort = config?.managementPort || '8443';
  
  const vmwareTemplate = `# VMware vSphere Template for ${customerName}
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

# VM Configuration
vm_name: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf-appliance"
vm_hardware_version: 19
vm_guest_os: "ubuntu64Guest"

# Resources
vm_cpu_count: 4
vm_memory_mb: 8192
vm_disk_size_gb: 100

# Network
vm_network: "Production_Network"
vm_ip_address: "${applianceIP}"
vm_netmask: "255.255.255.0"
vm_gateway: "192.168.1.1"
vm_dns_servers:
  - "8.8.8.8"
  - "8.8.4.4"

# Storage
vm_datastore: "Production_Datastore"
vm_disk_provisioning: "thin"

# Advanced Settings
vm_cpu_reservation: 2000  # MHz
vm_memory_reservation: 4096  # MB
vm_cpu_limit: -1  # Unlimited
vm_memory_limit: -1  # Unlimited

# HA Configuration
vm_ha_enabled: true
vm_drs_enabled: true
vm_drs_behavior: "fullyAutomated"

# Security
vm_secure_boot: true
vm_vtpm_enabled: true`;

  const cloudInit = `#cloud-config
# Cloud-init configuration for ${customerName} WAF Appliance
# Generated: ${new Date().toISOString()}

hostname: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf
fqdn: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf.${domain}

users:
  - name: wafadmin
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDH... # Replace with actual public key

packages:
  - docker.io
  - docker-compose
  - nginx
  - fail2ban
  - ufw
  - htop
  - curl
  - wget
  - unzip

write_files:
  - path: /opt/waf/config.yaml
    content: |
      customer:
        name: "${customerName}"
        domain: "${domain}"
        api_key: "${apiKey}"
      network:
        management_ip: "${applianceIP}"
        management_port: ${managementPort}
        data_interfaces:
          - eth1
          - eth2
      security:
        enable_fail2ban: true
        enable_ufw: true
        ssh_port: 22
      monitoring:
        enable_prometheus: true
        enable_grafana: true
        retention_days: 30
    permissions: '0600'
    owner: wafadmin:wafadmin

  - path: /opt/waf/docker-compose.yml
    content: |
      version: '3.8'
      services:
        waf-engine:
          image: waf-enterprise:latest
          container_name: waf-engine
          ports:
            - "80:80"
            - "443:443"
            - "${managementPort}:8443"
          volumes:
            - /opt/waf/config:/etc/waf/config:ro
            - /opt/waf/ssl:/etc/ssl:ro
            - /opt/waf/logs:/var/log/waf
          environment:
            - CUSTOMER_NAME=${customerName}
            - DOMAIN=${domain}
            - API_KEY=${apiKey}
            - MANAGEMENT_IP=${applianceIP}
          restart: unless-stopped
          networks:
            - waf-network
          cap_add:
            - NET_ADMIN
            - SYS_ADMIN

        prometheus:
          image: prom/prometheus:latest
          container_name: prometheus
          ports:
            - "9090:9090"
          volumes:
            - /opt/waf/prometheus:/etc/prometheus:ro
            - prometheus_data:/prometheus
          restart: unless-stopped
          networks:
            - waf-network

        grafana:
          image: grafana/grafana:latest
          container_name: grafana
          ports:
            - "3000:3000"
          volumes:
            - grafana_data:/var/lib/grafana
          environment:
            - GF_SECURITY_ADMIN_PASSWORD=admin123
          restart: unless-stopped
          networks:
            - waf-network

      volumes:
        prometheus_data:
        grafana_data:

      networks:
        waf-network:
          driver: bridge
    permissions: '0644'
    owner: wafadmin:wafadmin

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker wafadmin
  - ufw enable
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw allow ${managementPort}/tcp
  - cd /opt/waf && docker-compose up -d
  - systemctl enable fail2ban
  - systemctl start fail2ban

final_message: "WAF Appliance for ${customerName} is ready!"`;

  const haproxyConfig = `# HAProxy Configuration for ${customerName} HA Setup
# Generated: ${new Date().toISOString()}

global
    daemon
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    
    # Security
    ssl-default-bind-ciphers ECDHE+AESGCM:ECDHE+CHACHA20:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option redispatch
    retries 3

# Statistics
stats enable
stats uri /haproxy-stats
stats refresh 30s
stats hide-version
stats auth admin:secure123

# Frontend for ${customerName}
frontend ${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/${domain}.pem
    redirect scheme https if !{ ssl_fc }
    
    # WAF Integration
    http-request set-header X-Customer-Name "${customerName}"
    http-request set-header X-Domain "${domain}"
    
    default_backend ${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_waf_backend

# Backend WAF Engines
backend ${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_waf_backend
    balance roundrobin
    option httpchk GET /health
    
    # Primary WAF Appliance
    server waf1 ${applianceIP}:80 check inter 5s fall 3 rise 2
    
    # Secondary WAF Appliance (for HA)
    server waf2 192.168.1.101:80 check inter 5s fall 3 rise 2 backup
    
    # Health check configuration
    http-check send meth GET uri /health ver HTTP/1.1 hdr Host ${domain}
    http-check expect status 200`;

  return {
    vmware_template: vmwareTemplate,
    cloud_init: cloudInit,
    haproxy_config: haproxyConfig
  };
}

function generateHybridCloudArtifacts(domain: string, apiKey: string, customerName: string, config: any) {
  const cloudEndpoint = config?.cloudEndpoint || 'https://kgazsoccrtmhturhxggi.supabase.co';
  
  const terraformMain = `# Terraform Configuration for ${customerName} Hybrid Cloud Deployment
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Variables
variable "customer_name" {
  description = "Customer name"
  type        = string
  default     = "${customerName}"
}

variable "domain" {
  description = "Customer domain"
  type        = string
  default     = "${domain}"
}

variable "api_key" {
  description = "WAF API key"
  type        = string
  sensitive   = true
  default     = "${apiKey}"
}

variable "regions" {
  description = "AWS regions for deployment"
  type        = list(string)
  default     = ["us-east-1", "us-west-2", "eu-west-1"]
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC for each region
resource "aws_vpc" "waf_vpc" {
  count = length(var.regions)
  
  cidr_block           = "10.${count.index}.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name     = "\${var.customer_name}-waf-vpc-\${var.regions[count.index]}"
    Customer = var.customer_name
    Purpose  = "WAF-Hybrid-Cloud"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "waf_igw" {
  count  = length(var.regions)
  vpc_id = aws_vpc.waf_vpc[count.index].id
  
  tags = {
    Name     = "\${var.customer_name}-waf-igw-\${var.regions[count.index]}"
    Customer = var.customer_name
  }
}

# Public Subnets
resource "aws_subnet" "waf_public" {
  count = length(var.regions) * 2
  
  vpc_id                  = aws_vpc.waf_vpc[floor(count.index / 2)].id
  cidr_block              = "10.${floor(count.index / 2)}.${(count.index % 2) + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index % 2]
  map_public_ip_on_launch = true
  
  tags = {
    Name     = "\${var.customer_name}-waf-public-\${floor(count.index / 2)}-\${count.index % 2}"
    Customer = var.customer_name
    Type     = "Public"
  }
}

# Security Groups
resource "aws_security_group" "waf_sg" {
  count       = length(var.regions)
  name_prefix = "\${var.customer_name}-waf-sg"
  vpc_id      = aws_vpc.waf_vpc[count.index].id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name     = "\${var.customer_name}-waf-sg-\${var.regions[count.index]}"
    Customer = var.customer_name
  }
}

# Launch Template
resource "aws_launch_template" "waf_template" {
  count = length(var.regions)
  
  name_prefix   = "\${var.customer_name}-waf-"
  image_id      = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.medium"
  
  vpc_security_group_ids = [aws_security_group.waf_sg[count.index].id]
  
  user_data = base64encode(templatefile("\${path.module}/user_data.sh", {
    customer_name  = var.customer_name
    domain        = var.domain
    api_key       = var.api_key
    cloud_endpoint = "${cloudEndpoint}"
    region        = var.regions[count.index]
  }))
  
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name     = "\${var.customer_name}-waf-instance"
      Customer = var.customer_name
      Region   = var.regions[count.index]
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "waf_asg" {
  count = length(var.regions)
  
  name                = "\${var.customer_name}-waf-asg-\${var.regions[count.index]}"
  vpc_zone_identifier = [aws_subnet.waf_public[count.index * 2].id, aws_subnet.waf_public[count.index * 2 + 1].id]
  target_group_arns   = [aws_lb_target_group.waf_tg[count.index].arn]
  health_check_type   = "ELB"
  
  min_size         = 2
  max_size         = 10
  desired_capacity = 3
  
  launch_template {
    id      = aws_launch_template.waf_template[count.index].id
    version = "$Latest"
  }
  
  tag {
    key                 = "Name"
    value               = "\${var.customer_name}-waf-asg"
    propagate_at_launch = true
  }
  
  tag {
    key                 = "Customer"
    value               = var.customer_name
    propagate_at_launch = true
  }
}

# Application Load Balancer
resource "aws_lb" "waf_alb" {
  count = length(var.regions)
  
  name               = "\${var.customer_name}-waf-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.waf_sg[count.index].id]
  subnets           = [aws_subnet.waf_public[count.index * 2].id, aws_subnet.waf_public[count.index * 2 + 1].id]
  
  enable_deletion_protection = false
  
  tags = {
    Name     = "\${var.customer_name}-waf-alb-\${var.regions[count.index]}"
    Customer = var.customer_name
  }
}

# Target Group
resource "aws_lb_target_group" "waf_tg" {
  count = length(var.regions)
  
  name     = "\${var.customer_name}-waf-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.waf_vpc[count.index].id
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
  
  tags = {
    Name     = "\${var.customer_name}-waf-tg-\${var.regions[count.index]}"
    Customer = var.customer_name
  }
}

# ALB Listener
resource "aws_lb_listener" "waf_listener" {
  count = length(var.regions)
  
  load_balancer_arn = aws_lb.waf_alb[count.index].arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.waf_tg[count.index].arn
  }
}

# Route 53 for DNS
resource "aws_route53_zone" "main" {
  name = var.domain
  
  tags = {
    Name     = "\${var.customer_name}-zone"
    Customer = var.customer_name
  }
}

resource "aws_route53_record" "waf" {
  count = length(var.regions)
  
  zone_id = aws_route53_zone.main.zone_id
  name    = "\${var.regions[count.index]}.waf"
  type    = "A"
  
  alias {
    name                   = aws_lb.waf_alb[count.index].dns_name
    zone_id                = aws_lb.waf_alb[count.index].zone_id
    evaluate_target_health = true
  }
}

# Outputs
output "load_balancer_dns" {
  description = "DNS names of the load balancers"
  value       = aws_lb.waf_alb[*].dns_name
}

output "name_servers" {
  description = "Name servers for the domain"
  value       = aws_route53_zone.main.name_servers
}`;

  const userDataScript = `#!/bin/bash
# User data script for ${customerName} WAF Edge Nodes
# Generated: ${new Date().toISOString()}

# Variables
CUSTOMER_NAME="${customerName}"
DOMAIN="${domain}"
API_KEY="${apiKey}"
CLOUD_ENDPOINT="${cloudEndpoint}"
REGION="\${region}"

# Update system
yum update -y

# Install dependencies
yum install -y docker git curl wget htop

# Start Docker
systemctl start docker
systemctl enable docker

# Create WAF user
useradd -m -s /bin/bash wafuser
usermod -aG docker wafuser

# Create directories
mkdir -p /opt/waf/{config,logs,ssl}
chown -R wafuser:wafuser /opt/waf

# WAF Configuration
cat > /opt/waf/config/waf.conf << EOF
# WAF Edge Configuration for \${CUSTOMER_NAME}
customer_name="\${CUSTOMER_NAME}"
domain="\${DOMAIN}"
api_key="\${API_KEY}"
cloud_endpoint="\${CLOUD_ENDPOINT}"
region="\${REGION}"
mode="hybrid"

# Edge-specific settings
edge_cache_enabled=true
edge_cache_ttl=300
threat_intel_sync_interval=60
local_rules_enabled=true
cloud_fallback=true

# Performance settings
worker_processes=auto
worker_connections=1024
keepalive_timeout=65
EOF

# Docker Compose for Edge WAF
cat > /opt/waf/docker-compose.yml << EOF
version: '3.8'

services:
  waf-edge:
    image: waf-edge:latest
    container_name: waf-edge-\${REGION}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /opt/waf/config:/etc/waf/config:ro
      - /opt/waf/logs:/var/log/waf
      - /opt/waf/ssl:/etc/ssl:ro
    environment:
      - CUSTOMER_NAME=\${CUSTOMER_NAME}
      - DOMAIN=\${DOMAIN}
      - API_KEY=\${API_KEY}
      - CLOUD_ENDPOINT=\${CLOUD_ENDPOINT}
      - REGION=\${REGION}
      - MODE=hybrid
    restart: unless-stopped
    networks:
      - waf-network

  threat-intel-sync:
    image: threat-intel-sync:latest
    container_name: threat-intel-sync-\${REGION}
    volumes:
      - /opt/waf/config:/etc/waf/config:ro
    environment:
      - API_KEY=\${API_KEY}
      - CLOUD_ENDPOINT=\${CLOUD_ENDPOINT}
      - SYNC_INTERVAL=60
    restart: unless-stopped
    networks:
      - waf-network
    depends_on:
      - waf-edge

  metrics-exporter:
    image: waf-metrics-exporter:latest
    container_name: metrics-exporter-\${REGION}
    ports:
      - "9100:9100"
    volumes:
      - /opt/waf/logs:/var/log/waf:ro
    environment:
      - REGION=\${REGION}
      - CUSTOMER_NAME=\${CUSTOMER_NAME}
    restart: unless-stopped
    networks:
      - waf-network

networks:
  waf-network:
    driver: bridge
EOF

# Start WAF services
cd /opt/waf
docker-compose up -d

# Configure log rotation
cat > /etc/logrotate.d/waf << EOF
/opt/waf/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 wafuser wafuser
    postrotate
        docker-compose -f /opt/waf/docker-compose.yml restart waf-edge
    endscript
}
EOF

# Health check script
cat > /opt/waf/health-check.sh << '#!/bin/bash'
#!/bin/bash
# Health check for WAF edge node

HEALTH_URL="http://localhost/health"
RESPONSE=\$(curl -s -o /dev/null -w "%{http_code}" \${HEALTH_URL})

if [ "\$RESPONSE" = "200" ]; then
    echo "WAF Edge Node: Healthy"
    exit 0
else
    echo "WAF Edge Node: Unhealthy (HTTP \$RESPONSE)"
    exit 1
fi
EOF

chmod +x /opt/waf/health-check.sh

# Install health check in cron
echo "*/1 * * * * /opt/waf/health-check.sh >> /opt/waf/logs/health.log 2>&1" | crontab -u wafuser -

# Signal completion
/opt/aws/bin/cfn-signal -e $? --stack \${AWS::StackName} --resource AutoScalingGroup --region \${AWS::Region}`;

  const ansiblePlaybook = `# Ansible Playbook for ${customerName} Hybrid Cloud Management
# Generated: ${new Date().toISOString()}
---
- name: Deploy WAF Hybrid Cloud Infrastructure
  hosts: localhost
  connection: local
  gather_facts: false
  
  vars:
    customer_name: "${customerName}"
    domain: "${domain}"
    api_key: "${apiKey}"
    cloud_endpoint: "${cloudEndpoint}"
    regions:
      - us-east-1
      - us-west-2
      - eu-west-1
    
  tasks:
    - name: Deploy Terraform infrastructure
      terraform:
        project_path: "./terraform"
        state: present
        variables:
          customer_name: "{{ customer_name }}"
          domain: "{{ domain }}"
          api_key: "{{ api_key }}"
          regions: "{{ regions }}"
      register: terraform_output
    
    - name: Wait for instances to be ready
      wait_for:
        host: "{{ item }}"
        port: 80
        timeout: 300
      loop: "{{ terraform_output.outputs.load_balancer_dns.value }}"
    
    - name: Configure DNS
      route53:
        state: present
        zone: "{{ domain }}"
        record: "waf.{{ domain }}"
        type: A
        value: "{{ terraform_output.outputs.load_balancer_dns.value[0] }}"
        ttl: 300
    
    - name: Deploy monitoring
      kubernetes.core.k8s:
        name: waf-monitoring
        api_version: v1
        kind: Namespace
        state: present
    
    - name: Configure alerting
      uri:
        url: "{{ cloud_endpoint }}/functions/v1/alert-manager"
        method: POST
        body_format: json
        body:
          customer: "{{ customer_name }}"
          domain: "{{ domain }}"
          endpoints: "{{ terraform_output.outputs.load_balancer_dns.value }}"
          alert_rules:
            - name: "WAF Edge Down"
              condition: "up == 0"
              severity: "critical"
            - name: "High Traffic Volume"
              condition: "rate(requests_total[5m]) > 1000"
              severity: "warning"
        headers:
          Authorization: "Bearer {{ api_key }}"
    
    - name: Verify deployment
      uri:
        url: "http://{{ item }}/health"
        method: GET
      loop: "{{ terraform_output.outputs.load_balancer_dns.value }}"
      register: health_checks
    
    - name: Report deployment status
      debug:
        msg: "WAF Hybrid Cloud deployment for {{ customer_name }} completed successfully"
      when: health_checks.results | selectattr('status', 'equalto', 200) | list | length == regions | length`;

  return {
    terraform_main: terraformMain,
    user_data_script: userDataScript,
    ansible_playbook: ansiblePlaybook
  };
}`;

const deploymentOrchestrator = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, customerId, artifacts, config } = await req.json();

    console.log('Orchestrating deployment for model:', model, 'customer:', customerId);

    // Simulate deployment orchestration based on model
    let deploymentResult = {};

    switch (model) {
      case 'reverse-proxy':
        deploymentResult = await deployReverseProxy(artifacts, config);
        break;
      case 'kubernetes':
        deploymentResult = await deployKubernetes(artifacts, config);
        break;
      case 'on-premise':
        deploymentResult = await deployOnPremise(artifacts, config);
        break;
      case 'hybrid-cloud':
        deploymentResult = await deployHybridCloud(artifacts, config);
        break;
      default:
        throw new Error(\`Unsupported deployment model: \${model}\`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deployment_id: \`deploy-\${Date.now()}\`,
        model: model,
        status: 'deployed',
        endpoints: deploymentResult.endpoints,
        monitoring: deploymentResult.monitoring,
        message: \`\${model} deployment completed successfully\`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Deployment orchestration error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to orchestrate deployment'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function deployReverseProxy(artifacts: any, config: any) {
  // Simulate reverse proxy deployment
  console.log('Deploying reverse proxy configuration...');
  
  return {
    endpoints: [
      \`http://\${config.domain}\`,
      \`https://\${config.domain}\`
    ],
    monitoring: {
      health_check: \`http://\${config.domain}/health\`,
      metrics: \`http://\${config.domain}/metrics\`,
      logs: '/var/log/nginx/access.log'
    }
  };
}

async function deployKubernetes(artifacts: any, config: any) {
  // Simulate Kubernetes deployment
  console.log('Deploying to Kubernetes cluster...');
  
  return {
    endpoints: [
      \`http://\${config.domain}\`,
      \`https://\${config.domain}\`
    ],
    monitoring: {
      health_check: \`http://\${config.domain}/health\`,
      prometheus: \`http://prometheus.\${config.domain}:9090\`,
      grafana: \`http://grafana.\${config.domain}:3000\`
    }
  };
}

async function deployOnPremise(artifacts: any, config: any) {
  // Simulate on-premise appliance deployment
  console.log('Deploying on-premise appliance...');
  
  return {
    endpoints: [
      \`http://\${config.applianceIP}\`,
      \`https://\${config.applianceIP}:\${config.managementPort}\`
    ],
    monitoring: {
      health_check: \`http://\${config.applianceIP}/health\`,
      management: \`https://\${config.applianceIP}:\${config.managementPort}\`,
      snmp: \`\${config.applianceIP}:161\`
    }
  };
}

async function deployHybridCloud(artifacts: any, config: any) {
  // Simulate hybrid cloud deployment
  console.log('Deploying hybrid cloud infrastructure...');
  
  return {
    endpoints: [
      \`http://us-east-1.waf.\${config.domain}\`,
      \`http://us-west-2.waf.\${config.domain}\`,
      \`http://eu-west-1.waf.\${config.domain}\`
    ],
    monitoring: {
      global_dashboard: \`https://dashboard.waf.\${config.domain}\`,
      regional_health: \`https://health.waf.\${config.domain}\`,
      threat_intel: \`https://intel.waf.\${config.domain}\`
    }
  };
}`;