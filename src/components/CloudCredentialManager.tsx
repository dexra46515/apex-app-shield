import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  Plus, 
  Check, 
  X, 
  AlertCircle,
  Trash2,
  RefreshCw,
  Key,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CloudCredential {
  id: string;
  provider: string;
  credential_name: string;
  is_active: boolean;
  created_at: string;
}

interface CredentialForm {
  provider: string;
  credentialName: string;
  credentials: any;
}

const CloudCredentialManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<CloudCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{ [key: string]: boolean }>({});
  
  const [form, setForm] = useState<CredentialForm>({
    provider: '',
    credentialName: '',
    credentials: {}
  });

  const cloudProviders = [
    { id: 'aws', name: 'Amazon Web Services', icon: '🟠' },
    { id: 'gcp', name: 'Google Cloud Platform', icon: '🔵' },
    { id: 'azure', name: 'Microsoft Azure', icon: '🔷' },
    { id: 'digitalocean', name: 'DigitalOcean', icon: '🌊' },
    { id: 'vercel', name: 'Vercel', icon: '⚡' },
    { id: 'railway', name: 'Railway', icon: '🚂' }
  ];

  useEffect(() => {
    if (user) {
      loadCredentials();
    }
  }, [user]);

  const loadCredentials = async () => {
    try {
      const response = await supabase.functions.invoke('credential-manager', {
        body: { action: 'list', userId: user?.id }
      });

      if (response.error) throw response.error;
      
      setCredentials(response.data.credentials || []);
      
      // Validate all credentials
      for (const cred of response.data.credentials || []) {
        validateCredential(cred.id, cred.provider);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast({
        title: "Error",
        description: "Failed to load cloud credentials",
        variant: "destructive",
      });
    }
  };

  const validateCredential = async (credentialId: string, provider: string) => {
    try {
      const response = await supabase.functions.invoke('credential-manager', {
        body: { action: 'validate', credentialId, provider }
      });

      if (response.data) {
        setValidationStatus(prev => ({
          ...prev,
          [credentialId]: response.data.is_valid
        }));
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationStatus(prev => ({
        ...prev,
        [credentialId]: false
      }));
    }
  };

  const handleStoreCredentials = async () => {
    if (!form.provider || !form.credentialName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('credential-manager', {
        body: {
          action: 'store',
          provider: form.provider,
          credentialName: form.credentialName,
          credentials: form.credentials,
          userId: user?.id
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `${form.provider.toUpperCase()} credentials stored successfully`,
      });

      setForm({ provider: '', credentialName: '', credentials: {} });
      setShowForm(false);
      loadCredentials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to store credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    try {
      const response = await supabase.functions.invoke('credential-manager', {
        body: { action: 'delete', credentialId, userId: user?.id }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Credentials deleted successfully",
      });

      loadCredentials();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credentials",
        variant: "destructive",
      });
    }
  };

  const renderCredentialForm = () => {
    const provider = cloudProviders.find(p => p.id === form.provider);
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Add Cloud Credentials
          </CardTitle>
          <CardDescription>
            Securely store your cloud provider credentials for one-click deployments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provider">Cloud Provider</Label>
              <Select value={form.provider} onValueChange={(value) => setForm({ ...form, provider: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {cloudProviders.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.icon} {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="credentialName">Credential Name</Label>
              <Input
                id="credentialName"
                placeholder="e.g., Production AWS"
                value={form.credentialName}
                onChange={(e) => setForm({ ...form, credentialName: e.target.value })}
              />
            </div>
          </div>

          {form.provider && (
            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-medium">{provider?.name} Configuration</h4>
              {renderProviderForm()}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleStoreCredentials} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Store Credentials
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderProviderForm = () => {
    switch (form.provider) {
      case 'aws':
        return (
          <>
            <Input
              placeholder="AWS Access Key ID"
              value={form.credentials.accessKeyId || ''}
              onChange={(e) => setForm({
                ...form,
                credentials: { ...form.credentials, accessKeyId: e.target.value }
              })}
            />
            <Input
              type="password"
              placeholder="AWS Secret Access Key"
              value={form.credentials.secretAccessKey || ''}
              onChange={(e) => setForm({
                ...form,
                credentials: { ...form.credentials, secretAccessKey: e.target.value }
              })}
            />
            <Input
              placeholder="ECS Cluster Name"
              value={form.credentials.clusterName || ''}
              onChange={(e) => setForm({
                ...form,
                credentials: { ...form.credentials, clusterName: e.target.value }
              })}
            />
          </>
        );
      
      case 'gcp':
        return (
          <>
            <Input
              placeholder="GCP Project ID"
              value={form.credentials.projectId || ''}
              onChange={(e) => setForm({
                ...form,
                credentials: { ...form.credentials, projectId: e.target.value }
              })}
            />
            <Input
              type="password"
              placeholder="Service Account Key (JSON)"
              value={form.credentials.serviceAccountKey || ''}
              onChange={(e) => setForm({
                ...form,
                credentials: { ...form.credentials, serviceAccountKey: e.target.value }
              })}
            />
          </>
        );

      case 'digitalocean':
        return (
          <Input
            type="password"
            placeholder="DigitalOcean API Token"
            value={form.credentials.apiToken || ''}
            onChange={(e) => setForm({
              ...form,
              credentials: { ...form.credentials, apiToken: e.target.value }
            })}
          />
        );

      case 'vercel':
        return (
          <Input
            type="password"
            placeholder="Vercel Token"
            value={form.credentials.token || ''}
            onChange={(e) => setForm({
              ...form,
              credentials: { ...form.credentials, token: e.target.value }
            })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cloud Credentials</h2>
          <p className="text-muted-foreground">Manage your cloud provider credentials for seamless deployments</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Credentials
        </Button>
      </div>

      {showForm && renderCredentialForm()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {credentials.map((credential) => (
          <Card key={credential.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  <CardTitle className="text-lg">{credential.credential_name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {validationStatus[credential.id] === true && (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                  {validationStatus[credential.id] === false && (
                    <Badge variant="destructive">
                      <X className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                {cloudProviders.find(p => p.id === credential.provider)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Added {new Date(credential.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => validateCredential(credential.id, credential.provider)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCredential(credential.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {credentials.length === 0 && !showForm && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No cloud credentials configured. Add credentials to enable one-click deployments to AWS, GCP, Azure, and more.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CloudCredentialManager;