import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Play, Pause, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Honeypot {
  id: string;
  name: string;
  type: string;
  endpoint_path: string;
  decoy_response: any;
  is_active: boolean;
  created_at: string;
}

interface HoneypotManagementProps {
  honeypots: Honeypot[];
  onHoneypotCreated: () => void;
}

const HoneypotManagement: React.FC<HoneypotManagementProps> = ({ 
  honeypots, 
  onHoneypotCreated 
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'web',
    endpoint_path: '',
    decoy_response: '{"status": "success", "message": "Welcome to admin panel"}'
  });

  const honeypotTypes = [
    { value: 'web', label: 'Web Application', description: 'Fake admin panels, login pages' },
    { value: 'api', label: 'API Endpoint', description: 'Fake API keys, sensitive data' },
    { value: 'file', label: 'File System', description: 'Fake config files, backups' },
    { value: 'database', label: 'Database', description: 'Fake database dumps' },
    { value: 'login', label: 'Login Form', description: 'Fake authentication portals' }
  ];

  const handleCreateHoneypot = async () => {
    try {
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(formData.decoy_response);
      } catch {
        toast.error('Invalid JSON in decoy response');
        return;
      }

      const { error } = await supabase
        .from('honeypots')
        .insert({
          name: formData.name,
          type: formData.type,
          endpoint_path: formData.endpoint_path,
          decoy_response: parsedResponse,
          is_active: true
        });

      if (error) throw error;

      toast.success('Honeypot created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        type: 'web',
        endpoint_path: '',
        decoy_response: '{"status": "success", "message": "Welcome to admin panel"}'
      });
      onHoneypotCreated();
    } catch (error) {
      console.error('Error creating honeypot:', error);
      toast.error('Failed to create honeypot');
    }
  };

  const toggleHoneypot = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('honeypots')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Honeypot ${!currentStatus ? 'activated' : 'deactivated'}`);
      onHoneypotCreated();
    } catch (error) {
      console.error('Error toggling honeypot:', error);
      toast.error('Failed to update honeypot');
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      web: '🌐',
      api: '🔑',
      file: '📁',
      database: '🗄️',
      login: '🔐'
    };
    return icons[type as keyof typeof icons] || '🍯';
  };

  const copyDeploymentCode = (honeypot: Honeypot) => {
    const code = `# Nginx Configuration for ${honeypot.name}
location ${honeypot.endpoint_path} {
    proxy_pass https://your-waf-domain.com/honeypot/${honeypot.id};
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}`;
    navigator.clipboard.writeText(code);
    toast.success('Deployment code copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">Honeypot Management</h3>
          <p className="text-slate-400">Deploy and manage honeypots to detect attackers</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10">
                <ExternalLink className="w-4 h-4 mr-2" />
                Deployment Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Honeypot Deployment Guide</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-slate-300">
                <div>
                  <h4 className="font-semibold text-white mb-2">1. Nginx Integration</h4>
                  <p className="text-sm text-slate-400 mb-2">Add honeypot locations to your Nginx configuration:</p>
                  <pre className="bg-slate-900 p-3 rounded text-xs overflow-x-auto">
{`location /admin {
    proxy_pass https://your-waf-domain.com/honeypot/[honeypot-id];
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">2. Docker Integration</h4>
                  <p className="text-sm text-slate-400 mb-2">Environment variables for containerized deployments:</p>
                  <pre className="bg-slate-900 p-3 rounded text-xs overflow-x-auto">
{`HONEYPOT_ENDPOINTS=/admin,/api/keys,/.env
WAF_HONEYPOT_URL=https://your-waf-domain.com/honeypot/`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">3. Application Integration</h4>
                  <p className="text-sm text-slate-400">Forward suspicious requests to honeypot endpoints to capture attacker behavior and improve threat intelligence.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Honeypot
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Honeypot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-300">Honeypot Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Admin Panel Honeypot"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type" className="text-slate-300">Honeypot Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {honeypotTypes.map(type => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-600">
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-slate-400">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="endpoint" className="text-slate-300">Endpoint Path</Label>
                  <Input
                    id="endpoint"
                    value={formData.endpoint_path}
                    onChange={(e) => setFormData(prev => ({ ...prev, endpoint_path: e.target.value }))}
                    placeholder="/admin"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="response" className="text-slate-300">Decoy Response (JSON)</Label>
                  <Textarea
                    id="response"
                    value={formData.decoy_response}
                    onChange={(e) => setFormData(prev => ({ ...prev, decoy_response: e.target.value }))}
                    placeholder='{"status": "success", "message": "Welcome to admin panel"}'
                    className="bg-slate-700 border-slate-600 text-white h-20"
                  />
                </div>
                
                <Button onClick={handleCreateHoneypot} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  Create Honeypot
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Honeypots Grid */}
      <div className="grid gap-4">
        {honeypots.map((honeypot) => (
          <Card key={honeypot.id} className="bg-slate-800/50 border-orange-500/30 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getTypeIcon(honeypot.type)}</span>
                  <div>
                    <CardTitle className="text-orange-200 text-lg">{honeypot.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-orange-500/50 text-orange-300">
                        {honeypot.type}
                      </Badge>
                      <Badge variant={honeypot.is_active ? "default" : "secondary"} 
                             className={honeypot.is_active ? "bg-green-600" : "bg-gray-600"}>
                        {honeypot.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={honeypot.is_active}
                    onCheckedChange={() => toggleHoneypot(honeypot.id, honeypot.is_active)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <div>
                    <span className="text-slate-400 text-sm">Endpoint:</span>
                    <code className="text-orange-300 ml-2">{honeypot.endpoint_path}</code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyDeploymentCode(honeypot)}
                    className="text-blue-300 hover:bg-blue-500/10"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-xs text-slate-400">
                  <span>Created:</span> {new Date(honeypot.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {honeypots.length === 0 && (
          <Card className="bg-slate-800/30 border-slate-600 border-dashed">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🍯</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Honeypots Deployed</h3>
              <p className="text-slate-400 mb-4">Create your first honeypot to start catching attackers</p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Honeypot
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HoneypotManagement;