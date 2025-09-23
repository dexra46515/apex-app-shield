import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, 
  Building, 
  Plus, 
  Settings, 
  TrendingUp,
  Shield,
  AlertTriangle,
  Activity,
  Brain,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  customer_name: string;
  domain: string;
  status: string;
  requests_total: number;
  threats_blocked_total: number;
  config_settings: any;
}

interface AdaptiveRule {
  id: string;
  name: string;
  condition_pattern: any;
  action_type: string;
  action_parameters: any;
  trigger_count: number;
  learning_confidence: number;
  is_active: boolean;
  auto_generated: boolean;
  created_at: string;
  last_triggered: string | null;
}

const CustomerAdaptiveRules = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [adaptiveRules, setAdaptiveRules] = useState<AdaptiveRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    action_type: 'block',
    condition_pattern: '{"threat_level": "high"}',
    learning_enabled: true
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadAdaptiveRules();
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

  const loadAdaptiveRules = async () => {
    try {
      const { data, error } = await supabase
        .from('adaptive_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdaptiveRules(data || []);
    } catch (error) {
      console.error('Error loading adaptive rules:', error);
    }
  };

  const createAdaptiveRule = async () => {
    if (!selectedCustomer) return;

    try {
      let conditionPattern;
      try {
        conditionPattern = JSON.parse(newRule.condition_pattern);
      } catch {
        toast({
          title: "Invalid JSON",
          description: "Please enter valid JSON for the condition pattern",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('adaptive_rules')
        .insert({
          name: newRule.name,
          condition_pattern: conditionPattern,
          action_type: newRule.action_type,
          action_parameters: {
            customer_id: selectedCustomer,
            learning_enabled: newRule.learning_enabled,
            confidence_threshold: 0.8
          },
          is_active: true,
          auto_generated: false,
          learning_confidence: 0.5,
          trigger_count: 0
        });

      if (error) throw error;

      toast({
        title: "Rule Created",
        description: "Adaptive security rule created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewRule({
        name: '',
        action_type: 'block',
        condition_pattern: '{"threat_level": "high"}',
        learning_enabled: true
      });
      loadAdaptiveRules();
    } catch (error) {
      console.error('Error creating adaptive rule:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create adaptive rule",
        variant: "destructive",
      });
    }
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('adaptive_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Rule Updated",
        description: `Rule ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      loadAdaptiveRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update rule status",
        variant: "destructive",
      });
    }
  };

  const generateAIRules = async () => {
    if (!selectedCustomer) return;

    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) return;

      toast({
        title: "Generating AI Rules",
        description: `Creating adaptive rules for ${customer.customer_name}...`,
      });

      // Simulate AI rule generation based on customer patterns
      const aiGeneratedRules = [
        {
          name: `${customer.customer_name} - SQL Injection Pattern`,
          condition_pattern: {
            request_path: "contains_sql_patterns",
            threat_score: "> 70"
          },
          action_type: 'block',
          action_parameters: {
            customer_id: selectedCustomer,
            learning_enabled: true,
            confidence_threshold: 0.9,
            auto_generated: true
          },
          is_active: true,
          auto_generated: true,
          learning_confidence: 0.85,
          trigger_count: 0
        },
        {
          name: `${customer.customer_name} - Rate Limit Adaptation`,
          condition_pattern: {
            request_frequency: "> 100/min",
            source_reputation: "< 50"
          },
          action_type: 'rate_limit',
          action_parameters: {
            customer_id: selectedCustomer,
            learning_enabled: true,
            limit_requests: 50,
            window_minutes: 1
          },
          is_active: true,
          auto_generated: true,
          learning_confidence: 0.75,
          trigger_count: 0
        }
      ];

      for (const rule of aiGeneratedRules) {
        await supabase
          .from('adaptive_rules')
          .insert(rule);
      }

      toast({
        title: "AI Rules Generated",
        description: `Generated ${aiGeneratedRules.length} adaptive rules`,
      });

      loadAdaptiveRules();
    } catch (error) {
      console.error('Error generating AI rules:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI adaptive rules",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading adaptive rules...</div>;
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const activeRules = adaptiveRules.filter(rule => rule.is_active);
  const autoGeneratedRules = adaptiveRules.filter(rule => rule.auto_generated);
  const avgConfidence = adaptiveRules.length > 0 
    ? (adaptiveRules.reduce((sum, rule) => sum + rule.learning_confidence, 0) / adaptiveRules.length * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Customer Adaptive Rules</h3>
        <div className="flex gap-2">
          <Button
            onClick={generateAIRules}
            disabled={!selectedCustomer}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate AI Rules
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Adaptive Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule-name" className="text-slate-300">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="High Traffic Rate Limiter"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="action-type" className="text-slate-300">Action Type</Label>
                  <Select value={newRule.action_type} onValueChange={(value) => setNewRule(prev => ({ ...prev, action_type: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="block" className="text-white">Block Request</SelectItem>
                      <SelectItem value="rate_limit" className="text-white">Rate Limit</SelectItem>
                      <SelectItem value="challenge" className="text-white">Challenge</SelectItem>
                      <SelectItem value="monitor" className="text-white">Monitor Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="condition" className="text-slate-300">Condition Pattern (JSON)</Label>
                  <Input
                    id="condition"
                    value={newRule.condition_pattern}
                    onChange={(e) => setNewRule(prev => ({ ...prev, condition_pattern: e.target.value }))}
                    placeholder='{"threat_level": "high"}'
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="learning"
                    checked={newRule.learning_enabled}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, learning_enabled: checked }))}
                  />
                  <Label htmlFor="learning" className="text-slate-300">Enable Machine Learning</Label>
                </div>
                
                <Button onClick={createAdaptiveRule} className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Create Adaptive Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Customer Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building className="w-5 h-5 text-blue-400" />
            Select Customer Deployment
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
          {/* Adaptive Rules Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/30 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-green-300">{activeRules.length}</div>
                    <div className="text-sm text-slate-400">Active Rules</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/30 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold text-purple-300">{autoGeneratedRules.length}</div>
                    <div className="text-sm text-slate-400">AI Generated</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/30 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold text-blue-300">{avgConfidence}%</div>
                    <div className="text-sm text-slate-400">Avg Confidence</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-900/20 to-orange-800/30 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-400" />
                  <div>
                    <div className="text-2xl font-bold text-orange-300">
                      {adaptiveRules.reduce((sum, rule) => sum + rule.trigger_count, 0)}
                    </div>
                    <div className="text-sm text-slate-400">Total Triggers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rules List */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="w-5 h-5 text-green-400" />
                Adaptive Security Rules for {selectedCustomerData.customer_name}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Self-learning rules that adapt to attack patterns for this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adaptiveRules.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">No adaptive rules configured</p>
                  <p className="text-slate-400 text-sm">Create your first rule or generate AI rules to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adaptiveRules.map(rule => (
                    <Card key={rule.id} className="bg-slate-700/50 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="font-medium text-white">{rule.name}</div>
                              {rule.auto_generated && (
                                <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                                  AI Generated
                                </Badge>
                              )}
                              <Badge variant={rule.is_active ? "default" : "secondary"}>
                                {rule.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-400 space-y-1">
                              <div>Action: {rule.action_type}</div>
                              <div>Triggers: {rule.trigger_count} | Confidence: {(rule.learning_confidence * 100).toFixed(1)}%</div>
                              {rule.last_triggered && (
                                <div>Last triggered: {new Date(rule.last_triggered).toLocaleString()}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

export default CustomerAdaptiveRules;