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
  Webhook
} from 'lucide-react';

const DeveloperCentricWAF = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
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
  
  // CI/CD Testing States
  const [cicdTest, setCicdTest] = useState({
    repository_url: '',
    branch_name: 'main',
    test_suite_name: 'security-scan'
  });
  const [testResults, setTestResults] = useState(null);
  
  // Debug Session States
  const [debugSession, setDebugSession] = useState({
    session_name: '',
    target_domain: '',
    debug_mode: 'live',
    session_duration_minutes: 60
  });
  const [activeDebugSession, setActiveDebugSession] = useState(null);
  const [debugEvents, setDebugEvents] = useState([]);

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
        title: "GitOps Sync Initiated",
        description: "Security policies are being synchronized with your repository.",
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
          config_name: devWafConfig.config_name
        }
      });

      if (error) throw error;

      setGeneratedConfig(data.middleware_code);
      toast({
        title: "Dev WAF Generated",
        description: `${devWafConfig.framework} middleware configuration generated successfully.`,
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

  // CI/CD Security Testing
  const handleRunSecurityTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cicd-security-tester', {
        body: {
          action: 'run_security_scan',
          ...cicdTest,
          commit_hash: 'latest'
        }
      });

      if (error) throw error;

      setTestResults(data);
      toast({
        title: "Security Test Started",
        description: "CI/CD security testing pipeline initiated.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Debug Session Management
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
        description: "Real-time debug analysis is now active.",
      });
    } catch (error) {
      toast({
        title: "Debug Start Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load existing configurations
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        // Load GitOps configs
        const { data: gitopsData } = await supabase
          .from('gitops_security_policies')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (gitopsData) {
          setGitopsConfig(gitopsData);
          setGitopsStatus(gitopsData.sync_status);
        }

        // Load debug sessions
        const { data: debugData } = await supabase
          .from('debug_sessions')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        
        if (debugData) {
          setActiveDebugSession(debugData);
        }
      } catch (error) {
        console.error('Error loading configurations:', error);
      }
    };

    loadConfigurations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Code className="h-8 w-8 text-cyan-400" />
          Developer-Centric WAF
        </h2>
        <Badge variant="secondary" className="bg-gradient-to-r from-cyan-500 to-blue-600">
          Next-Generation DevSecOps
        </Badge>
      </div>

      <Tabs defaultValue="gitops" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full bg-slate-800 border-slate-700">
          <TabsTrigger value="gitops" className="data-[state=active]:bg-slate-700">
            <GitBranch className="w-4 h-4 mr-2" />
            GitOps Policies
          </TabsTrigger>
          <TabsTrigger value="dev-waf" className="data-[state=active]:bg-slate-700">
            <Download className="w-4 h-4 mr-2" />
            Dev WAF Generator
          </TabsTrigger>
          <TabsTrigger value="cicd" className="data-[state=active]:bg-slate-700">
            <TestTube2 className="w-4 h-4 mr-2" />
            CI/CD Testing
          </TabsTrigger>
          <TabsTrigger value="debug" className="data-[state=active]:bg-slate-700">
            <Bug className="w-4 h-4 mr-2" />
            Real-time Debug
          </TabsTrigger>
        </TabsList>

        {/* GitOps Policy Management */}
        <TabsContent value="gitops">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GitMerge className="h-5 w-5 text-cyan-400" />
                  GitOps Configuration
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
                  <Label className="text-slate-300">Auto-deploy changes</Label>
                </div>
                <Button onClick={handleGitopsSync} disabled={loading} className="w-full">
                  <Webhook className="w-4 h-4 mr-2" />
                  Sync Policies
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Current Status:</span>
                  <Badge variant={gitopsStatus === 'synced' ? 'default' : 'secondary'}>
                    {gitopsStatus}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-slate-300">Version-Controlled Security Policies</div>
                  <Progress value={gitopsStatus === 'synced' ? 100 : 60} className="h-2" />
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  <div>• Automatic policy synchronization</div>
                  <div>• Git-based security configuration</div>
                  <div>• Branch-based deployment pipeline</div>
                  <div>• Webhook-driven updates</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dev WAF Generator */}
        <TabsContent value="dev-waf">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-400" />
                  Framework Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Framework</Label>
                  <Select value={devWafConfig.framework} onValueChange={(value) => setDevWafConfig({...devWafConfig, framework: value})}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="express">Express.js</SelectItem>
                      <SelectItem value="fastify">Fastify</SelectItem>
                      <SelectItem value="koa">Koa.js</SelectItem>
                      <SelectItem value="nextjs">Next.js</SelectItem>
                      <SelectItem value="django">Django</SelectItem>
                      <SelectItem value="flask">Flask</SelectItem>
                      <SelectItem value="spring">Spring Boot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Configuration Name</Label>
                  <Input
                    value={devWafConfig.config_name}
                    onChange={(e) => setDevWafConfig({...devWafConfig, config_name: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <Button onClick={handleGenerateDevWAF} disabled={loading} className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Dev WAF
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-yellow-400" />
                  Generated Middleware
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generatedConfig}
                  readOnly
                  placeholder="Generated middleware code will appear here..."
                  className="bg-slate-900 border-slate-600 text-white font-mono text-sm min-h-[200px]"
                />
                {generatedConfig && (
                  <Button variant="outline" className="mt-4" onClick={() => navigator.clipboard.writeText(generatedConfig)}>
                    Copy Code
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CI/CD Security Testing */}
        <TabsContent value="cicd">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-orange-400" />
                  CI/CD Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Repository URL</Label>
                  <Input
                    placeholder="https://github.com/org/repo"
                    value={cicdTest.repository_url}
                    onChange={(e) => setCicdTest({...cicdTest, repository_url: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Branch</Label>
                    <Input
                      value={cicdTest.branch_name}
                      onChange={(e) => setCicdTest({...cicdTest, branch_name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Test Suite</Label>
                    <Input
                      value={cicdTest.test_suite_name}
                      onChange={(e) => setCicdTest({...cicdTest, test_suite_name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <Button onClick={handleRunSecurityTest} disabled={loading} className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Run Security Tests
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Test Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testResults ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Security Score:</span>
                      <Badge variant={testResults.security_score >= 80 ? 'default' : 'destructive'}>
                        {testResults.security_score}/100
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Vulnerabilities:</span>
                      <span className="text-red-400">{testResults.vulnerabilities_found}</span>
                    </div>
                    <Progress value={testResults.security_score} className="h-2" />
                    <div className="text-xs text-slate-400">
                      Test Duration: {testResults.test_duration_ms}ms
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No test results yet. Run a security test to see results.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Real-time Debug */}
        <TabsContent value="debug">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-red-400" />
                  Debug Session Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Session Name</Label>
                  <Input
                    placeholder="Debug session name"
                    value={debugSession.session_name}
                    onChange={(e) => setDebugSession({...debugSession, session_name: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Target Domain</Label>
                  <Input
                    placeholder="api.example.com"
                    value={debugSession.target_domain}
                    onChange={(e) => setDebugSession({...debugSession, target_domain: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Debug Mode</Label>
                    <Select value={debugSession.debug_mode} onValueChange={(value) => setDebugSession({...debugSession, debug_mode: value})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live Analysis</SelectItem>
                        <SelectItem value="replay">Replay Mode</SelectItem>
                        <SelectItem value="capture">Capture Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Duration (min)</Label>
                    <Input
                      type="number"
                      value={debugSession.session_duration_minutes}
                      onChange={(e) => setDebugSession({...debugSession, session_duration_minutes: parseInt(e.target.value)})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <Button onClick={handleStartDebugSession} disabled={loading} className="w-full">
                  <Bug className="w-4 h-4 mr-2" />
                  Start Debug Session
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Live Debug Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeDebugSession ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Active Session:</span>
                      <Badge variant="default">{activeDebugSession.session_name}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-300">Events Captured: {activeDebugSession.events_captured}</span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded border border-slate-600 max-h-[200px] overflow-y-auto">
                      <div className="text-xs text-slate-400 font-mono">
                        Real-time debug events will appear here...
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No active debug session. Start a session to begin live analysis.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeveloperCentricWAF;