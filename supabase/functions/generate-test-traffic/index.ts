import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Generating test WAF traffic...');

    // Get all customers
    const { data: customers, error: customerError } = await supabaseClient
      .from('customer_deployments')
      .select('*');

    if (customerError) throw customerError;

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No customers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const generatedRequests = [];

    // Generate 20-50 requests for each customer
    for (const customer of customers) {
      const requestCount = Math.floor(Math.random() * 30) + 20; // 20-50 requests
      
      for (let i = 0; i < requestCount; i++) {
        const request = generateTestRequest(customer.id);
        generatedRequests.push(request);
      }
    }

    // Insert all requests in batch
    const { data: insertedRequests, error: insertError } = await supabaseClient
      .from('waf_requests')
      .insert(generatedRequests)
      .select();

    if (insertError) throw insertError;

    console.log(`Generated ${generatedRequests.length} test WAF requests`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${generatedRequests.length} test WAF requests`,
        customers_updated: customers.length,
        requests_generated: generatedRequests.length,
        sample_requests: insertedRequests?.slice(0, 5) || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating test traffic:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateTestRequest(customerId: string) {
  const actions = ['allow', 'block', 'challenge'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const paths = [
    '/api/users', '/api/auth/login', '/api/products', '/admin/dashboard',
    '/api/orders', '/api/payments', '/uploads/files', '/api/search',
    '/api/analytics', '/health', '/metrics', '/admin/users'
  ];
  
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'curl/7.68.0', // This might get blocked as suspicious
    'python-requests/2.25.1', // This might get blocked
    'sqlmap/1.5.2', // This should get blocked
    'Googlebot/2.1', // Legitimate bot
    'PostmanRuntime/7.28.4'
  ];

  const sourceIPs = [
    '192.168.1.' + Math.floor(Math.random() * 254 + 1), // Local network
    '10.0.0.' + Math.floor(Math.random() * 254 + 1), // Local network
    '203.0.113.' + Math.floor(Math.random() * 254 + 1), // Test network
    '198.51.100.' + Math.floor(Math.random() * 254 + 1), // Test network
    '185.220.101.' + Math.floor(Math.random() * 254 + 1), // Tor exit node (should be blocked)
    '1.2.3.' + Math.floor(Math.random() * 254 + 1), // Random IP
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  const sourceIP = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];
  
  // Determine if this should be a malicious request
  const isMalicious = userAgent.includes('sqlmap') || 
                     userAgent.includes('curl') && Math.random() < 0.3 ||
                     sourceIP.includes('185.220.101') || // Tor exit
                     Math.random() < 0.15; // 15% chance of random malicious activity

  const request = {
    customer_id: customerId,
    source_ip: sourceIP,
    request_method: methods[Math.floor(Math.random() * methods.length)],
    request_path: paths[Math.floor(Math.random() * paths.length)],
    user_agent: userAgent,
    processing_time_ms: Math.floor(Math.random() * 150) + 10, // 10-160ms
    action: isMalicious && Math.random() < 0.7 ? 'block' : action,
    threat_score: isMalicious ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 50),
    threat_type: isMalicious ? getThreatType(userAgent, sourceIP) : null,
    rule_matches: isMalicious ? getMatchingRules(userAgent, sourceIP) : [],
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
    request_size: Math.floor(Math.random() * 10000) + 100,
    response_status: getResponseStatus(action, isMalicious)
  };

  return request;
}

function getThreatType(userAgent: string, sourceIP: string): string {
  if (userAgent.includes('sqlmap')) return 'sql_injection';
  if (userAgent.includes('curl') || userAgent.includes('python')) return 'suspicious_bot';
  if (sourceIP.includes('185.220.101')) return 'tor_exit_node';
  
  const threatTypes = ['xss', 'path_traversal', 'brute_force', 'rate_limit_violation'];
  return threatTypes[Math.floor(Math.random() * threatTypes.length)];
}

function getMatchingRules(userAgent: string, sourceIP: string): string[] {
  const rules = [];
  
  if (userAgent.includes('sqlmap')) rules.push('malicious_user_agent', 'sql_injection_tool');
  if (userAgent.includes('curl')) rules.push('suspicious_bot');
  if (sourceIP.includes('185.220.101')) rules.push('tor_exit_node', 'ip_reputation');
  
  // Add some generic rules
  if (Math.random() < 0.5) rules.push('owasp_rule_' + Math.floor(Math.random() * 10));
  if (Math.random() < 0.3) rules.push('custom_rule_' + Math.floor(Math.random() * 5));
  
  return rules;
}

function getResponseStatus(action: string, isMalicious: boolean): number {
  if (action === 'block') return Math.random() < 0.5 ? 403 : 429;
  if (action === 'challenge') return 429;
  
  // Allow requests
  if (isMalicious && Math.random() < 0.3) return 400; // Some malicious requests might cause errors
  return Math.random() < 0.9 ? 200 : (Math.random() < 0.5 ? 404 : 500);
}