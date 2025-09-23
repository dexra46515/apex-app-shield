import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Building, 
  Activity, 
  Shield, 
  AlertTriangle,
  TrendingUp,
  Eye,
  Clock,
  Globe,
  Zap,
  Brain,
  Network
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
  requests_today: number;
  threats_blocked_today: number;
  last_seen: string;
  config_settings: any;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  source_ip: unknown;
  timestamp: string;
  blocked: boolean;
  threat_type: string;
  country_code: string;
}

const CustomerSIEMAnalytics = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadSecurityEvents();
    }
  }, [selectedCustomer, timeRange]);

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

  const loadSecurityEvents = async () => {
    try {
      // Calculate time range
      const now = new Date();
      const hoursBack = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSecurityEvents(data || []);
    } catch (error) {
      console.error('Error loading security events:', error);
    }
  };

  const getCustomerAnalytics = (customer: Customer) => {
    const blockingRate = customer.requests_total > 0 
      ? ((customer.threats_blocked_total / customer.requests_total) * 100)
      : 0;

    const todayBlockingRate = customer.requests_today > 0
      ? ((customer.threats_blocked_today / customer.requests_today) * 100)
      : 0;

    const customerEvents = securityEvents.filter(event => 
      // In a real scenario, you'd filter by customer_id or domain
      event.source_ip // For demo, we'll show all events
    );

    const criticalEvents = customerEvents.filter(e => e.severity === 'critical').length;
    const highEvents = customerEvents.filter(e => e.severity === 'high').length;
    const blockedEvents = customerEvents.filter(e => e.blocked).length;

    const threatTypes = customerEvents.reduce((acc, event) => {
      if (event.threat_type) {
        acc[event.threat_type] = (acc[event.threat_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const countries = customerEvents.reduce((acc, event) => {
      if (event.country_code) {
        acc[event.country_code] = (acc[event.country_code] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      blockingRate,
      todayBlockingRate,
      totalEvents: customerEvents.length,
      criticalEvents,
      highEvents,
      blockedEvents,
      blockingEfficiency: customerEvents.length > 0 ? (blockedEvents / customerEvents.length * 100) : 0,
      topThreatTypes: Object.entries(threatTypes).sort(([,a], [,b]) => b - a).slice(0, 5),
      topCountries: Object.entries(countries).sort(([,a], [,b]) => b - a).slice(0, 5),
      lastActivity: customer.last_seen
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-900/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'high': return <Shield className="w-4 h-4 text-orange-400" />;
      case 'medium': return <Activity className="w-4 h-4 text-yellow-400" />;
      case 'low': return <Eye className="w-4 h-4 text-green-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading SIEM analytics...</div>;
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const analytics = selectedCustomerData ? getCustomerAnalytics(selectedCustomerData) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Customer SIEM Analytics</h3>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="1h" className="text-white">Last Hour</SelectItem>
              <SelectItem value="24h" className="text-white">Last 24h</SelectItem>
              <SelectItem value="7d" className="text-white">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-white">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customer Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building className="w-5 h-5 text-blue-400" />
            Select Customer for SIEM Analysis
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

      {selectedCustomerData && analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/30 border-cyan-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-2xl font-bold text-cyan-300">{analytics.totalEvents}</div>
                    <div className="text-sm text-slate-400">Security Events</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-900/20 to-red-800/30 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <div className="text-2xl font-bold text-red-300">{analytics.criticalEvents}</div>
                    <div className="text-sm text-slate-400">Critical Alerts</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/30 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-green-300">{analytics.blockedEvents}</div>
                    <div className="text-sm text-slate-400">Threats Blocked</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/30 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold text-purple-300">{analytics.blockingEfficiency.toFixed(1)}%</div>
                    <div className="text-sm text-slate-400">Block Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Security Overview */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Network className="w-5 h-5 text-cyan-400" />
                {selectedCustomerData.customer_name} - Security Analytics
              </CardTitle>
              <CardDescription className="text-slate-400">
                Real-time security analytics and threat intelligence for {selectedCustomerData.domain}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Traffic Overview */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Traffic Overview</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300">Total Requests</span>
                        <span className="text-sm font-medium text-white">{selectedCustomerData.requests_total?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-300">Today's Requests</span>
                        <span className="text-sm font-medium text-white">{selectedCustomerData.requests_today?.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">Overall Blocking Rate</span>
                        <span className="text-sm font-medium text-orange-400">{analytics.blockingRate.toFixed(2)}%</span>
                      </div>
                      <Progress value={analytics.blockingRate} className="h-2 bg-slate-700" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">Today's Blocking Rate</span>
                        <span className="text-sm font-medium text-green-400">{analytics.todayBlockingRate.toFixed(2)}%</span>
                      </div>
                      <Progress value={analytics.todayBlockingRate} className="h-2 bg-slate-700" />
                    </div>
                  </div>
                </div>

                {/* Threat Intelligence */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Threat Intelligence</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-slate-300 block mb-2">Top Threat Types</span>
                      {analytics.topThreatTypes.length > 0 ? (
                        <div className="space-y-1">
                          {analytics.topThreatTypes.map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{type}</span>
                              <Badge variant="outline" className="border-red-500/50 text-red-300">
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">No threats detected</p>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-sm text-slate-300 block mb-2">Top Source Countries</span>
                      {analytics.topCountries.length > 0 ? (
                        <div className="space-y-1">
                          {analytics.topCountries.map(([country, count]) => (
                            <div key={country} className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{country || 'Unknown'}</span>
                              <Badge variant="outline" className="border-blue-500/50 text-blue-300">
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">No data available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Security Events */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-orange-400" />
                Recent Security Events ({timeRange})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {securityEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-300">No security events in the selected time range</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityEvents.slice(0, 10).map(event => (
                    <Card key={event.id} className="bg-slate-700/50 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(event.severity)}
                            <div>
                              <div className="font-medium text-white">{event.event_type}</div>
                              <div className="text-sm text-slate-300">
                                Source: {String(event.source_ip || 'Unknown')} 
                                {event.country_code && ` (${event.country_code})`}
                              </div>
                              <div className="text-xs text-slate-400">
                                {new Date(event.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                            {event.blocked && (
                              <Badge variant="outline" className="border-green-500/50 text-green-300">
                                Blocked
                              </Badge>
                            )}
                            {event.threat_type && (
                              <Badge variant="outline" className="border-red-500/50 text-red-300">
                                {event.threat_type}
                              </Badge>
                            )}
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

export default CustomerSIEMAnalytics;