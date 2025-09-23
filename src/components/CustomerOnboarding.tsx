import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Building, 
  Key, 
  Code, 
  CheckCircle, 
  Copy,
  Download,
  ExternalLink,
  Settings,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerData {
  name: string;
  email: string;
  domain: string;
  deploymentType: 'docker' | 'kubernetes' | 'nginx' | 'apache';
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const CustomerOnboarding = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    domain: '',
    deploymentType: 'docker'
  });
  const [apiKey, setApiKey] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);

  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: 1, title: 'Customer Information', description: 'Basic company details', completed: false },
    { id: 2, title: 'API Key Generation', description: 'Generate secure API credentials', completed: false },
    { id: 3, title: 'Deployment Configuration', description: 'Configure WAF deployment', completed: false },
    { id: 4, title: 'Testing & Verification', description: 'Test WAF integration', completed: false }
  ]);

  const createCustomer = async () => {
    if (!customerData.name || !customerData.email || !customerData.domain) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .insert({
          customer_name: customerData.name,
          customer_email: customerData.email,
          domain: customerData.domain,
          deployment_type: customerData.deploymentType,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setCustomerId(data.id);
      setApiKey(data.api_key);
      
      // Mark step 1 as completed
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, completed: true } : step
      ));
      setCurrentStep(2);

      toast({
        title: "Customer Created",
        description: `Successfully onboarded ${customerData.name}`,
      });

    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: "Failed to create customer deployment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "Copied",
      description: "API key copied to clipboard"
    });
  };

  const generateDeploymentCode = () => {
    const dockerCode = `# Docker Compose Configuration
version: '3.8'
services:
  waf-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    environment:
      - WAF_API_KEY=${apiKey}
      - BACKEND_URL=${customerData.domain}
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    restart: unless-stopped`;

    const kubernetesCode = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: waf-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: waf-proxy
  template:
    metadata:
      labels:
        app: waf-proxy
    spec:
      containers:
      - name: waf-proxy
        image: nginx:alpine
        env:
        - name: WAF_API_KEY
          value: "${apiKey}"
        - name: BACKEND_URL
          value: "${customerData.domain}"
        ports:
        - containerPort: 80`;

    const nginxCode = `# Add to your nginx.conf
upstream backend {
    server ${customerData.domain};
}

server {
    listen 80;
    server_name _;
    
    location / {
        # WAF validation
        access_by_lua_block {
            local http = require "resty.http"
            local httpc = http.new()
            
            local res, err = httpc:request_uri("https://kgazsoccrtmhturhxggi.supabase.co/functions/v1/waf-engine", {
                method = "POST",
                body = ngx.var.request_body,
                headers = {
                    ["Authorization"] = "Bearer ${apiKey}",
                    ["Content-Type"] = "application/json"
                }
            })
            
            if res and res.body then
                local response = cjson.decode(res.body)
                if response.action == "block" then
                    ngx.status = 403
                    ngx.say("Request blocked by WAF")
                    ngx.exit(403)
                end
            end
        }
        
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`;

    switch (customerData.deploymentType) {
      case 'docker': return dockerCode;
      case 'kubernetes': return kubernetesCode;
      case 'nginx': return nginxCode;
      default: return dockerCode;
    }
  };

  const downloadConfig = () => {
    const code = generateDeploymentCode();
    const filename = customerData.deploymentType === 'docker' ? 'docker-compose.yml' :
                    customerData.deploymentType === 'kubernetes' ? 'waf-deployment.yaml' :
                    'nginx.conf';
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Mark step 3 as completed
    setSteps(prev => prev.map(step => 
      step.id === 3 ? { ...step, completed: true } : step
    ));
    setCurrentStep(4);

    toast({
      title: "Configuration Downloaded",
      description: `Downloaded ${filename} successfully`
    });
  };

  const testWAFConnection = async () => {
    if (!apiKey) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('waf-engine', {
        body: {
          method: 'GET',
          url: '/health-check',
          headers: {
            'User-Agent': 'WAF-Test-Client/1.0'
          },
          body: '',
          customer_key: apiKey
        }
      });

      if (error) throw error;

      // Mark step 4 as completed
      setSteps(prev => prev.map(step => 
        step.id === 4 ? { ...step, completed: true } : step
      ));

      toast({
        title: "Connection Test Successful",
        description: "WAF is properly configured and responding"
      });

    } catch (error) {
      console.error('WAF test error:', error);
      toast({
        title: "Connection Test Failed",
        description: "Please check your configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (steps.filter(s => s.completed).length / steps.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Customer Onboarding</h2>
          <p className="text-slate-400">Seamlessly onboard new customers to the WAF platform</p>
        </div>
        <Badge variant="outline" className="border-primary text-primary">
          Step {currentStep} of {steps.length}
        </Badge>
      </div>

      {/* Progress Bar */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Onboarding Progress</h3>
              <span className="text-sm text-slate-400">{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {steps.map((step) => (
                <div key={step.id} className={`flex items-center gap-2 p-3 rounded-lg ${
                  step.completed ? 'bg-green-900/20 border border-green-500/30' :
                  currentStep === step.id ? 'bg-blue-900/20 border border-blue-500/30' :
                  'bg-slate-700/50 border border-slate-600'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      currentStep === step.id ? 'border-blue-400' : 'border-slate-500'
                    }`} />
                  )}
                  <div>
                    <div className="text-sm font-medium text-white">{step.title}</div>
                    <div className="text-xs text-slate-400">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={currentStep.toString()} className="space-y-6">
        {/* Step 1: Customer Information */}
        <TabsContent value="1">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Building className="w-5 h-5 text-blue-400" />
                Customer Information
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enter the basic information for the new customer deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-white">Company Name *</Label>
                  <Input
                    id="customerName"
                    value={customerData.name}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Acme Corporation"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail" className="text-white">Contact Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="security@acme.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerDomain" className="text-white">Domain/URL *</Label>
                  <Input
                    id="customerDomain"
                    value={customerData.domain}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="api.acme.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deploymentType" className="text-white">Deployment Type</Label>
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
                      <SelectItem value="docker" className="text-white">Docker Compose</SelectItem>
                      <SelectItem value="kubernetes" className="text-white">Kubernetes</SelectItem>
                      <SelectItem value="nginx" className="text-white">Nginx</SelectItem>
                      <SelectItem value="apache" className="text-white">Apache</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={createCustomer} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Creating Customer...' : 'Create Customer & Generate API Key'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: API Key */}
        <TabsContent value="2">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Key className="w-5 h-5 text-yellow-400" />
                API Key Generated
              </CardTitle>
              <CardDescription className="text-slate-400">
                Secure API key for customer: {customerData.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white font-medium">Customer API Key</Label>
                  <Button variant="outline" size="sm" onClick={copyApiKey}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="font-mono text-sm text-green-400 bg-slate-800 p-2 rounded border break-all">
                  {apiKey}
                </div>
              </div>
              <div className="text-sm text-slate-400">
                <p>• This API key is unique to this customer</p>
                <p>• Keep this key secure - it cannot be recovered if lost</p>
                <p>• Use this key to authenticate WAF requests</p>
                <p>• Customer ID: <span className="text-white font-mono">{customerId}</span></p>
              </div>
              <Button 
                onClick={() => {
                  setSteps(prev => prev.map(step => 
                    step.id === 2 ? { ...step, completed: true } : step
                  ));
                  setCurrentStep(3);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Continue to Deployment Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Deployment Configuration */}
        <TabsContent value="3">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Code className="w-5 h-5 text-purple-400" />
                Deployment Configuration
              </CardTitle>
              <CardDescription className="text-slate-400">
                {customerData.deploymentType.charAt(0).toUpperCase() + customerData.deploymentType.slice(1)} configuration for {customerData.domain}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-600">
                <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
                  {generateDeploymentCode()}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadConfig} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download Configuration
                </Button>
                <Button variant="outline" className="border-slate-600 text-white">
                  <ExternalLink className="w-4 w-4 mr-2" />
                  View Docs
                </Button>
              </div>
              <div className="text-sm text-slate-400">
                <p>• Download the configuration file for your deployment type</p>
                <p>• Replace any placeholder values with your actual settings</p>
                <p>• Deploy using your preferred method</p>
                <p>• The WAF will start protecting your application immediately</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Testing */}
        <TabsContent value="4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-green-400" />
                Testing & Verification
              </CardTitle>
              <CardDescription className="text-slate-400">
                Verify that the WAF is properly configured and protecting {customerData.domain}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <h4 className="font-medium text-white mb-2">Connection Test</h4>
                  <p className="text-sm text-slate-400 mb-3">Test if WAF engine can communicate with your deployment</p>
                  <Button 
                    onClick={testWAFConnection} 
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? 'Testing...' : 'Test WAF Connection'}
                  </Button>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <h4 className="font-medium text-white mb-2">Manual Verification</h4>
                  <p className="text-sm text-slate-400 mb-3">Send a test request to verify blocking</p>
                  <div className="text-xs text-slate-500 font-mono bg-slate-800 p-2 rounded">
                    curl -H "User-Agent: malicious-bot" {customerData.domain}
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-400">
                <p>• Once testing is complete, the customer will be fully onboarded</p>
                <p>• Monitor their traffic in the main dashboard</p>
                <p>• Customer can access their analytics and configuration</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerOnboarding;