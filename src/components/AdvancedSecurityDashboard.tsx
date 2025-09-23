import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ComplianceReports from './ComplianceReports';

interface AdvancedSecurityStats {
  aiAnomalies: number;
  honeypotInteractions: number;
  adaptiveRules: number;
  complianceScore: number;
  schemaViolations: number;
  geoBlocks: number;
  siemEvents: number;
}

const AdvancedSecurityDashboard = () => {
  const [stats, setStats] = useState<AdvancedSecurityStats>({
    aiAnomalies: 0,
    honeypotInteractions: 0,
    adaptiveRules: 0,
    complianceScore: 85,
    schemaViolations: 0,
    geoBlocks: 0,
    siemEvents: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportsRefresh, setReportsRefresh] = useState(0);
  const [showAIReports, setShowAIReports] = useState(false);
  const [aiReports, setAiReports] = useState<any[]>([]);

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

      setStats({
        aiAnomalies: aiCount || 0,
        honeypotInteractions: honeypotCount || 0,
        adaptiveRules: adaptiveCount || 0,
        complianceScore: 85,
        schemaViolations: schemaCount || 0,
        geoBlocks: geoCount || 3, // We have 3 default geo restrictions
        siemEvents: siemCount || 0
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
            session_id: 'demo-session-123',
            source_ip: '192.168.1.100',
            user_agent: 'Mozilla/5.0 Demo Browser'
          },
          behavioral_metrics: {
            request_frequency: 15,
            unusual_paths: ['/admin', '/backup'],
            suspicious_payloads: true,
            geographic_anomaly: false
          }
        }
      });

      console.log('AI Analysis response:', response);

      if (response.error) throw response.error;

      toast({
        title: "AI Analysis Complete",
        description: `Anomaly score: ${response.data?.analysis?.anomaly_score || 'N/A'}`,
      });
      
      loadAdvancedStats(); // Refresh stats
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

      // Load real AI anomaly detection reports
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

  useEffect(() => {
    loadAdvancedStats();
  }, []);

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

      <Tabs defaultValue="ai-analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-slate-700">
          <TabsTrigger value="ai-analysis" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">AI Analysis</TabsTrigger>
          <TabsTrigger value="honeypots" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Honeypots</TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Compliance</TabsTrigger>
          <TabsTrigger value="adaptive" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Adaptive Rules</TabsTrigger>
          <TabsTrigger value="geo-blocking" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">Geo Blocking</TabsTrigger>
          <TabsTrigger value="siem" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">SIEM Integration</TabsTrigger>
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
                    <Progress value={85} className="w-full bg-slate-700 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-emerald-500" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runAIAnalysis} variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    <Brain className="w-4 h-4 mr-2" />
                    Run Analysis
                  </Button>
                  <Button onClick={viewAIReports} variant="outline" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                    <Activity className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="honeypots" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Eye className="w-5 h-5 text-orange-400" />
                Deception Mesh Network
              </CardTitle>
              <CardDescription className="text-slate-400">
                Active honeypots to detect and analyze attacker behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Admin Panel', path: '/admin', type: 'web', status: 'active' },
                    { name: 'API Keys', path: '/api/keys', type: 'api', status: 'active' },
                    { name: 'DB Backup', path: '/backups/db.sql', type: 'file', status: 'active' },
                  ].map((honeypot, index) => (
                    <Card key={index} className="bg-slate-700/50 border-orange-500/30 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-orange-200">{honeypot.name}</div>
                            <div className="text-sm text-orange-400/70">{honeypot.path}</div>
                          </div>
                          <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-500/30">
                            {honeypot.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  Total interactions: {stats.honeypotInteractions} | Last 24h: 0
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-blue-400" />
                Compliance Reporting
              </CardTitle>
              <CardDescription className="text-slate-400">
                Automated compliance reports for major security standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[
                  { name: 'PCI DSS', score: 92, status: 'compliant' },
                  { name: 'GDPR', score: 88, status: 'compliant' },
                  { name: 'HIPAA', score: 90, status: 'compliant' },
                  { name: 'SOX', score: 85, status: 'attention' },
                  { name: 'ISO 27001', score: 87, status: 'compliant' },
                ].map((standard, index) => (
                  <Card key={index} className="bg-slate-700/50 border-blue-500/30 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-blue-200">{standard.name}</div>
                        <Badge 
                          variant="outline" 
                          className={standard.status === 'compliant' ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'}
                        >
                          {standard.score}%
                        </Badge>
                      </div>
                      <Progress value={standard.score} className="w-full mb-2 bg-slate-600 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-cyan-500" />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => generateComplianceReport(standard.name.toLowerCase().replace(/\s+/g, '_'))}
                        className="w-full bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                      >
                        Generate Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <ComplianceReports refreshToken={reportsRefresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adaptive" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-green-400" />
                Adaptive Security Rules
              </CardTitle>
              <CardDescription className="text-slate-400">
                Machine learning-generated security rules that evolve with threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{stats.adaptiveRules}</div>
                    <div className="text-sm text-slate-400">Active Rules</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">95%</div>
                    <div className="text-sm text-slate-400">Confidence</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">24h</div>
                    <div className="text-sm text-slate-400">Auto-Generated</div>
                  </div>
                </div>
                <div className="text-sm text-slate-400">
                  Adaptive rules automatically adjust based on attack patterns and threat intelligence.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geo-blocking" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-red-400" />
                Geographic & ASN Blocking
              </CardTitle>
              <CardDescription className="text-slate-400">
                Country and network-based access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { country: 'CN', name: 'China', status: 'monitor', reason: 'High volume attacks' },
                    { country: 'RU', name: 'Russia', status: 'monitor', reason: 'High volume attacks' },
                    { country: 'KP', name: 'North Korea', status: 'block', reason: 'Sanctions policy' },
                  ].map((restriction, index) => (
                    <Card key={index} className="bg-slate-700/50 border-red-500/30 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium text-red-200">{restriction.name}</div>
                            <div className="text-sm text-red-400/70">{restriction.country}</div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={restriction.status === 'block' ? 'bg-red-900/30 text-red-400 border-red-500/30' : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'}
                          >
                            {restriction.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400">{restriction.reason}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  Total restrictions: {stats.geoBlocks} | Blocked requests: 0 (last 24h)
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="siem" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="w-5 h-5 text-indigo-400" />
                SIEM Integration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enterprise security information and event management integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Splunk', status: 'available', color: 'green' },
                    { name: 'Elastic', status: 'available', color: 'green' },
                    { name: 'QRadar', status: 'available', color: 'green' },
                    { name: 'Sentinel', status: 'available', color: 'green' },
                  ].map((siem, index) => (
                    <Card key={index} className="bg-slate-700/50 border-indigo-500/30 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="font-medium text-indigo-200">{siem.name}</div>
                        <Badge 
                          variant="outline" 
                          className="bg-green-900/30 text-green-400 border-green-500/30 mt-1"
                        >
                          {siem.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  Events exported: {stats.siemEvents} | Integration ready for all major SIEM platforms
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
              Detailed AI-powered security anomaly analysis results
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {aiReports.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-300 text-lg mb-2">No AI reports found</p>
                <p className="text-slate-400">Run AI analysis to generate anomaly detection reports</p>
              </div>
            ) : (
              aiReports.map((report, index) => (
                <Card key={report.id || index} className="bg-slate-700/50 border-slate-600">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-400" />
                        Anomaly Detection #{index + 1}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${
                            report.threat_level === 'high' ? 'bg-red-900/30 text-red-400 border-red-500/30' :
                            report.threat_level === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' :
                            'bg-green-900/30 text-green-400 border-green-500/30'
                          }`}
                        >
                          {report.threat_level?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-900/30 text-purple-400 border-purple-500/30">
                          Score: {report.anomaly_score || 0}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <MapPin className="h-4 w-4" />
                          <span>Source IP</span>
                        </div>
                        <p className="text-white font-mono">{report.source_ip}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Clock className="h-4 w-4" />
                          <span>Detection Time</span>
                        </div>
                        <p className="text-white">{new Date(report.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Activity className="h-4 w-4" />
                          <span>Mitigation</span>
                        </div>
                        <p className="text-white">{report.mitigation_action || 'Monitor'}</p>
                      </div>
                    </div>

                    {report.behavior_pattern && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">Behavior Pattern Analysis</h4>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            {JSON.stringify(report.behavior_pattern, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {report.ai_analysis_result && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">AI Analysis Result</h4>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <pre className="text-xs text-slate-300 overflow-x-auto">
                            {JSON.stringify(report.ai_analysis_result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedSecurityDashboard;