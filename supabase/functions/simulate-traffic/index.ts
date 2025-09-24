import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real attack patterns to test against actual URLs
const attackPatterns = [
  {
    type: 'sql_injection',
    severity: 'high',
    paths: [
      "/login?user=' OR '1'='1' --",
      "/search?q='; DROP TABLE products; --",
      "/api/users?id=1 UNION SELECT password FROM users",
      "/admin?id=' OR 1=1 --"
    ],
    payloads: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "UNION SELECT * FROM admin_users"
    ]
  },
  {
    type: 'xss_attack',
    severity: 'high', 
    paths: [
      "/comment?text=<script>alert('XSS')</script>",
      "/profile?name=<img onerror='alert(1)' src='x'>",
      "/search?q=javascript:alert('XSS')"
    ],
    payloads: [
      "<script>alert('XSS')</script>",
      "javascript:alert('XSS')",
      "<iframe src='javascript:alert(1)'></iframe>"
    ]
  },
  {
    type: 'path_traversal',
    severity: 'high',
    paths: [
      "/files?path=../../../etc/passwd",
      "/download?file=../../../../windows/system32/config/sam",
      "/api/file?name=..%2F..%2F..%2Fetc%2Fpasswd"
    ],
    payloads: ["../../../etc/passwd", "../../../../windows/system32/config/sam"]
  }
];

const legitPaths = ["/", "/about", "/products", "/contact", "/api/status", "/login", "/dashboard"];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const { targetUrl, pattern = 'mixed', count = 10 } = await req.json();
      
      if (!targetUrl) {
        return new Response(
          JSON.stringify({ error: 'Target URL is required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      console.log(`Making ${count} REAL HTTP requests to ${targetUrl} with pattern: ${pattern}`);

      const results: Array<any> = [];
      let successCount = 0;
      let failedCount = 0;
      let attackCount = 0;
      
      for (let i = 0; i < count; i++) {
        let testPath: string;
        let payload = '';
        let isAttack = false;
        let timeoutId: number | undefined;
        
        // Determine if this should be an attack or legitimate request
        if (pattern === 'attack' || (pattern === 'mixed' && Math.random() < 0.4)) {
          const attackPattern = attackPatterns[Math.floor(Math.random() * attackPatterns.length)];
          testPath = attackPattern.paths[Math.floor(Math.random() * attackPattern.paths.length)];
          payload = attackPattern.payloads[Math.floor(Math.random() * attackPattern.payloads.length)];
          isAttack = true;
          attackCount++;
        } else {
          testPath = legitPaths[Math.floor(Math.random() * legitPaths.length)];
        }
        
        const fullUrl = `${targetUrl}${testPath}`;
        const startTime = Date.now();
        
        try {
          console.log(`[${i+1}/${count}] Testing: ${fullUrl}`);
          
          const requestOptions: RequestInit = {
            method: payload ? 'POST' : 'GET',
            headers: {
              'User-Agent': 'SecurityTest-Bot/1.0',
              'Content-Type': 'application/json',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          };
          
          if (payload) {
            requestOptions.body = JSON.stringify({ test: payload });
          }

          // Set timeout manually since AbortSignal.timeout might not be available
          timeoutId = setTimeout(() => {
            throw new Error('Request timeout (10s)');
          }, 10000);
          
          const response = await fetch(fullUrl, requestOptions);
          if (timeoutId) clearTimeout(timeoutId);
          
          const responseTime = Date.now() - startTime;
          const responseText = await response.text().catch(() => 'Unable to read response body');
          
          const result = {
            url: fullUrl,
            method: requestOptions.method,
            status: response.status,
            statusText: response.statusText,
            responseTime,
            isAttack,
            payload: payload || null,
            success: response.ok,
            error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
            blocked: response.status === 403 || response.status === 429 || responseText.includes('blocked') || responseText.includes('Cloudflare'),
            responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
          };
          
          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
          }
          
          results.push(result);
          console.log(`Result: ${response.status} ${response.statusText} (${responseTime}ms)`);
          
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          
          const result = {
            url: fullUrl,
            method: payload ? 'POST' : 'GET',
            status: 0,
            statusText: 'Request Failed',
            responseTime,
            isAttack,
            payload: payload || null,
            success: false,
            error: (error as Error).message,
            blocked: false,
            responsePreview: null
          };
          
          failedCount++;
          results.push(result);
          console.error(`Request failed: ${(error as Error).message}`);
        }
        
        // Small delay between requests to avoid overwhelming the target
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        }
      }

      const blockedCount = results.filter(r => r.blocked).length;
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Completed ${count} real HTTP requests to ${targetUrl}`,
          summary: {
            total: count,
            successful: successCount,
            failed: failedCount,
            attacks: attackCount,
            blocked: blockedCount
          },
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
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});