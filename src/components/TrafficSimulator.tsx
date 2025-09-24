import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, Square, Zap, Target, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SimulationStats {
  totalEvents: number;
  attacksGenerated: number;
  blocked: number;
  processing: boolean;
  progress: number;
}

const TrafficSimulator = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<SimulationStats>({
    totalEvents: 0,
    attacksGenerated: 0,
    blocked: 0,
    processing: false,
    progress: 0,
  });
  const [simulationConfig, setSimulationConfig] = useState({
    targetUrl: '',
    pattern: 'mixed',
    count: 50,
    interval: 1000,
  });

  const startSimulation = async () => {
    console.log('Traffic Simulator button clicked!');
    if (stats.processing) return;

    if (!simulationConfig.targetUrl) {
      toast({
        title: "Target URL Required",
        description: "Please enter a target URL to test",
        variant: "destructive"
      });
      return;
    }

    setStats(prev => ({ ...prev, processing: true, progress: 0 }));
    
    try {
      toast({
        title: "Simulation Started",
        description: `Testing ${simulationConfig.count} requests against ${simulationConfig.targetUrl}`,
      });

      const { data, error } = await supabase.functions.invoke('simulate-traffic', {
        body: {
          targetUrl: simulationConfig.targetUrl,
          pattern: simulationConfig.pattern,
          count: simulationConfig.count
        }
      });

      if (error) {
        console.error('Simulation error details:', error);
        throw error;
      }

      console.log('Simulation results:', data);

      if (data?.summary) {
        const { total, successful, failed, attacks } = data.summary;
        
        setStats(prev => ({
          ...prev,
          totalEvents: prev.totalEvents + total,
          attacksGenerated: prev.attacksGenerated + attacks,
          blocked: prev.blocked + failed, // Failed requests could be blocked by WAF
          processing: false,
          progress: 100,
        }));

        // Show detailed results
        const errorResults = data.results?.filter((r: any) => !r.success) || [];
        const successResults = data.results?.filter((r: any) => r.success) || [];

        if (errorResults.length > 0) {
          const errorMessages = errorResults.map((r: any) => 
            `${r.target_url}: ${r.error}`
          ).slice(0, 3); // Show first 3 errors
          
          toast({
            title: "Simulation Complete with Issues",
            description: `${successful}/${total} requests successful. Errors: ${errorMessages.join('; ')}`,
            variant: errorResults.length === total ? "destructive" : "default"
          });
        } else {
          toast({
            title: "Simulation Complete",
            description: `Successfully tested ${total} requests against ${simulationConfig.targetUrl}`,
          });
        }
      }

    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: error.message || "Failed to run traffic simulation",
        variant: "destructive",
      });
      
      setStats(prev => ({ ...prev, processing: false, progress: 0 }));
    }
  };

  const stopSimulation = () => {
    setStats(prev => ({ ...prev, processing: false, progress: 0 }));
    toast({
      title: "Simulation Stopped",
      description: "Traffic simulation has been stopped",
    });
  };

  const resetStats = () => {
    setStats({
      totalEvents: 0,
      attacksGenerated: 0,
      blocked: 0,
      processing: false,
      progress: 0,
    });
    toast({
      title: "Stats Reset",
      description: "Simulation statistics have been reset",
    });
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-warning" />
          Traffic Simulator
        </CardTitle>
        <CardDescription>
          Generate realistic security events for testing and demonstration
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetUrl">Target URL</Label>
            <Input
              id="targetUrl"
              placeholder="https://procurement.dexra.cloud"
              value={simulationConfig.targetUrl}
              onChange={(e) => 
                setSimulationConfig(prev => ({ ...prev, targetUrl: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pattern">Traffic Pattern</Label>
            <Select
              value={simulationConfig.pattern}
              onValueChange={(value) => 
                setSimulationConfig(prev => ({ ...prev, pattern: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed Traffic</SelectItem>
                <SelectItem value="attack">Attack Only</SelectItem>
                <SelectItem value="clean">Clean Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="count">Event Count</Label>
            <Input
              id="count"
              type="number"
              min="1"
              max="1000"
              value={simulationConfig.count}
              onChange={(e) => 
                setSimulationConfig(prev => ({ 
                  ...prev, 
                  count: parseInt(e.target.value) || 50 
                }))
              }
              className="bg-input/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Simulation Control</Label>
            <div className="flex gap-2">
              <Button
                onClick={startSimulation}
                disabled={stats.processing}
                className="flex-1 bg-gradient-to-r from-neon-green to-primary hover:from-neon-green/90 hover:to-primary/90"
              >
                <Play className="h-4 w-4 mr-2" />
                {stats.processing ? 'Running...' : 'Start'}
              </Button>
              
              <Button
                variant="outline"
                onClick={stopSimulation}
                disabled={!stats.processing}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress */}
        {stats.processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing events...</span>
              <span>{stats.progress}%</span>
            </div>
            <Progress value={stats.progress} className="h-2" />
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold text-primary">{stats.totalEvents}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 border border-warning/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attacks Generated</p>
                <p className="text-2xl font-bold text-warning">{stats.attacksGenerated}</p>
              </div>
              <Bot className="h-8 w-8 text-warning" />
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 border border-destructive/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-destructive">{stats.blocked}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-destructive text-white">
                  {stats.totalEvents > 0 ? Math.round((stats.blocked / stats.totalEvents) * 100) : 0}%
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Pattern Info */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
          <h4 className="text-sm font-medium mb-2">Current Pattern: {simulationConfig.pattern}</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            {simulationConfig.pattern === 'mixed' && (
              <p>• 70% legitimate traffic, 30% attack patterns</p>
            )}
            {simulationConfig.pattern === 'attack' && (
              <p>• 100% attack patterns (SQL injection, XSS, bot attacks)</p>
            )}
            {simulationConfig.pattern === 'clean' && (
              <p>• 100% legitimate traffic patterns</p>
            )}
            <p>• Events processed through real WAF engine</p>
            <p>• Results stored in security events database</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={resetStats}
            className="flex-1"
          >
            Reset Statistics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafficSimulator;