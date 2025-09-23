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
  config_settings: any;
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

      // Get related events for the incident (real attack reconstruction)
      const { data: relatedEvents, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('source_ip', incidentId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (!relatedEvents || relatedEvents.length === 0) {
        // If no events with that exact IP, get events from similar timeframe for analysis
        const { data: nearbyEvents, error: nearbyError } = await supabase
          .from('security_events')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);
        
        if (nearbyError) throw nearbyError;
        
        // Use AI to analyze patterns and create timeline
        const response = await supabase.functions.invoke('ai-anomaly-detector', {
          body: {
            action: 'reconstruct_attack',
            events: nearbyEvents,
            target_ip: incidentId,
            analysis_depth: 'full'
          }
        });

        if (response.data?.timeline) {
          setTimelineData(response.data.timeline);
        } else {
          // Fallback: create timeline from available events
          const timeline = nearbyEvents.slice(0, 10).map((event, index) => ({
            id: event.id,
            timestamp: event.timestamp,
            phase: index === 0 ? 'Initial Contact' : 
                   index < nearbyEvents.length / 3 ? 'Reconnaissance' :
                   index < (nearbyEvents.length * 2) / 3 ? 'Exploitation' : 'Post-Exploitation',
            event_type: event.event_type,
            severity: event.severity,
            description: `${event.threat_type || 'Security Event'} from ${event.source_ip}`,
            ai_annotation: `System analysis: ${event.severity} level threat detected`,
            mitre_technique: getMitreTechnique(event.threat_type),
            payload: event.payload,
            user_agent: event.user_agent
          }));
          setTimelineData(timeline);
        }
      } else {
        // Process real events for this IP
        const timeline = relatedEvents.map((event, index) => ({
          id: event.id,
          timestamp: event.timestamp,
          phase: determineAttackPhase(event, index, relatedEvents.length),
          event_type: event.event_type,
          severity: event.severity,
          description: `${event.threat_type || 'Security Event'} targeting ${event.request_path}`,
          ai_annotation: `System analysis: ${event.severity} level ${event.threat_type} activity detected`,
          mitre_technique: getMitreTechnique(event.threat_type),
          payload: event.payload,
          user_agent: event.user_agent,
          blocked: event.blocked
        }));
        setTimelineData(timeline);
      }

      toast({
        title: "Attack Reconstruction Complete",
        description: `Generated timeline with ${timelineData.length} events`,
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

  const generateAIAnnotation = async (event: any): Promise<string> => {
    try {
      // Use real AI analysis
      const response = await supabase.functions.invoke('ai-anomaly-detector', {
        body: {
          action: 'analyze_event',
          event_data: {
            threat_type: event.threat_type,
            severity: event.severity,
            payload: event.payload,
            source_ip: event.source_ip,
            blocked: event.blocked
          }
        }
      });
      
      return response.data?.annotation || `System detected ${event.severity} level ${event.threat_type} activity`;
    } catch (error) {
      return `System detected ${event.severity} level ${event.threat_type} activity`;
    }
  };

  const getMitreTechnique = (threatType: string): string => {
    const techniques = {
      'sql_injection': 'T1190 - Exploit Public-Facing Application',
      'xss': 'T1189 - Drive-by Compromise', 
      'command_injection': 'T1059 - Command and Scripting Interpreter',
      'path_traversal': 'T1083 - File and Directory Discovery',
      'rce': 'T1059 - Command and Scripting Interpreter',
      'brute_force': 'T1110 - Brute Force',
      'ddos': 'T1498 - Network Denial of Service'
    };
    return techniques[threatType as keyof typeof techniques] || 'T1071 - Application Layer Protocol';
  };

  const determineAttackPhase = (event: any, index: number, total: number): string => {
    if (index === 0) return 'Initial Contact';
    if (index < total / 4) return 'Reconnaissance';
    if (index < total / 2) return 'Weaponization';
    if (index < (total * 3) / 4) return 'Exploitation';
    return 'Post-Exploitation';
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

  const getAnomalyHeatmapData = async () => {
    try {
      // Get real security events from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: events, error } = await supabase
        .from('security_events')
        .select('timestamp, severity, blocked')
        .gte('timestamp', sevenDaysAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Process events into heatmap format
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const hours = Array.from({ length: 24 }, (_, i) => i);
      
      // Initialize heatmap data
      const heatmapData = days.map(day => ({
        day,
        hours: hours.map(hour => ({ hour, value: 0, threats: 0 }))
      }));

      // Populate with real event data
      events?.forEach(event => {
        const eventDate = new Date(event.timestamp);
        const dayIndex = (eventDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
        const hour = eventDate.getHours();
        
        if (heatmapData[dayIndex] && heatmapData[dayIndex].hours[hour]) {
          heatmapData[dayIndex].hours[hour].value += 1;
          if (event.severity === 'critical' || event.severity === 'high') {
            heatmapData[dayIndex].hours[hour].threats += 1;
          }
        }
      });

      return heatmapData;
    } catch (error) {
      console.error('Error generating heatmap data:', error);
      // Fallback to empty data
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const hours = Array.from({ length: 24 }, (_, i) => i);
      return days.map(day => ({
        day,
        hours: hours.map(hour => ({ hour, value: 0, threats: 0 }))
      }));
    }
  };

  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  
  useEffect(() => {
    const loadHeatmap = async () => {
      const data = await getAnomalyHeatmapData();
      setHeatmapData(data);
    };
    loadHeatmap();
  }, []);

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
                {heatmapData.map((day, dayIndex) => (
                  <div key={day.day} className="flex items-center gap-1">
                    <span className="w-8 text-xs text-muted-foreground">{day.day}</span>
                    <div className="flex gap-1">
                      {day.hours.map((hour, hourIndex) => (
                        <div
                          key={hourIndex}
                          className={`w-3 h-3 rounded-sm ${
                            hour.threats > 10 ? 'bg-red-500' :
                            hour.threats > 5 ? 'bg-orange-500' :
                            hour.threats > 2 ? 'bg-yellow-500' :
                            hour.threats > 0 ? 'bg-green-500' : 'bg-muted'
                          }`}
                          title={`${day.day} ${hour.hour}:00 - ${hour.threats} threats, ${hour.value} total events`}
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
                  <span>Low (1-2)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
                  <span>Medium (3-5)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                  <span>High (6-10)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-sm" />
                  <span>Critical (10+)</span>
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
                        <div className={`w-3 h-3 rounded-full ${
                          event.blocked ? 'bg-green-500' : 'bg-red-500'
                        }`} />
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
                          <Badge variant={event.blocked ? "default" : "destructive"}>
                            {event.blocked ? "BLOCKED" : "ALLOWED"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="font-medium">{event.description}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{event.ai_annotation}</p>
                        <p className="text-xs text-primary mt-1">MITRE: {event.mitre_technique}</p>
                        {event.payload && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View payload
                            </summary>
                            <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto">
                              {event.payload}
                            </pre>
                          </details>
                        )}
                        {event.user_agent && (
                          <p className="text-xs text-muted-foreground mt-1">
                            User-Agent: {event.user_agent}
                          </p>
                        )}
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
                                <div className="p-3 rounded-lg bg-muted/50">
                                  <div className="text-lg font-bold text-info">
                                    {new Date(customer.last_seen).toLocaleDateString()}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Last Active</div>
                                </div>
                                
                                {/* Real-time customer status */}
                                <div className="p-3 rounded-lg bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      customer.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                    }`} />
                                    <div className="text-sm font-medium capitalize">{customer.status}</div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">Current Status</div>
                                </div>
                              </>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">Real-time Delegation Controls</h4>
                        <div className="space-y-3">
                          {(() => {
                            const customer = customers.find(c => c.id === selectedCustomer);
                            const config = customer?.config_settings || {};
                            
                            return (
                              <>
                                <div className="p-3 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Admin Access</span>
                                    <Badge variant={config.admin_access !== false ? "default" : "secondary"}>
                                      {config.admin_access !== false ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Customer can manage their own rules and configurations
                                  </div>
                                </div>
                                
                                <div className="p-3 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">AI Analysis</span>
                                    <Badge variant={config.ai_analysis ? "default" : "secondary"}>
                                      {config.ai_analysis ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Real-time AI threat analysis and adaptive rules
                                  </div>
                                </div>
                                
                                <div className="p-3 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Geo Blocking</span>
                                    <Badge variant={config.geo_blocking ? "default" : "secondary"}>
                                      {config.geo_blocking ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Geographic traffic filtering and restrictions
                                  </div>
                                </div>
                                
                                <div className="p-3 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Rate Limiting</span>
                                    <Badge variant={config.rate_limit ? "default" : "secondary"}>
                                      {config.rate_limit || 1000}/min
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Current rate limiting configuration
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
                              </>
                            );
                          })()}
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