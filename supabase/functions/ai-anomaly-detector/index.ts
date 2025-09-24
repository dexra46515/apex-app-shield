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

    const { session_data, behavioral_metrics } = await req.json();

    console.log('Processing AI anomaly detection for:', session_data);

    // Create simulated AI analysis based on behavioral metrics
    const anomalyScore = calculateAnomalyScore(behavioral_metrics);
    const riskLevel = getRiskLevel(anomalyScore);
    const threatClassification = getThreatClassification(behavioral_metrics);
    const recommendedActions = getRecommendedActions(riskLevel, behavioral_metrics);

    const analysis = {
      anomaly_score: anomalyScore,
      threat_level: riskLevel,
      anomalies_detected: threatClassification !== 'normal_behavior' ? [threatClassification] : [],
      confidence: Math.min(95, 60 + (anomalyScore * 0.4)),
      recommended_actions: recommendedActions,
      risk_factors: getRiskFactors(behavioral_metrics),
      analysis_timestamp: new Date().toISOString(),
      session_id: session_data.session_id
    };

    // Store AI anomaly detection result
    const { data: detectionRecord, error: insertError } = await supabase
      .from('ai_anomaly_detections')
      .insert({
        session_id: session_data.session_id || 'unknown',
        source_ip: session_data.source_ip,
        anomaly_score: analysis.anomaly_score,
        behavior_pattern: behavioral_metrics,
        ai_analysis_result: analysis,
        threat_level: analysis.threat_level,
        mitigation_action: analysis.anomaly_score > 70 ? 'block' : 'monitor'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing anomaly detection:', insertError);
    }

    // Generate adaptive security rules if high-confidence anomaly detected
    if (analysis.anomaly_score > 80 && analysis.confidence > 85) {
      await generateAdaptiveRule(analysis, session_data, supabase);
    }

    console.log('AI anomaly analysis completed:', analysis);

    return new Response(
      JSON.stringify({
        success: true,
        detection_id: detectionRecord?.id,
        analysis: analysis,
        adaptive_rule_generated: analysis.anomaly_score > 80
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('AI Anomaly Detector Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function generateAdaptiveRule(analysis: any, sessionData: any, supabase: any) {
  try {
    const ruleName = `AI-Generated-${Date.now()}`;
    const conditions = {
      source_ip: analysis.risk_factors.suspicious_ip ? sessionData.source_ip : null,
      user_agent_pattern: analysis.risk_factors.suspicious_user_agent ? sessionData.user_agent : null,
      anomaly_threshold: analysis.anomaly_score
    };

    const actions = {
      type: analysis.threat_level === 'critical' ? 'block' : 'monitor',
      parameters: {
        duration: '1h',
        alert: true,
        log_level: 'high'
      }
    };

    await supabase
      .from('adaptive_rules')
      .insert({
        name: ruleName,
        condition_pattern: conditions,
        action_type: actions.type,
        action_parameters: actions.parameters,
        auto_generated: true,
        learning_confidence: analysis.confidence / 100,
        is_active: true
      });

    console.log('Generated adaptive rule:', ruleName);
  } catch (error) {
    console.error('Error generating adaptive rule:', error);
  }
}

// Helper functions for AI analysis simulation
function calculateAnomalyScore(metrics: any): number {
  let score = 0;
  
  // High request frequency indicates potential DDoS or scraping
  if (metrics.request_frequency > 20) score += 30;
  else if (metrics.request_frequency > 10) score += 15;
  
  // Unusual paths indicate reconnaissance or attack attempts
  if (metrics.unusual_paths && metrics.unusual_paths.length > 0) {
    score += metrics.unusual_paths.length * 20;
  }
  
  // Suspicious payloads are a strong indicator
  if (metrics.suspicious_payloads) score += 40;
  
  // Geographic anomalies can indicate compromised accounts
  if (metrics.geographic_anomaly) score += 25;
  
  // Cap at 100
  return Math.min(100, score);
}

function getRiskLevel(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function getThreatClassification(metrics: any): string {
  if (metrics.suspicious_payloads && metrics.unusual_paths?.length > 0) {
    return 'active_attack';
  }
  if (metrics.suspicious_payloads) {
    return 'injection_attempt';
  }
  if (metrics.unusual_paths?.length > 0) {
    return 'reconnaissance';
  }
  if (metrics.request_frequency > 20) {
    return 'potential_ddos';
  }
  if (metrics.geographic_anomaly) {
    return 'account_anomaly';
  }
  return 'normal_behavior';
}

function getRecommendedActions(riskLevel: string, metrics: any): string[] {
  const actions = [];
  
  if (riskLevel === 'critical') {
    actions.push('immediate_block', 'escalate_to_soc', 'full_investigation');
  } else if (riskLevel === 'high') {
    actions.push('temporary_block', 'increase_monitoring', 'alert_admin');
  } else if (riskLevel === 'medium') {
    actions.push('rate_limit', 'enhanced_logging', 'monitor_closely');
  } else {
    actions.push('continue_monitoring');
  }
  
  if (metrics.suspicious_payloads) {
    actions.push('block_malicious_patterns');
  }
  
  return actions;
}

function getRiskFactors(metrics: any): any {
  const factors: any = {};
  
  if (metrics.request_frequency > 20) {
    factors.high_frequency = 'Unusually high request frequency detected';
  }
  
  if (metrics.unusual_paths?.length > 0) {
    factors.path_scanning = 'Attempting to access unusual paths';
  }
  
  if (metrics.suspicious_payloads) {
    factors.malicious_payload = 'Suspicious payload patterns detected';
  }
  
  if (metrics.geographic_anomaly) {
    factors.location_anomaly = 'Geographic location inconsistent with user profile';
  }
  
  return factors;
}