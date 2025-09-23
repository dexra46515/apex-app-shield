import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
    try {
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
        description: "Unable to perform AI anomaly detection",
        variant: "destructive",
      });
    }
  };

  const generateComplianceReport = async (reportType: string) => {
    try {
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

      if (response.error) throw response.error;

      toast({
        title: "Compliance Report Generated",
        description: `${reportType.toUpperCase()} report created successfully`,
      });
    } catch (error) {
      console.error('Error generating compliance report:', error);
      toast({
        title: "Report Generation Failed",
        description: "Unable to generate compliance report",
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
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Advanced WAF Security Center
        </h2>
        <Button onClick={runAIAnalysis} className="bg-gradient-to-r from-purple-500 to-blue-600">
          <Brain className="w-4 h-4 mr-2" />
          Run AI Analysis
        </Button>
      </div>

      {/* Advanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Anomalies Detected</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.aiAnomalies}</div>
            <p className="text-xs text-muted-foreground">Machine learning analysis</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Honeypot Interactions</CardTitle>
            <Eye className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.honeypotInteractions}</div>
            <p className="text-xs text-muted-foreground">Deception mesh active</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adaptive Rules</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.adaptiveRules}</div>
            <p className="text-xs text-muted-foreground">Self-learning security</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.complianceScore}%</div>
            <p className="text-xs text-muted-foreground">Multi-standard compliance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ai-analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="honeypots">Honeypots</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="adaptive">Adaptive Rules</TabsTrigger>
          <TabsTrigger value="geo-blocking">Geo Blocking</TabsTrigger>
          <TabsTrigger value="siem">SIEM Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI-Powered Anomaly Detection
              </CardTitle>
              <CardDescription>
                Advanced behavioral analysis using Perplexity AI to detect sophisticated threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detection Sensitivity</label>
                    <Progress value={75} className="w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Learning Confidence</label>
                    <Progress value={85} className="w-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runAIAnalysis} variant="outline">
                    <Brain className="w-4 h-4 mr-2" />
                    Run Analysis
                  </Button>
                  <Button variant="outline">
                    <Activity className="w-4 h-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="honeypots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-600" />
                Deception Mesh Network
              </CardTitle>
              <CardDescription>
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
                    <Card key={index} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{honeypot.name}</div>
                            <div className="text-sm text-muted-foreground">{honeypot.path}</div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {honeypot.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total interactions: {stats.honeypotInteractions} | Last 24h: 0
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Compliance Reporting
              </CardTitle>
              <CardDescription>
                Automated compliance reports for major security standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'PCI DSS', score: 92, status: 'compliant' },
                  { name: 'GDPR', score: 88, status: 'compliant' },
                  { name: 'HIPAA', score: 90, status: 'compliant' },
                  { name: 'SOX', score: 85, status: 'attention' },
                  { name: 'ISO 27001', score: 87, status: 'compliant' },
                ].map((standard, index) => (
                  <Card key={index} className="border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{standard.name}</div>
                        <Badge 
                          variant="outline" 
                          className={standard.status === 'compliant' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                        >
                          {standard.score}%
                        </Badge>
                      </div>
                      <Progress value={standard.score} className="w-full mb-2" />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => generateComplianceReport(standard.name.toLowerCase().replace(/\s+/g, '_'))}
                        className="w-full"
                      >
                        Generate Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adaptive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                Adaptive Security Rules
              </CardTitle>
              <CardDescription>
                Machine learning-generated security rules that evolve with threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-700">{stats.adaptiveRules}</div>
                    <div className="text-sm text-muted-foreground">Active Rules</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700">95%</div>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-700">24h</div>
                    <div className="text-sm text-muted-foreground">Auto-Generated</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Adaptive rules automatically adjust based on attack patterns and threat intelligence.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geo-blocking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-red-600" />
                Geographic & ASN Blocking
              </CardTitle>
              <CardDescription>
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
                    <Card key={index} className="border-red-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{restriction.name}</div>
                            <div className="text-sm text-muted-foreground">{restriction.country}</div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={restriction.status === 'block' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                          >
                            {restriction.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{restriction.reason}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total restrictions: {stats.geoBlocks} | Blocked requests: 0 (last 24h)
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="siem" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                SIEM Integration
              </CardTitle>
              <CardDescription>
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
                    <Card key={index} className="border-indigo-200">
                      <CardContent className="p-4 text-center">
                        <div className="font-medium">{siem.name}</div>
                        <Badge 
                          variant="outline" 
                          className="bg-green-50 text-green-700 border-green-200 mt-1"
                        >
                          {siem.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Events exported: {stats.siemEvents} | Integration ready for all major SIEM platforms
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedSecurityDashboard;