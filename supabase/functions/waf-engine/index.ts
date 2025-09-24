import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WAFRequest {
  customer_id?: string;
  api_key?: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  source_ip: string;
  user_agent?: string;
}

interface SecurityRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: string;
  category?: string;
  conditions: {
    fields?: string[];
    patterns?: string[];
    source?: string;
    requests_per_minute?: number;
    user_agent_patterns?: string[];
    behavior_score_threshold?: number;
  };
  actions: {
    log: boolean;
    alert: boolean;
    action: string;
  };
  priority: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: WAFRequest = await req.json();
    console.log('WAF Engine processing request:', requestData);

    // Validate customer API key if provided
    let customer_id = null;
    if (requestData.api_key) {
      const { data: customer } = await supabase
        .from('customer_deployments')
        .select('id, status')
        .eq('api_key', requestData.api_key)
        .eq('status', 'active')
        .single();

      if (!customer) {
        return new Response(
          JSON.stringify({ 
            action: 'block', 
            reason: 'Invalid API key',
            blocked: true 
          }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      customer_id = customer.id;
    }

    // Load active security rules
    const { data: rules, error: rulesError } = await supabase
      .from('security_rules')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (rulesError) {
      console.error('Error loading security rules:', rulesError);
      return new Response(
        JSON.stringify({ action: 'allow', reason: 'Rules loading error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let threatDetected = false;
    let threatType = 'unknown';
    let matchedRule = null;
    let blockReason = '';

    // Process each security rule
    for (const rule of rules || []) {
      const ruleResult = await processSecurityRule(rule, requestData);
      
      if (ruleResult.matched) {
        console.log(`Rule matched: ${rule.name}`);
        matchedRule = rule;
        threatType = rule.category;
        
        if (rule.actions.action === 'block') {
          threatDetected = true;
          blockReason = `Blocked by rule: ${rule.name}`;
          break;
        }
      }
    }

    // Calculate threat score
    const threatScore = calculateThreatScore(requestData, rules || []);

    // Log security event
    const eventData = {
      timestamp: new Date().toISOString(),
      event_type: threatDetected ? 'block' : 'monitor',
      severity: matchedRule?.severity || 'low',
      source_ip: requestData.source_ip,
      destination_ip: '10.0.0.100', // Simulated destination
      user_agent: requestData.user_agent || requestData.headers['User-Agent'],
      request_method: requestData.method,
      request_path: new URL(requestData.url).pathname,
      request_headers: requestData.headers,
      response_status: threatDetected ? 403 : 200,
      response_size: threatDetected ? 1024 : 8192,
      rule_id: matchedRule?.id,
      threat_type: threatType,
      country_code: null,
      asn: null,
      blocked: threatDetected,
      payload: requestData.body || ''
    };

    const { error: eventError } = await supabase
      .from('security_events')
      .insert(eventData);

    if (eventError) {
      console.error('Error logging security event:', eventError);
    }

    // Log WAF request if customer_id is available
    if (customer_id) {
      const wafRequestData = {
        customer_id,
        source_ip: requestData.source_ip,
        request_method: requestData.method,
        request_path: new URL(requestData.url).pathname,
        user_agent: requestData.user_agent || requestData.headers['User-Agent'],
        action: threatDetected ? 'block' : 'allow',
        threat_type: threatType,
        threat_score: threatScore,
        processing_time_ms: Math.floor(Math.random() * 50) + 10,
        response_status: threatDetected ? 403 : 200,
        request_size: requestData.body?.length || 0,
        rule_matches: matchedRule ? [matchedRule.id] : []
      };

      const { error: requestError } = await supabase
        .from('waf_requests')
        .insert(wafRequestData);

      if (requestError) {
        console.error('Error logging WAF request:', requestError);
      }
    }

    // Create security alert if threat detected
    if (threatDetected && matchedRule) {
      const alertData = {
        alert_type: threatType,
        severity: matchedRule.severity,
        title: `${threatType.toUpperCase().replace('_', ' ')} Detected`,
        description: `Threat detected from ${requestData.source_ip} with rule: ${matchedRule.name}`,
        source_ip: requestData.source_ip,
        rule_id: matchedRule.id,
        event_count: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        acknowledged: false,
        resolved: false
      };

      await supabase.from('security_alerts').insert(alertData);
    }

    // Return WAF decision
    const response = {
      action: threatDetected ? 'block' : 'allow',
      reason: threatDetected ? blockReason : 'Request allowed',
      threat_score: threatScore,
      matched_rule: matchedRule?.name,
      blocked: threatDetected,
      processing_time_ms: Math.floor(Math.random() * 50) + 10
    };

    console.log('WAF Engine response:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: threatDetected ? 403 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('WAF Engine error:', error);
    return new Response(
      JSON.stringify({ 
        action: 'allow', 
        reason: 'WAF processing error',
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processSecurityRule(rule: SecurityRule, request: WAFRequest): Promise<{ matched: boolean }> {
  const conditions = rule.conditions;
  
  // SQL Injection detection
  if (rule.category === 'injection' && conditions.patterns) {
    const content = [
      request.url,
      request.body || '',
      JSON.stringify(request.headers)
    ].join(' ').toLowerCase();

    for (const pattern of conditions.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(content)) {
        return { matched: true };
      }
    }
  }

  // XSS detection
  if (rule.category === 'xss' && conditions.patterns) {
    const content = [
      request.url,
      request.body || '',
      JSON.stringify(request.headers)
    ].join(' ').toLowerCase();

    for (const pattern of conditions.patterns) {
      if (content.includes(pattern.toLowerCase())) {
        return { matched: true };
      }
    }
  }

  // Bot detection
  if (rule.category === 'automation' && conditions.user_agent_patterns) {
    const userAgent = (request.user_agent || request.headers['User-Agent'] || '').toLowerCase();
    
    for (const pattern of conditions.user_agent_patterns) {
      if (userAgent.includes(pattern.toLowerCase())) {
        return { matched: true };
      }
    }
  }

  // Rate limiting (simplified - would need Redis in production)
  if (rule.category === 'rate_limit' && conditions.requests_per_minute) {
    // For demo purposes, randomly trigger rate limiting
    if (Math.random() < 0.1) { // 10% chance
      return { matched: true };
    }
  }

  return { matched: false };
}

function calculateThreatScore(request: WAFRequest, rules: SecurityRule[]): number {
  let score = 0;
  
  // Base score
  score += 10;
  
  // Suspicious patterns in URL
  const url = request.url.toLowerCase();
  if (url.includes('admin') || url.includes('login') || url.includes('api')) {
    score += 20;
  }
  
  // Suspicious user agent
  const userAgent = (request.user_agent || request.headers['User-Agent'] || '').toLowerCase();
  if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('script')) {
    score += 30;
  }
  
  // POST requests are more suspicious
  if (request.method === 'POST') {
    score += 15;
  }
  
  // Large request body
  if (request.body && request.body.length > 1000) {
    score += 25;
  }
  
  return Math.min(score, 100);
}