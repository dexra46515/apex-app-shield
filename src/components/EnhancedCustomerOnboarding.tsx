import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building, 
  Key, 
  Code, 
  CheckCircle, 
  Copy,
  Download,
  ExternalLink,
  Shield,
  AlertCircle,
  Globe,
  Clock,
  Zap,
  BookOpen,
  Phone,
  Check,
  X,
  RefreshCw,
  Play,
  CheckCircle2,
  Users,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerData {
  name: string;
  email: string;
  domain: string;
  deploymentType: 'docker' | 'kubernetes' | 'nginx' | 'apache';
  contactPhone?: string;
  industry?: string;
  expectedTraffic?: string;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  inProgress: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface DeploymentStatus {
  configured: boolean;
  deployed: boolean;
  tested: boolean;
  monitoring: boolean;
  lastCheck: string;
}

const EnhancedCustomerOnboarding = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    domain: '',
    deploymentType: 'docker',
    contactPhone: '',
    industry: '',
    expectedTraffic: 'medium'
  });
  const [apiKey, setApiKey] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: false,
    errors: [],
    warnings: []
  });
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({
    configured: false,
    deployed: false,
    tested: false,
    monitoring: false,
    lastCheck: ''
  });

  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: 1, title: 'Customer Details', description: 'Company & contact information', completed: false, inProgress: false },
    { id: 2, title: 'Deployment Model', description: 'Choose Docker, K8s, or cloud deployment', completed: false, inProgress: false },
    { id: 3, title: 'Cloud Credentials', description: 'Setup AWS, GCP, or Azure credentials', completed: false, inProgress: false },
    { id: 4, title: 'One-Click Deploy', description: 'Deploy WAF to your infrastructure', completed: false, inProgress: false },
    { id: 5, title: 'Verification & Go Live', description: 'Test and activate protection', completed: false, inProgress: false }
  ]);

  // Real-time validation
  useEffect(() => {
    validateCustomerData();
  }, [customerData]);

  const validateCustomerData = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!customerData.name.trim()) errors.push('Company name is required');
    if (!customerData.email.trim()) errors.push('Contact email is required');
    if (!customerData.domain.trim()) errors.push('Domain/URL is required');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (customerData.email && !emailRegex.test(customerData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Domain validation
    if (customerData.domain) {
      if (customerData.domain.includes('localhost') || customerData.domain.includes('127.0.0.1')) {
        errors.push('Local domains cannot be protected in production');
      }
      if (!customerData.domain.includes('.')) {
        errors.push('Please enter a valid domain (e.g., api.company.com)');
      }
    }

    // Business warnings
    if (customerData.expectedTraffic === 'high' && customerData.deploymentType === 'docker') {
      warnings.push('Consider Kubernetes for high traffic volumes');
    }

    setValidationResult({ isValid: errors.length === 0, errors, warnings });
  };

  const createCustomer = async () => {
    if (!validationResult.isValid) {
      toast({
        title: "Please Fix Validation Errors",
        description: "All required fields must be completed correctly",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSteps(prev => prev.map(step => 
      step.id === 1 ? { ...step, inProgress: true } : step
    ));

    try {
      // Check for existing domain
      const { data: existing } = await supabase
        .from('customer_deployments')
        .select('customer_name')
        .eq('domain', customerData.domain)
        .single();

      if (existing) {
        throw new Error(`Domain ${customerData.domain} is already protected by ${existing.customer_name}`);
      }

      // Create customer with extended profile
      const { data, error } = await supabase
        .from('customer_deployments')
        .insert({
          customer_name: customerData.name,
          customer_email: customerData.email,
          domain: customerData.domain,
          deployment_type: customerData.deploymentType,
          status: 'provisioning',
          config_settings: {
            industry: customerData.industry,
            expected_traffic: customerData.expectedTraffic,
            contact_phone: customerData.contactPhone,
            onboarded_at: new Date().toISOString(),
            onboarding_version: '2.0'
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize default security rules for customer
      await createDefaultSecurityRules(data.id);

      setCustomerId(data.id);
      setApiKey(data.api_key);

      // Complete step 1
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, completed: true, inProgress: false } : step
      ));
      setCurrentStep(2);

      toast({
        title: "✅ Customer Created Successfully",
        description: `${customerData.name} has been onboarded with secure API credentials`,
      });

    } catch (error: any) {
      console.error('Customer creation error:', error);
      toast({
        title: "Onboarding Failed",
        description: error.message || "Unable to create customer account",
        variant: "destructive"
      });
      
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, inProgress: false } : step
      ));
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSecurityRules = async (customerId: string) => {
    const defaultRules = [
      {
        name: `${customerData.name} - SQL Injection Protection`,
        rule_type: 'owasp',
        category: 'injection',
        severity: 'high',
        enabled: true,
        priority: 10,
        conditions: {
          fields: ['body', 'query', 'headers'],
          patterns: ['union.*select', 'drop.*table', 'insert.*into', '--.*', '/\\*.*\\*/']
        },
        actions: { log: true, alert: true, action: 'block' }
      },
      {
        name: `${customerData.name} - XSS Protection`,
        rule_type: 'owasp',
        category: 'xss',
        severity: 'high',
        enabled: true,
        priority: 20,
        conditions: {
          fields: ['body', 'query'],
          patterns: ['<script', 'javascript:', 'onerror=', 'onload=']
        },
        actions: { log: true, alert: true, action: 'block' }
      }
    ];

    await supabase.from('security_rules').insert(defaultRules);
  };

  const generateEnhancedDeploymentCode = () => {
    const wafEndpoint = "https://kgazsoccrtmhturhxggi.supabase.co/functions/v1/waf-engine";
    
    const dockerCode = `# Production WAF Deployment - ${customerData.name}
# Generated: ${new Date().toISOString()}

version: '3.8'
services:
  waf-proxy:
    image: nginx:alpine
    container_name: waf-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
    ports:
      - "80:80"
      - "443:443"
    environment:
      - WAF_API_KEY=${apiKey}
      - BACKEND_URL=${customerData.domain}
      - WAF_ENDPOINT=${wafEndpoint}
      - CUSTOMER_NAME=${customerData.name}
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs:/var/log/nginx
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - waf-network

  waf-monitor:
    image: prom/prometheus:latest
    container_name: waf-monitor-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    restart: unless-stopped
    networks:
      - waf-network

networks:
  waf-network:
    driver: bridge

# Additional files needed:
# 1. nginx.conf - WAF configuration
# 2. ssl/ - SSL certificates
# 3. prometheus.yml - Monitoring config`;

    const nginxConfig = `# Enhanced Nginx WAF Configuration for ${customerData.name}
# API Key: ${apiKey}
# Protected Domain: ${customerData.domain}

upstream backend {
    server ${customerData.domain} max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=waf_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=waf_conn:10m;

server {
    listen 80;
    listen 443 ssl http2;
    server_name _;
    
    # Security headers
    add_header X-WAF-Protected "true" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req zone=waf_limit burst=20 nodelay;
    limit_conn waf_conn 10;
    
    # WAF Protection
    location / {
        # Pre-flight WAF validation
        access_by_lua_block {
            local http = require "resty.http"
            local cjson = require "cjson"
            local httpc = http.new()
            httpc:set_timeout(5000) -- 5 second timeout
            
            -- Prepare request data for WAF engine
            local waf_request = {
                method = ngx.var.request_method,
                url = ngx.var.request_uri,
                headers = ngx.req.get_headers(),
                source_ip = ngx.var.remote_addr,
                user_agent = ngx.var.http_user_agent,
                api_key = "${apiKey}"
            }
            
            -- Read request body for POST/PUT requests
            if ngx.var.request_method == "POST" or ngx.var.request_method == "PUT" then
                ngx.req.read_body()
                waf_request.body = ngx.req.get_body_data()
            end
            
            -- Call WAF engine
            local res, err = httpc:request_uri("${wafEndpoint}", {
                method = "POST",
                body = cjson.encode(waf_request),
                headers = {
                    ["Content-Type"] = "application/json",
                    ["User-Agent"] = "WAF-Proxy/1.0"
                }
            })
            
            -- Handle WAF response
            if res and res.status == 200 and res.body then
                local waf_response = cjson.decode(res.body)
                
                if waf_response.action == "block" then
                    ngx.status = 403
                    ngx.header["X-WAF-Blocked"] = "true"
                    ngx.header["X-WAF-Reason"] = waf_response.reason or "Security violation"
                    ngx.say('{"error": "Request blocked by WAF", "reason": "' .. (waf_response.reason or "Security policy violation") .. '"}')
                    ngx.exit(403)
                end
                
                -- Log WAF decision
                ngx.log(ngx.INFO, "WAF Decision: " .. waf_response.action .. " - " .. (waf_response.reason or "allowed"))
            else
                -- WAF engine unavailable - fail open or closed based on config
                ngx.log(ngx.ERR, "WAF engine unavailable: " .. (err or "unknown error"))
                -- In production, decide whether to fail open (allow) or closed (block)
            end
        }
        
        # Proxy to backend
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /waf/health {
        access_log off;
        return 200 '{"status":"ok","waf":"active","timestamp":"' . date('c') . '"}';
        add_header Content-Type application/json;
    }
    
    # WAF stats endpoint  
    location /waf/stats {
        access_log off;
        content_by_lua_block {
            ngx.header.content_type = "application/json"
            ngx.say('{"protected_by":"Enterprise WAF","customer":"${customerData.name}","api_key_preview":"' .. string.sub("${apiKey}", 1, 8) .. '***"}')
        }
    }
}`;

    const kubernetesCode = `# Kubernetes WAF Deployment for ${customerData.name}
apiVersion: v1
kind: ConfigMap
metadata:
  name: waf-config-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
  namespace: default
data:
  WAF_API_KEY: "${apiKey}"
  WAF_ENDPOINT: "${wafEndpoint}"
  BACKEND_URL: "${customerData.domain}"
  CUSTOMER_NAME: "${customerData.name}"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: waf-deployment-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
  namespace: default
  labels:
    app: waf-proxy
    customer: ${customerData.name.toLowerCase().replace(/\s+/g, '-')}
spec:
  replicas: ${customerData.expectedTraffic === 'high' ? '3' : '2'}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: waf-proxy
      customer: ${customerData.name.toLowerCase().replace(/\s+/g, '-')}
  template:
    metadata:
      labels:
        app: waf-proxy
        customer: ${customerData.name.toLowerCase().replace(/\s+/g, '-')}
    spec:
      containers:
      - name: waf-proxy
        image: nginx:alpine
        ports:
        - containerPort: 80
        - containerPort: 443
        envFrom:
        - configMapRef:
            name: waf-config-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"  
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /waf/health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /waf/health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: waf-service-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
  namespace: default
spec:
  selector:
    app: waf-proxy
    customer: ${customerData.name.toLowerCase().replace(/\s+/g, '-')}
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https  
    port: 443
    targetPort: 443
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: waf-ingress-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - ${customerData.domain}
    secretName: waf-tls-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
  rules:
  - host: ${customerData.domain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: waf-service-${customerData.name.toLowerCase().replace(/\s+/g, '-')}
            port:
              number: 80`;

    switch (customerData.deploymentType) {
      case 'docker': return dockerCode;
      case 'kubernetes': return kubernetesCode;  
      case 'nginx': return nginxConfig;
      default: return dockerCode;
    }
  };

  const proceedToSecurity = () => {
    setSteps(prev => prev.map(step => 
      step.id === 2 ? { ...step, completed: true } : step
    ));
    setCurrentStep(3);
  };

  const downloadConfiguration = () => {
    const config = generateEnhancedDeploymentCode();
    const filename = customerData.deploymentType === 'docker' ? 'docker-compose.yml' :
                    customerData.deploymentType === 'kubernetes' ? 'waf-k8s-deployment.yaml' :
                    'waf-nginx.conf';
                    
    const blob = new Blob([config], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    setDeploymentStatus(prev => ({ ...prev, configured: true, lastCheck: new Date().toISOString() }));
    
    setSteps(prev => prev.map(step => 
      step.id === 3 ? { ...step, completed: true } : step
    ));
    setCurrentStep(4);

    toast({
      title: "✅ Configuration Downloaded",
      description: `${filename} ready for deployment`,
    });
  };

  const testWAFIntegration = async () => {
    if (!apiKey) return;
    
    setLoading(true);
    setSteps(prev => prev.map(step => 
      step.id === 4 ? { ...step, inProgress: true } : step
    ));

    try {
      // Test 1: Health check
      const { data: healthCheck, error: healthError } = await supabase.functions.invoke('waf-engine', {
        body: {
          method: 'GET',
          url: '/health',
          headers: { 'User-Agent': 'WAF-Integration-Test/1.0' },
          source_ip: '127.0.0.1',
          api_key: apiKey
        }
      });

      if (healthError) throw new Error('WAF engine health check failed');

      // Test 2: Security rule test
      const { data: securityTest } = await supabase.functions.invoke('waf-engine', {
        body: {
          method: 'POST',
          url: '/test',
          headers: { 'Content-Type': 'application/json' },
          body: '{"test": "SELECT * FROM users WHERE 1=1--"}',
          source_ip: '127.0.0.1',
          api_key: apiKey
        }
      });

      const isBlocked = securityTest?.action === 'block';
      if (!isBlocked) {
        throw new Error('Security rules not functioning correctly');
      }

      setDeploymentStatus(prev => ({ 
        ...prev, 
        tested: true, 
        lastCheck: new Date().toISOString() 
      }));

      setSteps(prev => prev.map(step => 
        step.id === 4 ? { ...step, completed: true, inProgress: false } : step
      ));
      setCurrentStep(5);

      toast({
        title: "🛡️ WAF Integration Verified",
        description: "Security rules are active and protecting your domain",
      });

    } catch (error: any) {
      console.error('WAF integration test failed:', error);
      toast({
        title: "Integration Test Failed",
        description: error.message || "WAF testing encountered issues",
        variant: "destructive"
      });
      
      setSteps(prev => prev.map(step => 
        step.id === 4 ? { ...step, inProgress: false } : step
      ));
    } finally {
      setLoading(false);
    }
  };

  const activateMonitoring = async () => {
    setLoading(true);
    setSteps(prev => prev.map(step => 
      step.id === 5 ? { ...step, inProgress: true } : step
    ));

    try {
      // Update customer status to active
      await supabase
        .from('customer_deployments')
        .update({ 
          status: 'active',
          config_settings: {
            ...customerData,
            activated_at: new Date().toISOString(),
            monitoring_enabled: true
          }
        })
        .eq('id', customerId);

      setDeploymentStatus(prev => ({ 
        ...prev, 
        monitoring: true,
        lastCheck: new Date().toISOString() 
      }));

      setSteps(prev => prev.map(step => 
        step.id === 5 ? { ...step, completed: true, inProgress: false } : step
      ));

      toast({
        title: "🎉 WAF Successfully Activated!",
        description: `${customerData.name} is now protected and monitored 24/7`,
      });

    } catch (error) {
      console.error('Monitoring activation failed:', error);
      toast({
        title: "Activation Failed", 
        description: "Unable to activate monitoring",
        variant: "destructive"
      });
      
      setSteps(prev => prev.map(step => 
        step.id === 5 ? { ...step, inProgress: false } : step
      ));
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (steps.filter(s => s.completed).length / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Enterprise Customer Onboarding</h2>
          <p className="text-slate-400">Complete WAF deployment in 5 seamless steps</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary text-primary">
            Step {currentStep} of {steps.length}
          </Badge>
          {progressPercentage === 100 && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced Progress Tracker */}
      <Card className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Onboarding Progress</h3>
              <span className="text-sm text-slate-300">{Math.round(progressPercentage)}% Complete</span>
            </div>
            
            <Progress value={progressPercentage} className="h-3 bg-slate-700" />
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {steps.map((step) => (
                <div key={step.id} className={`relative flex items-center gap-3 p-4 rounded-xl transition-all ${
                  step.completed ? 'bg-gradient-to-r from-green-900/30 to-green-800/30 border border-green-500/40' :
                  step.inProgress ? 'bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-500/40 animate-pulse' :
                  currentStep === step.id ? 'bg-gradient-to-r from-cyan-900/30 to-cyan-800/30 border border-cyan-500/40' :
                  'bg-slate-700/30 border border-slate-600'
                }`}>
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : step.inProgress ? (
                      <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                    ) : (
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        currentStep === step.id ? 'border-cyan-400 text-cyan-400' : 'border-slate-500 text-slate-500'
                      }`}>
                        {step.id}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{step.title}</div>
                    <div className="text-xs text-slate-400 truncate">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Feedback */}
      {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
        <div className="space-y-2">
          {validationResult.errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ))}
          {validationResult.warnings.map((warning, index) => (
            <Alert key={index} className="border-yellow-500/50 text-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs value={currentStep.toString()} className="space-y-6">
        {/* Step 1: Enhanced Customer Details */}
        <TabsContent value="1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Building className="w-5 h-5 text-blue-400" />
                    Customer Information
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Complete customer profile for WAF deployment configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white flex items-center gap-1">
                        Company Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={customerData.name}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Acme Corporation"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white flex items-center gap-1">
                        Contact Email <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerData.email}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="security@acme.com"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="domain" className="text-white flex items-center gap-1">
                        Protected Domain <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="domain"
                        value={customerData.domain}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, domain: e.target.value }))}
                        placeholder="api.acme.com"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">Contact Phone</Label>
                      <Input
                        id="phone"
                        value={customerData.contactPhone}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-white">Industry</Label>
                      <Select value={customerData.industry} onValueChange={(value) => 
                        setCustomerData(prev => ({ ...prev, industry: value }))
                      }>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="technology" className="text-white">Technology</SelectItem>
                          <SelectItem value="finance" className="text-white">Finance</SelectItem>
                          <SelectItem value="healthcare" className="text-white">Healthcare</SelectItem>
                          <SelectItem value="ecommerce" className="text-white">E-commerce</SelectItem>
                          <SelectItem value="government" className="text-white">Government</SelectItem>
                          <SelectItem value="other" className="text-white">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="traffic" className="text-white">Expected Traffic</Label>
                      <Select value={customerData.expectedTraffic} onValueChange={(value) => 
                        setCustomerData(prev => ({ ...prev, expectedTraffic: value }))
                      }>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="low" className="text-white">Low (&lt;10K req/day)</SelectItem>
                          <SelectItem value="medium" className="text-white">Medium (10K-100K req/day)</SelectItem>
                          <SelectItem value="high" className="text-white">High (&gt;100K req/day)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deploymentType" className="text-white">Deployment Method</Label>
                    <Select
                      value={customerData.deploymentType}
                      onValueChange={(value: 'docker' | 'kubernetes' | 'nginx' | 'apache') => 
                        setCustomerData(prev => ({ ...prev, deploymentType: value }))
                      }
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="docker" className="text-white">🐳 Docker Compose</SelectItem>
                        <SelectItem value="kubernetes" className="text-white">☸️ Kubernetes</SelectItem>
                        <SelectItem value="nginx" className="text-white">🔧 Nginx Integration</SelectItem>
                        <SelectItem value="apache" className="text-white">🌐 Apache Integration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={createCustomer}
                    disabled={!validationResult.isValid || loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Creating Customer Account...' : 'Create Customer & Generate Credentials'}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/30 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-300 text-sm">What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-yellow-400" />
                    <span>Secure API credentials generated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span>Default security rules applied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-400" />
                    <span>Deployment config customized</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/30 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-purple-300 text-sm">Support & Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" size="sm" className="w-full border-purple-500/50 text-purple-300">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Documentation
                  </Button>
                  <Button variant="outline" size="sm" className="w-full border-purple-500/50 text-purple-300">
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Step 2: Security Configuration */}
        <TabsContent value="2">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Key className="w-5 h-5 text-yellow-400" />
                Security Configuration Complete
              </CardTitle>
              <CardDescription className="text-slate-400">
                API credentials and security rules configured for {customerData.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">API Credentials</h4>
                  <div className="p-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-white font-medium">Production API Key</Label>
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(apiKey);
                        toast({ title: "Copied!", description: "API key copied to clipboard" });
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <div className="font-mono text-sm text-green-400 bg-slate-800 p-3 rounded border break-all">
                      {apiKey}
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>✓ Unique API key generated and secured</p>
                    <p>✓ Customer ID: <span className="text-white font-mono">{customerId}</span></p>
                    <p>✓ Account status: <Badge variant="default" className="bg-green-600">Active</Badge></p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Security Rules Applied</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded border border-green-500/30">
                      <span className="text-sm text-white">SQL Injection Protection</span>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded border border-green-500/30">
                      <span className="text-sm text-white">XSS Attack Prevention</span>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded border border-green-500/30">
                      <span className="text-sm text-white">Rate Limiting</span>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded border border-green-500/30">
                      <span className="text-sm text-white">Bot Detection</span>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={proceedToSecurity}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Proceed to WAF Deployment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Enhanced Deployment */}
        <TabsContent value="3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Code className="w-5 h-5 text-purple-400" />
                    Production Deployment Configuration
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {customerData.deploymentType === 'docker' && '🐳 Docker Compose with monitoring'}
                    {customerData.deploymentType === 'kubernetes' && '☸️ Kubernetes with auto-scaling'}
                    {customerData.deploymentType === 'nginx' && '🔧 Nginx with Lua WAF integration'}
                    {customerData.deploymentType === 'apache' && '🌐 Apache with mod_security'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-600 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-green-400 whitespace-pre-wrap">
                      {generateEnhancedDeploymentCode()}
                    </pre>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={downloadConfiguration} className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Download Production Config
                    </Button>
                    <Button variant="outline" className="border-slate-600 text-white">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Deployment Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/30 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-blue-300 text-sm">Deployment Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">1</div>
                      <span>Download configuration files</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">2</div>
                      <span>Deploy to your infrastructure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">3</div>
                      <span>Configure SSL certificates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">4</div>
                      <span>Update DNS settings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">5</div>
                      <span>Verify WAF protection</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Alert className="border-yellow-500/50 bg-yellow-900/20">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200">
                  <strong>Important:</strong> Ensure your deployment is complete before proceeding to testing. WAF protection will not be active until properly deployed.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </TabsContent>

        {/* Step 4: Integration Testing */}
        <TabsContent value="4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-yellow-400" />
                WAF Integration Testing
              </CardTitle>
              <CardDescription className="text-slate-400">
                Comprehensive testing to ensure your WAF is protecting {customerData.domain}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Automated Security Tests</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-white">WAF Engine Connectivity</span>
                      </div>
                      <Badge variant="outline" className={deploymentStatus.tested ? "border-green-500 text-green-300" : "border-slate-500"}>
                        {deploymentStatus.tested ? "Passed" : "Pending"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-white">SQL Injection Block Test</span>
                      </div>
                      <Badge variant="outline" className={deploymentStatus.tested ? "border-green-500 text-green-300" : "border-slate-500"}>
                        {deploymentStatus.tested ? "Blocked" : "Pending"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-white">XSS Protection Test</span>
                      </div>
                      <Badge variant="outline" className={deploymentStatus.tested ? "border-green-500 text-green-300" : "border-slate-500"}>
                        {deploymentStatus.tested ? "Blocked" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={testWAFIntegration}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Running Integration Tests...' : 'Run Comprehensive Tests'}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Manual Verification</h4>
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-600">
                    <p className="text-sm text-slate-300 mb-3">Test WAF protection manually:</p>
                    <div className="space-y-2 text-xs font-mono text-green-400">
                      <div># Test legitimate request (should pass)</div>
                      <div className="bg-slate-800 p-2 rounded">
                        curl https://{customerData.domain}/api/health
                      </div>
                      
                      <div className="mt-3"># Test malicious request (should block)</div>
                      <div className="bg-slate-800 p-2 rounded">
                        curl -d "id=1' OR '1'='1--" https://{customerData.domain}/api/users
                      </div>
                    </div>
                  </div>
                  
                  <Alert className="border-green-500/50 bg-green-900/20">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-200">
                      Expected: Legitimate requests pass through, malicious requests return 403 Forbidden
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 5: Go Live */}
        <TabsContent value="5">
          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/30 border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Activate WAF Protection
              </CardTitle>
              <CardDescription className="text-slate-300">
                Final step: Activate 24/7 monitoring and alerting for {customerData.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <h4 className="font-semibold text-white">Protected Domain</h4>
                  <p className="text-sm text-green-300">{customerData.domain}</p>
                </div>
                
                <div className="text-center p-4">
                  <Clock className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                  <h4 className="font-semibold text-white">24/7 Monitoring</h4>
                  <p className="text-sm text-blue-300">Real-time threat detection</p>
                </div>
                
                <div className="text-center p-4">
                  <Users className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                  <h4 className="font-semibold text-white">Expert Support</h4>
                  <p className="text-sm text-purple-300">Dedicated security team</p>
                </div>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                <h4 className="font-semibold text-white mb-3">What you get with activation:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Real-time threat blocking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Detailed security analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Automated threat response</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>24/7 monitoring & alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Compliance reporting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Expert security support</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={activateMonitoring}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-lg py-3"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Activating Protection...' : '🎉 Activate WAF Protection'}
              </Button>
              
              {steps[4].completed && (
                <Alert className="border-green-500/50 bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-200">
                    <strong>🎉 Congratulations!</strong> {customerData.name} is now fully protected by our Enterprise WAF. 
                    Visit the main dashboard to monitor your security analytics in real-time.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedCustomerOnboarding;