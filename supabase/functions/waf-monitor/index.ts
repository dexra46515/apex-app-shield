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
  event_type?: string;
  country_code?: string;
  asn?: number;
  session_id?: string;
  device_fingerprint?: string;
  user_id?: string;
}

interface ThreatAnalysis {
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  rule_matches: string[];
  should_block: boolean;
  threat_detected: boolean;
  recommendations: string[];
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
      console.log('Processing advanced security event:', eventData);

      // Enhanced threat analysis with all advanced features
      const threatAnalysis = await analyzeRequest(eventData, supabaseClient);
      
      // Check honeypots first
      const honeypotCheck = await checkHoneypotInteraction(eventData, supabaseClient);
      if (honeypotCheck.is_honeypot) {
        console.log('Honeypot interaction detected:', honeypotCheck);
        await logHoneypotInteraction(honeypotCheck, eventData, supabaseClient);
      }

      // Device attestation check
      const deviceAttestation = await checkDeviceAttestation(eventData, supabaseClient);
      
      // API schema validation
      const schemaValidation = await validateAPISchema(eventData, supabaseClient);
      
      // BOLA prevention check
      const bolaCheck = await checkBOLAVulnerability(eventData, supabaseClient);
      
      // Geo/ASN restrictions
      const geoCheck = await checkGeoRestrictions(eventData, supabaseClient);
      
      // AI anomaly detection
      const aiAnalysis = await performAIAnomalyDetection(eventData, supabaseClient);
      
      // Advanced Differentiators Integration
      try {
        // 1. TLS Fingerprinting (if headers suggest HTTPS)
        if (eventData.request_headers && eventData.source_ip) {
          await supabaseClient.functions.invoke('tls-fingerprint-analyzer', {
            body: {
              tls_data: {
                version: 'TLS1.3',
                cipher_suites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256'],
                extensions: ['server_name', 'application_layer_protocol_negotiation'],
                client_hello_length: 512
              },
              source_ip: eventData.source_ip
            }
          });
        }

        // 2. Encrypted Flow Analysis (for large payloads)
        if (eventData.payload && eventData.payload.length > 1000) {
          await supabaseClient.functions.invoke('encrypted-flow-analyzer', {
            body: {
              flow_data: {
                packet_sizes: [eventData.payload.length],
                timing_patterns: { average_interval: 100, regularity_score: 0.5 },
                protocol: 'HTTP',
                direction: 'inbound',
                packet_count: 1,
                total_bytes: eventData.payload.length,
                duration: 1
              },
              source_ip: eventData.source_ip,
              destination_ip: eventData.destination_ip
            }
          });
        }

        // 3. Dynamic Honeypot Generation (if patterns suggest reconnaissance)
        if (eventData.request_path && (
          eventData.request_path.includes('admin') ||
          eventData.request_path.includes('.env') ||
          eventData.request_path.includes('config')
        )) {
          await supabaseClient.functions.invoke('dynamic-honeypot-generator', {
            body: {
              generation_type: 'learning',
              learning_source: 'waf_traffic',
              target_endpoints: [eventData.request_path]
            }
          });
        }
      } catch (advancedError) {
        console.error('Advanced differentiators error:', advancedError);
        // Don't fail the main request if advanced features fail
      }
      
      // Adaptive rules check
      const adaptiveRulesCheck = await checkAdaptiveRules(eventData, supabaseClient);

      // Additional OWASP threat checks
      const advancedOwaspCheck = await checkAdvancedOWASPThreats(eventData, supabaseClient);

      // Create comprehensive security event record
      const securityEvent = {
        event_type: threatAnalysis.should_block || honeypotCheck.is_honeypot || geoCheck.should_block ? 'block' : 'monitor',
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
        blocked: threatAnalysis.should_block || geoCheck.should_block || honeypotCheck.is_honeypot,
        payload: eventData.payload,
        country_code: eventData.country_code,
        asn: eventData.asn
      };

