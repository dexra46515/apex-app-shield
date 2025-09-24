import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Shield,
  Globe,
  Key,
  Server,
  PlayCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ValidationResult {
  score: number;
  checks: any;
}

interface ProductionValidation {
  domain_validation: ValidationResult;
  security_configuration: ValidationResult;
  api_integration: ValidationResult;
  hardware_trust_setup: ValidationResult;
  overall_score: number;
}

const ProductionReadinessChecker = () => {
  const [validationResults, setValidationResults] = useState<ProductionValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerDeployments, setCustomerDeployments] = useState<any[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadCustomerDeployments();
  }, []);

  const loadCustomerDeployments = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .select('*')
        .eq('status', 'active')
        .order('customer_name');

      if (error) throw error;
      setCustomerDeployments(data || []);
      
      // Auto-select first deployment if available and none is selected
      if (data && data.length > 0 && !selectedDeployment) {
        setSelectedDeployment(data[0].api_key);
      }
    } catch (error) {
      console.error('Error loading deployments:', error);
      toast({
        title: "Error",
        description: "Failed to load customer deployments",
        variant: "destructive",
      });
    }
  };

  const runProductionValidation = async () => {
    if (!selectedDeployment) {
      toast({
        title: "No Deployment Selected",
        description: "Please select a customer deployment to validate",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      toast({
        title: "Running Production Validation",
        description: "Checking deployment readiness...",
      });

      const deployment = customerDeployments.find(d => d.api_key === selectedDeployment);
      
      const response = await supabase.functions.invoke('production-deployment-validator', {
        body: {
          api_key: selectedDeployment,
          customer_id: deployment?.id,
          deployment_config: deployment?.config_settings || {}
        }
      });

      if (response.error) throw response.error;

      setValidationResults(response.data.validation_results);
      
      toast({
        title: "Validation Complete",
        description: `Overall score: ${response.data.validation_results.overall_score}%`,
        variant: response.data.production_ready ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error running validation:', error);
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to run production validation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertTriangle;
    return XCircle;
  };

  const getOverallStatus = () => {
    if (!validationResults) return null;
    
    const { overall_score } = validationResults;
    if (overall_score >= 80) {
      return {
        status: 'Ready for Production',
        color: 'bg-green-500',
        variant: 'default' as const
      };
    } else if (overall_score >= 60) {
      return {
        status: 'Needs Improvements',
        color: 'bg-yellow-500',
        variant: 'secondary' as const
      };
    } else {
      return {
        status: 'Not Ready for Production',
        color: 'bg-red-500',
        variant: 'destructive' as const
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Production Readiness Assessment
          </h2>
          <p className="text-muted-foreground">Validate your WAF deployment for production use</p>
        </div>
        {validationResults && (
          <Badge variant={getOverallStatus()?.variant}>
            {getOverallStatus()?.status}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployment Selection</CardTitle>
          <CardDescription>Choose a customer deployment to validate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerDeployments.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Customer Deployments</h3>
              <p className="text-muted-foreground mb-4">
                Create customer deployments in the Onboarding tab to run production validation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerDeployments.map((deployment) => (
                <Card 
                  key={deployment.id}
                  className={`cursor-pointer transition-colors ${
                    selectedDeployment === deployment.api_key ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedDeployment(deployment.api_key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{deployment.customer_name}</h4>
                        <p className="text-sm text-muted-foreground">{deployment.domain}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {deployment.status}
                          </Badge>
                          {selectedDeployment === deployment.api_key && (
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {customerDeployments.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No active customer deployments found. Please create a customer deployment first in the Onboarding tab.
              </AlertDescription>
            </Alert>
          ) : (
            <Button 
              onClick={runProductionValidation}
              disabled={!selectedDeployment || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Validation...
                </>
              ) : !selectedDeployment ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Select Deployment to Validate
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run Production Validation
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {validationResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Overall Readiness Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress 
                    value={validationResults.overall_score} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(validationResults.overall_score)}`}>
                    {validationResults.overall_score}%
                  </div>
                  <Badge variant={getOverallStatus()?.variant}>
                    {getOverallStatus()?.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Domain Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Score</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getScoreIcon(validationResults.domain_validation.score);
                      return <Icon className={`h-5 w-5 ${getScoreColor(validationResults.domain_validation.score)}`} />;
                    })()}
                    <span className={`font-bold ${getScoreColor(validationResults.domain_validation.score)}`}>
                      {validationResults.domain_validation.score}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(validationResults.domain_validation.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <Badge variant={value ? "default" : "destructive"}>
                        {value?.toString() || 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Security Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Score</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getScoreIcon(validationResults.security_configuration.score);
                      return <Icon className={`h-5 w-5 ${getScoreColor(validationResults.security_configuration.score)}`} />;
                    })()}
                    <span className={`font-bold ${getScoreColor(validationResults.security_configuration.score)}`}>
                      {validationResults.security_configuration.score}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(validationResults.security_configuration.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <Badge variant={value ? "default" : "destructive"}>
                        {value ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* API Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Score</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getScoreIcon(validationResults.api_integration.score);
                      return <Icon className={`h-5 w-5 ${getScoreColor(validationResults.api_integration.score)}`} />;
                    })()}
                    <span className={`font-bold ${getScoreColor(validationResults.api_integration.score)}`}>
                      {validationResults.api_integration.score}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(validationResults.api_integration.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <Badge variant={value ? "default" : "destructive"}>
                        {value ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hardware Trust Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Hardware Trust Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Score</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getScoreIcon(validationResults.hardware_trust_setup.score);
                      return <Icon className={`h-5 w-5 ${getScoreColor(validationResults.hardware_trust_setup.score)}`} />;
                    })()}
                    <span className={`font-bold ${getScoreColor(validationResults.hardware_trust_setup.score)}`}>
                      {validationResults.hardware_trust_setup.score}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(validationResults.hardware_trust_setup.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <Badge variant={value ? "default" : "destructive"}>
                        {value ? 'Configured' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {validationResults.overall_score < 80 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action Required:</strong> Your deployment needs improvements before production use. 
                Focus on areas with low scores to increase overall readiness.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
};

export default ProductionReadinessChecker;