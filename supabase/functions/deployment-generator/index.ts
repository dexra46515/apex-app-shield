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
        error: error instanceof Error ? error.message : 'Unknown error',
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
    docker_compose: dockerCompose,
    model: 'reverse-proxy',
    status: 'generated',
    files: [
      { name: 'nginx.conf', content: nginxConfig },
      { name: 'docker-compose.yml', content: dockerCompose }
    ]
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
              number: 80`;

  const helmChart = `# Helm Chart values for ${customerName}
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

replicaCount: 3

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "alpine"

nameOverride: ""
fullnameOverride: "${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-waf"

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations: {}

podSecurityContext: {}

securityContext: {}

service:
  type: ClusterIP
  port: 80
  httpsPort: 443

ingress:
  enabled: true
  className: "${ingressClass}"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: ${domain}
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: ${customerName.replace(/[^a-zA-Z0-9]/g, '-')}-tls
      hosts:
        - ${domain}

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity: {}

waf:
  apiKey: "${apiKey}"
  domain: "${domain}"
  customerName: "${customerName}"`;

  return {
    deployment_yaml: deployment,
    helm_values: helmChart,
    model: 'kubernetes',
    status: 'generated',
    files: [
      { name: 'deployment.yaml', content: deployment },
      { name: 'values.yaml', content: helmChart }
    ]
  };
}

function generateOnPremiseArtifacts(domain: string, apiKey: string, customerName: string, config: any) {
  const applianceIP = config?.applianceIP || '192.168.1.100';
  const managementPort = config?.managementPort || '9443';
  
  const ansiblePlaybook = `# Ansible Playbook for ${customerName} On-Premise WAF
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

---
- name: Deploy WAF Appliance for ${customerName}
  hosts: waf_appliances
  become: yes
  vars:
    customer_name: "${customerName}"
    domain: "${domain}"
    api_key: "${apiKey}"
    appliance_ip: "${applianceIP}"
    management_port: "${managementPort}"
    
  tasks:
    - name: Update system packages
      package:
        name: "*"
        state: latest
        
    - name: Install required packages
      package:
        name:
          - nginx
          - openssl
          - curl
          - wget
          - python3
          - python3-pip
        state: present
        
    - name: Create WAF user
      user:
        name: waf
        system: yes
        shell: /bin/bash
        home: /opt/waf
        createhome: yes
        
    - name: Create SSL directory
      file:
        path: /etc/ssl/waf
        state: directory
        owner: waf
        group: waf
        mode: '0700'
        
    - name: Generate self-signed certificate
      command: |
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 
        -keyout /etc/ssl/waf/{{ domain }}.key 
        -out /etc/ssl/waf/{{ domain }}.crt 
        -subj "/C=US/ST=State/L=City/O=Organization/CN={{ domain }}"
      args:
        creates: /etc/ssl/waf/{{ domain }}.crt
        
    - name: Set certificate permissions
      file:
        path: "{{ item }}"
        owner: waf
        group: waf
        mode: '0600'
      with_items:
        - /etc/ssl/waf/{{ domain }}.key
        - /etc/ssl/waf/{{ domain }}.crt
        
    - name: Create nginx configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'
      notify: restart nginx
      
    - name: Create WAF monitoring script
      template:
        src: waf_monitor.py.j2
        dest: /opt/waf/monitor.py
        owner: waf
        group: waf
        mode: '0755'
        
    - name: Create systemd service for WAF monitor
      template:
        src: waf-monitor.service.j2
        dest: /etc/systemd/system/waf-monitor.service
        owner: root
        group: root
        mode: '0644'
      notify: 
        - reload systemd
        - restart waf-monitor
        
    - name: Enable and start services
      systemd:
        name: "{{ item }}"
        enabled: yes
        state: started
      with_items:
        - nginx
        - waf-monitor
        
  handlers:
    - name: restart nginx
      systemd:
        name: nginx
        state: restarted
        
    - name: reload systemd
      systemd:
        daemon_reload: yes
        
    - name: restart waf-monitor
      systemd:
        name: waf-monitor
        state: restarted`;

  const vmTemplate = `# VM Template for ${customerName} WAF Appliance
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

# Minimum VM Requirements:
# - CPU: 4 cores
# - RAM: 8GB
# - Storage: 100GB SSD
# - Network: 2 NICs (management + traffic)

