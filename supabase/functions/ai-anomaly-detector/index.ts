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

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { session_data, behavioral_metrics } = await req.json();

    // Prepare behavioral analysis prompt
    const prompt = `
    As a cybersecurity AI expert, analyze this user session for anomalies and potential threats:
    
    Session Data: ${JSON.stringify(session_data)}
    Behavioral Metrics: ${JSON.stringify(behavioral_metrics)}
    
    Evaluate for:
    1. Unusual navigation patterns
    2. Suspicious request frequencies
    3. Anomalous payload characteristics
    4. Device fingerprint inconsistencies
    5. Geographic location anomalies
    
    Respond with JSON containing:
    {
      "anomaly_score": number (0-100),
      "threat_level": "low|medium|high|critical", 
      "anomalies_detected": ["list", "of", "specific", "anomalies"],
      "confidence": number (0-100),
      "recommended_actions": ["action1", "action2"],
      "risk_factors": {"factor": "description"}
    }
    `;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cybersecurity AI specialized in behavioral anomaly detection. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0]?.message?.content;

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      analysis = {
        anomaly_score: 0,
        threat_level: 'low',
        anomalies_detected: [],
        confidence: 0,
        recommended_actions: ['Manual review required'],
        risk_factors: { parse_error: 'AI response could not be parsed' }
      };
    }

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
      JSON.stringify({ error: error.message }),
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