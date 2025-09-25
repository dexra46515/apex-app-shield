import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  GitBranch, 
  Download, 
  TestTube2, 
  Bug,
  Code,
  Zap,
  Shield,
  GitMerge,
  Terminal,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  FileCode,
  Webhook,
  Container,
  Activity,
  Database,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const DeveloperCentricWAF = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Docker WAF States
  const [dockerStatus, setDockerStatus] = useState('stopped');
  const [wafMetrics, setWafMetrics] = useState(null);
  
  // GitOps States
  const [gitopsConfig, setGitopsConfig] = useState({
    repository_url: '',
    branch_name: 'main',
    policy_file_path: '.waf/security-policies.yaml',
    auto_deploy: false,
    git_provider: 'github'
  });
  const [gitopsStatus, setGitopsStatus] = useState('pending');
  
  // Dev WAF States
  const [devWafConfig, setDevWafConfig] = useState({
    framework: 'express',
    config_name: 'development-waf'
  });
  const [generatedConfig, setGeneratedConfig] = useState('');
  
  // OpenAPI Testing States
  const [openApiConfig, setOpenApiConfig] = useState({
    targetUrl: 'http://localhost:8080',
    openApiSpec: '',
    testCount: 50
  });
  const [testResults, setTestResults] = useState(null);
  
  // Request Replay States
  const [replayRequests, setReplayRequests] = useState([]);
  const [cliOutput, setCLIOutput] = useState('');
  const [debugSession, setDebugSession] = useState({
    session_name: '',
    target_domain: 'localhost:8080',
    debug_mode: 'live',
    session_duration_minutes: 60
  });
  const [activeDebugSession, setActiveDebugSession] = useState(null);

  // Docker WAF Container Management
  const handleCheckDockerWAF = async () => {
    setLoading(true);
    try {
      // Call Supabase edge function instead of localhost
      const { data, error } = await supabase.functions.invoke('waf-monitor', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'WAF status check failed');
      }
      
      if (data) {
        console.log('WAF status received:', data);
        setWafMetrics(data);
        setDockerStatus('running');
        toast({
          title: "WAF Status Retrieved",
          description: `Active Deployments: ${data.active_deployments}, Requests Today: ${data.requests_today}, Threats Blocked: ${data.threats_blocked_today}`,
        });
      } else {
        throw new Error('No WAF data received');
      }
    } catch (error) {
      setDockerStatus('error');
      setWafMetrics({
        status: "error", 
        version: "unknown",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "WAF Status Check Failed",
        description: error instanceof Error ? error.message : "Failed to retrieve WAF status from cloud backend",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // GitOps Policy Management
  const handleGitopsSync = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gitops-policy-manager', {
        body: {
          action: 'sync_policies',
          ...gitopsConfig
        }
      });

      if (error) throw error;

      setGitopsStatus(data.status);
      toast({
        title: "GitOps Sync Completed",
        description: "Security policies synchronized with repository",
      });
    } catch (error) {
      toast({
        title: "GitOps Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Dev WAF Generator
  const handleGenerateDevWAF = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dev-waf-generator', {
        body: {
          action: 'generate_config',
          framework: devWafConfig.framework,
          config_name: devWafConfig.config_name,
          customer_id: 'demo-customer',
          security_level: 'standard'
        }
      });

      if (error) throw new Error(error.message || 'WAF generation failed');

      if (!data || !data.middleware_code) {
        throw new Error('No middleware code generated');
      }

      setGeneratedConfig(data.middleware_code);
      toast({
        title: "Dev WAF Generated",
        description: `${devWafConfig.framework} middleware ready for download`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // OpenAPI Security Testing
  const handleRunOpenAPITest = async () => {
    setLoading(true);
    try {
      let parsedSpec = null;
      if (openApiConfig.openApiSpec.trim()) {
        try {
          parsedSpec = JSON.parse(openApiConfig.openApiSpec);
        } catch {
          throw new Error('Invalid OpenAPI JSON specification');
        }
      }

      const { data, error } = await supabase.functions.invoke('openapi-traffic-generator', {
        body: {
          openApiSpec: parsedSpec,
          targetUrl: openApiConfig.targetUrl,
          testCount: openApiConfig.testCount,
          includeAttacks: true,
          attackRatio: 0.4
        }
      });

      if (error) throw error;

      setTestResults(data);
      toast({
        title: "OpenAPI Test Completed",
        description: `${data.summary.total} requests sent, ${data.summary.blocked} blocked`,
      });
    } catch (error) {
      toast({
        title: "OpenAPI Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Traffic Simulation
  const handleSimulateTraffic = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-traffic', {
        body: {
          targetUrl: openApiConfig.targetUrl,
          pattern: 'mixed',
          count: 25
        }
      });

      if (error) throw error;

      toast({
        title: "Traffic Simulation Complete",
        description: `${data.summary.attacks} attacks sent, ${data.summary.blocked} blocked`,
      });
    } catch (error) {
      toast({
        title: "Traffic Simulation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Request Replay via edge function
  const handleRequestReplay = async (requestId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('waf-monitor', {
        body: { 
          action: 'replay_request',
          request_id: requestId, 
          debug_enabled: true 
        }
      });

      if (error) {
        throw new Error(error.message || 'Request replay failed');
      }

      setCLIOutput(JSON.stringify(data, null, 2));
      
      toast({
        title: "Request Replayed",
        description: `Request ${requestId} processed with full debugging via cloud backend`,
      });
    } catch (error) {
      toast({
        title: "Replay Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const handleStartDebugSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('realtime-debug-analyzer', {
        body: {
          action: 'start_debug_session',
          ...debugSession,
          customer_id: 'dev-team'
        }
      });

      if (error) throw error;

      setActiveDebugSession(data.session);
      toast({
        title: "Debug Session Started",
        description: "Real-time analysis active",
      });
    } catch (error) {
      toast({
        title: "Debug Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load real data from Supabase on component mount
  useEffect(() => {
    const loadRealData = async () => {
      try {
        // Load actual WAF requests from database for replay functionality
        const { data: requests, error: requestsError } = await supabase
          .from('waf_requests')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(20);
        
        if (requestsError) {
          console.error('Error loading WAF requests:', requestsError);
        } else if (requests) {
          setReplayRequests(requests);
        }

        // Load real GitOps configuration from database
        const { data: gitops, error: gitopsError } = await supabase
          .from('gitops_security_policies')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (gitopsError) {
          console.error('Error loading GitOps config:', gitopsError);
        } else if (gitops) {
          setGitopsConfig(prev => ({
            ...prev,
            repository_url: gitops.repository_url,
            branch_name: gitops.branch_name,
            policy_file_path: gitops.policy_file_path,
            auto_deploy: gitops.auto_deploy,
            git_provider: gitops.git_provider
          }));
          setGitopsStatus(gitops.sync_status);
        }

        // Load active debug sessions from database
        const { data: debug, error: debugError } = await supabase
          .from('debug_sessions')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (debugError) {
          console.error('Error loading debug sessions:', debugError);
        } else if (debug) {
          setActiveDebugSession(debug);
        }

        // Load real customer deployment data
        const { data: deployment, error: deploymentError } = await supabase
          .from('customer_deployments')
          .select('*')
          .eq('deployment_type', 'development')
          .limit(1)
          .maybeSingle();
        
        if (deploymentError) {
          console.error('Error loading deployment data:', deploymentError);
        }
      } catch (error) {
        console.error('Error loading real data:', error);
        toast({
          title: "Data Loading Error",
          description: "Failed to load some component data from database",
          variant: "destructive"
        });
      }
    };

    loadRealData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadRealData, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  // Real-time WAF status monitoring via edge function
  useEffect(() => {
    const checkRealWAFStatus = async () => {
      try {
        // Call edge function instead of localhost
        const { data, error } = await supabase.functions.invoke('waf-monitor', {
          method: 'GET'
        });
        
        if (!error && data) {
          setWafMetrics(data);
          setDockerStatus('running');
          console.log('WAF status updated from cloud backend:', data);
        } else {
          setDockerStatus('stopped');
          setWafMetrics(null);
          console.log('WAF status unavailable:', error?.message);
        }
      } catch (error) {
        setDockerStatus('stopped');
        setWafMetrics(null);
        console.log('WAF status check error:', error);
      }
    };

    // Initial check
    checkRealWAFStatus();
    
    // Real-time polling every 30 seconds (less frequent for cloud backend)
    const healthCheckInterval = setInterval(checkRealWAFStatus, 30000);
    return () => clearInterval(healthCheckInterval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Code className="h-8 w-8 text-cyan-400" />
          Developer-Centric WAF
        </h2>
        <Badge variant="secondary" className="bg-gradient-to-r from-cyan-500 to-blue-600">
          Production-Ready DevSecOps
        </Badge>
      </div>

      <Tabs defaultValue="docs" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full bg-slate-800 border-slate-700">
          <TabsTrigger value="docker" className="data-[state=active]:bg-slate-700">
            <Container className="w-4 h-4 mr-2" />
            Docker WAF
          </TabsTrigger>
          <TabsTrigger value="gitops" className="data-[state=active]:bg-slate-700">
            <GitBranch className="w-4 h-4 mr-2" />
            GitOps
          </TabsTrigger>
          <TabsTrigger value="cli" className="data-[state=active]:bg-slate-700">
            <Terminal className="w-4 h-4 mr-2" />
            CLI Tools
          </TabsTrigger>
          <TabsTrigger value="openapi" className="data-[state=active]:bg-slate-700">
            <TestTube2 className="w-4 h-4 mr-2" />
            OpenAPI Testing
          </TabsTrigger>
          <TabsTrigger value="replay" className="data-[state=active]:bg-slate-700">
            <Bug className="w-4 h-4 mr-2" />
            Request Replay
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-slate-700">
            <Database className="w-4 h-4 mr-2" />
            Live Database
          </TabsTrigger>
        </TabsList>


        {/* Docker WAF Container */}
        <TabsContent value="docker">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Container className="h-5 w-5 text-cyan-400" />
                  Standalone WAF Container (ana-waf-dev)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Container Status:</span>
                  <Badge variant={dockerStatus === 'running' ? 'default' : 'secondary'}>
                    {dockerStatus}
                  </Badge>
                </div>
                
                {wafMetrics && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Version:</span>
                      <span className="text-white">{wafMetrics.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Policies Loaded:</span>
                      <span className="text-green-400">{wafMetrics.policies_loaded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Rules:</span>
                      <span className="text-blue-400">{wafMetrics.rules_active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Requests Processed:</span>
                      <span className="text-white">{wafMetrics.requests_processed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Threats Blocked:</span>
                      <span className="text-red-400">{wafMetrics.threats_blocked}</span>
                    </div>
                  </div>
                )}
                
                <Button onClick={handleCheckDockerWAF} disabled={loading} className="w-full">
                  <Activity className="w-4 h-4 mr-2" />
                  {loading ? 'Checking WAF Status...' : 'Check WAF Status'}
                </Button>
                
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="font-semibold">Quick Commands:</div>
                  <div>🐳 Start: <code className="bg-slate-700 px-1 rounded text-green-400">docker-compose -f deployment/dev-waf/docker-compose.dev.yml up -d</code></div>
                  <div>🌐 Proxy: <code className="bg-slate-700 px-1 rounded text-blue-400">http://localhost:8081</code></div>
                  <div>⚙️ Management: <code className="bg-slate-700 px-1 rounded text-purple-400">http://localhost:9090</code></div>
                  <div>📊 Metrics: <code className="bg-slate-700 px-1 rounded text-yellow-400">http://localhost:9090/metrics</code></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  Real WAF Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">SQL Injection Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">XSS Attack Detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">Path Traversal Prevention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">Rate Limiting & DDoS Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">Live Policy Hot-Reloading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">Request Replay Debugging</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-slate-300">Prometheus Metrics Export</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-slate-700 rounded">
                  <div className="text-xs text-slate-300 font-semibold">Security Status:</div>
                  <div className="text-xs text-green-400">
                    ✓ Production-grade OpenResty WAF Engine<br/>
                    ✓ Real HTTP proxy with attack detection<br/>
                    ✓ Live request logging to Supabase database<br/>
                    ✓ Zero-mock security event pipeline<br/>
                    ✓ Real-time debugging & request replay
                  </div>
                </div>
                
                <div className="mt-2 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCheckDockerWAF}
                    disabled={loading}
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    {loading ? 'Checking...' : 'Check Status'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open('https://docs.lovable.dev/tips-tricks/troubleshooting', '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Help
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* GitOps Policy Management */}
        <TabsContent value="gitops">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GitMerge className="h-5 w-5 text-cyan-400" />
                  Policy-as-Code Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Repository URL</Label>
                  <Input
                    placeholder="https://github.com/org/repo"
                    value={gitopsConfig.repository_url}
                    onChange={(e) => setGitopsConfig({...gitopsConfig, repository_url: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Branch</Label>
                    <Input
                      value={gitopsConfig.branch_name}
                      onChange={(e) => setGitopsConfig({...gitopsConfig, branch_name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Git Provider</Label>
                    <Select value={gitopsConfig.git_provider} onValueChange={(value) => setGitopsConfig({...gitopsConfig, git_provider: value})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github">GitHub</SelectItem>
                        <SelectItem value="gitlab">GitLab</SelectItem>
                        <SelectItem value="bitbucket">Bitbucket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Policy File Path</Label>
                  <Input
                    value={gitopsConfig.policy_file_path}
                    onChange={(e) => setGitopsConfig({...gitopsConfig, policy_file_path: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={gitopsConfig.auto_deploy}
                    onCheckedChange={(checked) => setGitopsConfig({...gitopsConfig, auto_deploy: checked})}
                  />
                  <Label className="text-slate-300">Auto-deploy policy changes</Label>
                </div>
                <Button onClick={handleGitopsSync} disabled={loading} className="w-full">
                  <Webhook className="w-4 h-4 mr-2" />
                  Sync Security Policies
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-green-400" />
                  GitOps Status & Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Sync Status:</span>
                  <Badge variant={gitopsStatus === 'synced' ? 'default' : 'secondary'}>
                    {gitopsStatus}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-300">Policy Deployment Pipeline</div>
                  <Progress value={gitopsStatus === 'synced' ? 100 : 60} className="h-2" />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="text-slate-300 font-semibold">Features:</div>
                  <div className="space-y-1 text-slate-400">
                    <div>• Version-controlled security policies</div>
                    <div>• Branch-based deployment workflow</div>
                    <div>• Webhook-driven policy sync</div>
                    <div>• Automated policy validation</div>
                    <div>• Rollback capabilities</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-700 rounded">
                  <div className="text-xs text-slate-300">Example Policy (YAML):</div>
                  <pre className="text-xs text-green-400 mt-1 overflow-x-auto">
{`rules:
  - id: "SQL_INJECTION_001"
    pattern: "union.*select"
    action: "block"
    severity: "high"`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CLI Tools */}
        <TabsContent value="cli">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-green-400" />
                  ANA WAF CLI Tool (ana-waf)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Framework Selection</Label>
                  <Select value={devWafConfig.framework} onValueChange={(value) => setDevWafConfig({...devWafConfig, framework: value})}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="express">Express.js</SelectItem>
                      <SelectItem value="fastify">Fastify</SelectItem>
                      <SelectItem value="nextjs">Next.js</SelectItem>
                      <SelectItem value="django">Django</SelectItem>
                      <SelectItem value="spring">Spring Boot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={handleGenerateDevWAF} disabled={loading} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Framework Middleware
                </Button>

                <div className="space-y-2 text-xs font-mono">
                  <div className="text-slate-300 font-semibold">CLI Installation:</div>
                  <div className="bg-slate-900 p-2 rounded text-green-400">
                    cd cli && npm install -g .
                  </div>
                  
                  <div className="text-slate-300 font-semibold mt-3">Security Testing:</div>
                  <div className="bg-slate-900 p-2 rounded text-green-400">
                    ana-waf test -u http://localhost:8080 --strict
                  </div>
                  
                  <div className="text-slate-300 font-semibold mt-3">Traffic Simulation:</div>
                  <div className="bg-slate-900 p-2 rounded text-green-400">
                    ana-waf simulate -u http://localhost:8080 --count 50
                  </div>
                  
                  <div className="text-slate-300 font-semibold mt-3">Request Replay:</div>
                  <div className="bg-slate-900 p-2 rounded text-green-400">
                    ana-waf replay req_123456 --debug
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-yellow-400" />
                  Generated Middleware Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generatedConfig}
                  readOnly
                  placeholder="Generated middleware code will appear here..."
                  className="bg-slate-900 border-slate-600 text-white font-mono text-sm min-h-[300px]"
                />
                {generatedConfig && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(generatedConfig)}>
                      Copy Code
                    </Button>
                    <Button variant="outline" onClick={() => {
                      const blob = new Blob([generatedConfig], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `waf-middleware-${devWafConfig.framework}.js`;
                      a.click();
                    }}>
                      Download
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OpenAPI Testing */}
        <TabsContent value="openapi">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-orange-400" />
                  OpenAPI-Driven Security Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Target URL</Label>
                  <Input
                    placeholder="http://localhost:8080 or https://api.example.com"
                    value={openApiConfig.targetUrl}
                    onChange={(e) => setOpenApiConfig({...openApiConfig, targetUrl: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Test Count</Label>
                  <Input
                    type="number"
                    value={openApiConfig.testCount}
                    onChange={(e) => setOpenApiConfig({...openApiConfig, testCount: parseInt(e.target.value)})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">OpenAPI 3.0 Specification (JSON)</Label>
                  <Textarea
                    placeholder='{"openapi": "3.0.0", "info": {"title": "API", "version": "1.0.0"}, "paths": {...}}'
                    value={openApiConfig.openApiSpec}
                    onChange={(e) => setOpenApiConfig({...openApiConfig, openApiSpec: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white font-mono text-sm min-h-[150px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={handleRunOpenAPITest} disabled={loading}>
                    <TestTube2 className="w-4 h-4 mr-2" />
                    Run Security Test
                  </Button>
                  <Button onClick={handleSimulateTraffic} disabled={loading} variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    Simulate Traffic
                  </Button>
                </div>
                
                <div className="text-xs text-slate-400 space-y-1">
                  <div>• Generates realistic requests from OpenAPI spec</div>
                  <div>• Injects SQL injection, XSS, and other attacks</div>
                  <div>• Tests endpoint authentication & authorization</div>
                  <div>• Validates API security posture</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Test Results & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Security Score:</span>
                      <Badge variant={testResults.security_score >= 80 ? 'default' : 'destructive'}>
                        {testResults.security_score}/100
                      </Badge>
                    </div>
                    
                    {testResults.summary && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Requests:</span>
                          <span className="text-white">{testResults.summary.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Successful:</span>
                          <span className="text-green-400">{testResults.summary.successful}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Attacks Sent:</span>
                          <span className="text-yellow-400">{testResults.summary.attacks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Threats Blocked:</span>
                          <span className="text-red-400">{testResults.summary.blocked}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="text-sm text-slate-300">Block Rate:</div>
                      <Progress 
                        value={testResults.summary ? (testResults.summary.blocked / testResults.summary.attacks) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div className="text-xs text-slate-400">
                      Real traffic simulation with attack patterns injected into your API endpoints
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-12">
                    <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div>Run OpenAPI security tests to see detailed results</div>
                    <div className="text-xs mt-2">Results include vulnerability analysis and recommendations</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Request Replay & Debugging */}
        <TabsContent value="replay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bug className="h-5 w-5 text-red-400" />
                  Request Replay & Debug
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Recent WAF Requests</Label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {replayRequests.length > 0 ? replayRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between bg-slate-700 p-3 rounded">
                        <div className="text-sm flex-1">
                          <div className="text-white font-medium">{req.request_method} {req.request_path}</div>
                          <div className="text-slate-400 text-xs mt-1">
                            {req.source_ip} • Action: {req.action} • Score: {req.threat_score}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {new Date(req.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleRequestReplay(req.id)} disabled={loading}>
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                    )) : (
                      <div className="text-center text-slate-400 py-4">
                        No WAF requests available for replay
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Debug Session Configuration</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Session name"
                      value={debugSession.session_name}
                      onChange={(e) => setDebugSession({...debugSession, session_name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                    <Input
                      placeholder="Target domain"
                      value={debugSession.target_domain}
                      onChange={(e) => setDebugSession({...debugSession, target_domain: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white text-sm"
                    />
                  </div>
                  <Button onClick={handleStartDebugSession} disabled={loading} variant="outline" className="w-full">
                    <Clock className="w-4 h-4 mr-2" />
                    Start Debug Session
                  </Button>
                </div>
                
                <div className="text-xs text-slate-400 space-y-1">
                  <div>• Click replay to re-process requests with full debugging</div>
                  <div>• Shows rule-by-rule evaluation and decision logic</div>
                  <div>• Perfect for fine-tuning WAF policies</div>
                  <div>• Real-time threat scoring analysis</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-green-400" />
                  Debug Output & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={cliOutput}
                  readOnly
                  placeholder="Request replay debug output will appear here with detailed rule evaluation, threat scoring, and processing timeline..."
                  className="bg-slate-900 border-slate-600 text-white font-mono text-sm min-h-[300px]"
                />
                
                {activeDebugSession && (
                  <div className="mt-4 p-3 bg-slate-700 rounded">
                    <div className="text-sm text-slate-300 font-semibold">Active Debug Session:</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {activeDebugSession.session_name} • {activeDebugSession.target_domain}
                    </div>
                    <div className="text-xs text-green-400">
                      Events Captured: {activeDebugSession.events_captured || 0}
                    </div>
                  </div>
                )}
                
                {cliOutput && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(cliOutput)}>
                      Copy Debug Output
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCLIOutput('')}>
                      Clear Output
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* Live Database Tab - Shows Real Data */}
        <TabsContent value="database">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-400" />
                  Live WAF Requests (Real Database)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Total Requests in DB:</span>
                  <Badge variant="secondary">{replayRequests.length}</Badge>
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {replayRequests.length > 0 ? replayRequests.slice(0, 10).map((req) => (
                    <div key={req.id} className="bg-slate-700 p-3 rounded text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium">
                            {req.request_method} {req.request_path}
                          </div>
                          <div className="text-slate-400 text-xs">
                            IP: {req.source_ip} • Action: {req.action} • Score: {req.threat_score}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {new Date(req.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={req.action === 'block' ? 'destructive' : 'default'}>
                          {req.action}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-slate-400 py-6">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div>No WAF requests in database yet</div>
                      <div className="text-xs">Send traffic to your WAF to see real data</div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={async () => {
                    const { data } = await supabase.from('waf_requests').select('*').order('timestamp', { ascending: false }).limit(20);
                    if (data) setReplayRequests(data);
                  }} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh Database
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-400" />
                  Live Security Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LiveSecurityEvents />
                
                <div className="p-3 bg-slate-900 rounded">
                  <div className="text-xs text-slate-300 font-semibold mb-2">Database Tables:</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• waf_requests - All HTTP requests processed</div>
                    <div>• security_events - Detected threats & attacks</div>
                    <div>• debug_sessions - Active debugging sessions</div>
                    <div>• gitops_security_policies - Policy configurations</div>
                    <div>• customer_deployments - WAF deployment status</div>
                  </div>
                </div>

                <Button 
                  onClick={() => window.open('https://supabase.com/dashboard/project/kgazsoccrtmhturhxggi/editor', '_blank')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open Supabase Console
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

// Component to show live security events from database
const LiveSecurityEvents = () => {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    const loadSecurityEvents = async () => {
      try {
        const { data } = await supabase
          .from('security_events')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5);
        
        if (data) setEvents(data);
      } catch (error) {
        console.error('Error loading security events:', error);
      }
    };

    loadSecurityEvents();
    const interval = setInterval(loadSecurityEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      <div className="text-sm text-slate-300">Recent Security Events:</div>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {events.length > 0 ? events.map((event) => (
          <div key={event.id} className="bg-slate-700 p-2 rounded text-xs">
            <div className="flex justify-between">
              <span className="text-white font-medium">{event.event_type}</span>
              <Badge variant="destructive" className="text-xs">
                {event.severity}
              </Badge>
            </div>
            <div className="text-slate-400 mt-1">
              {event.source_ip} • {event.description?.substring(0, 40)}...
            </div>
            <div className="text-slate-500 text-xs">
              {new Date(event.timestamp).toLocaleString()}
            </div>
          </div>
        )) : (
          <div className="text-slate-400 text-center py-4">
            No security events detected yet
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperCentricWAF;