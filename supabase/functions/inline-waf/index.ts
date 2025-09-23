import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface InlineWAFRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  source_ip: string;
  timestamp?: number;
}

interface WAFDecision {
  action: 'allow' | 'block' | 'challenge';
  status_code?: number;
  headers?: Record<string, string>;
  body?: string;
  reason?: string;
  threat_score: number;
  rule_matches: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const requestData: InlineWAFRequest = await req.json();
      console.log(`Processing inline WAF request: ${requestData.method} ${requestData.url}`);

      // Fast path security analysis for real-time decisions
      const decision = await analyzeInlineRequest(requestData, supabaseClient);
      
      const processingTime = performance.now() - startTime;
      console.log(`WAF decision: ${decision.action} in ${processingTime.toFixed(2)}ms`);

      // Log security event asynchronously (non-blocking)
      if (decision.threat_score > 50 || decision.action === 'block') {
        logSecurityEventAsync(requestData, decision, supabaseClient);
      }

      // Return decision immediately for minimal latency
      return new Response(
        JSON.stringify({
          action: decision.action,
          status_code: decision.status_code || (decision.action === 'block' ? 403 : 200),
          headers: decision.headers || {},
          body: decision.body || '',
          reason: decision.reason,
          threat_score: decision.threat_score,
          processing_time_ms: processingTime,
          rule_matches: decision.rule_matches
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: 'WAF Inline Processor Active',
        version: '1.0.0',
        features: ['OWASP Protection', 'Bot Detection', 'Rate Limiting', 'Geo Blocking']
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Inline WAF Error:', error);
    
    // Always allow traffic on error to prevent service disruption
    return new Response(
      JSON.stringify({
        action: 'allow',
        status_code: 200,
        error: 'WAF processing error - traffic allowed',
        reason: 'fail_open'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
  }
});

// Optimized real-time threat analysis
async function analyzeInlineRequest(requestData: InlineWAFRequest, supabaseClient: any): Promise<WAFDecision> {
  const decision: WAFDecision = {
    action: 'allow',
    threat_score: 0,
    rule_matches: []
  };

  try {
    // 1. Fast IP reputation check (cached)
    const ipCheck = await checkIPReputationFast(requestData.source_ip, supabaseClient);
    if (ipCheck.should_block) {
      decision.action = 'block';
      decision.threat_score = 95;
      decision.reason = 'malicious_ip';
      decision.rule_matches.push('ip_reputation');
      decision.body = 'Access denied - IP flagged as malicious';
      return decision;
    }

    // 2. Rate limiting check
    const rateLimitCheck = await checkRateLimitFast(requestData.source_ip, supabaseClient);
    if (rateLimitCheck.exceeded) {
      decision.action = 'block';
      decision.threat_score = 80;
      decision.reason = 'rate_limit_exceeded';
      decision.rule_matches.push('rate_limiting');
      decision.status_code = 429;
      decision.body = 'Rate limit exceeded';
      decision.headers = { 'Retry-After': '60' };
      return decision;
    }

    // 3. Fast OWASP pattern matching
    const owaspCheck = analyzeOWASPPatternsFast(requestData);
    if (owaspCheck.threat_detected) {
      decision.action = 'block';
      decision.threat_score = owaspCheck.severity === 'critical' ? 100 : 85;
      decision.reason = owaspCheck.threat_type;
      decision.rule_matches.push(...owaspCheck.patterns);
      decision.body = `Security violation detected: ${owaspCheck.threat_type}`;
      return decision;
    }

    // 4. Geo blocking check
    const geoCheck = await checkGeoBlockingFast(requestData, supabaseClient);
    if (geoCheck.blocked) {
      decision.action = 'block';
      decision.threat_score = 70;
      decision.reason = 'geo_restricted';
      decision.rule_matches.push('geo_blocking');
      decision.body = 'Access denied from this geographic location';
      return decision;
    }

    // 5. Bot detection
    const botCheck = analyzeBotPatternsFast(requestData);
    if (botCheck.is_malicious_bot) {
      decision.action = 'challenge';
      decision.threat_score = 60;
      decision.reason = 'suspicious_bot';
      decision.rule_matches.push('bot_detection');
      decision.status_code = 429;
      decision.body = 'Please verify you are human';
      return decision;
    }

    // Calculate final threat score
    decision.threat_score = Math.max(
      ipCheck.score || 0,
      owaspCheck.score || 0,
      botCheck.score || 0
    );

  } catch (error) {
    console.error('Error in inline analysis:', error);
    // Fail open - allow traffic on analysis error
  }

  return decision;
}

// Fast IP reputation check with caching
async function checkIPReputationFast(sourceIP: string, supabaseClient: any) {
  try {
    const { data } = await supabaseClient
      .from('ip_reputation')
      .select('reputation_score, risk_level')
      .eq('ip_address', sourceIP)
      .single();

    if (data && data.reputation_score < 30) {
      return { should_block: true, score: 95, reason: 'malicious_ip' };
    }

    return { should_block: false, score: data?.reputation_score || 50 };
  } catch (error) {
    return { should_block: false, score: 50 };
  }
}

// Fast rate limiting check
async function checkRateLimitFast(sourceIP: string, supabaseClient: any) {
  try {
    // Check requests in last minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    
    const { count } = await supabaseClient
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('source_ip', sourceIP)
      .gte('timestamp', oneMinuteAgo);

    const requestCount = count || 0;
    const rateLimit = 100; // 100 requests per minute

    return {
      exceeded: requestCount > rateLimit,
      current_count: requestCount,
      limit: rateLimit
    };
  } catch (error) {
    return { exceeded: false, current_count: 0, limit: 100 };
  }
}

// Fast OWASP pattern matching
function analyzeOWASPPatternsFast(requestData: InlineWAFRequest) {
  const patterns = {
    sql_injection: [
      /(\bUNION\b.*\bSELECT\b)|(\bSELECT\b.*\bFROM\b)|(\'\s*(OR|AND)\s*\'\s*=\s*\')|(\bDROP\b\s+\bTABLE\b)/i,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))\s*((\%72)|r|(\%52))/i
    ],
    xss: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ],
    path_traversal: [
      /\.\.\//g,
      /\.\.\\\\?/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi
    ]
  };

  const url = requestData.url;
  const body = requestData.body || '';
  const userAgent = requestData.headers['user-agent'] || '';

  // Check SQL Injection
  for (const pattern of patterns.sql_injection) {
    if (pattern.test(url) || pattern.test(body)) {
      return {
        threat_detected: true,
        threat_type: 'sql_injection',
        severity: 'critical',
        score: 100,
        patterns: ['sql_injection']
      };
    }
  }

  // Check XSS
  for (const pattern of patterns.xss) {
    if (pattern.test(url) || pattern.test(body)) {
      return {
        threat_detected: true,
        threat_type: 'xss',
        severity: 'high',
        score: 85,
        patterns: ['xss']
      };
    }
  }

  // Check Path Traversal
  for (const pattern of patterns.path_traversal) {
    if (pattern.test(url)) {
      return {
        threat_detected: true,
        threat_type: 'path_traversal',
        severity: 'high',
        score: 80,
        patterns: ['path_traversal']
      };
    }
  }

  return { threat_detected: false, score: 0, patterns: [] };
}

// Fast geo blocking check
async function checkGeoBlockingFast(requestData: InlineWAFRequest, supabaseClient: any) {
  try {
    // Extract country from IP (simplified - in production use GeoIP service)
    const country = requestData.headers['cf-ipcountry'] || 
                   requestData.headers['x-country-code'] || 
                   'unknown';

    if (country === 'unknown') {
      return { blocked: false };
    }

    const { data } = await supabaseClient
      .from('geo_restrictions')
      .select('restriction_type')
      .eq('country_code', country.toUpperCase())
      .eq('is_active', true)
      .single();

    return {
      blocked: data?.restriction_type === 'block',
      country: country
    };
  } catch (error) {
    return { blocked: false };
  }
}

// Fast bot pattern analysis
function analyzeBotPatternsFast(requestData: InlineWAFRequest) {
  const userAgent = requestData.headers['user-agent'] || '';
  
  const maliciousBotPatterns = [
    /sqlmap/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
    /shodan/i,
    /censys/i,
    /nikto/i,
    /dirb/i,
    /gobuster/i
  ];

  const suspiciousBotPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /scrapy/i,
    /bot/i
  ];

  // Check for malicious bots
  for (const pattern of maliciousBotPatterns) {
    if (pattern.test(userAgent)) {
      return {
        is_malicious_bot: true,
        score: 90,
        bot_type: 'malicious'
      };
    }
  }

  // Check for suspicious bots
  for (const pattern of suspiciousBotPatterns) {
    if (pattern.test(userAgent)) {
      return {
        is_malicious_bot: false,
        score: 40,
        bot_type: 'suspicious'
      };
    }
  }

  return { is_malicious_bot: false, score: 10, bot_type: 'human' };
}

// Async logging (non-blocking)
function logSecurityEventAsync(requestData: InlineWAFRequest, decision: WAFDecision, supabaseClient: any) {
  // Fire and forget logging
  Promise.resolve().then(async () => {
    try {
      await supabaseClient
        .from('security_events')
        .insert({
          event_type: decision.action,
          severity: decision.threat_score > 80 ? 'high' : decision.threat_score > 50 ? 'medium' : 'low',
          source_ip: requestData.source_ip,
          request_method: requestData.method,
          request_path: new URL(requestData.url).pathname,
          request_headers: requestData.headers,
          threat_type: decision.reason,
          blocked: decision.action === 'block',
          payload: requestData.body?.substring(0, 1000) // Limit payload size
        });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  });
}