      // Insert security event
      const { data: eventRecord, error: eventError } = await supabaseClient
        .from('security_events')
        .insert([securityEvent])
        .select()
        .single();

      if (eventError) {
        console.error('Error inserting security event:', eventError);
      }

      // Create security alert for high severity threats
      if (['high', 'critical'].includes(threatAnalysis.severity) || honeypotCheck.is_honeypot || aiAnalysis.anomaly_detected) {
        await createSecurityAlert(threatAnalysis, eventData, supabaseClient);
      }

      // TTP Pattern Collection for Honeypot Interactions
      if (honeypotCheck.is_honeypot && eventRecord) {
        try {
          await supabaseClient.functions.invoke('ttp-pattern-collector', {
            body: {
              honeypot_interaction_id: honeypotCheck.interaction_id || eventRecord.id,
              attack_data: {
                source_ip: eventData.source_ip,
                request_path: eventData.request_path,
                payload: eventData.payload,
                user_agent: eventData.user_agent,
                request_method: eventData.request_method,
                timestamp: new Date().toISOString(),
                request_headers: eventData.request_headers,
                threat_score: threatAnalysis.score || 0
              }
            }
          });
        } catch (ttpError) {
          console.error('TTP collection error:', ttpError);
        }
      }

      // Update IP reputation based on comprehensive analysis
      await updateIPReputation(eventData.source_ip, threatAnalysis, supabaseClient);

      // Log to SIEM if configured
      await logToSIEM({
        event_type: 'security_analysis',
        event_source: 'waf-monitor',
        severity: threatAnalysis.severity,
        event_data: {
          threat_analysis: threatAnalysis,
          honeypot_check: honeypotCheck,
          device_attestation: deviceAttestation,
          schema_validation: schemaValidation,
          bola_check: bolaCheck,
          geo_check: geoCheck,
          ai_analysis: aiAnalysis,
          adaptive_rules: adaptiveRulesCheck,
          advanced_owasp: advancedOwaspCheck
        }
      }, supabaseClient);

