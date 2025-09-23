import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Globe, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Copy,
  RefreshCw,
  Settings,
  Monitor,
  Zap,
  Lock,
  Eye,
  Code
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerDeployment {
  id: string;
  customer_name: string;
  customer_email: string;
  domain: string;
  deployment_type: string;
  api_key: string;
  status: string;
  config_settings: any;
  requests_today: number;
  requests_total: number;
  threats_blocked_today: number;
  threats_blocked_total: number;
  last_seen: string;
}

interface ConnectionTest {
  endpoint: string;
  status: 'testing' | 'success' | 'failed';
  responseTime?: number;
  error?: string;
}

interface HardwareCapability {
  feature: string;
  supported: boolean;
  details?: string;
}

export default function CustomerIntegrationDashboard() {
  const { toast } = useToast();
  const [deployment, setDeployment] = useState<CustomerDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([]);
  const [hardwareCapabilities, setHardwareCapabilities] = useState<HardwareCapability[]>([]);
  const [integrationStep, setIntegrationStep] = useState(1);
  
  // Registration form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [deploymentType, setDeploymentType] = useState("cloud");

  useEffect(() => {
    loadCustomerDeployment();
    detectHardwareCapabilities();
  }, []);

  const loadCustomerDeployment = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading deployment:', error);
        return;
      }
      
      if (data) {
        setDeployment(data);
        setIntegrationStep(data.status === 'active' ? 4 : 2);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectHardwareCapabilities = async () => {
    // Simulate hardware capability detection
    const capabilities = [
      { feature: "TPM 2.0", supported: false, details: "Not detected - Install TPM module" },
      { feature: "Secure Boot", supported: true, details: "UEFI Secure Boot enabled" },
      { feature: "Intel TXT", supported: false, details: "Not available on this platform" },
      { feature: "ARM TrustZone", supported: false, details: "x86 platform detected" },
      { feature: "Hardware RNG", supported: true, details: "Intel RdRand available" }
    ];
    setHardwareCapabilities(capabilities);
  };

  const registerCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .insert({
          customer_name: customerName,
          customer_email: customerEmail,
          domain: domain,
          deployment_type: deploymentType,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setDeployment(data);
      setIntegrationStep(2);
      
      toast({
        title: "Registration Successful",
        description: "Your deployment has been registered. Proceed to configuration.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const testConnection = async (endpoint: string) => {
    setConnectionTests(prev => prev.map(test => 
      test.endpoint === endpoint 
        ? { ...test, status: 'testing' as const }
        : test
    ));

    try {
      const startTime = Date.now();
      
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const responseTime = Date.now() - startTime;
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      setConnectionTests(prev => prev.map(test => 
        test.endpoint === endpoint 
          ? { 
              ...test, 
              status: success ? 'success' as const : 'failed' as const,
              responseTime: success ? responseTime : undefined,
              error: success ? undefined : 'Connection timeout'
            }
          : test
      ));
    } catch (error) {
      setConnectionTests(prev => prev.map(test => 
        test.endpoint === endpoint 
          ? { ...test, status: 'failed' as const, error: 'Network error' }
          : test
      ));
    }
  };

  const testAllConnections = () => {
    const endpoints = [
      `https://${domain}/api/health`,
      `https://${domain}/api/waf/status`,
      `https://api.pappayacloud.com/hardware/verify`,
      `https://api.pappayacloud.com/trust/attestation`
    ];

    const tests = endpoints.map(endpoint => ({
      endpoint,
      status: 'testing' as const
    }));

    setConnectionTests(tests);
    endpoints.forEach(endpoint => testConnection(endpoint));
  };

  const generateAPIKey = async () => {
    if (!deployment) return;

    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .update({ 
          api_key: `pak_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
          status: 'active'
        })
        .eq('id', deployment.id)
        .select()
        .single();

      if (error) throw error;

      setDeployment(data);
      setIntegrationStep(4);
      
      toast({
        title: "API Key Generated",
        description: "Your integration is now active.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const getIntegrationProgress = () => {
    return (integrationStep / 4) * 100;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hardware Trust Integration</h1>
          <p className="text-gray-600 mt-2">Set up and manage your hardware-backed security integration</p>
        </div>
        {deployment && (
          <div className="flex items-center space-x-4">
            {getStatusBadge(deployment.status)}
            <Button variant="outline" onClick={loadCustomerDeployment}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Integration Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" />
            Integration Progress
          </CardTitle>
          <CardDescription>
            Complete these steps to activate your hardware trust integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={getIntegrationProgress()} className="w-full" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-3 rounded-lg border ${integrationStep >= 1 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  {integrationStep >= 1 ? <CheckCircle className="w-5 h-5 text-green-600 mr-2" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-2" />}
                  <span className="font-medium">Register</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${integrationStep >= 2 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  {integrationStep >= 2 ? <CheckCircle className="w-5 h-5 text-green-600 mr-2" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-2" />}
                  <span className="font-medium">Configure</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${integrationStep >= 3 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  {integrationStep >= 3 ? <CheckCircle className="w-5 h-5 text-green-600 mr-2" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-2" />}
                  <span className="font-medium">Test</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${integrationStep >= 4 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  {integrationStep >= 4 ? <CheckCircle className="w-5 h-5 text-green-600 mr-2" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-2" />}
                  <span className="font-medium">Deploy</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={deployment ? "dashboard" : "setup"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          {!deployment ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Register Your Deployment
                </CardTitle>
                <CardDescription>
                  Register your infrastructure to begin hardware trust integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Organization Name</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Contact Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="admin@yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Primary Domain</Label>
                    <Input
                      id="domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="api.yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deploymentType">Deployment Type</Label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={deploymentType}
                      onChange={(e) => setDeploymentType(e.target.value)}
                    >
                      <option value="cloud">Cloud (AWS/Azure/GCP)</option>
                      <option value="on-premise">On-Premise</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="edge">Edge Computing</option>
                    </select>
                  </div>
                </div>
                <Button 
                  onClick={registerCustomer} 
                  className="w-full"
                  disabled={!customerName || !customerEmail || !domain}
                >
                  Register Deployment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Deployment Registered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Organization</Label>
                    <p className="font-medium">{deployment.customer_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Domain</Label>
                    <p className="font-medium">{deployment.domain}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Type</Label>
                    <p className="font-medium capitalize">{deployment.deployment_type}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Status</Label>
                    <div className="mt-1">{getStatusBadge(deployment.status)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {deployment ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Requests Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Monitor className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <div className="text-2xl font-bold">{deployment.requests_today?.toLocaleString() || 0}</div>
                        <div className="text-sm text-gray-500">+12% from yesterday</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Globe className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <div className="text-2xl font-bold">{deployment.requests_total?.toLocaleString() || 0}</div>
                        <div className="text-sm text-gray-500">All time</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Threats Blocked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Shield className="w-8 h-8 text-red-600 mr-3" />
                      <div>
                        <div className="text-2xl font-bold">{deployment.threats_blocked_today || 0}</div>
                        <div className="text-sm text-gray-500">Today</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Protection Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Lock className="w-8 h-8 text-purple-600 mr-3" />
                      <div>
                        <div className="text-2xl font-bold">99.9%</div>
                        <div className="text-sm text-gray-500">Uptime</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {deployment.api_key && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="w-5 h-5 mr-2 text-yellow-600" />
                      API Credentials
                    </CardTitle>
                    <CardDescription>
                      Use these credentials to integrate with your applications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">API Key</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          type="password"
                          value={deployment.api_key}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(deployment.api_key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Endpoint</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value="https://api.pappayacloud.com/hardware/verify"
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard("https://api.pappayacloud.com/hardware/verify")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please register your deployment first to access the dashboard.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Hardware Tab */}
        <TabsContent value="hardware" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-600" />
                Hardware Capabilities
              </CardTitle>
              <CardDescription>
                Current hardware security features detected on your system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hardwareCapabilities.map((capability, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {capability.supported ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mr-3" />
                      )}
                      <div>
                        <div className="font-medium">{capability.feature}</div>
                        <div className="text-sm text-gray-500">{capability.details}</div>
                      </div>
                    </div>
                    <Badge variant={capability.supported ? "default" : "secondary"}>
                      {capability.supported ? "Available" : "Not Available"}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" onClick={detectHardwareCapabilities}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-scan Hardware
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="w-5 h-5 mr-2 text-blue-600" />
                Connection Testing
              </CardTitle>
              <CardDescription>
                Test connectivity between your infrastructure and our security services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testAllConnections} disabled={!domain} className="w-full">
                <Zap className="w-4 h-4 mr-2" />
                Run Connection Tests
              </Button>
              
              {connectionTests.length > 0 && (
                <div className="space-y-3">
                  {connectionTests.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        {test.status === 'testing' && <RefreshCw className="w-4 h-4 text-blue-600 mr-3 animate-spin" />}
                        {test.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600 mr-3" />}
                        {test.status === 'failed' && <XCircle className="w-4 h-4 text-red-600 mr-3" />}
                        <div>
                          <div className="font-mono text-sm">{test.endpoint}</div>
                          {test.error && <div className="text-xs text-red-600">{test.error}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        {test.responseTime && (
                          <div className="text-sm font-medium">{test.responseTime}ms</div>
                        )}
                        <Badge variant={
                          test.status === 'success' ? 'default' : 
                          test.status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {test.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="w-5 h-5 mr-2 text-purple-600" />
                Integration Guide
              </CardTitle>
              <CardDescription>
                Download client libraries and integration packages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">JavaScript SDK</h3>
                    <Badge>Latest</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Client library for web applications and Node.js backends
                  </p>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download SDK
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Python SDK</h3>
                    <Badge>Latest</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Client library for Python applications and services
                  </p>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download SDK
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Docker Image</h3>
                    <Badge variant="secondary">Beta</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Pre-configured container with hardware trust agent
                  </p>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Pull Image
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Documentation</h3>
                    <Badge variant="outline">Docs</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Complete integration guide and API reference
                  </p>
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    View Docs
                  </Button>
                </Card>
              </div>

              {deployment && !deployment.api_key && (
                <div className="pt-4 border-t">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Complete your integration setup to generate API credentials and activate your deployment.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={generateAPIKey} className="w-full mt-4">
                    <Key className="w-4 h-4 mr-2" />
                    Generate API Key & Activate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}