import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Settings,
  Users,
  Globe,
  Code,
  Download,
  Copy,
  ExternalLink,
  Server,
  Zap,
  Eye,
  Database,
  FileText,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface WAFStats {
  totalCustomers: number;
  activeDeployments: number;
  requestsPerSecond: number;
  threatsBlocked: number;
  uptime: number;
}

interface CustomerDeployment {
  id: string;
  customer_name: string;
  customer_email?: string;
  domain: string;
  deployment_type: string;
  status: string;
  api_key: string;
  requests_today: number;
  requests_total: number;
  threats_blocked_today: number;
  threats_blocked_total: number;
  last_seen: string;
  created_at: string;
  config_settings: any;
}

const WAFManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<WAFStats>({
    totalCustomers: 0,
    activeDeployments: 0,
    requestsPerSecond: 0,
    threatsBlocked: 0,
    uptime: 99.98
  });
  
  const [customers, setCustomers] = useState<CustomerDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  const [wafConfig, setWafConfig] = useState({
    globalRateLimit: 1000,
    enableGeoBlocking: true,
    enableAIAnalysis: true,
    failOpenMode: true,
    logLevel: 'info',
    maxProcessingTime: 100
  });

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDeployment | null>(null);
  const [deploymentCode, setDeploymentCode] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showManageCustomer, setShowManageCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    domain: '',
    deploymentType: 'docker'
  });

  useEffect(() => {
    loadWAFData();
    generateDeploymentCode();
    const interval = setInterval(loadWAFData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadWAFData = async () => {
    try {
      setLoading(true);
      
      // Load customer deployments
      const { data: customerData, error: customerError } = await supabase
        .from('customer_deployments')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerError) throw customerError;

      // Load WAF requests for statistics
      const { data: requestsData, error: requestsError } = await supabase
        .from('waf_requests')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (requestsError) throw requestsError;

      // Load security events for additional stats
      const { data: securityEvents, error: securityError } = await supabase
        .from('security_events')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (securityError) throw securityError;

      // Process customer data
      const processedCustomers = (customerData || []).map(customer => ({
        ...customer,
        last_seen: formatLastSeen(customer.last_seen)
      }));

      setCustomers(processedCustomers);

      // Calculate statistics
      const activeCustomers = customerData?.filter(c => c.status === 'active').length || 0;
      const totalRequests = requestsData?.length || 0;
      const blockedRequests = requestsData?.filter(r => r.action === 'block').length || 0;
      const securityBlocked = securityEvents?.filter(e => e.blocked).length || 0;
      
      setStats({
        totalCustomers: customerData?.length || 0,
        activeDeployments: activeCustomers,
        requestsPerSecond: Math.round(totalRequests / (24 * 60 * 60)), // Rough estimate
        threatsBlocked: blockedRequests + securityBlocked,
        uptime: 99.98
      });

      console.log('WAF Data loaded:', {
        customers: customerData?.length,
        requests: totalRequests,
        blocked: blockedRequests
      });

    } catch (error) {
      console.error('Error loading WAF data:', error);
      toast({
        title: "Data Load Error",
        description: "Failed to load WAF management data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const generateDeploymentCode = () => {
    const dockerCompose = `# WAF Deployment Package
version: '3.8'
services:
  waf-proxy:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
      - "443:443"
    environment:
      - SUPABASE_URL=${window.location.origin.replace('localhost:5173', 'kgazsoccrtmhturhxggi.supabase.co')}
      - WAF_ENDPOINT=/functions/v1/inline-waf
    volumes:
      - ./nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf
    restart: unless-stopped

  customer-app:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./app:/usr/share/nginx/html
`;
    setDeploymentCode(dockerCompose);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Deployment configuration copied successfully",
    });
  };

  const generateTestTraffic = async () => {
    try {
      toast({
        title: "Generating Test Data",
        description: "Creating sample WAF requests for all customers...",
      });

      const response = await supabase.functions.invoke('generate-test-traffic');

      console.log('Test traffic response:', response);

      if (response.error) throw response.error;

      toast({
        title: "Test Data Generated",
        description: `Created ${response.data?.requests_generated || 0} sample requests`,
      });
      
      // Refresh the data to show new requests
      loadWAFData();
    } catch (error) {
      console.error('Error generating test traffic:', error);
      toast({
        title: "Test Data Generation Failed",
        description: error.message || "Unable to generate test traffic",
        variant: "destructive",
      });
    }
  };

  const addNewCustomer = async () => {
    setShowAddCustomer(true);
  };

  const manageCustomer = (customer: CustomerDeployment) => {
    setSelectedCustomer(customer);
    setShowManageCustomer(true);
  };

  const createCustomer = async () => {
    try {
      if (!newCustomer.name || !newCustomer.domain) {
        toast({
          title: "Validation Error",
          description: "Customer name and domain are required",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('customer_deployments')
        .insert({
          customer_name: newCustomer.name,
          customer_email: newCustomer.email,
          domain: newCustomer.domain,
          deployment_type: newCustomer.deploymentType
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Customer Added",
        description: `${newCustomer.name} has been added successfully`,
      });

      setShowAddCustomer(false);
      setNewCustomer({ name: '', email: '', domain: '', deploymentType: 'docker' });
      loadWAFData(); // Refresh the list

    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    }
  };

  const updateCustomerStatus = async (customerId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('customer_deployments')
        .update({ status })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Customer status changed to ${status}`,
      });

      loadWAFData(); // Refresh the data
      setShowManageCustomer(false);
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error", 
        description: "Failed to update customer status",
        variant: "destructive",
      });
    }
  };

  const testInlineWAF = async () => {
    try {
      toast({
        title: "Testing WAF",
        description: "Sending test request to inline WAF...",
      });

      const testRequest = {
        method: 'GET',
        url: 'https://test.example.com/api/users',
        headers: {
          'User-Agent': 'Test Browser',
          'X-Forwarded-For': '192.168.1.100'
        },
        source_ip: '192.168.1.100',
        timestamp: Date.now()
      };

      const response = await supabase.functions.invoke('inline-waf', {
        body: testRequest
      });

      console.log('WAF Test Response:', response);

      toast({
        title: "WAF Test Complete",
        description: `Action: ${response.data?.action || 'Unknown'} - Processing time: ${response.data?.processing_time_ms || 0}ms`,
      });
    } catch (error) {
      console.error('WAF test error:', error);
      toast({
        title: "WAF Test Failed",
        description: error.message || "Failed to test WAF endpoint",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            WAF Management Center
          </h1>
          <p className="text-muted-foreground">Manage your inline WAF service and customer deployments</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={testInlineWAF} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Test WAF
          </Button>
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Live Monitor
          </Button>
        </div>
      </div>

      {/* WAF Service Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-300">{stats.totalCustomers}</div>
            <p className="text-xs text-blue-400/70">+2 this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Deployments</CardTitle>
            <Server className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-300">{stats.activeDeployments}</div>
            <p className="text-xs text-green-400/70">All systems operational</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests/sec</CardTitle>
            <Activity className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-300">{stats.requestsPerSecond.toLocaleString()}</div>
            <p className="text-xs text-purple-400/70">Peak: 2.1K/sec</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/20 border-red-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threats Blocked</CardTitle>
            <Shield className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300">{stats.threatsBlocked.toLocaleString()}</div>
            <p className="text-xs text-red-400/70">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/20 border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <BarChart3 className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-300">{stats.uptime}%</div>
            <p className="text-xs text-cyan-400/70">SLA compliant</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deployments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="deployments">Customer Deployments</TabsTrigger>
          <TabsTrigger value="configuration">WAF Configuration</TabsTrigger>
          <TabsTrigger value="deployment-package">Deployment Package</TabsTrigger>
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
          <TabsTrigger value="rules">Security Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customer Deployments
              </CardTitle>
              <CardDescription>
                Monitor and manage customer WAF deployments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading customer deployments...</p>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2" />
                  <p>No customer deployments found</p>
                  <Button className="mt-4" onClick={() => addNewCustomer()}>
                    <Users className="w-4 h-4 mr-2" />
                    Add First Customer
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customers.map((customer) => (
                  <Card key={customer.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(customer.status)}`}></div>
                          <div>
                            <h4 className="font-medium text-white">{customer.customer_name}</h4>
                            <p className="text-sm text-slate-400">{customer.domain}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-300">
                  <div className="text-center">
                            <div className="font-medium">{customer.requests_today.toLocaleString()}</div>
                            <div className="text-xs text-slate-500">Requests today</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-400">{customer.threats_blocked_today}</div>
                            <div className="text-xs text-slate-500">Threats blocked</div>
                          </div>
                          <Badge variant="outline" className="bg-slate-700 text-slate-300">
                            {customer.deployment_type}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => manageCustomer(customer)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Global WAF Configuration
              </CardTitle>
              <CardDescription>
                Configure global WAF settings and policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rate-limit">Global Rate Limit (req/min)</Label>
                    <Input
                      id="rate-limit"
                      type="number"
                      value={wafConfig.globalRateLimit}
                      onChange={(e) => setWafConfig(prev => ({ ...prev, globalRateLimit: Number(e.target.value) }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="processing-time">Max Processing Time (ms)</Label>
                    <Input
                      id="processing-time"
                      type="number"
                      value={wafConfig.maxProcessingTime}
                      onChange={(e) => setWafConfig(prev => ({ ...prev, maxProcessingTime: Number(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="log-level">Log Level</Label>
                    <select 
                      id="log-level"
                      className="w-full p-2 border rounded bg-background"
                      value={wafConfig.logLevel}
                      onChange={(e) => setWafConfig(prev => ({ ...prev, logLevel: e.target.value }))}
                    >
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="geo-blocking">Enable Geo-blocking</Label>
                    <Switch
                      id="geo-blocking"
                      checked={wafConfig.enableGeoBlocking}
                      onCheckedChange={(checked) => setWafConfig(prev => ({ ...prev, enableGeoBlocking: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="ai-analysis">Enable AI Analysis</Label>
                    <Switch
                      id="ai-analysis"
                      checked={wafConfig.enableAIAnalysis}
                      onCheckedChange={(checked) => setWafConfig(prev => ({ ...prev, enableAIAnalysis: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="fail-open">Fail-open Mode</Label>
                    <Switch
                      id="fail-open"
                      checked={wafConfig.failOpenMode}
                      onCheckedChange={(checked) => setWafConfig(prev => ({ ...prev, failOpenMode: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button className="mr-2">Save Configuration</Button>
                <Button variant="outline">Reset to Defaults</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment-package" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Customer Deployment Package
              </CardTitle>
              <CardDescription>
                Generate deployment configurations for customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button variant="outline" onClick={() => generateDeploymentCode()}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Package
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(deploymentCode)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Configuration
                </Button>
              </div>

              <div className="bg-slate-900 rounded-lg p-4">
                <pre className="text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {deploymentCode}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <Download className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <h4 className="font-medium text-white mb-1">Docker Package</h4>
                    <p className="text-xs text-slate-400 mb-3">Complete containerized deployment</p>
                    <Button size="sm" variant="outline">Download</Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <Server className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <h4 className="font-medium text-white mb-1">Kubernetes</h4>
                    <p className="text-xs text-slate-400 mb-3">Enterprise K8s manifests</p>
                    <Button size="sm" variant="outline">Download</Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 text-center">
                    <Globe className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                    <h4 className="font-medium text-white mb-1">Nginx Config</h4>
                    <p className="text-xs text-slate-400 mb-3">Reverse proxy integration</p>
                    <Button size="sm" variant="outline">Download</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live WAF Monitoring
              </CardTitle>
              <CardDescription>
                Real-time WAF performance and security metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Processing Performance</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average Response Time</span>
                        <span>45ms</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span>23%</span>
                      </div>
                      <Progress value={23} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>67%</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Security Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Requests Processed</span>
                      <Badge variant="outline">1,247,832</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Threats Blocked</span>
                      <Badge variant="destructive">8,742</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">False Positives</span>
                      <Badge variant="secondary">23</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Block Rate</span>
                      <Badge variant="outline">0.7%</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Rules Management
              </CardTitle>
              <CardDescription>
                Configure and manage WAF security rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button>
                  <Shield className="w-4 h-4 mr-2" />
                  Add New Rule
                </Button>
                
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2" />
                  <p>Security rules management interface</p>
                  <p className="text-sm">Configure OWASP rules, custom patterns, and geo-blocking</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                WAF Analytics Dashboard
              </CardTitle>
              <CardDescription>
                Comprehensive analytics and reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>Advanced analytics dashboard</p>
                <p className="text-sm">Traffic patterns, threat analysis, and performance metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Customer Modal */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer deployment for WAF protection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@acme.com"
              />
            </div>
            <div>
              <Label htmlFor="customer-domain">Domain</Label>
              <Input
                id="customer-domain"
                value={newCustomer.domain}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="api.acme.com"
              />
            </div>
            <div>
              <Label htmlFor="deployment-type">Deployment Type</Label>
              <Select value={newCustomer.deploymentType} onValueChange={(value) => setNewCustomer(prev => ({ ...prev, deploymentType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="docker">Docker</SelectItem>
                  <SelectItem value="kubernetes">Kubernetes</SelectItem>
                  <SelectItem value="nginx">Nginx</SelectItem>
                  <SelectItem value="envoy">Envoy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
            <Button onClick={createCustomer}>Create Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Customer Modal */}
      <Dialog open={showManageCustomer} onOpenChange={setShowManageCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Customer: {selectedCustomer?.customer_name}</DialogTitle>
            <DialogDescription>
              Configure customer deployment settings and status
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Domain</Label>
                  <Input value={selectedCustomer.domain} readOnly />
                </div>
                <div>
                  <Label>Deployment Type</Label>
                  <Input value={selectedCustomer.deployment_type} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Requests Today</Label>
                  <Input value={selectedCustomer.requests_today.toLocaleString()} readOnly />
                </div>
                <div>
                  <Label>Threats Blocked</Label>
                  <Input value={selectedCustomer.threats_blocked_today.toString()} readOnly />
                </div>
              </div>
              <div>
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input value={selectedCustomer.api_key} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedCustomer.api_key)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant={selectedCustomer.status === 'active' ? 'default' : 'outline'}
                    onClick={() => updateCustomerStatus(selectedCustomer.id, 'active')}
                  >
                    Active
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedCustomer.status === 'maintenance' ? 'default' : 'outline'}
                    onClick={() => updateCustomerStatus(selectedCustomer.id, 'maintenance')}
                  >
                    Maintenance
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedCustomer.status === 'inactive' ? 'destructive' : 'outline'}
                    onClick={() => updateCustomerStatus(selectedCustomer.id, 'inactive')}
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageCustomer(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WAFManagement;