import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Target, 
  Shield, 
  Globe, 
  Database, 
  GitBranch, 
  AlertCircle,
  Activity,
  Settings,
  Eye,
  Lock,
  Zap
} from "lucide-react";

interface AdvancedStats {
  aiAnomalies: number;
  honeypotInteractions: number;
  complianceReports: number;
  adaptiveRules: number;
  geoRestrictions: number;
  siemEvents: number;
  tlsFingerprints: number;
  encryptedFlows: number;
}

const AdvancedFeaturesPanel = () => {
  const [stats, setStats] = useState<AdvancedStats>({
    aiAnomalies: 0,
    honeypotInteractions: 0,
    complianceReports: 0,
    adaptiveRules: 0,
    geoRestrictions: 0,
    siemEvents: 0,
    tlsFingerprints: 0,
    encryptedFlows: 0
  });
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState({
    aiAnalysis: true,
    honeypots: true,
    geoBlocking: true,
    adaptiveRules: true,
    builtInSiem: true,
    externalSiem: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAdvancedStats();
  }, []);

  const loadAdvancedStats = async () => {
    try {
      const [
        { count: aiCount },
        { count: honeypotCount },
        { count: complianceCount },
        { count: adaptiveCount },
        { count: geoCount },
        { count: siemCount },
        { count: tlsCount },
        { count: flowCount }
      ] = await Promise.all([
        supabase.from('ai_anomaly_detections').select('*', { count: 'exact', head: true }),
        supabase.from('honeypot_interactions').select('*', { count: 'exact', head: true }),
        supabase.from('compliance_reports').select('*', { count: 'exact', head: true }),
        supabase.from('adaptive_rules').select('*', { count: 'exact', head: true }),
        supabase.from('geo_restrictions').select('*', { count: 'exact', head: true }),
        supabase.from('siem_events').select('*', { count: 'exact', head: true }),
        supabase.from('tls_fingerprints').select('*', { count: 'exact', head: true }),
        supabase.from('encrypted_flow_patterns').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        aiAnomalies: aiCount || 0,
        honeypotInteractions: honeypotCount || 0,
        complianceReports: complianceCount || 0,
        adaptiveRules: adaptiveCount || 0,
        geoRestrictions: geoCount || 0,
        siemEvents: siemCount || 0,
        tlsFingerprints: tlsCount || 0,
        encryptedFlows: flowCount || 0
      });
    } catch (error) {
      console.error('Error loading advanced stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (type: string) => {
    try {
      const functionMap: { [key: string]: string } = {
        'ai': 'ai-anomaly-detector',
        'honeypot': 'dynamic-honeypot-generator',
        'compliance': 'compliance-reporter',
        'adaptive': 'rule-deployment-pipeline',
        'siem': 'siem-integrator'
      };

      await supabase.functions.invoke(functionMap[type], {
        body: { trigger: 'manual_analysis' }
      });

      toast({
        title: "Analysis Triggered",
        description: `${type.toUpperCase()} analysis has been initiated`,
      });

      loadAdvancedStats();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to trigger ${type} analysis`,
        variant: "destructive"
      });
    }
  };

  const toggleFeature = async (feature: string, enabled: boolean) => {
    setFeatures(prev => ({ ...prev, [feature]: enabled }));
    
    toast({
      title: enabled ? "Feature Enabled" : "Feature Disabled",
      description: `${feature.replace(/([A-Z])/g, ' $1').trim()} has been ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading advanced features...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Advanced Security Features</h2>
        <Badge variant="secondary">Enterprise Ready</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="honeypots">Honeypots</TabsTrigger>
          <TabsTrigger value="siem">SIEM & Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AI Analysis */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Analysis</CardTitle>
                <Brain className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.aiAnomalies}</div>
                <p className="text-xs text-muted-foreground">Anomalies detected</p>
                <div className="flex items-center justify-between mt-2">
                  <Switch 
                    checked={features.aiAnalysis}
                    onCheckedChange={(checked) => toggleFeature('aiAnalysis', checked)}
                  />
                  <Button size="sm" onClick={() => triggerAnalysis('ai')}>
                    Analyze
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Honeypots */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Honeypots</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.honeypotInteractions}</div>
                <p className="text-xs text-muted-foreground">Interactions captured</p>
                <div className="flex items-center justify-between mt-2">
                  <Switch 
                    checked={features.honeypots}
                    onCheckedChange={(checked) => toggleFeature('honeypots', checked)}
                  />
                  <Button size="sm" onClick={() => triggerAnalysis('honeypot')}>
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Adaptive Rules */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Adaptive Rules</CardTitle>
                <GitBranch className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.adaptiveRules}</div>
                <p className="text-xs text-muted-foreground">Active rules</p>
                <div className="flex items-center justify-between mt-2">
                  <Switch 
                    checked={features.adaptiveRules}
                    onCheckedChange={(checked) => toggleFeature('adaptiveRules', checked)}
                  />
                  <Button size="sm" onClick={() => triggerAnalysis('adaptive')}>
                    Deploy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Geo Blocking */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Geo Blocking</CardTitle>
                <Globe className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.geoRestrictions}</div>
                <p className="text-xs text-muted-foreground">Restricted regions</p>
                <div className="flex items-center justify-between mt-2">
                  <Switch 
                    checked={features.geoBlocking}
                    onCheckedChange={(checked) => toggleFeature('geoBlocking', checked)}
                  />
                  <Button size="sm">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIEM Integration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Built-in SIEM
                </CardTitle>
                <CardDescription>Integrated security information and event management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Switch 
                      checked={features.builtInSiem}
                      onCheckedChange={(checked) => toggleFeature('builtInSiem', checked)}
                    />
                  </div>
                  <div className="text-2xl font-bold">{stats.siemEvents}</div>
                  <p className="text-xs text-muted-foreground">Events processed today</p>
                  <Button size="sm" className="w-full" onClick={() => triggerAnalysis('siem')}>
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  External SIEM
                </CardTitle>
                <CardDescription>Integration with external SIEM platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Switch 
                      checked={features.externalSiem}
                      onCheckedChange={(checked) => toggleFeature('externalSiem', checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Splunk</Badge>
                    <Badge variant="outline">QRadar</Badge>
                    <Badge variant="outline">ArcSight</Badge>
                  </div>
                  <Button size="sm" className="w-full">
                    Configure Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Reports
              </CardTitle>
              <CardDescription>Automated compliance monitoring and reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.complianceReports}</div>
                  <p className="text-xs text-muted-foreground">Reports generated</p>
                </div>
                <div className="space-y-2">
                  <Badge variant="outline">PCI DSS</Badge>
                  <Badge variant="outline">GDPR</Badge>
                  <Badge variant="outline">SOC 2</Badge>
                  <Badge variant="outline">ISO 27001</Badge>
                </div>
                <div className="space-y-2">
                  <Button size="sm" className="w-full" onClick={() => triggerAnalysis('compliance')}>
                    Generate Report
                  </Button>
                  <Progress value={85} className="h-2" />
                  <p className="text-xs text-muted-foreground">85% Compliance Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Security Analysis</CardTitle>
              <CardDescription>Advanced machine learning for threat detection and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Anomaly Detection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.aiAnomalies}</div>
                    <p className="text-xs text-muted-foreground">Anomalies detected</p>
                    <Progress value={92} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">92% Accuracy Rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">TLS Fingerprinting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.tlsFingerprints}</div>
                    <p className="text-xs text-muted-foreground">Unique fingerprints</p>
                    <Button size="sm" className="mt-2 w-full">
                      Analyze TLS Traffic
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Encrypted Flow Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.encryptedFlows}</div>
                    <p className="text-xs text-muted-foreground">Flow patterns analyzed</p>
                    <Button size="sm" className="mt-2 w-full">
                      Deep Packet Inspection
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Behavioral Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">Real-time monitoring</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm">Pattern recognition</span>
                    </div>
                    <Button size="sm" className="mt-2 w-full">
                      View Analysis
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="honeypots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Honeypot Management</CardTitle>
              <CardDescription>Intelligent decoy systems for threat intelligence gathering</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Active Honeypots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground">Currently deployed</p>
                    <div className="mt-2 space-y-1">
                      <div className="text-xs">API Endpoints: 8</div>
                      <div className="text-xs">File Downloads: 3</div>
                      <div className="text-xs">Login Forms: 1</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Interactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.honeypotInteractions}</div>
                    <p className="text-xs text-muted-foreground">Total interactions</p>
                    <Progress value={75} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">75% Threat Detection Rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Auto-Generation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm">AI-Powered</span>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => triggerAnalysis('honeypot')}>
                      Generate New Honeypot
                    </Button>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Based on recent attack patterns
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="siem" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>SIEM Integration Status</CardTitle>
                <CardDescription>Security Information and Event Management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>Built-in SIEM</span>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span>Splunk Integration</span>
                    </div>
                    <Badge variant="outline">Configured</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>QRadar Export</span>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Dashboard</CardTitle>
                <CardDescription>Real-time compliance monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">PCI DSS</span>
                    <div className="flex items-center gap-2">
                      <Progress value={95} className="w-20" />
                      <span className="text-sm">95%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">GDPR</span>
                    <div className="flex items-center gap-2">
                      <Progress value={88} className="w-20" />
                      <span className="text-sm">88%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">SOC 2</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-20" />
                      <span className="text-sm">92%</span>
                    </div>
                  </div>
                  
                  <Button size="sm" className="w-full mt-4" onClick={() => triggerAnalysis('compliance')}>
                    Generate Compliance Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedFeaturesPanel;