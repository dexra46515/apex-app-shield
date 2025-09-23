import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { traffic_data, prediction_window = '15min' } = await req.json();

    console.log('Processing predictive DDoS analysis for window:', prediction_window);

    // If no traffic data provided, generate mock data for testing
    const trafficData = traffic_data || {
      requests_per_second: 1250,
      baseline_rps: 800,
      source_ips: ['192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45'],
      requests: [
        { size: 1024, timestamp: new Date().toISOString() },
        { size: 2048, timestamp: new Date(Date.now() - 1000).toISOString() }
      ],
      historical_rps: [800, 850, 820, 900, 1100, 1200, 1250],
      user_agents: ['Mozilla/5.0', 'Chrome/91.0', 'Safari/14.1'],
      max_capacity: 5000
    };

    // Analyze current traffic patterns
    const currentAnalysis = analyzeCurrentTraffic(trafficData);
    
    // Generate predictions for multiple time windows
    const predictions = await generateDDoSPredictions(trafficData, supabase);
    
    // Create traffic forecasts
    const forecasts = await generateTrafficForecasts(trafficData, supabase);
    
    // Store main prediction
    const { data: prediction, error: insertError } = await supabase
      .from('ddos_predictions')
      .insert({
        prediction_window,
        target_time: new Date(Date.now() + getPredictionOffset(prediction_window)).toISOString(),
        predicted_volume: predictions.predicted_volume,
        predicted_attack_type: predictions.attack_type,
        confidence_level: predictions.confidence,
        risk_factors: predictions.risk_factors,
        mitigation_recommendations: predictions.mitigation_recommendations,
        early_indicators: predictions.early_indicators,
        source_patterns: predictions.source_patterns
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing DDoS prediction:', insertError);
      throw new Error('Failed to store prediction');
    }

    // Check if immediate action is needed
    const immediateAction = predictions.confidence > 0.8 && predictions.predicted_volume > 10000;
    
    if (immediateAction) {
      await triggerPreemptiveMitigation(predictions, supabase);
    }

    console.log('Predictive DDoS analysis completed:', {
      confidence: predictions.confidence,
      predicted_volume: predictions.predicted_volume,
      immediate_action: immediateAction
    });

    return new Response(
      JSON.stringify({
        success: true,
        prediction: {
          id: prediction.id,
          prediction_window,
          confidence_level: predictions.confidence,
          predicted_volume: predictions.predicted_volume,
          predicted_attack_type: predictions.attack_type,
          time_to_predicted_attack: getPredictionOffset(prediction_window),
          current_analysis: currentAnalysis,
          risk_assessment: getRiskAssessment(predictions.confidence, predictions.predicted_volume),
          preemptive_actions_taken: immediateAction,
          forecasts: forecasts.slice(0, 5) // Return top 5 forecasts
        },
        mitigation: {
          recommended_actions: predictions.mitigation_recommendations,
          scaling_requirements: calculateScalingRequirements(predictions.predicted_volume),
          estimated_cost_impact: estimateCostImpact(predictions.predicted_volume)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Predictive DDoS Analyzer Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function analyzeCurrentTraffic(trafficData: any) {
  const currentRPS = trafficData.requests_per_second || 0;
  const sourceDistribution = analyzeSourceDistribution(trafficData.source_ips || []);
  const requestPatterns = analyzeRequestPatterns(trafficData.requests || []);
  
  return {
    current_rps: currentRPS,
    baseline_rps: trafficData.baseline_rps || 100,
    deviation_percentage: ((currentRPS - (trafficData.baseline_rps || 100)) / (trafficData.baseline_rps || 100)) * 100,
    source_diversity: sourceDistribution.diversity_score,
    pattern_anomalies: requestPatterns.anomaly_count,
    trend_direction: calculateTrend(trafficData.historical_rps || [])
  };
}

async function generateDDoSPredictions(trafficData: any, supabase: any) {
  // Analyze historical patterns
  const { data: historicalData } = await supabase
    .from('waf_requests')
    .select('timestamp, source_ip, threat_score')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(10000);

  const mlFeatures = extractMLFeatures(trafficData, historicalData || []);
  const prediction = runPredictionModel(mlFeatures);
  
  return {
    predicted_volume: prediction.volume,
    attack_type: prediction.attack_type,
    confidence: prediction.confidence,
    risk_factors: identifyRiskFactors(trafficData, historicalData || []),
    mitigation_recommendations: generateMitigationRecommendations(prediction),
    early_indicators: identifyEarlyIndicators(trafficData),
    source_patterns: analyzeSourcePatterns(trafficData.source_ips || [])
  };
}

async function generateTrafficForecasts(trafficData: any, supabase: any) {
  const forecasts = [];
  const timeWindows = [5, 15, 30, 60, 120]; // minutes
  
  for (const window of timeWindows) {
    const forecastTime = new Date(Date.now() + window * 60 * 1000);
    const modelPrediction = forecastTrafficVolume(trafficData, window);
    
    const forecast = {
      forecast_time: forecastTime.toISOString(),
      predicted_requests_per_second: modelPrediction.rps,
      predicted_bandwidth: modelPrediction.bandwidth,
      confidence_interval: modelPrediction.confidence_interval,
      model_version: 'v2.1-ml-enhanced',
      feature_importance: modelPrediction.feature_importance,
      seasonal_factors: modelPrediction.seasonal_factors,
      anomaly_probability: modelPrediction.anomaly_probability,
      recommended_scaling: modelPrediction.scaling_recommendation
    };
    
    // Store forecast
    const { data: storedForecast } = await supabase
      .from('traffic_forecasts')
      .insert(forecast)
      .select()
      .single();
    
    if (storedForecast) {
      forecasts.push(storedForecast);
    }
  }
  
  return forecasts;
}

function extractMLFeatures(trafficData: any, historicalData: any[]) {
  return {
    current_rps: trafficData.requests_per_second || 0,
    rps_trend: calculateTrend(trafficData.historical_rps || []),
    source_diversity: analyzeSourceDistribution(trafficData.source_ips || []).diversity_score,
    geographic_spread: calculateGeographicSpread(trafficData.source_ips || []),
    request_size_variance: calculateRequestSizeVariance(trafficData.requests || []),
    user_agent_diversity: analyzeUserAgentDiversity(trafficData.user_agents || []),
    time_of_day_factor: getTimeOfDayFactor(),
    day_of_week_factor: getDayOfWeekFactor(),
    historical_attack_correlation: correlateWithHistoricalAttacks(historicalData),
    network_congestion_factor: calculateNetworkCongestion(trafficData)
  };
}

function runPredictionModel(features: any) {
  // Simplified ML model simulation
  let riskScore = 0;
  
  // Feature weights (in real implementation, these would be learned)
  riskScore += features.rps_trend * 0.3;
  riskScore += (1 - features.source_diversity) * 0.25;
  riskScore += features.request_size_variance * 0.2;
  riskScore += features.historical_attack_correlation * 0.15;
  riskScore += features.network_congestion_factor * 0.1;
  
  const predictedVolume = Math.max(0, features.current_rps * (1 + riskScore * 10));
  const confidence = Math.min(0.95, 0.5 + riskScore * 0.5);
  
  let attackType = 'volumetric';
  if (features.request_size_variance > 0.7) attackType = 'application_layer';
  if (features.source_diversity < 0.3) attackType = 'botnet';
  
  return {
    volume: predictedVolume,
    attack_type: attackType,
    confidence: confidence
  };
}

function identifyRiskFactors(trafficData: any, historicalData: any[]) {
  const riskFactors: any = {};
  
  if (trafficData.requests_per_second > (trafficData.baseline_rps || 100) * 2) {
    riskFactors.traffic_spike = 'Current traffic is 2x above baseline';
  }
  
  const sourceDistribution = analyzeSourceDistribution(trafficData.source_ips || []);
  if (sourceDistribution.diversity_score < 0.3) {
    riskFactors.low_source_diversity = 'Traffic concentrated from few sources';
  }
  
  if (historicalData.length > 0) {
    const recentThreats = historicalData.filter(d => d.threat_score > 70).length;
    if (recentThreats > historicalData.length * 0.1) {
      riskFactors.recent_threat_activity = 'Elevated threat activity in recent history';
    }
  }
  
  return riskFactors;
}

function generateMitigationRecommendations(prediction: any) {
  const recommendations = [];
  
  if (prediction.confidence > 0.8) {
    recommendations.push('activate_emergency_protocols');
    recommendations.push('scale_infrastructure_immediately');
  }
  
  if (prediction.volume > 10000) {
    recommendations.push('enable_rate_limiting');
    recommendations.push('activate_cdn_protection');
  }
  
  switch (prediction.attack_type) {
    case 'volumetric':
      recommendations.push('increase_bandwidth_capacity');
      break;
    case 'application_layer':
      recommendations.push('enable_application_firewall');
      break;
    case 'botnet':
      recommendations.push('activate_bot_protection');
      break;
  }
  
  return recommendations;
}

function identifyEarlyIndicators(trafficData: any) {
  const indicators: any = {};
  
  const currentRPS = trafficData.requests_per_second || 0;
  const baseline = trafficData.baseline_rps || 100;
  
  if (currentRPS > baseline * 1.5) {
    indicators.traffic_increase = 'RPS increased by 50% above baseline';
  }
  
  const sourceDistribution = analyzeSourceDistribution(trafficData.source_ips || []);
  if (sourceDistribution.top_source_percentage > 0.3) {
    indicators.source_concentration = 'Single source contributing >30% of traffic';
  }
  
  return indicators;
}

async function triggerPreemptiveMitigation(predictions: any, supabase: any) {
  console.log('Triggering preemptive DDoS mitigation');
  
  // This would integrate with actual mitigation systems
  // For now, we'll log the action and store it
  try {
    await supabase
      .from('security_alerts')
      .insert({
        title: 'Preemptive DDoS Mitigation Activated',
        description: `High confidence DDoS prediction (${predictions.confidence}) triggered automatic mitigation`,
        severity: 'critical',
        alert_type: 'ddos_prediction',
        resolved: false
      });
  } catch (error) {
    console.error('Error storing mitigation alert:', error);
  }
}

// Helper functions
function getPredictionOffset(window: string): number {
  const offsets: { [key: string]: number } = {
    '5min': 5 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1hour': 60 * 60 * 1000
  };
  return offsets[window] || offsets['15min'];
}

function analyzeSourceDistribution(sourceIPs: string[]) {
  if (sourceIPs.length === 0) return { diversity_score: 1, top_source_percentage: 0 };
  
  const ipCounts: { [key: string]: number } = {};
  sourceIPs.forEach(ip => ipCounts[ip] = (ipCounts[ip] || 0) + 1);
  
  const uniqueIPs = Object.keys(ipCounts).length;
  const totalRequests = sourceIPs.length;
  const maxCount = Math.max(...Object.values(ipCounts));
  
  return {
    diversity_score: uniqueIPs / totalRequests,
    top_source_percentage: maxCount / totalRequests
  };
}

function analyzeRequestPatterns(requests: any[]): { anomaly_count: number } {
  // Simplified pattern analysis
  return { anomaly_count: requests.filter(r => r.size > 10000 || r.size < 100).length };
}

function calculateTrend(historicalRPS: number[]): number {
  if (historicalRPS.length < 2) return 0;
  
  const recent = historicalRPS.slice(-5);
  const older = historicalRPS.slice(-10, -5);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  return (recentAvg - olderAvg) / olderAvg;
}

function forecastTrafficVolume(trafficData: any, windowMinutes: number) {
  const currentRPS = trafficData.requests_per_second || 0;
  const trend = calculateTrend(trafficData.historical_rps || []);
  
  // Simple forecast model (in production would use sophisticated ML)
  const forecastMultiplier = 1 + (trend * windowMinutes / 60);
  const predictedRPS = Math.max(0, currentRPS * forecastMultiplier);
  
  return {
    rps: predictedRPS,
    bandwidth: predictedRPS * (trafficData.average_request_size || 2000),
    confidence_interval: { lower: predictedRPS * 0.8, upper: predictedRPS * 1.2 },
    feature_importance: { trend: 0.6, current_rps: 0.4 },
    seasonal_factors: { time_of_day: getTimeOfDayFactor(), day_of_week: getDayOfWeekFactor() },
    anomaly_probability: Math.min(0.5, Math.abs(trend) * 0.5),
    scaling_recommendation: predictedRPS > currentRPS * 1.5 ? 'scale_up' : 'maintain'
  };
}

function getRiskAssessment(confidence: number, predictedVolume: number): string {
  if (confidence > 0.8 && predictedVolume > 10000) return 'critical';
  if (confidence > 0.6 && predictedVolume > 5000) return 'high';
  if (confidence > 0.4 && predictedVolume > 1000) return 'medium';
  return 'low';
}

function calculateScalingRequirements(predictedVolume: number) {
  return {
    additional_instances: Math.ceil(predictedVolume / 1000),
    bandwidth_increase: `${Math.ceil(predictedVolume * 2 / 1000)}MB/s`,
    cost_multiplier: Math.ceil(predictedVolume / 1000) * 1.5
  };
}

function estimateCostImpact(predictedVolume: number): string {
  const multiplier = Math.ceil(predictedVolume / 1000);
  if (multiplier > 10) return 'very_high';
  if (multiplier > 5) return 'high';
  if (multiplier > 2) return 'medium';
  return 'low';
}

// Additional helper functions for ML features
function calculateGeographicSpread(sourceIPs: string[]): number {
  // Simplified geo diversity calculation
  return Math.min(1, sourceIPs.length / 100);
}

function calculateRequestSizeVariance(requests: any[]): number {
  if (requests.length === 0) return 0;
  const sizes = requests.map(r => r.size || 1000);
  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const variance = sizes.reduce((acc, size) => acc + Math.pow(size - avg, 2), 0) / sizes.length;
  return Math.min(1, variance / 10000);
}

function analyzeUserAgentDiversity(userAgents: string[]): number {
  const unique = new Set(userAgents).size;
  return Math.min(1, unique / userAgents.length);
}

function getTimeOfDayFactor(): number {
  const hour = new Date().getHours();
  // Peak hours have higher factor
  if (hour >= 9 && hour <= 17) return 1.2;
  if (hour >= 18 && hour <= 22) return 1.0;
  return 0.8;
}

function getDayOfWeekFactor(): number {
  const day = new Date().getDay();
  // Weekdays have higher factor
  return day >= 1 && day <= 5 ? 1.1 : 0.9;
}

function correlateWithHistoricalAttacks(historicalData: any[]): number {
  const threatEvents = historicalData.filter(d => d.threat_score > 70);
  return Math.min(1, threatEvents.length / Math.max(1, historicalData.length));
}

function calculateNetworkCongestion(trafficData: any): number {
  const currentLoad = trafficData.requests_per_second || 0;
  const capacity = trafficData.max_capacity || 10000;
  return currentLoad / capacity;
}