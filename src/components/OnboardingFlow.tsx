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
  Shield,
  Cloud,
  CheckCircle,
  ArrowRight,
  Play,
  Settings,
  Globe,
  Lock,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CloudCredentialManager from './CloudCredentialManager';

interface CustomerData {
  name: string;
  email: string;
  domain: string;
  deploymentModel: 'docker' | 'kubernetes' | 'aws-fargate' | 'gcp-run' | 'azure-container';
  cloudProvider: 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'local';
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

const OnboardingFlow = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    domain: '',
    deploymentModel: 'docker',
    cloudProvider: 'aws',
    contactPhone: '',
    industry: '',
    expectedTraffic: 'medium'
  });
  const [apiKey, setApiKey] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [deploymentId, setDeploymentId] = useState('');

  const [steps, setSteps] = useState<OnboardingStep[]>([
    { id: 1, title: 'Customer Details', description: 'Company & contact information', completed: false, inProgress: false },
    { id: 2, title: 'Deployment Model', description: 'Choose your deployment target', completed: false, inProgress: false },
    { id: 3, title: 'Cloud Credentials', description: 'Setup cloud provider access', completed: false, inProgress: false },
    { id: 4, title: 'One-Click Deploy', description: 'Deploy WAF infrastructure', completed: false, inProgress: false },
    { id: 5, title: 'Go Live', description: 'Verify and activate protection', completed: false, inProgress: false }
  ]);

  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;

  // Step 1: Create Customer
  const createCustomer = async () => {
    if (!customerData.name || !customerData.email || !customerData.domain) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSteps(prev => prev.map(step => 
      step.id === 1 ? { ...step, inProgress: true } : step
    ));

    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .insert({
          customer_name: customerData.name,
          customer_email: customerData.email,
          domain: customerData.domain,
          deployment_type: customerData.deploymentModel,
          status: 'provisioning',
          config_settings: {
            industry: customerData.industry,
            expected_traffic: customerData.expectedTraffic,
            contact_phone: customerData.contactPhone,
            cloud_provider: customerData.cloudProvider,
            onboarded_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      setCustomerId(data.id);
      setApiKey(data.api_key);
      
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, completed: true, inProgress: false } : step
      ));
      setCurrentStep(2);

      toast({
        title: "Customer Created",
        description: `Welcome ${customerData.name}! Let's setup your WAF deployment.`
      });

    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive"
      });
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, inProgress: false } : step
      ));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Select Deployment Model
  const selectDeploymentModel = () => {
    setSteps(prev => prev.map(step => 
      step.id === 2 ? { ...step, completed: true } : step
    ));
    setCurrentStep(3);
    
    toast({
      title: "Deployment Model Selected",
      description: `You've chosen ${customerData.deploymentModel} on ${customerData.cloudProvider}`
    });
  };

  // Step 3: Cloud Credentials (handled by CloudCredentialManager)
  const onCredentialsConfigured = () => {
    setCredentialsConfigured(true);
    setSteps(prev => prev.map(step => 
      step.id === 3 ? { ...step, completed: true } : step
    ));
    setCurrentStep(4);
    
    toast({
      title: "Credentials Configured",
      description: "Cloud credentials are ready for deployment"
    });
  };

  // Step 4: One-Click Deploy
  const deployInfrastructure = async () => {
    if (!customerId || !credentialsConfigured) {
      toast({
        title: "Prerequisites Missing",
        description: "Customer and credentials must be setup first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSteps(prev => prev.map(step => 
      step.id === 4 ? { ...step, inProgress: true } : step
    ));

    try {
      const { data, error } = await supabase.functions.invoke('cloud-deployer', {
        body: {
          action: 'deploy',
          customer_id: customerId,
          deployment_model: customerData.deploymentModel,
          cloud_provider: customerData.cloudProvider,
          domain: customerData.domain,
          expected_traffic: customerData.expectedTraffic
        }
      });

      if (error) throw error;

      setDeploymentId(data.deployment_id);
      
      setSteps(prev => prev.map(step => 
        step.id === 4 ? { ...step, completed: true, inProgress: false } : step
      ));
      setCurrentStep(5);

      toast({
        title: "Deployment Successful",
        description: `WAF infrastructure deployed! Public URL: ${data.public_url}`
      });

    } catch (error: any) {
      toast({
        title: "Deployment Failed", 
        description: error.message,
        variant: "destructive"
      });
      setSteps(prev => prev.map(step => 
        step.id === 4 ? { ...step, inProgress: false } : step
      ));
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Go Live (verification and activation)
  const goLive = async () => {
    setLoading(true);
    setSteps(prev => prev.map(step => 
      step.id === 5 ? { ...step, inProgress: true } : step
    ));

    try {
      // Test WAF functionality
      const { error } = await supabase.functions.invoke('waf-engine', {
        body: {
          source_ip: '192.168.1.100',
          request_method: 'GET',
          request_path: '/health',
          api_key: apiKey,
          test_mode: true
        }
      });

      if (error) throw error;

      // Update customer status to active
      await supabase
        .from('customer_deployments')
        .update({ status: 'active' })
        .eq('id', customerId);

      setSteps(prev => prev.map(step => 
        step.id === 5 ? { ...step, completed: true, inProgress: false } : step
      ));

      toast({
        title: "🎉 WAF is Now Live!",
        description: "Your domain is now protected by enterprise-grade security"
      });

    } catch (error: any) {
      toast({
        title: "Activation Failed",
        description: error.message,
        variant: "destructive"
      });
      setSteps(prev => prev.map(step => 
        step.id === 5 ? { ...step, inProgress: false } : step
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            WAF Onboarding & Deployment
          </CardTitle>
          <CardDescription>
            Get your Web Application Firewall deployed in 5 simple steps
          </CardDescription>
          <Progress value={progress} className="mt-4" />
          <div className="flex gap-2 mt-2">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-sm">
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : step.inProgress ? (
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                )}
                <span className={step.completed ? 'text-green-600' : 'text-gray-600'}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Step 1: Customer Details
            </CardTitle>
            <CardDescription>
              Tell us about your company and the domain you want to protect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label htmlFor="email">Contact Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@acme.com"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="domain">Domain to Protect *</Label>
              <Input
                id="domain"
                value={customerData.domain}
                onChange={(e) => setCustomerData(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="api.acme.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={customerData.industry} onValueChange={(value) => setCustomerData(prev => ({ ...prev, industry: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fintech">Financial Services</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="traffic">Expected Traffic</Label>
                <Select value={customerData.expectedTraffic} onValueChange={(value) => setCustomerData(prev => ({ ...prev, expectedTraffic: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (&lt;1K req/min)</SelectItem>
                    <SelectItem value="medium">Medium (1K-10K req/min)</SelectItem>
                    <SelectItem value="high">High (&gt;10K req/min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={createCustomer} disabled={loading} className="w-full">
              {loading ? "Creating Customer..." : "Continue to Deployment Model"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Step 2: Choose Deployment Model
            </CardTitle>
            <CardDescription>
              Select how you want to deploy your WAF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deployment Model</Label>
                <Select value={customerData.deploymentModel} onValueChange={(value: any) => setCustomerData(prev => ({ ...prev, deploymentModel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docker">Docker Compose</SelectItem>
                    <SelectItem value="kubernetes">Kubernetes</SelectItem>
                    <SelectItem value="aws-fargate">AWS Fargate</SelectItem>
                    <SelectItem value="gcp-run">Google Cloud Run</SelectItem>
                    <SelectItem value="azure-container">Azure Container Instances</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cloud Provider</Label>
                <Select value={customerData.cloudProvider} onValueChange={(value: any) => setCustomerData(prev => ({ ...prev, cloudProvider: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aws">Amazon Web Services</SelectItem>
                    <SelectItem value="gcp">Google Cloud Platform</SelectItem>
                    <SelectItem value="azure">Microsoft Azure</SelectItem>
                    <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                    <SelectItem value="local">Local/On-Premise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommended:</strong> {customerData.expectedTraffic === 'high' ? 'Kubernetes for high availability' : 'Docker Compose for simplicity'}
              </AlertDescription>
            </Alert>

            <Button onClick={selectDeploymentModel} className="w-full">
              Continue to Cloud Credentials
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Step 3: Cloud Credentials
            </CardTitle>
            <CardDescription>
              Configure your {customerData.cloudProvider.toUpperCase()} credentials for deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CloudCredentialManager />
            
            {credentialsConfigured && (
              <Button onClick={() => setCurrentStep(4)} className="w-full mt-4">
                Continue to Deployment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Step 4: One-Click Deploy
            </CardTitle>
            <CardDescription>
              Deploy your WAF infrastructure to {customerData.cloudProvider.toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                <strong>Deployment Target:</strong> {customerData.deploymentModel} on {customerData.cloudProvider.toUpperCase()}<br/>
                <strong>Protected Domain:</strong> {customerData.domain}<br/>
                <strong>API Key:</strong> {apiKey.substring(0, 8)}...
              </AlertDescription>
            </Alert>

            <Button onClick={deployInfrastructure} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deploying Infrastructure...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Deploy WAF Infrastructure
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Step 5: Go Live
            </CardTitle>
            <CardDescription>
              Final verification and activation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <strong>Deployment Complete!</strong><br/>
                Your WAF is deployed and ready for final testing.
              </AlertDescription>
            </Alert>

            <Button onClick={goLive} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Activating Protection...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Activate WAF Protection
                </>
              )}
            </Button>

            {steps[4].completed && (
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800">
                  🎉 Congratulations!
                </h3>
                <p className="text-green-600">
                  {customerData.domain} is now protected by enterprise-grade WAF security
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OnboardingFlow;