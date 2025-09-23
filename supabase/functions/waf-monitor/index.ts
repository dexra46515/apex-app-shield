import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityEventPayload {
  source_ip: string;
  destination_ip?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  request_headers?: Record<string, any>;
  response_status?: number;
  response_size?: number;
  payload?: string;
}

interface ThreatAnalysis {
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  rule_matches: string[];
  should_block: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const eventData: SecurityEventPayload = await req.json();
      
      console.log('Processing security event:', eventData);

      // Perform real-time threat analysis
      const threatAnalysis = await analyzeRequest(eventData, supabaseClient);
      
      // Create security event record
      const securityEvent = {
        event_type: threatAnalysis.should_block ? 'block' : 'monitor',
        severity: threatAnalysis.severity,
        source_ip: eventData.source_ip,
        destination_ip: eventData.destination_ip,
        user_agent: eventData.user_agent,
        request_method: eventData.request_method,
        request_path: eventData.request_path,
        request_headers: eventData.request_headers,
        response_status: eventData.response_status,
        response_size: eventData.response_size,
        threat_type: threatAnalysis.threat_type,
        blocked: threatAnalysis.should_block,
        payload: eventData.payload,
      };

      // Insert security event
      const { data: eventRecord, error: eventError } = await supabaseClient
        .from('security_events')
        .insert([securityEvent])
        .select()
        .single();

      if (eventError) {
        console.error('Error inserting security event:', eventError);
        throw eventError;
      }

      console.log('Security event recorded:', eventRecord);

      // Check if we need to create an alert
      if (threatAnalysis.severity === 'high' || threatAnalysis.severity === 'critical') {
        await createSecurityAlert(threatAnalysis, eventData, supabaseClient);
      }

      // Update IP reputation
      await updateIPReputation(eventData.source_ip, threatAnalysis, supabaseClient);

      return new Response(
        JSON.stringify({
          success: true,
          event_id: eventRecord.id,
          threat_analysis: threatAnalysis,
          action: threatAnalysis.should_block ? 'blocked' : 'allowed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );

  } catch (error) {
    console.error('WAF Monitor Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function analyzeRequest(eventData: SecurityEventPayload, supabaseClient: any): Promise<ThreatAnalysis> {
  const analysis: ThreatAnalysis = {
    threat_type: 'unknown',
    severity: 'low',
    confidence: 0,
    rule_matches: [],
    should_block: false
  };

  try {
    // Get active security rules
    const { data: rules, error } = await supabaseClient
      .from('security_rules')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching security rules:', error);
      return analysis;
    }

    // Check OWASP Top 10 patterns
    const owaspAnalysis = analyzeOWASPThreats(eventData);
    if (owaspAnalysis.detected) {
      analysis.threat_type = owaspAnalysis.type;
      analysis.severity = owaspAnalysis.severity;
      analysis.confidence = owaspAnalysis.confidence;
      analysis.rule_matches.push(...owaspAnalysis.rules);
      analysis.should_block = owaspAnalysis.severity === 'high' || owaspAnalysis.severity === 'critical';
    }

    // Check bot patterns
    const botAnalysis = analyzeBotBehavior(eventData);
    if (botAnalysis.detected && botAnalysis.severity > analysis.severity) {
      analysis.threat_type = 'bot_attack';
      analysis.severity = botAnalysis.severity;
      analysis.confidence = Math.max(analysis.confidence, botAnalysis.confidence);
      analysis.rule_matches.push(...botAnalysis.rules);
    }

    // Check rate limiting
    const rateLimitAnalysis = await checkRateLimit(eventData.source_ip, supabaseClient);
    if (rateLimitAnalysis.violated) {
      analysis.threat_type = 'rate_limit_violation';
      analysis.severity = 'medium';
      analysis.confidence = 95;
      analysis.should_block = true;
      analysis.rule_matches.push('rate_limit_exceeded');
    }

    // Check IP reputation
    const reputationAnalysis = await checkIPReputation(eventData.source_ip, supabaseClient);
    if (reputationAnalysis.risky) {
      analysis.threat_type = 'malicious_ip';
      analysis.severity = reputationAnalysis.severity;
      analysis.confidence = Math.max(analysis.confidence, reputationAnalysis.confidence);
      analysis.should_block = reputationAnalysis.severity === 'critical';
      analysis.rule_matches.push('ip_reputation_low');
    }

  } catch (error) {
    console.error('Error in threat analysis:', error);
  }

  return analysis;
}

function analyzeOWASPThreats(eventData: SecurityEventPayload) {
  const result = {
    detected: false,
    type: 'clean',
    severity: 'low' as const,
    confidence: 0,
    rules: [] as string[]
  };

  const payload = eventData.payload || '';
  const userAgent = eventData.user_agent || '';
  const path = eventData.request_path || '';
  const headers = JSON.stringify(eventData.request_headers || {});

  // SQL Injection Detection
  const sqlPatterns = [
    /union.*select/i,
    /drop.*table/i,
    /exec.*xp_/i,
    /insert.*into/i,
    /delete.*from/i,
    /update.*set/i,
    /or.*1=1/i,
    /and.*1=1/i
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(payload) || pattern.test(path)) {
      result.detected = true;
      result.type = 'sql_injection';
      result.severity = 'high';
      result.confidence = 90;
      result.rules.push('sql_injection_detected');
      break;
    }
  }

  // XSS Detection
  const xssPatterns = [
    /<script.*>/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /<iframe.*>/i
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(payload) || pattern.test(path)) {
      result.detected = true;
      result.type = 'xss_attack';
      result.severity = 'high';
      result.confidence = 85;
      result.rules.push('xss_detected');
      break;
    }
  }

  // Path Traversal
  const pathTraversalPatterns = [
    /\.\.\//,
    /\.\.\\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i
  ];

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(path) || pattern.test(payload)) {
      result.detected = true;
      result.type = 'path_traversal';
      result.severity = 'medium';
      result.confidence = 80;
      result.rules.push('path_traversal_detected');
      break;
    }
  }

  return result;
}

