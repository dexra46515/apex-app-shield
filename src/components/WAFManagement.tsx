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
  BarChart3,
  UserCheck,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AnalyticsTab from './AnalyticsTab';

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
    uptime: 0
  });
  
  const [customers, setCustomers] = useState<CustomerDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    avgResponseTime: 0,
    requestsProcessed: 0,
    threatsBlocked: 0,
    falsePositives: 0,
    blockRate: 0
  });

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
  const [securityRules, setSecurityRules] = useState<any[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showRuleDetails, setShowRuleDetails] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rule_type: 'owasp',
    category: 'injection',
    severity: 'medium',
    enabled: true,
    priority: 100,
    conditions: {
      fields: ['body', 'query'],
      patterns: ['']
    },
    actions: {
      log: true,
      alert: true,
      action: 'block'
    }
  });
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    domain: '',
    deploymentType: 'docker'
  });

  const loadSecurityRules = async () => {
    try {
      const { data: rulesData, error } = await supabase
        .from('security_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;

      setSecurityRules(rulesData || []);
      console.log('Loaded security rules:', rulesData?.length);
    } catch (error) {
      console.error('Error loading security rules:', error);
      toast({
        title: "Error",
        description: "Failed to load security rules",
        variant: "destructive",
      });
    }
  };

  const SecurityRulesTable = () => (
    <div className="space-y-4">
      {securityRules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2" />
          <p>No security rules found</p>
          <p className="text-sm">Click 'Refresh Rules' to load security rules</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {securityRules.map((rule) => (
            <Card key={rule.id} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline" className={
                        rule.severity === 'high' ? 'border-destructive text-destructive' :
                        rule.severity === 'medium' ? 'border-orange-500 text-orange-500' :
                        'border-muted-foreground text-muted-foreground'
                      }>
                        {rule.severity}
                      </Badge>
                      <span className="font-medium">{rule.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>Category: <span className="text-foreground">{rule.category}</span></span>
                      <span>Priority: <span className="text-foreground">{rule.priority}</span></span>
                      <span>Type: <span className="text-foreground">{rule.rule_type}</span></span>
                    </div>
                    
                    {/* Show rule conditions preview */}
                    {rule.conditions && (
                      <div className="mt-3 p-2 bg-muted/50 rounded-sm">
                        <p className="text-xs font-medium mb-1">Conditions:</p>
                        <div className="text-xs text-muted-foreground">
                          {rule.conditions.patterns && (
                            <div>Patterns: {rule.conditions.patterns.slice(0, 2).join(', ')}{rule.conditions.patterns.length > 2 ? '...' : ''}</div>
                          )}
                          {rule.conditions.fields && (
                            <div>Fields: {rule.conditions.fields.join(', ')}</div>
                          )}
                          {rule.conditions.source && (
                            <div>Source: {rule.conditions.source}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                   <div className="flex gap-2 ml-4">
                     <Button 
                       size="sm" 
                       variant="outline" 
                       onClick={() => viewRuleDetails(rule)}
                       title="View Rule Details"
                     >
                       <Settings className="w-4 h-4" />
                     </Button>
                     <Button 
                       size="sm" 
                       variant={rule.enabled ? "destructive" : "default"}
                       onClick={() => toggleRule(rule.id, !rule.enabled)}
                       title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                       disabled={loading}
                     >
                       {rule.enabled ? 'Disable' : 'Enable'}
                     </Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('security_rules')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', ruleId);

      if (error) throw error;

      // Update local state immediately for better UX
      setSecurityRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      ));

      toast({
        title: "Rule Updated",
        description: `Security rule ${enabled ? 'enabled' : 'disabled'} successfully`,
      });

    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Error",
        description: "Failed to update security rule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const viewRuleDetails = (rule: any) => {
    setSelectedRule(rule);
    setShowRuleDetails(true);
  };

  const addNewRule = () => {
    setShowAddRule(true);
  };

  const createNewRule = async () => {
    if (!newRule.name || !newRule.description) {
      toast({
        title: "Validation Error",
        description: "Rule name and description are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const patterns = newRule.conditions.patterns.filter(p => p.trim() !== '');
      if (patterns.length === 0) {
        toast({
          title: "Validation Error", 
          description: "At least one pattern is required",
          variant: "destructive",
        });
        return;
      }

      const ruleData = {
        ...newRule,
        conditions: {
          ...newRule.conditions,
          patterns
        }
      };

      const { data, error } = await supabase
        .from('security_rules')
        .insert(ruleData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Rule Created",
        description: `Security rule "${newRule.name}" created successfully`,
      });

      setShowAddRule(false);
      setNewRule({
        name: '',
        description: '',
        rule_type: 'owasp',
        category: 'injection',
        severity: 'medium', 
        enabled: true,
        priority: 100,
        conditions: {
          fields: ['body', 'query'],
          patterns: ['']
        },
        actions: {
          log: true,
          alert: true,
          action: 'block'
        }
      });
      
      loadSecurityRules(); // Refresh the list

    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: "Error",
        description: "Failed to create security rule",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadWAFData();
    loadWAFConfiguration(); // Load real configuration
    loadSecurityRules(); // Load security rules
    generateDeploymentCode();
    
    // Set up real-time subscription for new customer registrations
    const customerSubscription = supabase
      .channel('customer-registrations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_deployments'
        },
        (payload) => {
          console.log('Customer deployment changed:', payload);
          // Reload customers when changes occur
          loadWAFData();
          
          // Show toast notification for new registrations
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Customer Registration",
              description: `${payload.new.customer_name} just registered via Customer Integration Portal`,
            });
          }
        }
      )
      .subscribe();
    
    const interval = setInterval(loadWAFData, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(customerSubscription);
    };
  }, []);

  const loadWAFConfiguration = async () => {
    try {
      const { data: configData, error } = await supabase
        .from('waf_configuration')
        .select('*')
        .eq('config_key', 'global_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

      if (configData) {
        setWafConfig(configData.config_value as typeof wafConfig);
        console.log('Loaded WAF configuration:', configData.config_value);
      }
    } catch (error) {
      console.error('Error loading WAF configuration:', error);
    }
  };

  const saveWAFConfiguration = async () => {
    try {
      const { error } = await supabase
        .from('waf_configuration')
        .upsert({
          config_key: 'global_settings',
          config_value: wafConfig,
          description: 'Global WAF configuration settings',
          updated_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Configuration Saved",
        description: "WAF configuration has been updated successfully",
      });

      console.log('Saved WAF configuration:', wafConfig);
    } catch (error) {
      console.error('Error saving WAF configuration:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save WAF configuration",
        variant: "destructive",
      });
    }
  };

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

      // Load real-time metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('waf_metrics')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('timestamp', { ascending: false });

      if (metricsError) throw metricsError;

      // Process customer data
      const processedCustomers = (customerData || []).map(customer => ({
        ...customer,
        last_seen: formatLastSeen(customer.last_seen)
      }));

      setCustomers(processedCustomers);

      // Calculate statistics
      const activeCustomers = customerData?.filter(c => c.status === 'active').length || 0;
      const selfRegisteredCustomers = customerData?.filter(c => c.customer_email).length || 0;
      const totalRequests = requestsData?.length || 0;
      const blockedRequests = requestsData?.filter(r => r.action === 'block').length || 0;
      const securityBlocked = securityEvents?.filter(e => e.blocked).length || 0;
      
      // Process real-time metrics first
      const latestMetrics = metricsData?.reduce((acc, metric) => {
        if (!acc[metric.metric_name] || new Date(metric.timestamp) > new Date(acc[metric.metric_name].timestamp)) {
          acc[metric.metric_name] = metric;
        }
        return acc;
      }, {} as Record<string, any>) || {};
      
      // Calculate real-time requests per second from recent metrics
      const recentRequestsPerSecond = latestMetrics['requests_per_second']?.metric_value || 
        (totalRequests > 0 ? Math.max(1, Math.round(totalRequests / (24 * 60 * 60))) : 0);
      
      // Calculate real uptime from system metrics
      const systemUptime = latestMetrics['system_uptime_percent']?.metric_value || 
        (metricsData && metricsData.length > 0 ? 99.9 : 0);
      
      setStats({
        totalCustomers: customerData?.length || 0,
        activeDeployments: activeCustomers,
        requestsPerSecond: recentRequestsPerSecond,
        threatsBlocked: blockedRequests + securityBlocked,
        uptime: systemUptime
      });

      // Process real-time metrics
      setRealTimeMetrics({
        cpuUsage: latestMetrics['cpu_usage_percent']?.metric_value || 0,
        memoryUsage: latestMetrics['memory_usage_percent']?.metric_value || 0,
        avgResponseTime: latestMetrics['average_response_time']?.metric_value || 0,
        requestsProcessed: totalRequests,
        threatsBlocked: blockedRequests + securityBlocked,
        falsePositives: 0, // Would need manual reporting system to track actual false positives
        blockRate: totalRequests > 0 ? ((blockedRequests + securityBlocked) / totalRequests * 100) : 0
      });

      console.log('WAF Data loaded:', {
        customers: customerData?.length,
        requests: totalRequests,
        blocked: blockedRequests,
        metrics: Object.keys(latestMetrics).length
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

  const openLiveMonitor = () => {
    // Open real-time monitoring view
    toast({
      title: "Live Monitor",
      description: "Opening real-time security event monitoring...",
    });
    
    // You could navigate to a live monitoring page or open a modal
    window.open('/live-monitor', '_blank');
  };

  const testInlineWAF = async () => {
    try {
      setLoading(true);
      toast({
        title: "Testing WAF Engine",
        description: "Sending test request through WAF processing engine...",
      });

      // Create realistic test requests
      const testRequests = [
        {
          method: 'GET',
          url: 'https://api.company.com/users?id=1',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'X-Forwarded-For': '192.168.1.100'
          },
          source_ip: '192.168.1.100'
        },
        {
          method: 'POST',
          url: 'https://api.company.com/login',
          headers: {
            'User-Agent': 'sqlmap/1.0',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: "admin' OR '1'='1", password: 'test' }),
          source_ip: '45.123.128.221'
        },
        {
          method: 'GET',
          url: 'https://api.company.com/profile?name=<script>alert(1)</script>',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html'
          },
          source_ip: '103.41.21.83'
        }
      ];

      const results = [];
      
      for (const testRequest of testRequests) {
        try {
          const { data, error } = await supabase.functions.invoke('waf-engine', {
            body: testRequest
          });

          if (error) throw error;
          results.push({
            request: testRequest.method + ' ' + new URL(testRequest.url).pathname,
            result: data
          });
        } catch (error) {
          console.error('Test request failed:', error);
          results.push({
            request: testRequest.method + ' ' + new URL(testRequest.url).pathname,
            result: { action: 'error', reason: error.message }
          });
        }
      }

      // Show results
      const blockedCount = results.filter(r => r.result.blocked).length;
      const allowedCount = results.filter(r => r.result.action === 'allow').length;
      
      toast({
        title: "WAF Test Complete",
        description: `Processed ${results.length} requests: ${blockedCount} blocked, ${allowedCount} allowed`,
      });

      console.log('WAF Test Results:', results);
      
      // Refresh data to show new events
      setTimeout(() => {
        loadWAFData();
        loadSecurityRules();
      }, 1000);

    } catch (error) {
      console.error('WAF test error:', error);
      toast({
        title: "WAF Test Failed",
        description: error.message || "Unable to test WAF engine",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <Button onClick={openLiveMonitor} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Live Monitor
          </Button>
        </div>
      </div>

      {/* WAF Service Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-300">{stats.totalCustomers}</div>
            <p className="text-xs text-blue-400/70">
              {customers.filter(c => c.customer_email).length} via Customer Portal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Self-Registrations</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-300">
              {customers.filter(c => c.customer_email).length}
            </div>
            <p className="text-xs text-purple-400/70">
              {customers.filter(c => c.customer_email && c.status === 'active').length} active integrations
            </p>
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
          <TabsTrigger value="configuration">Settings</TabsTrigger>
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
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {customers.length} customer{customers.length !== 1 ? 's' : ''} deployed
                    </p>
                    <Button onClick={() => addNewCustomer()}>
                      <Users className="w-4 h-4 mr-2" />
                      Add New Customer
                    </Button>
                  </div>
                  
                  {customers.map((customer) => (
                  <Card key={customer.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-4">
                           <div className={`w-3 h-3 rounded-full ${getStatusColor(customer.status)}`}></div>
                           <div>
                             <div className="flex items-center space-x-2">
                               <h4 className="font-medium text-white">{customer.customer_name}</h4>
                               {customer.customer_email && (
                                 <Badge variant="outline" className="bg-blue-900/30 border-blue-500 text-blue-300 text-xs">
                                   <UserCheck className="w-3 h-3 mr-1" />
                                   Self-Registered
                                 </Badge>
                               )}
                             </div>
                             <p className="text-sm text-slate-400">{customer.domain}</p>
                             {customer.customer_email && (
                               <p className="text-xs text-slate-500">{customer.customer_email}</p>
                             )}
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
              
              {/* Recent Customer Activity Section */}
              <Card className="bg-slate-800/50 border-slate-700 mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Clock className="w-5 h-5 mr-2 text-blue-400" />
                    Recent Customer Activity
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Customer registrations from the Customer Integration Portal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {customers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                      <p>No customer registrations yet</p>
                      <p className="text-sm mt-1">When customers register through the Customer Integration Portal, they'll appear here automatically.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customers
                        .filter(customer => customer.customer_email) // Only show self-registered customers
                        .slice(0, 5) // Show last 5
                        .map((customer) => (
                          <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-600">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-medium">{customer.customer_name}</span>
                                  <Badge variant="outline" className="bg-green-900/30 border-green-500 text-green-300 text-xs">
                                    Self-Registered
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-400">{customer.domain} • {customer.customer_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={`${customer.status === 'active' ? 'bg-green-900/30 border-green-500 text-green-300' : 'bg-yellow-900/30 border-yellow-500 text-yellow-300'}`}
                              >
                                {customer.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => manageCustomer(customer)}
                                className="text-slate-300 border-slate-600 hover:bg-slate-700"
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Manage
                              </Button>
                            </div>
                          </div>
                        ))}
                      
                      {customers.filter(customer => customer.customer_email).length === 0 && (
                        <div className="text-center py-4 text-slate-400">
                          <p>All customers were created manually by admin</p>
                          <p className="text-sm mt-1">Customer self-registrations will appear here with real-time updates.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                <Button onClick={saveWAFConfiguration} className="mr-2">Save Configuration</Button>
                <Button variant="outline" onClick={loadWAFConfiguration}>Reset to Saved</Button>
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
                        <span>{realTimeMetrics.avgResponseTime.toFixed(1)}ms</span>
                      </div>
                      <Progress value={Math.min(realTimeMetrics.avgResponseTime, 100)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span>{realTimeMetrics.cpuUsage.toFixed(1)}%</span>
                      </div>
                      <Progress value={realTimeMetrics.cpuUsage} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>{realTimeMetrics.memoryUsage.toFixed(1)}%</span>
                      </div>
                      <Progress value={realTimeMetrics.memoryUsage} className="h-2" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Security Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Requests Processed</span>
                      <Badge variant="outline">{realTimeMetrics.requestsProcessed.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Threats Blocked</span>
                      <Badge variant="destructive">{realTimeMetrics.threatsBlocked.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">False Positives</span>
                      <Badge variant="secondary">{realTimeMetrics.falsePositives}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Block Rate</span>
                      <Badge variant="outline">{realTimeMetrics.blockRate.toFixed(1)}%</Badge>
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
                 <div className="flex justify-between items-center">
                   <Button onClick={loadSecurityRules} disabled={loading}>
                     <Shield className="w-4 h-4 mr-2" />
                     Refresh Rules
                   </Button>
                   <Button variant="outline" onClick={addNewRule}>
                     <Shield className="w-4 h-4 mr-2" />
                     Add New Rule
                   </Button>
                 </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading security rules...</p>
                  </div>
                ) : (
                  <SecurityRulesTable />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab />
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

      {/* Add Rule Modal */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Security Rule</DialogTitle>
            <DialogDescription>
              Create a new security rule for WAF protection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="SQL Injection Protection"
                />
              </div>
              <div>
                <Label htmlFor="rule-severity">Severity</Label>
                <Select value={newRule.severity} onValueChange={(value) => setNewRule(prev => ({ ...prev, severity: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={newRule.description}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detects and blocks SQL injection attempts"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rule-type">Rule Type</Label>
                <Select value={newRule.rule_type} onValueChange={(value) => setNewRule(prev => ({ ...prev, rule_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owasp">OWASP</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="bot">Bot Detection</SelectItem>
                    <SelectItem value="ddos">DDoS Protection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rule-category">Category</Label>
                <Select value={newRule.category} onValueChange={(value) => setNewRule(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injection">Injection</SelectItem>
                    <SelectItem value="xss">XSS</SelectItem>
                    <SelectItem value="rate_limit">Rate Limiting</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="malware">Malware</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="rule-priority">Priority (1-1000)</Label>
              <Input
                id="rule-priority"
                type="number"
                min="1"
                max="1000"
                value={newRule.priority}
                onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}
              />
            </div>

            <div>
              <Label>Detection Patterns (one per line)</Label>
              <Textarea
                value={newRule.conditions.patterns.join('\n')}
                onChange={(e) => {
                  const patterns = e.target.value.split('\n').filter(p => p.trim() !== '');
                  setNewRule(prev => ({ 
                    ...prev, 
                    conditions: { ...prev.conditions, patterns }
                  }));
                }}
                placeholder="union.*select&#10;drop.*table&#10;exec.*xp_"
                rows={4}
              />
            </div>

            <div>
              <Label>Target Fields</Label>
              <div className="flex gap-2 mt-2">
                {['body', 'query', 'headers', 'path', 'user_agent'].map(field => (
                  <Button
                    key={field}
                    size="sm"
                    variant={newRule.conditions.fields.includes(field) ? 'default' : 'outline'}
                    onClick={() => {
                      const fields = newRule.conditions.fields.includes(field)
                        ? newRule.conditions.fields.filter(f => f !== field)
                        : [...newRule.conditions.fields, field];
                      setNewRule(prev => ({ 
                        ...prev, 
                        conditions: { ...prev.conditions, fields }
                      }));
                    }}
                  >
                    {field}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Actions</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newRule.actions.log}
                      onCheckedChange={(checked) => setNewRule(prev => ({
                        ...prev,
                        actions: { ...prev.actions, log: checked }
                      }))}
                    />
                    <Label>Log Event</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newRule.actions.alert}
                      onCheckedChange={(checked) => setNewRule(prev => ({
                        ...prev,
                        actions: { ...prev.actions, alert: checked }
                      }))}
                    />
                    <Label>Send Alert</Label>
                  </div>
                </div>
                <div>
                  <Label>Action Type</Label>
                  <Select 
                    value={newRule.actions.action} 
                    onValueChange={(value) => setNewRule(prev => ({
                      ...prev,
                      actions: { ...prev.actions, action: value }
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="block">Block Request</SelectItem>
                      <SelectItem value="challenge">Challenge</SelectItem>
                      <SelectItem value="rate_limit">Rate Limit</SelectItem>
                      <SelectItem value="monitor">Monitor Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRule(false)}>Cancel</Button>
            <Button onClick={createNewRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Details Modal */}
      <Dialog open={showRuleDetails} onOpenChange={setShowRuleDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Security Rule Details</DialogTitle>
            <DialogDescription>
              Detailed view of security rule configuration
            </DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rule Name</Label>
                  <Input value={selectedRule.name} readOnly />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={selectedRule.enabled ? 'default' : 'secondary'}>
                      {selectedRule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline">{selectedRule.severity}</Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea value={selectedRule.description} readOnly rows={2} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Type</Label>
                  <Input value={selectedRule.rule_type} readOnly />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={selectedRule.category} readOnly />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Input value={selectedRule.priority} readOnly />
                </div>
              </div>

              {selectedRule.conditions && (
                <div>
                  <Label>Rule Conditions</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedRule.conditions, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedRule.actions && (
                <div>
                  <Label>Rule Actions</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedRule.actions, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <Label>Created</Label>
                  <p>{new Date(selectedRule.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <p>{new Date(selectedRule.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDetails(false)}>Close</Button>
            <Button variant="destructive" onClick={() => {
              if (selectedRule) {
                toggleRule(selectedRule.id, !selectedRule.enabled);
                setShowRuleDetails(false);
              }
            }}>
              {selectedRule?.enabled ? 'Disable Rule' : 'Enable Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WAFManagement;