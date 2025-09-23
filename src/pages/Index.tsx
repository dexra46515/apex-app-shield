import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SecurityDashboard from '@/components/SecurityDashboard';
import AdvancedSecurityDashboard from '@/components/AdvancedSecurityDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-6">
        <Tabs defaultValue="standard" className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Enterprise WAF Security Platform
            </h1>
            <TabsList className="grid grid-cols-2 w-[400px]">
              <TabsTrigger value="standard">Standard Dashboard</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Features</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="standard">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedSecurityDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