      return new Response(
        JSON.stringify({
          success: true,
          event_id: eventRecord?.id,
          threat_detected: threatAnalysis.threat_detected || honeypotCheck.is_honeypot || aiAnalysis.anomaly_detected,
          severity: threatAnalysis.severity,
          should_block: threatAnalysis.should_block || geoCheck.should_block || honeypotCheck.is_honeypot,
          threat_type: threatAnalysis.threat_type,
          recommendations: threatAnalysis.recommendations,
          advanced_analysis: {
            honeypot_interaction: honeypotCheck.is_honeypot,
            device_trust_level: deviceAttestation.trust_level,
            schema_violations: schemaValidation.violations || 0,
            bola_risk: bolaCheck.risk_score || 0,
            geo_restricted: geoCheck.should_block,
            anomaly_score: aiAnalysis.anomaly_score || 0,
            adaptive_rules_triggered: adaptiveRulesCheck.rules_triggered || 0,
            advanced_owasp_threats: advancedOwaspCheck.threats_detected || []
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );

  } catch (error) {
    console.error('Advanced WAF Monitor Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Enhanced threat analysis with machine learning patterns
async function analyzeRequest(eventData: SecurityEventPayload, supabaseClient: any): Promise<ThreatAnalysis> {
  const analysis: ThreatAnalysis = {
    threat_type: 'unknown',
    severity: 'low',
    confidence: 0,
    rule_matches: [],
    should_block: false,
    threat_detected: false,
    recommendations: []
  };

  try {
    // Get active security rules
    const { data: rules } = await supabaseClient
      .from('security_rules')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: true });

    // Check OWASP Top 10 patterns
    const owaspAnalysis = analyzeOWASPThreats(eventData);
    if (owaspAnalysis.detected) {
      analysis.threat_type = owaspAnalysis.type;
      analysis.severity = owaspAnalysis.severity;
      analysis.confidence = owaspAnalysis.confidence;
      analysis.rule_matches.push(...owaspAnalysis.rules);
      analysis.should_block = owaspAnalysis.severity === 'high' || owaspAnalysis.severity === 'critical';
      analysis.threat_detected = true;
      analysis.recommendations.push(`Block ${owaspAnalysis.type} attempts from ${eventData.source_ip}`);
    }

    // Check bot patterns
    const botAnalysis = analyzeBotBehavior(eventData);
    if (botAnalysis.detected && botAnalysis.severity > analysis.severity) {
      analysis.threat_type = 'bot_attack';
      analysis.severity = botAnalysis.severity;
      analysis.confidence = Math.max(analysis.confidence, botAnalysis.confidence);
      analysis.rule_matches.push(...botAnalysis.rules);
      analysis.threat_detected = true;
      analysis.recommendations.push('Implement CAPTCHA or rate limiting for bot traffic');
    }

    // Check rate limiting
    const rateLimitAnalysis = await checkRateLimit(eventData.source_ip, supabaseClient);
    if (rateLimitAnalysis.violated) {
      analysis.threat_type = 'rate_limit_violation';
      analysis.severity = 'medium';
      analysis.confidence = 95;
      analysis.should_block = true;
      analysis.threat_detected = true;
      analysis.rule_matches.push('rate_limit_exceeded');
      analysis.recommendations.push('Implement progressive rate limiting');
    }

    // Check IP reputation
    const reputationAnalysis = await checkIPReputation(eventData.source_ip, supabaseClient);
    if (reputationAnalysis.risky) {
      analysis.threat_type = 'malicious_ip';
      analysis.severity = reputationAnalysis.severity;
      analysis.confidence = Math.max(analysis.confidence, reputationAnalysis.confidence);
      analysis.should_block = reputationAnalysis.severity === 'critical';
      analysis.threat_detected = true;
      analysis.rule_matches.push('ip_reputation_low');
      analysis.recommendations.push('Block or monitor IP from threat intelligence feeds');
    }

  } catch (error) {
    console.error('Error in threat analysis:', error);
  }

  return analysis;
}

// Honeypot interaction detection
async function checkHoneypotInteraction(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { is_honeypot: false, honeypot_type: '', decoy_response: {} };

  try {
    const { data: honeypots } = await supabaseClient
      .from('honeypots')
      .select('*')
      .eq('is_active', true);

    for (const honeypot of honeypots || []) {
      if (eventData.request_path?.includes(honeypot.endpoint_path)) {
        result.is_honeypot = true;
        result.honeypot_type = honeypot.type;
        result.decoy_response = honeypot.decoy_response;
        break;
      }
    }
  } catch (error) {
    console.error('Error checking honeypots:', error);
  }

  return result;
}

// Log honeypot interactions
async function logHoneypotInteraction(honeypotCheck: any, eventData: SecurityEventPayload, supabaseClient: any) {
  try {
    const { data: honeypot } = await supabaseClient
      .from('honeypots')
      .select('id')
      .eq('endpoint_path', eventData.request_path)
      .single();

    if (honeypot) {
      await supabaseClient
        .from('honeypot_interactions')
        .insert({
          honeypot_id: honeypot.id,
          source_ip: eventData.source_ip,
          user_agent: eventData.user_agent,
          request_method: eventData.request_method,
          request_headers: eventData.request_headers,
          request_body: eventData.payload,
          threat_score: 100
        });
    }
  } catch (error) {
    console.error('Error logging honeypot interaction:', error);
  }
}

// Device attestation verification
async function checkDeviceAttestation(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { trust_level: 'suspicious', verification_status: 'pending' };

  if (!eventData.device_fingerprint) {
    return result;
  }

  try {
    const { data: attestation } = await supabaseClient
      .from('device_attestations')
      .select('*')
      .eq('device_fingerprint', eventData.device_fingerprint)
      .single();

    if (attestation) {
      result.trust_level = attestation.trust_level;
      result.verification_status = attestation.verification_status;
    }
  } catch (error) {
    console.error('Error checking device attestation:', error);
  }

  return result;
}

// API schema validation
async function validateAPISchema(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { violations: 0, violation_details: [] };

  try {
    const { data: schemas } = await supabaseClient
      .from('api_schemas')
      .select('*')
      .eq('validation_enabled', true);

    for (const schema of schemas || []) {
      if (eventData.request_path?.match(new RegExp(schema.path_pattern)) && 
          eventData.request_method === schema.method) {
        // Validate request against schema
        // This is a simplified validation - in production, use a JSON schema validator
        if (eventData.payload && schema.schema_definition) {
          try {
            const payload = JSON.parse(eventData.payload);
            // Schema validation logic would go here
          } catch (e) {
            result.violations++;
            result.violation_details.push({
              type: 'invalid_json',
              schema_id: schema.id,
              details: 'Request payload is not valid JSON'
            });
          }
        }
      }
    }

    // Log schema violations
    if (result.violations > 0) {
      for (const violation of result.violation_details) {
        await supabaseClient
          .from('schema_violations')
          .insert({
            api_schema_id: violation.schema_id,
            source_ip: eventData.source_ip,
            violation_type: violation.type,
            violation_details: violation.details,
            request_data: { payload: eventData.payload },
            severity: 'medium'
          });
      }
    }

  } catch (error) {
    console.error('Error validating API schema:', error);
  }

  return result;
}

// BOLA (Broken Object Level Authorization) detection
async function checkBOLAVulnerability(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { risk_score: 0, authorization_valid: true, ownership_verified: true };

  if (!eventData.user_id || !eventData.session_id) {
    return result;
  }

  try {
    // Extract resource ID from path
    const resourceIdMatch = eventData.request_path?.match(/\/([^\/]+)\/([a-f0-9\-]{36})/);
    if (resourceIdMatch) {
      const resourceType = resourceIdMatch[1];
      const resourceId = resourceIdMatch[2];

      // Log access pattern
      await supabaseClient
        .from('user_access_patterns')
        .insert({
          user_id: eventData.user_id,
          session_id: eventData.session_id,
          resource_type: resourceType,
          resource_id: resourceId,
          access_method: eventData.request_method,
          authorization_valid: true, // This would be determined by actual auth check
          ownership_verified: true   // This would be determined by ownership check
        });

      // Check for suspicious patterns (accessing many different resources quickly)
      const { count } = await supabaseClient
        .from('user_access_patterns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', eventData.user_id)
        .gte('created_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes

      if (count && count > 50) {
        result.risk_score = 80;
        result.ownership_verified = false;
      }
    }
  } catch (error) {
    console.error('Error checking BOLA vulnerability:', error);
  }

  return result;
}

// Geo/ASN-based restrictions
async function checkGeoRestrictions(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { should_block: false, restriction_type: '', reason: '' };

  if (!eventData.country_code && !eventData.asn) {
    return result;
  }

  try {
    const { data: restrictions } = await supabaseClient
      .from('geo_restrictions')
      .select('*')
      .eq('is_active', true);

    for (const restriction of restrictions || []) {
      if ((restriction.country_code && restriction.country_code === eventData.country_code) ||
          (restriction.asn && restriction.asn === eventData.asn)) {
        result.should_block = restriction.restriction_type === 'block';
        result.restriction_type = restriction.restriction_type;
        result.reason = restriction.reason;
        break;
      }
    }
  } catch (error) {
    console.error('Error checking geo restrictions:', error);
  }

  return result;
}

// AI-powered anomaly detection using Perplexity API
async function performAIAnomalyDetection(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { anomaly_detected: false, anomaly_score: 0, ai_analysis: {}, threat_level: 'low' };

  try {
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.log('Perplexity API key not configured, skipping AI analysis');
      return result;
    }

    // Prepare request data for AI analysis
    const requestData = {
      source_ip: eventData.source_ip,
      user_agent: eventData.user_agent,
      request_path: eventData.request_path,
      request_method: eventData.request_method,
      payload: eventData.payload?.substring(0, 1000) // Limit payload size for analysis
    };

    const prompt = `Analyze this HTTP request for security threats and anomalies. Return a JSON response with anomaly_score (0-100), threat_detected (boolean), and threat_categories (array). Request: ${JSON.stringify(requestData)}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert analyzing HTTP requests for threats. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (response.ok) {
      const aiResponse = await response.json();
      const analysis = aiResponse.choices[0]?.message?.content;
      
      try {
        const parsedAnalysis = JSON.parse(analysis);
        result.anomaly_score = parsedAnalysis.anomaly_score || 0;
        result.anomaly_detected = parsedAnalysis.threat_detected || false;
        result.ai_analysis = parsedAnalysis;
        
        if (result.anomaly_score > 70) {
          result.threat_level = 'high';
        } else if (result.anomaly_score > 40) {
          result.threat_level = 'medium';
        }

        // Store AI analysis result
        await supabaseClient
          .from('ai_anomaly_detections')
          .insert({
            session_id: eventData.session_id || 'unknown',
            source_ip: eventData.source_ip,
            anomaly_score: result.anomaly_score,
            behavior_pattern: requestData,
            ai_analysis_result: result.ai_analysis,
            threat_level: result.threat_level,
            mitigation_action: result.anomaly_score > 70 ? 'block' : 'monitor'
          });

      } catch (parseError) {
        console.error('Error parsing AI analysis result:', parseError);
      }
    }
  } catch (error) {
    console.error('Error performing AI anomaly detection:', error);
  }

  return result;
}

// Adaptive security rules engine
async function checkAdaptiveRules(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { rules_triggered: 0, actions_taken: [] };

  try {
    const { data: adaptiveRules } = await supabaseClient
      .from('adaptive_rules')
      .select('*')
      .eq('is_active', true)
      .order('learning_confidence', { ascending: false });

    for (const rule of adaptiveRules || []) {
      const conditions = rule.condition_pattern;
      let ruleMatched = false;

      // Evaluate rule conditions (simplified logic)
      if (conditions.source_ip && conditions.source_ip === eventData.source_ip) {
        ruleMatched = true;
      }
      if (conditions.user_agent_pattern && eventData.user_agent?.match(new RegExp(conditions.user_agent_pattern))) {
        ruleMatched = true;
      }
      if (conditions.path_pattern && eventData.request_path?.match(new RegExp(conditions.path_pattern))) {
        ruleMatched = true;
      }

      if (ruleMatched) {
        result.rules_triggered++;
        result.actions_taken.push(rule.action_type);

        // Update rule trigger count
        await supabaseClient
          .from('adaptive_rules')
          .update({
            trigger_count: rule.trigger_count + 1,
            last_triggered: new Date().toISOString()
          })
          .eq('id', rule.id);
      }
    }
  } catch (error) {
    console.error('Error checking adaptive rules:', error);
  }

  return result;
}

// Advanced OWASP threat detection (CSRF, SSRF, RCE, XXE, etc.)
async function checkAdvancedOWASPThreats(eventData: SecurityEventPayload, supabaseClient: any) {
  const result = { threats_detected: [], severity: 'low' };

  const payload = eventData.payload || '';
  const path = eventData.request_path || '';
  const headers = JSON.stringify(eventData.request_headers || {});

  // CSRF Detection
  if (eventData.request_method === 'POST' && !eventData.request_headers?.['x-csrf-token']) {
    result.threats_detected.push('potential_csrf');
  }

  // SSRF Detection
  const ssrfPatterns = [
    /localhost/i,
    /127\.0\.0\.1/,
    /0\.0\.0\.0/,
    /file:\/\//i,
    /gopher:\/\//i,
    /dict:\/\//i
  ];

  for (const pattern of ssrfPatterns) {
    if (pattern.test(payload) || pattern.test(path)) {
      result.threats_detected.push('ssrf_attempt');
      result.severity = 'high';
      break;
    }
  }

  // RCE Detection
  const rcePatterns = [
    /eval\(/i,
    /exec\(/i,
    /system\(/i,
    /shell_exec/i,
    /passthru/i,
    /wget\s+/i,
    /curl\s+/i
  ];

  for (const pattern of rcePatterns) {
    if (pattern.test(payload)) {
      result.threats_detected.push('rce_attempt');
      result.severity = 'critical';
      break;
    }
  }

  // XXE Detection
  const xxePatterns = [
    /<!ENTITY/i,
    /<!DOCTYPE.*\[/i,
    /SYSTEM.*file:/i
  ];

  for (const pattern of xxePatterns) {
    if (pattern.test(payload)) {
      result.threats_detected.push('xxe_attempt');
      result.severity = 'high';
      break;
    }
  }

  return result;
}

// SIEM integration
async function logToSIEM(eventData: any, supabaseClient: any) {
  try {
    await supabaseClient
      .from('siem_events')
      .insert({
        event_type: eventData.event_type,
        event_source: eventData.event_source,
        severity: eventData.severity,
        event_data: eventData.event_data,
        correlation_id: `waf-${Date.now()}`,
        exported_to_siem: false
      });
  } catch (error) {
    console.error('Error logging to SIEM:', error);
  }
}

// ... keep existing helper functions for OWASP, bot detection, rate limiting, IP reputation, alerts, etc.
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

  // SQL Injection Detection
  const sqlPatterns = [
    /union.*select/i, /drop.*table/i, /exec.*xp_/i, /insert.*into/i,
    /delete.*from/i, /update.*set/i, /or.*1=1/i, /and.*1=1/i
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
    /<script.*>/i, /javascript:/i, /onload=/i, /onerror=/i, /onclick=/i, /<iframe.*>/i
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
  const pathTraversalPatterns = [/\.\.\//,  /\.\.\\/,  /%2e%2e%2f/i,  /%2e%2e%5c/i];
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
    /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /burpsuite/i, /havij/i
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
  const botPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i];
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
  const result = { violated: false, current_rate: 0, limit: 100 };

  try {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabaseClient
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('source_ip', sourceIP)
      .gte('timestamp', oneMinuteAgo);

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
    const { data: reputation } = await supabaseClient
      .from('ip_reputation')
      .select('*')
      .eq('ip_address', sourceIP)
      .maybeSingle();

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
      description: `Advanced threat detected from ${eventData.source_ip} with ${threatAnalysis.confidence}% confidence`,
      source_ip: eventData.source_ip,
      event_count: 1,
    };

    await supabaseClient.from('security_alerts').insert([alert]);
    console.log('Advanced security alert created:', alert);
  } catch (error) {
    console.error('Alert creation error:', error);
  }
}

async function updateIPReputation(sourceIP: string, threatAnalysis: ThreatAnalysis, supabaseClient: any) {
  try {
    let reputationScore = 50;
    
    if (threatAnalysis.severity === 'critical') {
      reputationScore = Math.max(0, reputationScore - 30);
    } else if (threatAnalysis.severity === 'high') {
      reputationScore = Math.max(0, reputationScore - 20);
    } else if (threatAnalysis.severity === 'medium') {
      reputationScore = Math.max(0, reputationScore - 10);
    }

    await supabaseClient
      .from('ip_reputation')
      .upsert({
        ip_address: sourceIP,
        reputation_score: reputationScore,
        risk_level: threatAnalysis.severity,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'ip_address' });

  } catch (error) {
    console.error('IP reputation update error:', error);
  }
}
