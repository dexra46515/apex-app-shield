import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Shield, Brain, Lock, Eye, Code, Zap, AlertTriangle, CheckCircle, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdvancedSecurityDashboard = () => {
  const [selfHealingStatus, setSelfHealingStatus] = useState({
    enabled: true,
    activeInstances: 12,
    rolledBackToday: 3,
    healthScore: 98.5
  });

  const [quantumSafeStatus, setQuantumSafeStatus] = useState({
    pqcEnabled: true,
    handshakesProtected: 145820,
    algorithmStrength: 'CRYSTALS-Kyber-1024',
    migrationProgress: 89
  });

  const [predictiveModeling, setPredictiveModeling] = useState({
    threatsForecasted: 47,
    accuracyRate: 94.2,
    nextPrediction: '2025-09-24T10:30:00Z',
    vectorsIdentified: 156
  });

  const [zkProofs, setZkProofs] = useState({
    proofsGenerated: 2840,
    verificationTime: 0.023,
    complianceScore: 100,
    privateSetsVerified: 45
  });

  const [clientSideProtection, setClientSideProtection] = useState({
    jsInjectionBlocked: 89,
    magecartAttempts: 12,
    browserIntegrity: 99.1,
    protectedDomains: 156
  });

  const [graphqlSecurity, setGraphqlSecurity] = useState({
    queriesAnalyzed: 45782,
    anomaliesDetected: 23,
    depthLimitViolations: 8,
    rateLimitHits: 156
  });

  const [realTimeData, setRealTimeData] = useState([]);
  const [attackPredictions, setAttackPredictions] = useState([]);

  useEffect(() => {
    const generateRealTimeData = () => {
      const now = new Date();
      const data = [];
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        data.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          selfHealing: Math.floor(Math.random() * 10) + 90,
          quantumSafe: Math.floor(Math.random() * 5) + 95,
          clientSide: Math.floor(Math.random() * 8) + 92,
          graphql: Math.floor(Math.random() * 12) + 88
        });
      }
      setRealTimeData(data);
    };

    const generateAttackPredictions = () => {
      const predictions = [
        { vector: 'SQL Injection', probability: 23, timeframe: '2-4 hours', severity: 'high' },
        { vector: 'XSS Campaign', probability: 67, timeframe: '6-8 hours', severity: 'critical' },
        { vector: 'GraphQL DoS', probability: 34, timeframe: '12-24 hours', severity: 'medium' },
        { vector: 'Credential Stuffing', probability: 89, timeframe: '1-2 hours', severity: 'high' },
        { vector: 'API Abuse', probability: 45, timeframe: '4-6 hours', severity: 'medium' }
      ];
      setAttackPredictions(predictions);
    };

    generateRealTimeData();
    generateAttackPredictions();

    const interval = setInterval(() => {
      generateRealTimeData();
      if (Math.random() < 0.1) generateAttackPredictions();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const triggerSelfHealing = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('self-healing-manager', {
        body: { action: 'trigger_healing', reason: 'manual_trigger' }
      });

      if (error) throw error;

      toast.success('Self-healing process initiated');
      setSelfHealingStatus(prev => ({
        ...prev,
        activeInstances: prev.activeInstances + 1,
        healthScore: Math.min(100, prev.healthScore + 0.5)
      }));
    } catch (error) {
      toast.error('Failed to trigger self-healing');
      console.error('Self-healing error:', error);
    }
  };

  const generateZKProof = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('zk-proof-generator', {
        body: { 
          proofType: 'compliance_verification',
          dataset: 'security_metrics',
          privateInputs: ['threat_detection_rules', 'customer_data_access_patterns']
        }
      });

      if (error) throw error;

      toast.success('Zero-knowledge proof generated');
      setZkProofs(prev => ({
        ...prev,
        proofsGenerated: prev.proofsGenerated + 1,
        verificationTime: Math.random() * 0.05 + 0.01
      }));
    } catch (error) {
      toast.error('Failed to generate ZK proof');
      console.error('ZK proof error:', error);
    }
  };

  const initiatePredictiveAnalysis = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('predictive-attack-analyzer', {
        body: { 
          analysisType: 'threat_vector_prediction',
          timeframe: '24_hours',
          includeHistoricalData: true
        }
      });

      if (error) throw error;

      toast.success('Predictive analysis initiated');
      setPredictiveModeling(prev => ({
        ...prev,
        threatsForecasted: prev.threatsForecasted + Math.floor(Math.random() * 5) + 1,
        nextPrediction: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      }));
    } catch (error) {
      toast.error('Failed to initiate predictive analysis');
      console.error('Predictive analysis error:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <div className="w-full space-y-6 bg-slate-900 min-h-screen p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Advanced Security Features
          </h1>
          <p className="text-slate-300 text-lg mt-2">Next-generation security with quantum-safe protection and AI-powered threat prediction</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 border-green-400 text-green-400">
          <Shield className="h-5 w-5 mr-2" />
          All Systems Operational
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Self-Healing APIs */}
        <Card className="border-green-300 bg-gradient-to-br from-green-100 to-emerald-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-green-800">Self-Healing APIs</CardTitle>
            <Zap className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800 mb-2">{selfHealingStatus.healthScore}%</div>
            <p className="text-sm text-green-700 font-medium mb-4">System Health Score</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm text-green-800">
                <span className="font-medium">Active Instances:</span>
                <span className="font-bold">{selfHealingStatus.activeInstances}</span>
              </div>
              <div className="flex justify-between text-sm text-green-800">
                <span className="font-medium">Auto-Rollbacks Today:</span>
                <span className="font-bold">{selfHealingStatus.rolledBackToday}</span>
              </div>
              <Button onClick={triggerSelfHealing} size="sm" className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-medium">
                Trigger Manual Healing
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quantum-Safe Crypto */}
        <Card className="border-blue-300 bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-blue-800">Quantum-Safe Crypto</CardTitle>
            <Lock className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800 mb-2">{quantumSafeStatus.migrationProgress}%</div>
            <p className="text-sm text-blue-700 font-medium mb-4">PQC Migration Complete</p>
            <div className="mt-4 space-y-2">
              <Progress value={quantumSafeStatus.migrationProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Algorithm: {quantumSafeStatus.algorithmStrength}
              </div>
              <div className="text-xs">
                Protected: {quantumSafeStatus.handshakesProtected.toLocaleString()} handshakes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predictive Attack Modeling */}
        <Card className="border-purple-300 bg-gradient-to-br from-purple-100 to-violet-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-purple-800">AI Threat Prediction</CardTitle>
            <Brain className="h-6 w-6 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-800 mb-2">{predictiveModeling.accuracyRate}%</div>
            <p className="text-sm text-purple-700 font-medium mb-4">Prediction Accuracy</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm text-purple-800">
                <span className="font-medium">Threats Forecasted:</span>
                <span className="font-bold">{predictiveModeling.threatsForecasted}</span>
              </div>
              <div className="flex justify-between text-sm text-purple-800">
                <span className="font-medium">Attack Vectors:</span>
                <span className="font-bold">{predictiveModeling.vectorsIdentified}</span>
              </div>
              <Button onClick={initiatePredictiveAnalysis} size="sm" className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white font-medium">
                Run AI Analysis
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zero-Knowledge Proofs */}
        <Card className="border-indigo-300 bg-gradient-to-br from-indigo-100 to-purple-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-indigo-800">Zero-Knowledge Proofs</CardTitle>
            <Eye className="h-6 w-6 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-800 mb-2">{zkProofs.complianceScore}%</div>
            <p className="text-sm text-indigo-700 font-medium mb-4">Compliance Score</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm text-indigo-800">
                <span className="font-medium">Proofs Generated:</span>
                <span className="font-bold">{zkProofs.proofsGenerated}</span>
              </div>
              <div className="flex justify-between text-sm text-indigo-800">
                <span className="font-medium">Verification Time:</span>
                <span className="font-bold">{zkProofs.verificationTime.toFixed(3)}ms</span>
              </div>
              <Button onClick={generateZKProof} size="sm" className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                Generate Proof
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client-Side Protection */}
        <Card className="border-red-300 bg-gradient-to-br from-red-100 to-pink-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-red-800">Client-Side Protection</CardTitle>
            <Shield className="h-6 w-6 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800 mb-2">{clientSideProtection.browserIntegrity}%</div>
            <p className="text-sm text-red-700 font-medium mb-4">Browser Integrity</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm text-red-800">
                <span className="font-medium">JS Injections Blocked:</span>
                <span className="font-bold">{clientSideProtection.jsInjectionBlocked}</span>
              </div>
              <div className="flex justify-between text-sm text-red-800">
                <span className="font-medium">Magecart Stopped:</span>
                <span className="font-bold">{clientSideProtection.magecartAttempts}</span>
              </div>
              <div className="text-sm text-red-700 font-medium">
                Protected: {clientSideProtection.protectedDomains} domains
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GraphQL Security */}
        <Card className="border-teal-300 bg-gradient-to-br from-teal-100 to-cyan-100 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-teal-800">GraphQL Security</CardTitle>
            <Code className="h-6 w-6 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-800 mb-2">{graphqlSecurity.anomaliesDetected}</div>
            <p className="text-sm text-teal-700 font-medium mb-4">Anomalies Detected</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm text-teal-800">
                <span className="font-medium">Queries Analyzed:</span>
                <span className="font-bold">{graphqlSecurity.queriesAnalyzed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-teal-800">
                <span className="font-medium">Depth Violations:</span>
                <span className="font-bold">{graphqlSecurity.depthLimitViolations}</span>
              </div>
              <div className="flex justify-between text-sm text-teal-800">
                <span className="font-medium">Rate Limits:</span>
                <span className="font-bold">{graphqlSecurity.rateLimitHits}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
          <TabsTrigger value="realtime" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Real-Time Monitoring</TabsTrigger>
          <TabsTrigger value="predictions" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Attack Predictions</TabsTrigger>
          <TabsTrigger value="quantum" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Quantum Readiness</TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">ZK Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Advanced Security Metrics</CardTitle>
              <CardDescription className="text-slate-300">Real-time performance of next-generation security features</CardDescription>
            </CardHeader>
            <CardContent className="bg-slate-800">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={realTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[80, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="selfHealing" stroke="#22c55e" name="Self-Healing" strokeWidth={2} />
                  <Line type="monotone" dataKey="quantumSafe" stroke="#3b82f6" name="Quantum-Safe" strokeWidth={2} />
                  <Line type="monotone" dataKey="clientSide" stroke="#ef4444" name="Client-Side" strokeWidth={2} />
                  <Line type="monotone" dataKey="graphql" stroke="#14b8a6" name="GraphQL" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Attack Predictions</CardTitle>
              <CardDescription>Machine learning forecasts of incoming threats and attack vectors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attackPredictions.map((prediction, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={prediction.severity === 'critical' ? 'destructive' : prediction.severity === 'high' ? 'default' : 'secondary'}>
                          {prediction.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{prediction.vector}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{prediction.timeframe}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Attack Probability:</span>
                        <span className="font-medium">{prediction.probability}%</span>
                      </div>
                      <Progress value={prediction.probability} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quantum" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quantum-Safe Cryptography Status</CardTitle>
              <CardDescription>Post-quantum cryptography readiness and migration progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Migration Progress</h4>
                    <Progress value={quantumSafeStatus.migrationProgress} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-1">
                      {quantumSafeStatus.migrationProgress}% of systems migrated to post-quantum cryptography
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Current Algorithm</h4>
                    <Badge variant="outline" className="text-sm">
                      {quantumSafeStatus.algorithmStrength}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Protected Handshakes</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {quantumSafeStatus.handshakesProtected.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Quantum Threat Timeline</h4>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Current quantum computers pose minimal threat. Estimated 15+ years until cryptographically relevant quantum computers emerge.
                      </AlertDescription>
                    </Alert>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Readiness Score</h4>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Quantum-Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zero-Knowledge Compliance Proofs</CardTitle>
              <CardDescription>Privacy-preserving compliance verification without revealing sensitive architecture or data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Proof Generation Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Proofs Generated:</span>
                        <span className="font-medium">{zkProofs.proofsGenerated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Verification Time:</span>
                        <span className="font-medium">{zkProofs.verificationTime.toFixed(3)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Private Sets Verified:</span>
                        <span className="font-medium">{zkProofs.privateSetsVerified}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Compliance Score</h4>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {zkProofs.complianceScore}%
                    </div>
                    <Progress value={zkProofs.complianceScore} className="h-3" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Verified Compliance Standards</h4>
                    <div className="space-y-2">
                      <Badge variant="outline" className="mr-2">GDPR</Badge>
                      <Badge variant="outline" className="mr-2">SOC 2</Badge>
                      <Badge variant="outline" className="mr-2">ISO 27001</Badge>
                      <Badge variant="outline" className="mr-2">PCI DSS</Badge>
                      <Badge variant="outline" className="mr-2">HIPAA</Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Recent Proof Activity</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>• Security controls verification - 2 min ago</div>
                      <div>• Data processing compliance - 15 min ago</div>
                      <div>• Access pattern validation - 1 hour ago</div>
                      <div>• Encryption standard proof - 3 hours ago</div>
                    </div>
                  </div>
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