function analyzeBotBehavior(eventData: SecurityEventPayload) {
  const result = {
    detected: false,
    severity: 'low' as const,
    confidence: 0,
    rules: [] as string[]
  };

  const userAgent = eventData.user_agent || '';
  
  // Known bad bot patterns
  const maliciousBotPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /burpsuite/i,
    /havij/i
  ];

  for (const pattern of maliciousBotPatterns) {
    if (pattern.test(userAgent)) {
      result.detected = true;
      result.severity = 'critical';
      result.confidence = 95;
      result.rules.push('malicious_bot_detected');
      return result;
    }
  }

  // Generic bot patterns
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      result.detected = true;
      result.severity = 'low';
      result.confidence = 70;
      result.rules.push('bot_detected');
      break;
    }
  }

  return result;
}

async function checkRateLimit(sourceIP: string, supabaseClient: any) {
  const result = {
    violated: false,
    current_rate: 0,
    limit: 100
  };

  try {
    // Count requests from this IP in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    
    const { count, error } = await supabaseClient
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('source_ip', sourceIP)
      .gte('timestamp', oneMinuteAgo);

    if (error) {
      console.error('Error checking rate limit:', error);
      return result;
    }

    result.current_rate = count || 0;
    result.violated = result.current_rate > result.limit;

  } catch (error) {
    console.error('Rate limit check error:', error);
  }

  return result;
}

async function checkIPReputation(sourceIP: string, supabaseClient: any) {
  const result = {
    risky: false,
    severity: 'low' as const,
    confidence: 0,
    reputation_score: 50
  };

  try {
    // Check IP reputation database
    const { data: reputation, error } = await supabaseClient
      .from('ip_reputation')
      .select('*')
      .eq('ip_address', sourceIP)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking IP reputation:', error);
      return result;
    }

    if (reputation) {
      result.reputation_score = reputation.reputation_score;
      
      if (reputation.reputation_score < 30) {
        result.risky = true;
        result.severity = 'critical';
        result.confidence = 90;
      } else if (reputation.reputation_score < 50) {
        result.risky = true;
        result.severity = 'high';
        result.confidence = 75;
      }
    }

  } catch (error) {
    console.error('IP reputation check error:', error);
  }

  return result;
}

async function createSecurityAlert(threatAnalysis: ThreatAnalysis, eventData: SecurityEventPayload, supabaseClient: any) {
  try {
    const alert = {
      alert_type: threatAnalysis.threat_type,
      severity: threatAnalysis.severity,
      title: `${threatAnalysis.threat_type.replace('_', ' ').toUpperCase()} Detected`,
      description: `Threat detected from ${eventData.source_ip} with ${threatAnalysis.confidence}% confidence`,
      source_ip: eventData.source_ip,
      event_count: 1,
    };

    const { error } = await supabaseClient
      .from('security_alerts')
      .insert([alert]);

    if (error) {
      console.error('Error creating security alert:', error);
    } else {
      console.log('Security alert created:', alert);
    }

  } catch (error) {
    console.error('Alert creation error:', error);
  }
}

async function updateIPReputation(sourceIP: string, threatAnalysis: ThreatAnalysis, supabaseClient: any) {
  try {
    let reputationScore = 50; // Default neutral score
    
    // Adjust reputation based on threat analysis
    if (threatAnalysis.severity === 'critical') {
      reputationScore = Math.max(0, reputationScore - 30);
    } else if (threatAnalysis.severity === 'high') {
      reputationScore = Math.max(0, reputationScore - 20);
    } else if (threatAnalysis.severity === 'medium') {
      reputationScore = Math.max(0, reputationScore - 10);
    }

    const { error } = await supabaseClient
      .from('ip_reputation')
      .upsert({
        ip_address: sourceIP,
        reputation_score: reputationScore,
        risk_level: threatAnalysis.severity,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'ip_address'
      });

    if (error) {
      console.error('Error updating IP reputation:', error);
    }

  } catch (error) {
    console.error('IP reputation update error:', error);
  }
}