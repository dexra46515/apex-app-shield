import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Cloud, 
  Server, 
  Globe, 
  Shield,
  Download,
  Copy,
  CheckCircle,
  AlertTriangle,
  Code,
  Monitor,
  Network,
  Database,
  Lock,
  Zap,
  Settings,
  Play,
  Terminal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CloudCredentialManager from './CloudCredentialManager';

interface DeploymentModel {
  id: string;
  name: string;
  description: string;
  icon: any;
  complexity: 'Simple' | 'Moderate' | 'Advanced';
  useCase: string;
  features: string[];
}

interface DeploymentConfig {
  model: string;
  customerId: string;
  domain: string;
  apiKey: string;
  config: any;
}

const DeploymentModels = () => {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [cloudCredentials, setCloudCredentials] = useState<any[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<string>('');
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<string>('');
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    model: '',
    customerId: '',
    domain: '',
    apiKey: '',
    config: {}
  });
  const [generatedArtifacts, setGeneratedArtifacts] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showCredentialManager, setShowCredentialManager] = useState(false);

  const deploymentModels: DeploymentModel[] = [
    {
      id: 'reverse-proxy',
      name: 'Reverse Proxy Gateway Mode',
      description: 'Deploy as Envoy/Nginx gateway with inline WAF protection',
      icon: Network,
      complexity: 'Simple',
      useCase: 'Web applications, API gateways, load balancers',
      features: [
        'High-performance inline protection',
        'Load balancing integration',
        'SSL termination',
        'Real-time threat blocking',
        'Zero application changes'
      ]
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes Ingress/Sidecar Mode',
      description: 'Cloud-native deployment for microservices architecture',
      icon: Cloud,
      complexity: 'Moderate',
      useCase: 'Microservices, containerized applications, cloud-native',
      features: [
        'Service mesh integration',
        'Automatic scaling',
        'Per-service protection',
        'Istio/Linkerd compatible',
        'DevOps workflow integration'
      ]
    },
    {
      id: 'on-premise',
      name: 'On-Prem Appliance Mode',
      description: 'Dedicated VM or bare-metal deployment for enterprise control',
      icon: Server,
      complexity: 'Advanced',
      useCase: 'Enterprise data centers, compliance requirements, air-gapped environments',
      features: [
        'Complete data sovereignty',
        'Hardware acceleration',
        'Custom compliance rules',
        'Offline operation capability',
        'Enterprise integration'
      ]
    },
    {
      id: 'hybrid-cloud',
      name: 'Hybrid Cloud Mode',
      description: 'Bridge on-premises infrastructure with cloud-based AI and threat intelligence',
      icon: Globe,
      complexity: 'Advanced',
      useCase: 'Multi-cloud environments, gradual cloud migration, hybrid architectures',
      features: [
        'Cloud threat intelligence',
        'Edge processing',
        'Data residency compliance',
        'Gradual cloud adoption',
        'Multi-region deployment'
      ]
    }
  ];

  useEffect(() => {
    loadCustomers();
    loadCloudCredentials();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .select('*')
        .order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadCloudCredentials = async () => {
    try {
      const response = await supabase.functions.invoke('credential-manager', {
        body: { action: 'list', userId: 'current-user' } // Will be replaced with actual user ID
      });

      if (response.data) {
        setCloudCredentials(response.data.credentials || []);
      }
    } catch (error) {
      console.error('Error loading cloud credentials:', error);
    }
  };

  const generateDeploymentArtifacts = async () => {
    if (!selectedModel || !selectedCustomer) {
      toast({
        title: "Configuration Required",
        description: "Please select deployment model and customer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) return;

      toast({
        title: "Generating Deployment Artifacts",
        description: `Creating ${selectedModel} configuration for ${customer.customer_name}...`,
      });

      const config = {
        model: selectedModel,
        customerId: selectedCustomer,
        domain: customer.domain,
        apiKey: customer.api_key,
        customerName: customer.customer_name,
        config: deploymentConfig.config
      };

      const response = await supabase.functions.invoke('deployment-generator', {
        body: config
      });

      if (response.error) throw response.error;

      setGeneratedArtifacts(response.data);
      
      toast({
        title: "Deployment Artifacts Generated",
        description: `Ready to deploy ${selectedModel} for ${customer.customer_name}`,
      });
    } catch (error) {
      console.error('Error generating deployment artifacts:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate deployment configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: `${type} configuration copied`,
    });
  };

  const downloadArtifact = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: `${filename} downloaded`,
    });
  };

  const deployToEnvironment = async () => {
    if (!selectedModel || !selectedCustomer || !selectedCredential) {
      toast({
        title: "Configuration Required",
        description: "Please select deployment model, customer, and cloud credentials",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Starting Real Deployment",
        description: "Deploying WAF to your cloud infrastructure...",
      });

      const customer = customers.find(c => c.id === selectedCustomer);
      
      const response = await supabase.functions.invoke('cloud-deployer', {
        body: {
          model: selectedModel,
          customerId: selectedCustomer,
          cloudProvider: selectedCloudProvider,
          credentialId: selectedCredential,
          deploymentConfig: {
            ...deploymentConfig,
            customerName: customer?.customer_name,
            domain: customer?.domain,
            apiKey: customer?.api_key
          }
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Deployment Started",
        description: `WAF deployment initiated. Track progress at ${response.data.tracking_url}`,
      });

      // Store deployment info for tracking
      setGeneratedArtifacts({
        ...generatedArtifacts,
        deployment_id: response.data.deployment_id,
        tracking_url: response.data.tracking_url
      });

    } catch (error) {
      console.error('Real deployment error:', error);
      toast({
        title: "Deployment Failed",
        description: "Failed to deploy to cloud infrastructure",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WAF Deployment Models</h2>
          <p className="text-muted-foreground">Enterprise-grade deployment options for any infrastructure</p>
        </div>
        <Badge variant="outline" className="border-primary text-primary">
          {deploymentModels.length} Deployment Options
        </Badge>
      </div>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models">Deployment Models</TabsTrigger>
          <TabsTrigger value="credentials">Cloud Credentials</TabsTrigger>
          <TabsTrigger value="configure">Configure & Generate</TabsTrigger>
          <TabsTrigger value="deploy">Deploy & Monitor</TabsTrigger>
        </TabsList>

        {/* Deployment Models Overview */}
        <TabsContent value="models" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deploymentModels.map((model) => (
              <Card 
                key={model.id}
                className={`cursor-pointer transition-colors ${
                  selectedModel === model.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedModel(model.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <model.icon className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={
                          model.complexity === 'Simple' ? 'default' :
                          model.complexity === 'Moderate' ? 'secondary' : 'destructive'
                        }>
                          {model.complexity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{model.description}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm">Best For:</h4>
                      <p className="text-sm text-muted-foreground">{model.useCase}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm">Key Features:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                        {model.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cloud Credentials Management */}
        <TabsContent value="credentials">
          <CloudCredentialManager />
        </TabsContent>

        {/* Configuration & Generation */}
        <TabsContent value="configure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Deployment Configuration
              </CardTitle>
              <CardDescription>
                Configure and generate deployment artifacts for your selected model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="model-select">Deployment Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deployment model" />
                      </SelectTrigger>
                      <SelectContent>
                        {deploymentModels.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="customer-select">Customer</Label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.customer_name} ({customer.domain})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cloud-provider">Cloud Provider</Label>
                    <Select value={selectedCloudProvider} onValueChange={setSelectedCloudProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cloud provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aws">🟠 Amazon Web Services</SelectItem>
                        <SelectItem value="gcp">🔵 Google Cloud Platform</SelectItem>
                        <SelectItem value="azure">🔷 Microsoft Azure</SelectItem>
                        <SelectItem value="digitalocean">🌊 DigitalOcean</SelectItem>
                        <SelectItem value="vercel">⚡ Vercel</SelectItem>
                        <SelectItem value="railway">🚂 Railway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCloudProvider && (
                    <div>
                      <Label htmlFor="credential-select">Cloud Credentials</Label>
                      <Select value={selectedCredential} onValueChange={setSelectedCredential}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select credentials" />
                        </SelectTrigger>
                        <SelectContent>
                          {cloudCredentials
                            .filter(cred => cred.provider === selectedCloudProvider)
                            .map(credential => (
                              <SelectItem key={credential.id} value={credential.id}>
                                {credential.credential_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {selectedModel && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Model-Specific Configuration</h4>
                    
                    {selectedModel === 'reverse-proxy' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="proxy-port">Proxy Port</Label>
                          <Input 
                            id="proxy-port" 
                            placeholder="80, 443" 
                            defaultValue="80,443"
                          />
                        </div>
                        <div>
                          <Label htmlFor="backend-servers">Backend Servers</Label>
                          <Textarea 
                            id="backend-servers"
                            placeholder="server1.internal:8080&#10;server2.internal:8080"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="ssl-termination" />
                          <Label htmlFor="ssl-termination">SSL Termination</Label>
                        </div>
                      </div>
                    )}

                    {selectedModel === 'kubernetes' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="namespace">Kubernetes Namespace</Label>
                          <Input id="namespace" placeholder="waf-system" defaultValue="waf-system" />
                        </div>
                        <div>
                          <Label htmlFor="ingress-class">Ingress Class</Label>
                          <Input id="ingress-class" placeholder="nginx" defaultValue="nginx" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="istio-integration" />
                          <Label htmlFor="istio-integration">Istio Service Mesh</Label>
                        </div>
                      </div>
                    )}

                    {selectedModel === 'on-premise' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="appliance-ip">Appliance IP</Label>
                          <Input id="appliance-ip" placeholder="192.168.1.100" />
                        </div>
                        <div>
                          <Label htmlFor="management-port">Management Port</Label>
                          <Input id="management-port" placeholder="8443" defaultValue="8443" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="ha-mode" />
                          <Label htmlFor="ha-mode">High Availability</Label>
                        </div>
                      </div>
                    )}

                    {selectedModel === 'hybrid-cloud' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="cloud-endpoint">Cloud API Endpoint</Label>
                          <Input 
                            id="cloud-endpoint" 
                            placeholder="https://api.waf-cloud.com" 
                            defaultValue="https://kgazsoccrtmhturhxggi.supabase.co"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edge-locations">Edge Locations</Label>
                          <Textarea 
                            id="edge-locations"
                            placeholder="us-east-1&#10;eu-west-1&#10;ap-southeast-1"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="data-residency" />
                          <Label htmlFor="data-residency">Data Residency Controls</Label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button 
                onClick={generateDeploymentArtifacts}
                disabled={!selectedModel || !selectedCustomer || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Monitor className="h-4 w-4 mr-2 animate-spin" />
                    Generating Artifacts...
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4 mr-2" />
                    Generate Deployment Artifacts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Artifacts Display */}
          {Object.keys(generatedArtifacts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Generated Deployment Artifacts
                </CardTitle>
                <CardDescription>
                  Production-ready configuration files for {selectedModel} deployment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(generatedArtifacts).map(([key, content]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium capitalize">{key.replace(/_/g, ' ')}</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(content as string, key)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadArtifact(content as string, `${key}.yaml`)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-48">
                        {content as string}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deploy & Monitor */}
        <TabsContent value="deploy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Deploy to Environment
              </CardTitle>
              <CardDescription>
                Deploy generated artifacts to your target infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(generatedArtifacts).length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Generate deployment artifacts first to enable deployment
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Artifacts Ready</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        All deployment files generated
                      </p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="font-medium">Security Validated</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Configuration passes security checks
                      </p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">Ready to Deploy</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Infrastructure monitoring enabled
                      </p>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Deployment Target</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{selectedModel}</Badge>
                          <Badge variant="outline">{selectedCloudProvider?.toUpperCase()}</Badge>
                          <span className="font-medium">
                            {customers.find(c => c.id === selectedCustomer)?.customer_name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Domain: {customers.find(c => c.id === selectedCustomer)?.domain}
                        </p>
                        {selectedCredential && (
                          <p className="text-sm text-muted-foreground">
                            Credentials: {cloudCredentials.find(c => c.id === selectedCredential)?.credential_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button 
                      onClick={deployToEnvironment}
                      className="w-full"
                      size="lg"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Deploy WAF to Production
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeploymentModels;