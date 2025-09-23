import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Building, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Customer {
  id: string;
  customer_name: string;
  domain: string;
  status: string;
  requests_total: number;
  threats_blocked_total: number;
  config_settings: any;
}

interface ComplianceReport {
  id: string;
  report_type: string;
  compliance_score: number;
  findings: any;
  recommendations: any;
  report_data: any;
  created_at: string;
  customer_id?: string;
}

const CustomerSpecificCompliance = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerReports, setCustomerReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerReports();
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .select('*')
        .order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
      
      if (data && data.length > 0) {
        setSelectedCustomer(data[0].id);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customer deployments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerReports = async () => {
    if (!selectedCustomer) return;

    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerReports(data || []);
    } catch (error) {
      console.error('Error loading customer reports:', error);
    }
  };

  const generateCustomerReport = async (reportType: string) => {
    if (!selectedCustomer) return;

    setGenerating(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) return;

      toast({
        title: "Generating Report",
        description: `Creating ${reportType.toUpperCase()} compliance report for ${customer.customer_name}...`,
      });

      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await supabase.functions.invoke('compliance-reporter', {
        body: {
          report_type: reportType,
          start_date: startDate,
          end_date: endDate,
          generated_by: user?.id,
          customer_id: selectedCustomer,
          customer_context: {
            customer_name: customer.customer_name,
            domain: customer.domain,
            total_requests: customer.requests_total,
            threats_blocked: customer.threats_blocked_total,
            waf_settings: customer.config_settings
          }
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Report Generated",
        description: `${reportType.toUpperCase()} compliance report generated for ${customer.customer_name}`,
      });
      
      loadCustomerReports();
    } catch (error) {
      console.error('Error generating customer report:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate compliance report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getCustomerStats = (customer: Customer) => {
    const blockingRate = customer.requests_total > 0 
      ? ((customer.threats_blocked_total / customer.requests_total) * 100).toFixed(1)
      : '0';
    
    return {
      blockingRate: parseFloat(blockingRate),
      isHighSecurity: parseFloat(blockingRate) > 5,
      hasAIEnabled: customer.config_settings?.ai_analysis === true,
      hasGeoBlocking: customer.config_settings?.geo_blocking === true
    };
  };

  const getComplianceScore = (customer: Customer) => {
    const stats = getCustomerStats(customer);
    let score = 70; // Base score
    
    if (stats.hasAIEnabled) score += 10;
    if (stats.hasGeoBlocking) score += 5;
    if (stats.blockingRate > 1) score += 10;
    if (stats.blockingRate > 5) score += 5;
    if (customer.status === 'active') score += 5;
    
    return Math.min(score, 100);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading customer compliance data...</div>;
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const customerStats = selectedCustomerData ? getCustomerStats(selectedCustomerData) : null;
  const complianceScore = selectedCustomerData ? getComplianceScore(selectedCustomerData) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Customer Compliance Management</h3>
        <Badge variant="outline" className="border-blue-500/50 text-blue-300">
          {customers.length} Active Customers
        </Badge>
      </div>

      {/* Customer Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building className="w-5 h-5 text-blue-400" />
            Select Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Choose a customer" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id} className="text-white hover:bg-slate-600">
                  <div className="flex items-center justify-between w-full">
                    <span>{customer.customer_name}</span>
                    <span className="text-slate-400 text-sm ml-2">{customer.domain}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCustomerData && (
        <>
          {/* Customer Overview */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-green-400" />
                {selectedCustomerData.customer_name} - Security Overview
              </CardTitle>
              <CardDescription className="text-slate-400">
                Domain: {selectedCustomerData.domain}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">{selectedCustomerData.requests_total?.toLocaleString() || 0}</div>
                  <div className="text-sm text-slate-400">Total Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{selectedCustomerData.threats_blocked_total?.toLocaleString() || 0}</div>
                  <div className="text-sm text-slate-400">Threats Blocked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-300">{customerStats?.blockingRate}%</div>
                  <div className="text-sm text-slate-400">Blocking Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">{complianceScore}%</div>
                  <div className="text-sm text-slate-400">Est. Compliance</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Overall Compliance Score</span>
                  <span className="text-sm font-medium text-green-400">{complianceScore}%</span>
                </div>
                <Progress value={complianceScore} className="h-2 bg-slate-700" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {customerStats?.hasAIEnabled ? 
                    <CheckCircle className="w-4 h-4 text-green-400" /> : 
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  }
                  <span className="text-sm text-slate-300">AI Analysis</span>
                  <Badge variant={customerStats?.hasAIEnabled ? "default" : "secondary"} className="ml-auto">
                    {customerStats?.hasAIEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {customerStats?.hasGeoBlocking ? 
                    <CheckCircle className="w-4 h-4 text-green-400" /> : 
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  }
                  <span className="text-sm text-slate-300">Geo Blocking</span>
                  <Badge variant={customerStats?.hasGeoBlocking ? "default" : "secondary"} className="ml-auto">
                    {customerStats?.hasGeoBlocking ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Report Generation */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-blue-400" />
                Generate Customer Compliance Reports
              </CardTitle>
              <CardDescription className="text-slate-400">
                Generate compliance reports specific to {selectedCustomerData.customer_name}'s deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['pci_dss', 'gdpr', 'hipaa', 'sox', 'iso_27001'].map(type => (
                  <Button
                    key={type}
                    onClick={() => generateCustomerReport(type)}
                    disabled={generating}
                    variant="outline"
                    className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
                  >
                    {type.replace('_', ' ').toUpperCase()}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-purple-400" />
                Recent Compliance Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-300">No compliance reports generated yet</p>
                  <p className="text-slate-400 text-sm">Generate your first report above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerReports.slice(0, 5).map(report => (
                    <div key={report.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="font-medium text-white">{report.report_type.replace('_', ' ').toUpperCase()}</div>
                          <div className="text-sm text-slate-400">{new Date(report.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <Badge variant={report.compliance_score >= 90 ? "default" : "secondary"}>
                        {report.compliance_score}% Compliant
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CustomerSpecificCompliance;