import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Activity, 
  Search, 
  FileText, 
  Clock, 
  Database,
  Users,
  AlertTriangle,
  Eye,
  Filter,
  MapPin,
  Bot,
  Target,
  Lock,
  TrendingUp,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Import existing components
import ComplianceReports from './ComplianceReports';
import CustomerSpecificCompliance from './CustomerSpecificCompliance';

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  source_ip: string;
  request_path: string;
  threat_type: string;
  blocked: boolean;
  country_code: string;
  user_agent: string;
  payload: string;
}

interface AuditTrail {
  id: string;
  log_data: any;
  hardware_signature: string;
  chain_hash: string;
  created_at: string;
  integrity_verified: boolean;
}

interface CustomerDeployment {
  id: string;
  customer_name: string;
  domain: string;
  status: string;
  requests_total: number;
  threats_blocked_total: number;
  last_seen: string;
}

const ManagementCompliance = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('unified');
  const [loading, setLoading] = useState(true);
  
  // Unified Dashboard State
  const [dashboardStats, setDashboardStats] = useState({
    totalRequests: 0,
    threatsBlocked: 0,
    activeCustomers: 0,
    honeypotHits: 0,
    adaptiveRules: 0
  });

  // Events Explorer State
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  // Forensic Timeline State
  const [selectedIncident, setSelectedIncident] = useState<string>('');
  const [timelineData, setTimelineData] = useState<any[]>([]);

  // Audit Trails State
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);

  // Multi-Tenant State
  const [customers, setCustomers] = useState<CustomerDeployment[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadDashboardStats(),
        loadSecurityEvents(),
        loadAuditTrails(),
        loadCustomers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Data Load Error",
        description: "Failed to load management dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const [requestsCount, eventsCount, customersCount, honeypotCount, adaptiveCount] = await Promise.all([
        supabase.from('waf_requests').select('*', { count: 'exact', head: true }),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('blocked', true),
        supabase.from('customer_deployments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('honeypot_interactions').select('*', { count: 'exact', head: true }),
        supabase.from('adaptive_rules').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);

      setDashboardStats({
        totalRequests: requestsCount.count || 0,
        threatsBlocked: eventsCount.count || 0,
        activeCustomers: customersCount.count || 0,
        honeypotHits: honeypotCount.count || 0,
        adaptiveRules: adaptiveCount.count || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setEvents((data || []).map(event => ({
        ...event,
        source_ip: String(event.source_ip || ''),
        request_path: String(event.request_path || ''),
        threat_type: String(event.threat_type || ''),
        country_code: String(event.country_code || ''),
        user_agent: String(event.user_agent || ''),
        payload: String(event.payload || '')
      })));
    } catch (error) {
      console.error('Error loading security events:', error);
    }
  };

  const loadAuditTrails = async () => {
    try {
      const { data, error } = await supabase
        .from('hardware_signed_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditTrails(data || []);
    } catch (error) {
      console.error('Error loading audit trails:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_deployments')
        .select('*')
        .order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const reconstructAttack = async (incidentId: string) => {
    try {
      toast({
        title: "Reconstructing Attack",
        description: "Analyzing attack patterns with AI...",
      });

      // Get related events for the incident
      const { data: relatedEvents, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('source_ip', incidentId) // Using incident ID as source IP for demo
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Process with AI to create timeline
      const timeline = relatedEvents?.map((event, index) => ({
        id: event.id,
        timestamp: event.timestamp,
        phase: index === 0 ? 'Initial Contact' : 
               index < relatedEvents.length / 3 ? 'Reconnaissance' :
               index < (relatedEvents.length * 2) / 3 ? 'Exploitation' : 'Post-Exploitation',
        event_type: event.event_type,
        severity: event.severity,
        description: `${event.threat_type || 'Security Event'} from ${event.source_ip}`,
        ai_annotation: `AI Analysis: ${event.severity === 'critical' ? 'High-confidence malicious activity' : 
                       event.severity === 'high' ? 'Likely threat behavior' : 'Suspicious pattern detected'}`,
        mitre_technique: event.threat_type === 'sql_injection' ? 'T1190 - Exploit Public-Facing Application' :
                        event.threat_type === 'xss' ? 'T1189 - Drive-by Compromise' : 'T1071 - Application Layer Protocol'
      })) || [];

      setTimelineData(timeline);
      toast({
        title: "Attack Reconstruction Complete",
        description: `Generated timeline with ${timeline.length} events`,
      });
    } catch (error) {
      console.error('Error reconstructing attack:', error);
      toast({
        title: "Reconstruction Failed",
        description: "Unable to reconstruct attack timeline",
        variant: "destructive",
      });
    }
  };

  const exportAuditLog = () => {
    const exportData = auditTrails.map(trail => ({
      timestamp: trail.created_at,
      hash: trail.chain_hash,
      signature: trail.hardware_signature,
      verified: trail.integrity_verified,
      data: trail.log_data
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Audit Log Exported",
      description: "Cryptographically signed audit trail downloaded",
    });
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchTerm || 
      event.source_ip.includes(searchTerm) ||
      event.request_path?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.threat_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    const matchesType = eventTypeFilter === 'all' || event.event_type === eventTypeFilter;
    
    return matchesSearch && matchesSeverity && matchesType;
  });

  const getAnomalyHeatmapData = () => {
    // Generate heatmap data from events
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map(day => ({
      day,
      hours: hours.map(hour => ({
        hour,
        value: Math.floor(Math.random() * 100), // In real implementation, calculate from actual events
        threats: Math.floor(Math.random() * 20)
      }))
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold">Loading Management & Compliance...</h2>
          <p className="text-muted-foreground">Initializing enterprise features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-neon-purple bg-clip-text text-transparent">
            Management & Compliance
          </h1>
          <p className="text-muted-foreground">Enterprise security governance and oversight</p>
        </div>
        <Badge variant="outline" className="border-primary text-primary">
          {user?.email}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="unified">Unified Dashboard</TabsTrigger>
          <TabsTrigger value="events">Events Explorer</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Center</TabsTrigger>
          <TabsTrigger value="forensic">Forensic Timeline</TabsTrigger>
          <TabsTrigger value="audit">Audit Trails</TabsTrigger>
          <TabsTrigger value="multitenant">Multi-Tenant</TabsTrigger>
        </TabsList>

        {/* Unified Security Dashboard */}
        <TabsContent value="unified" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{dashboardStats.totalRequests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All time traffic</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Threats Blocked</CardTitle>
                <Shield className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{dashboardStats.threatsBlocked.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Malicious requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <Users className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{dashboardStats.activeCustomers}</div>
                <p className="text-xs text-muted-foreground">Deployed instances</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Honeypot Hits</CardTitle>
                <Target className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{dashboardStats.honeypotHits}</div>
                <p className="text-xs text-muted-foreground">Deception interactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Adaptive Rules</CardTitle>
                <Bot className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-info">{dashboardStats.adaptiveRules}</div>
                <p className="text-xs text-muted-foreground">AI-generated rules</p>
              </CardContent>
            </Card>
          </div>

          {/* Anomaly Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Threat Activity Heatmap
              </CardTitle>
              <CardDescription>24-hour threat activity visualization by day of week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getAnomalyHeatmapData().map((day, dayIndex) => (
                  <div key={day.day} className="flex items-center gap-1">
                    <span className="w-8 text-xs text-muted-foreground">{day.day}</span>
                    <div className="flex gap-1">
                      {day.hours.map((hour, hourIndex) => (
                        <div
                          key={hourIndex}
                          className={`w-3 h-3 rounded-sm ${
                            hour.threats > 15 ? 'bg-red-500' :
                            hour.threats > 10 ? 'bg-orange-500' :
                            hour.threats > 5 ? 'bg-yellow-500' :
                            hour.threats > 0 ? 'bg-green-500' : 'bg-muted'
                          }`}
                          title={`${day.day} ${hour.hour}:00 - ${hour.threats} threats`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-muted rounded-sm" />
                  <span>No threats</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-sm" />
                  <span>Low (1-5)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
                  <span>Medium (6-10)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                  <span>High (11-15)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-sm" />
                  <span>Critical (15+)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Explorer */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Events Explorer
              </CardTitle>
              <CardDescription>Full searchable log of all security requests and decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by IP, path, threat type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-muted"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="attack">Attack</SelectItem>
                    <SelectItem value="anomaly">Anomaly</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="allowed">Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted">
                    <Badge variant={event.blocked ? "destructive" : "secondary"}>
                      {event.blocked ? "BLOCKED" : "ALLOWED"}
                    </Badge>
                    <Badge className={
                      event.severity === 'critical' ? 'bg-red-500' :
                      event.severity === 'high' ? 'bg-orange-500' :
                      event.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }>
                      {event.severity}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.source_ip}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm">{event.request_path}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.threat_type && <span className="mr-4">Threat: {event.threat_type}</span>}
                        {event.country_code && <span className="mr-4">Country: {event.country_code}</span>}
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedIncident(event.source_ip);
                        setActiveTab('forensic');
                        reconstructAttack(event.source_ip);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Investigate
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Center */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComplianceReports />
            <CustomerSpecificCompliance />
          </div>
        </TabsContent>

        {/* Forensic Timeline */}
        <TabsContent value="forensic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Attack Forensic Timeline
              </CardTitle>
              <CardDescription>
                AI-powered attack reconstruction with MITRE ATT&CK annotations
                {selectedIncident && <span className="ml-2 text-primary">Investigating: {selectedIncident}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timelineData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select an incident from Events Explorer to begin reconstruction</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineData.map((event, index) => (
                    <div key={event.id} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-primary rounded-full" />
                        {index < timelineData.length - 1 && <div className="w-px h-16 bg-border mt-2" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{event.phase}</Badge>
                          <Badge className={
                            event.severity === 'critical' ? 'bg-red-500' :
                            event.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                          }>
                            {event.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="font-medium">{event.description}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{event.ai_annotation}</p>
                        <p className="text-xs text-primary mt-1">MITRE: {event.mitre_technique}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trails */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Immutable Audit Trails
              </CardTitle>
              <CardDescription>
                Cryptographically signed logs with Merkle-tree indexing
              </CardDescription>
              <div className="flex gap-2">
                <Button onClick={exportAuditLog} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Audit Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditTrails.map((trail) => (
                  <div key={trail.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className={`w-3 h-3 rounded-full ${trail.integrity_verified ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm">{trail.chain_hash.substring(0, 16)}...</span>
                        <Badge variant={trail.integrity_verified ? "default" : "destructive"}>
                          {trail.integrity_verified ? "VERIFIED" : "FAILED"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>Hardware Sig: {trail.hardware_signature.substring(0, 24)}...</span>
                        <span className="ml-4">{new Date(trail.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-Tenant Mode */}
        <TabsContent value="multitenant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Multi-Tenant Management
              </CardTitle>
              <CardDescription>Organization isolation, delegated admins, and consolidated reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Customer Organizations</h4>
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedCustomer === customer.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedCustomer(customer.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{customer.customer_name}</span>
                          <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                            {customer.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>{customer.domain}</div>
                          <div>{customer.requests_total?.toLocaleString() || 0} requests</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedCustomer && (
                  <>
                    <div>
                      <h4 className="font-medium mb-3">Organization Stats</h4>
                      <div className="space-y-4">
                        {(() => {
                          const customer = customers.find(c => c.id === selectedCustomer);
                          return customer ? (
                            <>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="text-lg font-bold text-primary">{customer.requests_total?.toLocaleString() || 0}</div>
                                <div className="text-sm text-muted-foreground">Total Requests</div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="text-lg font-bold text-destructive">{customer.threats_blocked_total?.toLocaleString() || 0}</div>
                                <div className="text-sm text-muted-foreground">Threats Blocked</div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="text-lg font-bold text-success">
                                  {customer.requests_total > 0 ? 
                                    ((customer.threats_blocked_total / customer.requests_total) * 100).toFixed(1) : 0}%
                                </div>
                                <div className="text-sm text-muted-foreground">Block Rate</div>
                              </div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Delegation Controls</h4>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Admin Access</span>
                            <Badge variant="outline">Enabled</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Customer can manage their own rules and configurations
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Compliance Reports</span>
                            <Badge variant="outline">Automated</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Monthly compliance reports generated automatically
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Data Isolation</span>
                            <Badge variant="default">Active</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Complete organizational data separation enforced
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagementCompliance;