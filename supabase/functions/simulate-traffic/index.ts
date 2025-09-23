import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simulated attack patterns for demonstration
const attackPatterns = [
  {
    type: 'sql_injection',
    severity: 'high',
    payloads: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "UNION SELECT * FROM admin_users",
      "exec xp_cmdshell('dir')"
    ],
    paths: [
      "/login?user=' OR '1'='1' --",
      "/search?q='; DROP TABLE products; --",
      "/api/users?id=1 UNION SELECT password FROM users"
    ]
  },
  {
    type: 'xss_attack',
    severity: 'high',
    payloads: [
      "<script>alert('XSS')</script>",
      "javascript:alert('XSS')",
      "<iframe src='javascript:alert(1)'></iframe>",
      "<img onerror='alert(1)' src='x'>"
    ],
    paths: [
      "/comment?text=<script>alert('XSS')</script>",
      "/profile?name=<img onerror='alert(1)' src='x'>",
      "/search?q=javascript:alert('XSS')"
    ]
  },
  {
    type: 'bot_attack',
    severity: 'medium',
    payloads: [""],
    paths: ["/api/data", "/admin", "/robots.txt", "/sitemap.xml"],
    user_agents: [
      "sqlmap/1.0",
      "Nikto/2.1.6",
      "Mozilla/5.0 (compatible; Baiduspider)",
      "python-requests/2.25.1"
    ]
  },
  {
    type: 'ddos_simulation',
    severity: 'medium',
    payloads: [""],
    paths: ["/", "/api/status", "/login", "/search"]
  }
];

const legitTrafficPatterns = [
  {
    paths: ["/", "/about", "/products", "/contact"],
    user_agents: [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
    ]
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { pattern = 'mixed', count = 10 } = await req.json();
      
      console.log(`Simulating ${count} events with pattern: ${pattern}`);

      const events = [];
      
      for (let i = 0; i < count; i++) {
        let event;
        
        if (pattern === 'attack' || (pattern === 'mixed' && Math.random() < 0.3)) {
          event = generateAttackEvent();
        } else {
          event = generateLegitEvent();
        }
        
        events.push(event);
        
        // Add some delay between events to simulate realistic timing
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        }
      }

      // Process events through WAF monitor
      const results = [];
      
      for (const event of events) {
        try {
          // Call WAF monitor function
          const wafResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/waf-monitor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify(event)
          });

          const result = await wafResponse.json();
          results.push({
            event: event,
            analysis: result
          });

        } catch (error) {
          console.error('Error processing event through WAF:', error);
          results.push({
            event: event,
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Generated ${count} security events`,
          pattern: pattern,
          results: results
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
    console.error('Traffic Simulation Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateAttackEvent() {
  const pattern = attackPatterns[Math.floor(Math.random() * attackPatterns.length)];
  const sourceIP = generateMaliciousIP();
  
  const event = {
    source_ip: sourceIP,
    destination_ip: "10.0.0.100",
    user_agent: pattern.user_agents ? 
      pattern.user_agents[Math.floor(Math.random() * pattern.user_agents.length)] : 
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    request_method: Math.random() > 0.7 ? "POST" : "GET",
    request_path: pattern.paths[Math.floor(Math.random() * pattern.paths.length)],
    request_headers: {
      "host": "api.company.com",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.5",
      "accept-encoding": "gzip, deflate"
    },
    response_status: Math.random() > 0.5 ? 403 : 200,
    response_size: Math.floor(Math.random() * 5000) + 500,
    payload: pattern.payloads[Math.floor(Math.random() * pattern.payloads.length)]
  };

  return event;
}

function generateLegitEvent() {
  const pattern = legitTrafficPatterns[0];
  const sourceIP = generateLegitIP();
  
  const event = {
    source_ip: sourceIP,
    destination_ip: "10.0.0.100",
    user_agent: pattern.user_agents[Math.floor(Math.random() * pattern.user_agents.length)],
    request_method: Math.random() > 0.8 ? "POST" : "GET",
    request_path: pattern.paths[Math.floor(Math.random() * pattern.paths.length)],
    request_headers: {
      "host": "www.company.com",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.5",
      "accept-encoding": "gzip, deflate, br",
      "referer": "https://www.google.com/"
    },
    response_status: Math.random() > 0.95 ? 404 : 200,
    response_size: Math.floor(Math.random() * 50000) + 1000,
    payload: ""
  };

  return event;
}

function generateMaliciousIP() {
  // Generate IPs from ranges commonly associated with attacks
  const maliciousRanges = [
    "45.123.",    // Known bad range
    "185.220.",   // Tor exit nodes
    "198.98.",    // Suspicious range
    "103.41.",    // Compromised hosts
  ];
  
  const range = maliciousRanges[Math.floor(Math.random() * maliciousRanges.length)];
  const third = Math.floor(Math.random() * 255);
  const fourth = Math.floor(Math.random() * 255) + 1;
  
  return `${range}${third}.${fourth}`;
}

function generateLegitIP() {
  // Generate legitimate-looking IPs
  const legitRanges = [
    "192.168.",   // Private networks
    "10.0.",      // Private networks
    "172.16.",    // Private networks
    "203.0.",     // Public ranges
    "8.8.",       // Google DNS range
  ];
  
  const range = legitRanges[Math.floor(Math.random() * legitRanges.length)];
  const third = Math.floor(Math.random() * 255);
  const fourth = Math.floor(Math.random() * 255) + 1;
  
  return `${range}${third}.${fourth}`;
}