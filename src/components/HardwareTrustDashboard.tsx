import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Key, 
  Lock, 
  CheckCircle, 
  AlertTriangle,
  Cpu,
  FileCheck,
  Activity,
  Eye,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HardwareTrustMetrics {
  device_trust_distribution: Record<string, number>;
  hardware_verified_devices: number;
  log_integrity_rate: number;
  total_hardware_signed_logs: number;
  last_updated: string;
}

interface DeviceAttestation {
  device_fingerprint: string;
  trust_level: string;
  hardware_verified: boolean;
  tpm_version?: string;
  tee_type?: string;
  verification_status: string;
  last_verified: string;
}

const HardwareTrustDashboard = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<HardwareTrustMetrics | null>(null);
  const [attestations, setAttestations] = useState<DeviceAttestation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrustMetrics();
    loadDeviceAttestations();
  }, []);

  const loadTrustMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('hardware-trust-verifier', {
        body: { action: 'get_trust_metrics' }
      });

      if (error) throw error;
      if (data.success) {
        setMetrics(data.trust_metrics);
      }
    } catch (error) {
      console.error('Error loading trust metrics:', error);
    }
  };

  const loadDeviceAttestations = async () => {
    try {
      const { data, error } = await supabase
        .from('device_attestations')
        .select('*')
        .order('last_verified', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAttestations(data || []);
    } catch (error) {
      console.error('Error loading device attestations:', error);
    }
  };

  const verifyDevicePosture = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hardware-trust-verifier', {
        body: {
          action: 'verify_device_posture',
          payload: {
            device_fingerprint: 'demo-device-' + Date.now(),
            attestation_jwt: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ0bXBfdmVyc2lvbiI6IjIuMCIsInBjcl92YWx1ZXMiOnsicGNyMCI6ImExYjJjM2Q0ZTVmNiIsInBjcjciOiJiMmMzZDRlNWY2YTEifSwidGVlX3R5cGUiOiJJbnRlbF9TR1gifQ.dummy',
            tmp_quote: 'TPM2_Quote_V1_00000001_PCR0_a1b2c3d4e5f6...',
            tee_attestation: 'SGX_Report_V1_enclave_id_12345_measurement_abcdef...',
            platform_configuration: {
              secure_boot: true,
              measured_boot: true,
              tpm_version: '2.0',
              tee_type: 'Intel_SGX'
            }
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Device Verification Complete",
          description: `Trust Level: ${data.verification_result.trust_level.toUpperCase()}`
        });
        loadTrustMetrics();
        loadDeviceAttestations();
      }
    } catch (error) {
      console.error('Error verifying device:', error);
      toast({
        title: "Verification Failed",
        description: "Failed to verify device posture",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createHardwareSignedLog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hardware-trust-verifier', {
        body: {
          action: 'create_hardware_signed_log',
          payload: {
            event_type: 'demo_security_event',
            action: 'api_access',
            resource: '/sensitive/data',
            user_context: 'demo-user',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Hardware-Signed Log Created",
          description: `Log ID: ${data.signed_log.log_id.substring(0, 8)}...`
        });
        loadTrustMetrics();
      }
    } catch (error) {
      console.error('Error creating hardware log:', error);
      toast({
        title: "Log Creation Failed",
        description: "Failed to create hardware-signed log",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrustLevelBadge = (level: string) => {
    const colors = {
      trusted: 'bg-green-500',
      conditional: 'bg-yellow-500', 
      suspicious: 'bg-orange-500',
      untrusted: 'bg-red-500'
    };
    return <Badge className={`${colors[level as keyof typeof colors] || colors.suspicious} text-white`}>
      {level.toUpperCase()}
    </Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Hardware & Trust Integration</h2>
          <p className="text-slate-400">TPM/TEE attestation and hardware-signed audit logs</p>
        </div>
        <Badge variant="outline" className="border-primary text-primary">
          Enterprise Security
        </Badge>
      </div>

      {/* Trust Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-slate-400">Hardware Verified</p>
                <p className="text-xl font-bold text-white">
                  {metrics?.hardware_verified_devices || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-slate-400">Signed Logs</p>
                <p className="text-xl font-bold text-white">
                  {metrics?.total_hardware_signed_logs || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-slate-400">Log Integrity</p>
                <p className="text-xl font-bold text-white">
                  {metrics ? Math.round(metrics.log_integrity_rate) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-sm text-slate-400">Trust Distribution</p>
                <div className="flex gap-1 mt-1">
                  {metrics?.device_trust_distribution && Object.entries(metrics.device_trust_distribution).map(([level, count]) => (
                    <div key={level} className="text-xs">
                      <span className={`inline-block w-2 h-2 rounded mr-1 ${
                        level === 'trusted' ? 'bg-green-400' :
                        level === 'conditional' ? 'bg-yellow-400' :
                        level === 'suspicious' ? 'bg-orange-400' : 'bg-red-400'
                      }`} />
                      {count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attestation" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="attestation" className="data-[state=active]:bg-slate-700">
            Device Attestation
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700">
            Hardware-Signed Logs
          </TabsTrigger>
          <TabsTrigger value="integration" className="data-[state=active]:bg-slate-700">
            WAF Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attestation" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Key className="w-5 h-5 text-blue-400" />
                Attestation-Aware Access Control
              </CardTitle>
              <CardDescription className="text-slate-400">
                Verify device posture using TPM/TEE-signed JWT tokens before granting access to sensitive APIs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-900/20 border-blue-500/30">
                <Lock className="w-4 h-4" />
                <AlertDescription className="text-blue-300">
                  Hardware attestation validates device integrity using cryptographic proof from TPM 2.0 or TEE (Intel SGX, ARM TrustZone)
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={verifyDevicePosture}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Verifying...' : 'Test Device Verification'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={loadDeviceAttestations}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Refresh Attestations
                </Button>
              </div>

              {/* Device Attestations List */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white">Recent Device Attestations</h4>
                {attestations.length === 0 ? (
                  <p className="text-sm text-slate-400">No device attestations yet. Run a test verification.</p>
                ) : (
                  <div className="space-y-2">
                    {attestations.map((attestation, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Device: {attestation.device_fingerprint.substring(0, 16)}...
                          </p>
                          <p className="text-xs text-slate-400">
                             {attestation.tpm_version && `TPM ${attestation.tpm_version}`}
                            {attestation.tee_type && ` • ${attestation.tee_type}`}
                            {attestation.hardware_verified && ' • Hardware Verified'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrustLevelBadge(attestation.trust_level)}
                          {attestation.hardware_verified && 
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileCheck className="w-5 h-5 text-green-400" />
                Hardware-Signed Audit Logs
              </CardTitle>
              <CardDescription className="text-slate-400">
                Cryptographic proof of request handling and security state using TPM-signed audit trail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-900/20 border-green-500/30">
                <Shield className="w-4 h-4" />
                <AlertDescription className="text-green-300">
                  Every security decision is cryptographically signed by hardware TPM and chained for tamper-evident audit trail
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={createHardwareSignedLog}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Creating...' : 'Create Signed Log Entry'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={loadTrustMetrics}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Refresh Metrics
                </Button>
              </div>

              {/* Log Integrity Status */}
              <div className="space-y-3">
                <h4 className="font-semibold text-white">Log Chain Integrity</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Signed Logs</span>
                    <span className="text-white font-medium">{metrics?.total_hardware_signed_logs || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Integrity Rate</span>
                    <span className="text-white font-medium">{metrics ? Math.round(metrics.log_integrity_rate) : 0}%</span>
                  </div>
                  <Progress 
                    value={metrics?.log_integrity_rate || 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="w-5 h-5 text-purple-400" />
                WAF Integration Status
              </CardTitle>
              <CardDescription className="text-slate-400">
                Hardware trust verification is integrated into the WAF for enhanced security decisions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <h5 className="font-medium text-white">Device Verification</h5>
                  </div>
                  <p className="text-sm text-slate-400">
                    WAF automatically verifies device posture for sensitive API access
                  </p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <h5 className="font-medium text-white">Hardware Logging</h5>
                  </div>
                  <p className="text-sm text-slate-400">
                    All security decisions are cryptographically signed and logged
                  </p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <h5 className="font-medium text-white">Trust-Based Access</h5>
                  </div>
                  <p className="text-sm text-slate-400">
                    Access controls adapt based on hardware-verified trust levels
                  </p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <h5 className="font-medium text-white">Audit Compliance</h5>
                  </div>
                  <p className="text-sm text-slate-400">
                    Tamper-evident logs provide cryptographic proof for compliance
                  </p>
                </div>
              </div>

              <Alert className="bg-purple-900/20 border-purple-500/30">
                <Eye className="w-4 h-4" />
                <AlertDescription className="text-purple-300">
                  <strong>Enterprise Ready:</strong> Full hardware trust integration with TPM 2.0, Intel SGX, ARM TrustZone support for zero-trust architecture
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HardwareTrustDashboard;