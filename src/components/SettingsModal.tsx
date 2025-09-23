import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Shield, 
  Bell, 
  Globe, 
  Database,
  AlertTriangle,
  Lock,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SecuritySettings {
  alertNotifications: boolean;
  emailReports: boolean;
  realTimeMonitoring: boolean;
  autoBlock: boolean;
  threatThreshold: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableGeoblocking: boolean;
  logRetentionDays: number;
}

const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SecuritySettings>({
    alertNotifications: true,
    emailReports: true,
    realTimeMonitoring: true,
    autoBlock: false,
    threatThreshold: 'medium',
    sessionTimeout: 3600,
    maxLoginAttempts: 3,
    enableGeoblocking: true,
    logRetentionDays: 90,
  });

  const handleSave = async () => {
    try {
      // Save settings to Supabase WAF configuration table
      const { error } = await supabase
        .from('waf_configuration')
        .upsert({
          config_key: 'security_settings',
          config_value: settings as any,
          description: 'WAF security preferences and monitoring settings'
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your WAF security settings have been updated successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save settings to database",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSettings({
      alertNotifications: true,
      emailReports: true,
      realTimeMonitoring: true,
      autoBlock: false,
      threatThreshold: 'medium',
      sessionTimeout: 3600,
      maxLoginAttempts: 3,
      enableGeoblocking: true,
      logRetentionDays: 90,
    });
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5 text-cyan-400" />
            WAF Security Settings
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure your Web Application Firewall security preferences and monitoring settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="security" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-700 border-slate-600">
            <TabsTrigger value="security" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="access" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">
              <Globe className="h-4 w-4 mr-2" />
              Access Control
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-slate-600 text-slate-300 data-[state=active]:text-white">
              <Database className="h-4 w-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-400" />
                  Security Configuration
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure core security protection settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-slate-200">Real-time Monitoring</Label>
                    <p className="text-sm text-slate-400">Monitor security events in real-time</p>
                  </div>
                  <Switch
                    checked={settings.realTimeMonitoring}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, realTimeMonitoring: checked }))
                    }
                  />
                </div>

                <Separator className="bg-slate-700" />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-slate-200">Auto-block Threats</Label>
                    <p className="text-sm text-slate-400">Automatically block detected threats</p>
                  </div>
                  <Switch
                    checked={settings.autoBlock}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, autoBlock: checked }))
                    }
                  />
                </div>

                <Separator className="bg-slate-700" />

                <div className="space-y-2">
                  <Label className="text-slate-200">Threat Detection Threshold</Label>
                  <Select
                    value={settings.threatThreshold}
                    onValueChange={(value) =>
                      setSettings(prev => ({ ...prev, threatThreshold: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="low">Low - Detect all suspicious activity</SelectItem>
                      <SelectItem value="medium">Medium - Balanced detection</SelectItem>
                      <SelectItem value="high">High - Only critical threats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAttempts" className="text-slate-200">Max Login Attempts</Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) =>
                      setSettings(prev => ({ 
                        ...prev, 
                        maxLoginAttempts: parseInt(e.target.value) || 3 
                      }))
                    }
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  Alert & Notification Settings
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure how you receive security alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-slate-200">Push Notifications</Label>
                    <p className="text-sm text-slate-400">Receive instant security alerts</p>
                  </div>
                  <Switch
                    checked={settings.alertNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, alertNotifications: checked }))
                    }
                  />
                </div>

                <Separator className="bg-slate-700" />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-slate-200">Email Reports</Label>
                    <p className="text-sm text-slate-400">Daily security summary reports</p>
                  </div>
                  <Switch
                    checked={settings.emailReports}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, emailReports: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  Access Control Settings
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure geographic and session-based access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-slate-200">Geographic Blocking</Label>
                    <p className="text-sm text-slate-400">Block traffic from high-risk countries</p>
                  </div>
                  <Switch
                    checked={settings.enableGeoblocking}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, enableGeoblocking: checked }))
                    }
                  />
                </div>

                <Separator className="bg-slate-700" />

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout" className="text-slate-200">Session Timeout (seconds)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="300"
                    max="86400"
                    value={settings.sessionTimeout}
                    onChange={(e) =>
                      setSettings(prev => ({ 
                        ...prev, 
                        sessionTimeout: parseInt(e.target.value) || 3600 
                      }))
                    }
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-400">
                    How long users stay logged in (300s - 24h)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-400" />
                  System Configuration
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure system-level settings and data retention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="retention" className="text-slate-200">Log Retention (days)</Label>
                  <Input
                    id="retention"
                    type="number"
                    min="7"
                    max="365"
                    value={settings.logRetentionDays}
                    onChange={(e) =>
                      setSettings(prev => ({ 
                        ...prev, 
                        logRetentionDays: parseInt(e.target.value) || 90 
                      }))
                    }
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-400">
                    How long to keep security logs (7-365 days)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t border-slate-700">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;