# Network Configuration
network:
  management:
    ip: ${applianceIP}
    netmask: 255.255.255.0
    gateway: 192.168.1.1
    dns: [8.8.8.8, 8.8.4.4]
  
  traffic:
    mode: bridge
    interface: eth1

# WAF Configuration
waf:
  customer: "${customerName}"
  domain: "${domain}"
  api_key: "${apiKey}"
  management_port: ${managementPort}
  
  rules:
    - name: "Rate Limiting"
      type: "rate_limit"
      threshold: 100
      window: 60
      
    - name: "SQL Injection Protection"
      type: "signature"
      pattern: "union|select|insert|update|delete"
      action: "block"
      
    - name: "XSS Protection"
      type: "signature"
      pattern: "<script|javascript:|vbscript:|onload="
      action: "block"

# Monitoring Configuration
monitoring:
  enabled: true
  metrics_port: 9090
  log_level: "info"
  syslog_server: "192.168.1.10:514"
  
  alerts:
    - name: "High CPU Usage"
      condition: "cpu > 80"
      action: "email"
      
    - name: "Attack Detected"
      condition: "blocked_requests > 10"
      action: "siem"`;

  return {
    ansible_playbook: ansiblePlaybook,
    vm_template: vmTemplate,
    model: 'on-premise',
    status: 'generated',
    files: [
      { name: 'deploy-appliance.yml', content: ansiblePlaybook },
      { name: 'vm-template.yml', content: vmTemplate }
    ]
  };
}

function generateHybridCloudArtifacts(domain: string, apiKey: string, customerName: string, config: any) {
  const regions = config?.regions || ['us-east-1', 'us-west-2', 'eu-west-1'];
  
  const terraformMain = `# Terraform configuration for ${customerName} Hybrid Cloud WAF
# Domain: ${domain}
# Generated: ${new Date().toISOString()}

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "customer_name" {
  description = "Customer name for tagging"
  type        = string
  default     = "${customerName}"
}

variable "domain" {
  description = "Domain name for WAF protection"
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
  default     = ${JSON.stringify(regions)}
}

# Data sources
data "aws_availability_zones" "available" {
  for_each = toset(var.regions)
  provider = aws.region[each.key]
  state    = "available"
}

# Providers for multi-region
${regions.map(region => `
provider "aws" {
  alias  = "${region.replace(/-/g, '_')}"
  region = "${region}"
}`).join('\n')}

# WAF instances in each region
${regions.map(region => `
module "waf_${region.replace(/-/g, '_')}" {
  source = "./modules/waf-instance"
  
  providers = {
    aws = aws.${region.replace(/-/g, '_')}
  }
  
  customer_name = var.customer_name
  domain        = var.domain
  api_key       = var.api_key
  region        = "${region}"
  
  tags = {
    Customer    = var.customer_name
    Environment = "production"
    Region      = "${region}"
    ManagedBy   = "terraform"
  }
}`).join('\n\n')}

# Global load balancer
resource "aws_route53_zone" "main" {
  name = var.domain
  
  tags = {
    Customer  = var.customer_name
    ManagedBy = "terraform"
  }
}

${regions.map(region => `
resource "aws_route53_record" "waf_${region.replace(/-/g, '_')}" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "${region}.waf.\${var.domain}"
  type    = "A"
  ttl     = 300
  records = [module.waf_${region.replace(/-/g, '_')}.public_ip]
}`).join('\n\n')}

# Health check and failover
resource "aws_route53_health_check" "waf_health" {
  for_each = toset(var.regions)
  
  fqdn                            = "\${each.value}.waf.\${var.domain}"
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 3
  request_interval                = 30
  
  tags = {
    Name      = "WAF Health Check - \${each.value}"
    Customer  = var.customer_name
    Region    = each.value
  }
}

# Outputs
output "waf_endpoints" {
  description = "WAF endpoint URLs"
  value = {
${regions.map(region => `    ${region} = "https://${region}.waf.\${var.domain}"`).join('\n')}
  }
}

output "management_dashboard" {
  description = "Global management dashboard URL"
  value = "https://dashboard.waf.\${var.domain}"
}

output "api_endpoints" {
  description = "API endpoints for each region"
  value = {
${regions.map(region => `    ${region} = module.waf_${region.replace(/-/g, '_')}.api_endpoint`).join('\n')}
  }
}`;

  return {
    terraform_main: terraformMain,
    model: 'hybrid-cloud',
    status: 'generated',
    files: [
      { name: 'main.tf', content: terraformMain }
    ]
  };
}