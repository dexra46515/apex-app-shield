import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Eye,
  Bot,
  Globe,
  Lock,
  TrendingUp,
  LogOut,
  Bell,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import TrafficSimulator from './TrafficSimulator';
import SettingsModal from './SettingsModal';

interface SecurityStats {
  totalEvents: number;
  blockedRequests: number;
  threatLevel: string;
  activeRules: number;
  criticalAlerts: number;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  source_ip: string;
  threat_type: string;
  blocked: boolean;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  source_ip: string;
  event_count: number;
  acknowledged: boolean;
  created_at: string;
}

const SecurityDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    blockedRequests: 0,
    threatLevel: 'low',
    activeRules: 0,
    criticalAlerts: 0,
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadSecurityData();
    
    // Set up real-time subscriptions
    const eventsChannel = supabase
      .channel('security-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events'
        },
        (payload) => {
          console.log('New security event:', payload);
          loadSecurityData(); // Refresh data
          
          const event = payload.new as SecurityEvent;
          if (event.severity === 'critical' || event.severity === 'high') {
            toast({
              title: "Security Alert",
              description: `${event.threat_type} detected from ${event.source_ip}`,
              variant: event.blocked ? "default" : "destructive",
            });
          }
        }
      )
      .subscribe();

    const alertsChannel = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_alerts'
        },
        (payload) => {
          console.log('New security alert:', payload);
          loadSecurityData();
          
          const alert = payload.new as SecurityAlert;
          toast({
            title: "New Security Alert",
            description: alert.title,
            variant: alert.severity === 'critical' ? "destructive" : "default",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [toast]);

  const loadSecurityData = async () => {
    try {
      // Load security statistics
      const [eventsResult, rulesResult, alertsResult] = await Promise.all([
        supabase
          .from('security_events')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100),
        supabase
          .from('security_rules')
          .select('*')
          .eq('enabled', true),
        supabase
          .from('security_alerts')
          .select('*')
          .eq('resolved', false)
          .order('created_at', { ascending: false })
      ]);

      if (eventsResult.data) {
        const events = eventsResult.data;
        const blockedCount = events.filter(e => e.blocked).length;
        const criticalEvents = events.filter(e => e.severity === 'critical').length;
        
        setStats({
          totalEvents: events.length,
          blockedRequests: blockedCount,
          threatLevel: criticalEvents > 5 ? 'critical' : criticalEvents > 2 ? 'high' : 'medium',
          activeRules: rulesResult.data?.length || 0,
          criticalAlerts: alertsResult.data?.filter(a => a.severity === 'critical').length || 0,
        });

        setRecentEvents(events.slice(0, 10) as SecurityEvent[]);
      }

      if (alertsResult.data) {
        setActiveAlerts(alertsResult.data as SecurityAlert[]);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Data Load Error",
        description: "Failed to load security dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alert Acknowledged",
        description: "Security alert has been acknowledged",
      });
      
      loadSecurityData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-critical text-white';
      case 'high': return 'bg-high text-white';
      case 'medium': return 'bg-medium text-black';
      case 'low': return 'bg-low text-white';
      default: return 'bg-muted text-foreground';
    }
  };

  const getThreatLevelProgress = () => {
    switch (stats.threatLevel) {
      case 'critical': return 90;
      case 'high': return 70;
      case 'medium': return 45;
      case 'low': return 20;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold">Loading Security Dashboard...</h2>
          <p className="text-muted-foreground">Initializing protection systems</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Shield className="h-8 w-8 text-primary neon-glow" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-neon-purple bg-clip-text text-transparent">
              WAF Security Platform
            </h1>
            <p className="text-muted-foreground">Enterprise Protection Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="border-primary text-primary">
            {user?.email}
          </Badge>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Alerts ({stats.criticalAlerts})
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Security events processed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Requests</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.blockedRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Malicious requests blocked
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize text-warning">{stats.threatLevel}</div>
            <Progress 
              value={getThreatLevelProgress()} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Lock className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeRules}</div>
            <p className="text-xs text-muted-foreground">
              Security rules enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Simulator */}
      <TrafficSimulator />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Security Events */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Recent Security Events
            </CardTitle>
            <CardDescription>
              Latest security events and threat detections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Badge className={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{event.threat_type || 'Security Event'}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.source_ip} • {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {event.blocked ? (
                      <Shield className="h-4 w-4 text-destructive" />
                    ) : (
                      <Eye className="h-4 w-4 text-warning" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Security Alerts */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Active Security Alerts
            </CardTitle>
            <CardDescription>
              Unresolved security alerts requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 text-success" />
                  <p>No active security alerts</p>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-lg bg-muted/50 border border-warning/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm font-medium">{alert.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Source: {alert.source_ip}</span>
                          <span>Count: {alert.event_count}</span>
                          <span>{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default SecurityDashboard;