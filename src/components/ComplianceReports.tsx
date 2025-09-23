import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface ComplianceReport {
  id: string;
  report_type: string;
  compliance_score: number;
  findings: Json;
  recommendations: Json;
  report_data: Json;
  created_at: string;
  report_period_start: string;
  report_period_end: string;
  generated_by: string | null;
}

const ComplianceReports = ({ refreshToken = 0 }: { refreshToken?: number }) => {
  const { toast } = useToast();
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    loadReports();
  }, [refreshToken]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'pci_dss': 'PCI DSS',
      'gdpr': 'GDPR',
      'hipaa': 'HIPAA',
      'sox': 'SOX',
      'iso_27001': 'ISO 27001'
    };
    return labels[type] || type.toUpperCase();
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-yellow-400';
    if (score >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getComplianceBadge = (score: number) => {
    if (score >= 90) return 'bg-green-900/30 text-green-400 border-green-500/30';
    if (score >= 80) return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
    if (score >= 70) return 'bg-orange-900/30 text-orange-400 border-orange-500/30';
    return 'bg-red-900/30 text-red-400 border-red-500/30';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      default:
        return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const downloadReport = (report: ComplianceReport) => {
    const reportData = {
      report_type: getReportTypeLabel(report.report_type),
      compliance_score: report.compliance_score,
      period: `${new Date(report.report_period_start).toLocaleDateString()} - ${new Date(report.report_period_end).toLocaleDateString()}`,
      generated_at: new Date(report.created_at).toLocaleString(),
      findings: report.findings,
      recommendations: report.recommendations,
      detailed_data: report.report_data
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_type}_compliance_report_${new Date(report.created_at).toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: `${getReportTypeLabel(report.report_type)} compliance report downloaded successfully`,
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-white">Loading compliance reports...</div>;
  }

  if (reports.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-300 text-lg mb-2">No compliance reports generated yet</p>
          <p className="text-slate-400 text-sm text-center">
            Generate reports from the Compliance tab to see them here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">Compliance Reports</h3>
        <Badge variant="outline" className="bg-blue-900/30 text-blue-400 border-blue-500/30">
          {reports.length} Reports Generated
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-slate-700 border-slate-600">
          <TabsTrigger value="list" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">
            Reports List
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">
            Report Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <div>
                        <CardTitle className="text-white">{getReportTypeLabel(report.report_type)} Compliance Report</CardTitle>
                        <CardDescription className="text-slate-400">
                          Generated {new Date(report.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getComplianceBadge(report.compliance_score)}>
                        {report.compliance_score}% Compliant
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">Compliance Score</span>
                        <span className={`text-sm font-medium ${getComplianceColor(report.compliance_score)}`}>
                          {report.compliance_score}%
                        </span>
                      </div>
                      <Progress value={report.compliance_score} className="h-2 bg-slate-700" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Period</span>
                        <p className="text-white font-medium">
                          {new Date(report.report_period_start).toLocaleDateString()} - {new Date(report.report_period_end).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Findings</span>
                        <p className="text-white font-medium">{Array.isArray(report.findings) ? report.findings.length : 0}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Recommendations</span>
                        <p className="text-white font-medium">{Array.isArray(report.recommendations) ? report.recommendations.length : 0}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Status</span>
                        <p className="text-white font-medium">
                          {report.compliance_score >= 90 ? 'Excellent' : 
                           report.compliance_score >= 80 ? 'Good' : 
                           report.compliance_score >= 70 ? 'Needs Attention' : 'Critical'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedReport(report); setActiveTab('details'); }}
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReport(report)}
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedReport ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-400" />
                      {getReportTypeLabel(selectedReport.report_type)} Detailed Report
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Generated on {new Date(selectedReport.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={getComplianceBadge(selectedReport.compliance_score)}>
                    {selectedReport.compliance_score}% Compliant
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Report Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-slate-300">Assessment Period</span>
                      </div>
                      <p className="text-white text-sm">
                        {new Date(selectedReport.report_period_start).toLocaleDateString()} - {new Date(selectedReport.report_period_end).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <span className="text-sm text-slate-300">Issues Found</span>
                    </div>
                    <p className="text-white text-lg font-bold">{Array.isArray(selectedReport.findings) ? selectedReport.findings.length : 0}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-slate-300">Recommendations</span>
                    </div>
                    <p className="text-white text-lg font-bold">{Array.isArray(selectedReport.recommendations) ? selectedReport.recommendations.length : 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Findings */}
                {Array.isArray(selectedReport.findings) && selectedReport.findings.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-400" />
                      Security Findings
                    </h4>
                    <div className="space-y-3">
                      {(Array.isArray(selectedReport.findings) ? selectedReport.findings : []).map((finding: any, index: number) => (
                        <Card key={index} className="bg-slate-700/30 border-slate-600">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {getSeverityIcon(finding.severity)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-semibold text-white">{finding.description}</h5>
                                  <Badge variant="outline" className={getComplianceBadge(0)}>
                                    {finding.severity?.toUpperCase() || 'UNKNOWN'}
                                  </Badge>
                                </div>
                                {finding.impact && (
                                  <p className="text-slate-300 text-sm mb-2">{finding.impact}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                  {finding.requirement && <span>Requirement: {finding.requirement}</span>}
                                  {finding.article && <span>Article: {finding.article}</span>}
                                  {finding.section && <span>Section: {finding.section}</span>}
                                  {finding.control && <span>Control: {finding.control}</span>}
                                  {finding.count && <span>Count: {finding.count}</span>}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {Array.isArray(selectedReport.recommendations) && selectedReport.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      Recommendations
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(selectedReport.recommendations) ? selectedReport.recommendations : []).map((recommendation: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <p className="text-slate-200 text-sm">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Data */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-400" />
                    Assessment Data
                  </h4>
                  <Card className="bg-slate-700/30 border-slate-600">
                    <CardContent className="p-4">
                      <pre className="text-xs text-slate-300 overflow-x-auto">
                        {JSON.stringify(selectedReport.report_data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => downloadReport(selectedReport)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-300 text-lg">Select a report to view details</p>
                <p className="text-slate-400 text-sm">Choose a report from the list to see detailed findings and recommendations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceReports;