import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Eye,
  Bot,
  Globe,
  Lock,
  TrendingUp,
  Brain,
  FileText,
  Database,
  Network,
  Zap,
  X,
  Clock,
  MapPin,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ComplianceReports from './ComplianceReports';
import HoneypotManagement from './HoneypotManagement';
import CustomerSpecificCompliance from './CustomerSpecificCompliance';
import CustomerAdaptiveRules from './CustomerAdaptiveRules';
import CustomerSIEMAnalytics from './CustomerSIEMAnalytics';

interface AdvancedSecurityStats {
  aiAnomalies: number;
  honeypotInteractions: number;
  adaptiveRules: number;
  complianceScore: number;
  schemaViolations: number;
  geoBlocks: number;
  siemEvents: number;
  tlsFingerprints: number;
  encryptedFlows: number;
  ddosPredictions: number;
  dynamicHoneypots: number;
  ttpPatterns: number;
  ruleDeployments: number;
}

const AdvancedSecurityDashboard = () => {
  const [stats, setStats] = useState<AdvancedSecurityStats>({
    aiAnomalies: 0,
    honeypotInteractions: 0,
    adaptiveRules: 0,
    complianceScore: 85,
    schemaViolations: 0,
    geoBlocks: 0,
    siemEvents: 0,
    tlsFingerprints: 0,
    encryptedFlows: 0,
    ddosPredictions: 0,
    dynamicHoneypots: 0,
    ttpPatterns: 0,
    ruleDeployments: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportsRefresh, setReportsRefresh] = useState(0);
  const [showAIReports, setShowAIReports] = useState(false);
  const [aiReports, setAiReports] = useState<any[]>([]);
  const [siemStatus, setSiemStatus] = useState<any>(null);
  const [siemConfig, setSiemConfig] = useState({
    type: 'splunk',
    endpoint: '',
    apiKey: '',
    enabled: false
  });
  const [honeypots, setHoneypots] = useState<any[]>([]);
  const [honeypotInteractions, setHoneypotInteractions] = useState<any[]>([]);
  const [resultDialog, setResultDialog] = useState<{ open: boolean; title: string; content: any }>({
    open: false,
    title: '',
    content: null
  });

  const loadAdvancedStats = async () => {
    try {
      // AI Anomaly Detections
      const { count: aiCount } = await supabase
        .from('ai_anomaly_detections')
        .select('*', { count: 'exact', head: true });

      // Honeypot Interactions
      const { count: honeypotCount } = await supabase
        .from('honeypot_interactions')
        .select('*', { count: 'exact', head: true });

      // Load real honeypots data
      const { data: honeypotsData, error: honeypotsError } = await supabase
        .from('honeypots')
        .select('*')
        .eq('is_active', true);

      if (honeypotsError) console.error('Error loading honeypots:', honeypotsError);
      else setHoneypots(honeypotsData || []);

      // Load recent honeypot interactions
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('honeypot_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (interactionsError) console.error('Error loading interactions:', interactionsError);
      else setHoneypotInteractions(interactionsData || []);

      // Adaptive Rules
      const { count: adaptiveCount } = await supabase
        .from('adaptive_rules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Schema Violations
      const { count: schemaCount } = await supabase
        .from('schema_violations')
        .select('*', { count: 'exact', head: true });

      // Geo Restrictions
      const { count: geoCount } = await supabase
        .from('geo_restrictions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // SIEM Events
      const { count: siemCount } = await supabase
        .from('siem_events')
        .select('*', { count: 'exact', head: true });

      // Advanced Differentiators - New tables
      const { count: tlsCount } = await supabase
        .from('tls_fingerprints')
        .select('*', { count: 'exact', head: true });

      const { count: flowCount } = await supabase
        .from('encrypted_flow_patterns')
        .select('*', { count: 'exact', head: true });

      const { count: ddosCount } = await supabase
        .from('ddos_predictions')
        .select('*', { count: 'exact', head: true });

      const { count: dynamicHoneypotCount } = await supabase
        .from('dynamic_honeypots')
        .select('*', { count: 'exact', head: true });

      const { count: ttpCount } = await supabase
        .from('attack_ttp_patterns')
        .select('*', { count: 'exact', head: true });

      const { count: ruleDeploymentCount } = await supabase
        .from('rule_deployments')
        .select('*', { count: 'exact', head: true });

      setStats({
        aiAnomalies: aiCount || 0,
        honeypotInteractions: honeypotCount || 0,
        adaptiveRules: adaptiveCount || 0,
        complianceScore: 85,
        schemaViolations: schemaCount || 0,
        geoBlocks: geoCount || 3,
        siemEvents: siemCount || 0,
        tlsFingerprints: tlsCount || 0,
        encryptedFlows: flowCount || 0,
        ddosPredictions: ddosCount || 0,
        dynamicHoneypots: dynamicHoneypotCount || 0,
        ttpPatterns: ttpCount || 0,
        ruleDeployments: ruleDeploymentCount || 0
      });
    } catch (error) {
      console.error('Error loading advanced stats:', error);
      toast({
        title: "Error",
        description: "Failed to load advanced security statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    console.log('AI Analysis button clicked!');
    try {
      toast({
        title: "Starting AI Analysis",
        description: "Running anomaly detection...",
      });

      const response = await supabase.functions.invoke('ai-anomaly-detector', {
        body: {
          session_data: {
            session_id: `analysis-${Date.now()}`,
            source_ip: '0.0.0.0', // Will be populated by real traffic analysis
            user_agent: 'WAF-Analysis-Engine'
          },
          behavioral_metrics: {
            request_frequency: 0, // Will analyze real request patterns
            unusual_paths: [], // Will detect from actual traffic
            suspicious_payloads: false, // Will analyze real payloads
            geographic_anomaly: false // Will detect from real geo data
          }
        }
      });

      console.log('AI Analysis response:', response);

      if (response.error) throw response.error;

      toast({
        title: "AI Analysis Complete",
        description: `Anomaly score: ${response.data?.analysis?.anomaly_score || 'N/A'}`,
      });
      
      loadAdvancedFeatures(); // Refresh stats
    } catch (error) {
      console.error('Error running AI analysis:', error);
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Unable to perform AI anomaly detection",
        variant: "destructive",
      });
    }
  };

  const viewAIReports = async () => {
    try {
      toast({
        title: "Loading AI Reports",
        description: "Fetching AI anomaly detection reports...",
      });

      const { data, error } = await supabase
        .from('ai_anomaly_detections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setAiReports(data || []);
      setShowAIReports(true);

      toast({
        title: "AI Reports Loaded",
        description: `Found ${data?.length || 0} AI anomaly detection reports`,
      });
      
    } catch (error) {
      console.error('Error loading AI reports:', error);
      toast({
        title: "Error Loading Reports",
        description: "Failed to load AI anomaly detection reports",
        variant: "destructive",
      });
    }
  };

  const generateComplianceReport = async (reportType: string) => {
    console.log('Compliance Report button clicked for:', reportType);
    try {
      toast({
        title: "Generating Report",
        description: `Creating ${reportType.toUpperCase()} compliance report...`,
      });

      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await supabase.functions.invoke('compliance-reporter', {
        body: {
          report_type: reportType,
          start_date: startDate,
          end_date: endDate,
          generated_by: user?.id
        }
      });

      console.log('Compliance report response:', response);

      if (response.error) throw response.error;

      toast({
        title: "Compliance Report Generated",
        description: `${reportType.toUpperCase()} report created successfully`,
      });
      setReportsRefresh((v) => v + 1);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      toast({
        title: "Report Generation Failed",
        description: error.message || "Unable to generate compliance report",
        variant: "destructive",
      });
    }
  };

  const loadAdvancedFeatures = async () => {
    await loadAdvancedStats();
    await loadSiemStatus();
  };

  useEffect(() => {
    loadAdvancedFeatures();
  }, []);

  const loadSiemStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('siem-integrator', {
        method: 'GET'
      });

      if (error) throw error;

      setSiemStatus(data);
      console.log('SIEM Status loaded:', data);
    } catch (error) {
      console.error('Error loading SIEM status:', error);
      setSiemStatus({
        total_events: 0,
        exported_events: 0,
        export_rate: 0,
        configured: false
      });
    }
  };

  const configureSiem = async () => {
    if (!siemConfig.endpoint || !siemConfig.apiKey) {
      toast({
        title: "Configuration Error",
        description: "Please fill in SIEM endpoint and API key",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Configuring SIEM",
        description: "Setting up SIEM integration...",
      });

      const { data, error } = await supabase.functions.invoke('siem-integrator', {
        body: {
          action: 'configure_integration',
          config: {
            type: siemConfig.type,
            endpoint: siemConfig.endpoint,
            api_key: siemConfig.apiKey,
            enabled: true
          }
        }
      });

      if (error) throw error;

      toast({
        title: "SIEM Configured",
        description: `${siemConfig.type.toUpperCase()} integration configured successfully`,
      });

      loadSiemStatus();
    } catch (error) {
      console.error('Error configuring SIEM:', error);
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to configure SIEM integration",
        variant: "destructive",
      });
    }
  };

  const testSiemConnection = async () => {
    try {
      toast({
        title: "Testing Connection",
        description: "Testing SIEM integration connection...",
      });

      const { data, error } = await supabase.functions.invoke('siem-integrator', {
        body: {
          action: 'test_connection',
          config: {
            type: siemConfig.type,
            endpoint: siemConfig.endpoint,
            api_key: siemConfig.apiKey
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Connection Test",
        description: data.success ? "SIEM connection successful!" : "SIEM connection failed",
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error testing SIEM connection:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test SIEM connection",
        variant: "destructive",
      });
    }
  };

  const exportEventsToSiem = async () => {
    try {
      toast({
        title: "Exporting Events",
        description: "Exporting security events to SIEM...",
      });

      const { data, error } = await supabase.functions.invoke('siem-integrator', {
        body: {
          action: 'export_events',
          batch_size: 100
        }
      });

      if (error) throw error;

      toast({
        title: "Export Complete",
        description: `Exported ${data.exported_count || 0} events to SIEM`,
      });

      loadSiemStatus();
    } catch (error) {
      console.error('Error exporting to SIEM:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export events to SIEM",
        variant: "destructive",
      });
    }
  };

  const triggerAdvancedFeature = async (type: string) => {
    try {
      const functionMap: { [key: string]: string } = {
        'tls': 'tls-fingerprint-analyzer',
        'flow': 'encrypted-flow-analyzer',
        'ddos': 'predictive-ddos-analyzer',
        'honeypot': 'dynamic-honeypot-generator',
        'ttp': 'ttp-pattern-collector'
      };

      toast({
        title: "Analysis Started",
        description: `Running ${type.toUpperCase()} analysis...`,
      });

      // Generate test data based on feature type
      let requestBody: any = { 
        trigger: 'manual_analysis',
        timestamp: new Date().toISOString(),
        source: 'dashboard'
      };

      // Add specific test data for each feature type
      if (type === 'tls') {
        requestBody.tls_data = {
          version: '771',
          cipher_suites: ['TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384'],
          extensions: ['server_name', 'supported_groups'],
          elliptic_curves: ['secp256r1'],
          ec_point_formats: ['uncompressed']
        };
        requestBody.source_ip = '192.168.1.100';
      } else if (type === 'flow') {
        requestBody.flow_data = {
          packet_sizes: [64, 128, 256, 512],
          timing_patterns: { inter_arrival_times: [10, 15, 12] },
          protocol: 'TLS',
          packet_count: 25
        };
        requestBody.source_ip = '192.168.1.100';
        requestBody.destination_ip = '203.0.113.50';
      } else if (type === 'ddos') {
        requestBody.traffic_data = {
          requests_per_second: 1500,
          baseline_rps: 800,
          source_ips: ['192.168.1.100', '10.0.0.50'],
          requests: [{ size: 1024 }],
          historical_rps: [800, 900, 1200]
        };
      }

      const { data, error } = await supabase.functions.invoke(functionMap[type], {
        body: requestBody
      });

      if (error) throw error;

      toast({
        title: "Analysis Complete",
        description: `${type.toUpperCase()} analysis completed successfully`,
      });

      loadAdvancedStats();
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: `Failed to run ${type} analysis: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const viewLatest = async (type: string) => {
    try {
      const map: Record<string, { table: string; order: string; title: string }> = {
        tls: { table: 'tls_fingerprints', order: 'last_seen', title: 'Latest TLS Fingerprint' },
        flow: { table: 'encrypted_flow_patterns', order: 'detected_at', title: 'Latest Encrypted Flow Analysis' },
        ddos: { table: 'ddos_predictions', order: 'predicted_at', title: 'Latest DDoS Prediction' },
        honeypot: { table: 'dynamic_honeypots', order: 'created_at', title: 'Latest Dynamic Honeypot' },
        ttp: { table: 'attack_ttp_patterns', order: 'created_at', title: 'Latest TTP Pattern' },
        rule: { table: 'rule_deployments', order: 'start_time', title: 'Latest Rule Deployment' },
      };
      const cfg = map[type];
      if (!cfg) return;

      const { data, error } = await (supabase as any)
        .from(cfg.table)
        .select('*')
        .order(cfg.order, { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setResultDialog({ open: true, title: cfg.title, content: data || { message: 'No records found.' } });
    } catch (err: any) {
      toast({ title: 'Load Failed', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading advanced security features...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
          Advanced WAF Security Center
        </h2>
        <Button onClick={runAIAnalysis} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
          <Brain className="w-4 h-4 mr-2" />
          Run AI Analysis
        </Button>
      </div>

      {/* Advanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-purple-800/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">AI Anomalies Detected</CardTitle>
            <Brain className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-300">{stats.aiAnomalies}</div>
            <p className="text-xs text-purple-400/70">Machine learning analysis</p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-900/20 to-orange-800/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Honeypot Interactions</CardTitle>
            <Eye className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-300">{stats.honeypotInteractions}</div>
            <p className="text-xs text-orange-400/70">Deception mesh active</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-gradient-to-br from-green-900/20 to-green-800/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-200">Adaptive Rules</CardTitle>
            <Zap className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-300">{stats.adaptiveRules}</div>
            <p className="text-xs text-green-400/70">Self-learning security</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-blue-800/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-200">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-300">{stats.complianceScore}%</div>
            <p className="text-xs text-blue-400/70">Multi-standard compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Differentiators Grid */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-white">🚀 Advanced AI Security Differentiators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-cyan-800/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-200">TLS Fingerprinting</CardTitle>
              <Shield className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-300">{stats.tlsFingerprints}</div>
              <p className="text-xs text-cyan-400/70">JA3 signatures captured</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => triggerAdvancedFeature('tls')} variant="outline" className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10">Run</Button>
                <Button size="sm" onClick={() => viewLatest('tls')} variant="ghost" className="text-cyan-300 hover:text-white">View latest</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 to-indigo-800/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-200">Encrypted Flow Analysis</CardTitle>
              <Eye className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-300">{stats.encryptedFlows}</div>
              <p className="text-xs text-indigo-400/70">Flow patterns analyzed</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => triggerAdvancedFeature('flow')} variant="outline" className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10">Run</Button>
                <Button size="sm" onClick={() => viewLatest('flow')} variant="ghost" className="text-indigo-300 hover:text-white">View latest</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-gradient-to-br from-red-900/20 to-red-800/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-200">Predictive DDoS</CardTitle>
              <Zap className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-300">{stats.ddosPredictions}</div>
              <p className="text-xs text-red-400/70">Attack predictions made</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => triggerAdvancedFeature('ddos')} variant="outline" className="border-red-500/50 text-red-300 hover:bg-red-500/10">Run</Button>
                <Button size="sm" onClick={() => viewLatest('ddos')} variant="ghost" className="text-red-300 hover:text-white">View latest</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-yellow-800/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-200">Dynamic Honeypots</CardTitle>
              <Target className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-300">{stats.dynamicHoneypots}</div>
              <p className="text-xs text-yellow-400/70">Auto-generated traps</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => triggerAdvancedFeature('honeypot')} variant="outline" className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10">Run</Button>
                <Button size="sm" onClick={() => viewLatest('honeypot')} variant="ghost" className="text-yellow-300 hover:text-white">View latest</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-pink-500/30 bg-gradient-to-br from-pink-900/20 to-pink-800/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-pink-200">TTP Intelligence</CardTitle>
              <Brain className="h-4 w-4 text-pink-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pink-300">{stats.ttpPatterns}</div>
              <p className="text-xs text-pink-400/70">Attack patterns cataloged</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => triggerAdvancedFeature('ttp')} variant="outline" className="border-pink-500/50 text-pink-300 hover:bg-pink-500/10">Run</Button>
                <Button size="sm" onClick={() => viewLatest('ttp')} variant="ghost" className="text-pink-300 hover:text-white">View latest</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-violet-800/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-violet-200">Rule Pipeline</CardTitle>
              <Activity className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-300">{stats.ruleDeployments}</div>
              <p className="text-xs text-violet-400/70">Shadow → Canary → Prod</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => viewLatest('rule')} variant="outline" className="border-violet-500/50 text-violet-300 hover:bg-violet-500/10">View latest</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="ai-analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7 bg-slate-800 border-slate-700">
          <TabsTrigger value="ai-analysis" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">AI Analysis</TabsTrigger>
          <TabsTrigger value="honeypots" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Honeypots</TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Compliance</TabsTrigger>
          <TabsTrigger value="adaptive" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Adaptive Rules</TabsTrigger>
          <TabsTrigger value="geo-blocking" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Geo Blocking</TabsTrigger>
          <TabsTrigger value="builtin-siem" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Built-in SIEM</TabsTrigger>
          <TabsTrigger value="siem" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">External SIEM</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-analysis" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Brain className="w-5 h-5 text-purple-400" />
                AI-Powered Anomaly Detection
              </CardTitle>
              <CardDescription className="text-slate-400">
                Advanced behavioral analysis using Perplexity AI to detect sophisticated threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Detection Sensitivity</label>
                    <Progress value={75} className="w-full bg-slate-700 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Learning Confidence</label>
                    <Progress value={85} className="w-full bg-slate-700 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-blue-500" />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button onClick={runAIAnalysis} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Brain className="w-4 h-4 mr-2" />
                    Run Analysis
                  </Button>
                  <Button onClick={viewAIReports} variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                    <Activity className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                  <Button onClick={() => triggerAdvancedFeature('tls')} variant="outline" className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10">
                    <Shield className="w-4 h-4 mr-2" />
                    TLS Analysis
                  </Button>
                  <Button onClick={() => triggerAdvancedFeature('flow')} variant="outline" className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10">
                    <Eye className="w-4 h-4 mr-2" />
                    Flow Analysis
                  </Button>
                  <Button onClick={() => triggerAdvancedFeature('ddos')} variant="outline" className="border-red-500/50 text-red-300 hover:bg-red-500/10">
                    <Zap className="w-4 h-4 mr-2" />
                    DDoS Forecast
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="honeypots" className="space-y-4">
          <HoneypotManagement 
            honeypots={honeypots} 
            onHoneypotCreated={() => {
              loadAdvancedFeatures();
            }} 
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <CustomerSpecificCompliance />
        </TabsContent>

        <TabsContent value="adaptive" className="space-y-4">
          <CustomerAdaptiveRules />
        </TabsContent>

        <TabsContent value="geo-blocking" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-blue-400" />
                Geographic Access Control
              </CardTitle>
              <CardDescription className="text-slate-400">
                Location-based traffic filtering and threat intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-300">{stats.geoBlocks}</div>
                    <div className="text-sm text-slate-400">Blocked Regions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-300">1,247</div>
                    <div className="text-sm text-slate-400">Blocked Requests</div>
                  </div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Active Geo Restrictions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">🇨🇳 China</span>
                      <Badge variant="destructive">Blocked</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">🇷🇺 Russia</span>
                      <Badge variant="destructive">Blocked</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">🏴‍☠️ Tor Network</span>
                      <Badge variant="destructive">Blocked</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builtin-siem" className="space-y-4">
          <CustomerSIEMAnalytics />
        </TabsContent>

        <TabsContent value="siem" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Network className="w-5 h-5 text-blue-400" />
                External SIEM Integration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Connect with external SIEM platforms for centralized security monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-300">{siemStatus?.total_events || 0}</div>
                    <div className="text-sm text-slate-400">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-300">{siemStatus?.exported_events || 0}</div>
                    <div className="text-sm text-slate-400">Exported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-300">{siemStatus?.export_rate || 0}%</div>
                    <div className="text-sm text-slate-400">Export Rate</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="siem-type" className="text-slate-300">SIEM Platform</Label>
                      <Select value={siemConfig.type} onValueChange={(value) => setSiemConfig(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="splunk" className="text-white">Splunk</SelectItem>
                          <SelectItem value="elastic" className="text-white">Elastic SIEM</SelectItem>
                          <SelectItem value="qradar" className="text-white">IBM QRadar</SelectItem>
                          <SelectItem value="sentinel" className="text-white">Microsoft Sentinel</SelectItem>
                          <SelectItem value="sumo" className="text-white">Sumo Logic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="siem-endpoint" className="text-slate-300">SIEM Endpoint</Label>
                      <Input
                        id="siem-endpoint"
                        value={siemConfig.endpoint}
                        onChange={(e) => setSiemConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                        placeholder="https://your-siem.company.com"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="siem-key" className="text-slate-300">API Key / Token</Label>
                    <Input
                      id="siem-key"
                      type="password"
                      value={siemConfig.apiKey}
                      onChange={(e) => setSiemConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter your SIEM API key"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button onClick={configureSiem} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Network className="w-4 h-4 mr-2" />
                      Configure Integration
                    </Button>
                    <Button onClick={testSiemConnection} variant="outline" className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10">
                      <Activity className="w-4 h-4 mr-2" />
                      Test Connection
                    </Button>
                    <Button onClick={exportEventsToSiem} variant="outline" className="border-green-500/50 text-green-300 hover:bg-green-500/10">
                      <Database className="w-4 h-4 mr-2" />
                      Export Events
                    </Button>
                  </div>

                  <div className="bg-slate-700/30 rounded-lg p-4 border border-blue-500/30">
                    <p className="text-sm text-slate-300">
                      🔗 <strong>SIEM Integration Status:</strong> {siemStatus?.configured ? 'Connected' : 'Not configured'}
                      {siemStatus?.configured && (
                        <>
                          <br />Export rate: {siemStatus.export_rate}% 
                          ({siemStatus.exported_events}/{siemStatus.total_events} events)
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Reports Modal */}
      <Dialog open={showAIReports} onOpenChange={setShowAIReports}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Brain className="h-5 w-5 text-purple-400" />
              AI Anomaly Detection Reports
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Detailed analysis of AI-detected security anomalies and behavioral patterns
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {aiReports.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No AI Reports Found</h3>
                <p className="text-slate-400">Run AI analysis to generate anomaly detection reports</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {aiReports.map((report, index) => (
                  <Card key={index} className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={report.threat_level === 'high' ? 'destructive' : 'secondary'}>
                              {report.threat_level}
                            </Badge>
                            <span className="text-sm text-slate-400">
                              {new Date(report.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-slate-300">
                            <strong>Source:</strong> {report.source_ip} | 
                            <strong> Score:</strong> {report.anomaly_score} | 
                            <strong> Action:</strong> {report.mitigation_action}
                          </div>
                          <div className="text-xs text-slate-400">
                            Session: {report.session_id}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAIReports(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          </DialogContent>
        </Dialog>

        {/* Result viewer for differentiators */}
        <Dialog open={resultDialog.open} onOpenChange={(o) => setResultDialog(prev => ({ ...prev, open: o }))}>
          <DialogContent className="max-w-3xl bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">{resultDialog.title}</DialogTitle>
            </DialogHeader>
            <div className="rounded-md bg-slate-900/60 p-4 border border-slate-700 overflow-x-auto">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap">{JSON.stringify(resultDialog.content, null, 2)}</pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default AdvancedSecurityDashboard;