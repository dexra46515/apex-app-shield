import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import SecurityDashboard from '@/components/SecurityDashboard';
import AdvancedDifferentiatorsPanel from '@/components/AdvancedDifferentiatorsPanel';
import AdvancedSecurityDashboard from '@/components/AdvancedSecurityDashboard';
import WAFManagement from '@/components/WAFManagement';
import CustomerOnboarding from '@/components/CustomerOnboarding';
import EnhancedCustomerOnboarding from '@/components/EnhancedCustomerOnboarding';
import HardwareTrustDashboard from '@/components/HardwareTrustDashboard';
import ManagementCompliance from '@/components/ManagementCompliance';
import DeploymentModels from '@/components/DeploymentModels';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Enterprise WAF Security Platform
            </h1>
            <TabsList className="grid grid-cols-5 w-[800px] bg-slate-800 border-slate-700">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Dashboard</TabsTrigger>
              <TabsTrigger value="advanced" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Advanced Security</TabsTrigger>
              <TabsTrigger value="management" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Management</TabsTrigger>
              <TabsTrigger value="deployment" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Deployment</TabsTrigger>
              <TabsTrigger value="onboarding" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">Customer Setup</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="advanced">
            <div className="space-y-6">
              <AdvancedSecurityDashboard />
              <AdvancedDifferentiatorsPanel />
              <HardwareTrustDashboard />
              <WAFManagement />
            </div>
          </TabsContent>

          <TabsContent value="management">
            <ManagementCompliance />
          </TabsContent>

          <TabsContent value="deployment">
            <DeploymentModels />
          </TabsContent>

          <TabsContent value="onboarding">
            <EnhancedCustomerOnboarding />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
