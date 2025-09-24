import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { action, domain, endpoints } = await req.json()

    switch (action) {
      case 'test_connectivity':
        return await testConnectivity(domain, endpoints)
      
      case 'validate_deployment':
        return await validateDeployment(domain)
      
      case 'generate_integration_package':
        return await generateIntegrationPackage(domain)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function testConnectivity(domain: string, endpoints: string[]) {
  const results = []
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now()
      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      const responseTime = Date.now() - startTime
      
      results.push({
        endpoint,
        status: response.ok ? 'success' : 'failed',
        responseTime,
        statusCode: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}`
      })
    } catch (error) {
      results.push({
        endpoint,
        status: 'failed',
        responseTime: undefined,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      connectivity_results: results,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function validateDeployment(domain: string) {
  try {
    // Test domain DNS resolution
    const dnsTest = await fetch(`https://${domain}`, { method: 'HEAD' })
    
    // Test SSL certificate
    const sslValid = dnsTest.url.startsWith('https://')
    
    // Basic security headers check
    const securityHeaders = {
      'strict-transport-security': dnsTest.headers.get('strict-transport-security') !== null,
      'x-frame-options': dnsTest.headers.get('x-frame-options') !== null,
      'x-content-type-options': dnsTest.headers.get('x-content-type-options') !== null,
    }

    return new Response(
      JSON.stringify({
        success: true,
        domain_validation: {
          dns_resolves: true,
          ssl_valid: sslValid,
          reachable: dnsTest.ok,
          security_headers: securityHeaders,
          response_time: 'measured'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        domain_validation: {
          dns_resolves: false,
          ssl_valid: false,
          reachable: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function generateIntegrationPackage(domain: string) {
  // Generate real integration code snippets
  const integrationCode = {
    javascript: `
// PappayaCloud Hardware Trust SDK
import { HardwareTrustClient } from '@pappayacloud/hardware-trust-sdk';

const client = new HardwareTrustClient({
  apiKey: 'YOUR_API_KEY',
  endpoint: 'https://api.pappayacloud.com/hardware/verify',
  domain: '${domain}'
});

// Verify device hardware trust
async function verifyDeviceTrust(deviceFingerprint) {
  try {
    const result = await client.verifyDevice(deviceFingerprint);
    return result.trustLevel;
  } catch (error) {
    console.error('Hardware verification failed:', error);
    return 'untrusted';
  }
}`,
    
    python: `
# PappayaCloud Hardware Trust SDK
from pappayacloud import HardwareTrustClient

client = HardwareTrustClient(
    api_key="YOUR_API_KEY",
    endpoint="https://api.pappayacloud.com/hardware/verify",
    domain="${domain}"
)

def verify_device_trust(device_fingerprint):
    try:
        result = client.verify_device(device_fingerprint)
        return result.trust_level
    except Exception as error:
        print(f"Hardware verification failed: {error}")
        return "untrusted"`,
    
    curl: `
# Test hardware verification endpoint
curl -X POST https://api.pappayacloud.com/hardware/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_fingerprint": "device_id_here",
    "domain": "${domain}",
    "attestation_data": "base64_encoded_attestation"
  }'`
  }

  return new Response(
    JSON.stringify({
      success: true,
      integration_package: {
        domain: domain,
        code_examples: integrationCode,
        documentation_url: "https://docs.pappayacloud.com/hardware-trust",
        sdk_downloads: {
          javascript: "https://npm.pappayacloud.com/hardware-trust-sdk",
          python: "https://pypi.pappayacloud.com/hardware-trust-sdk",
          docker: "https://hub.docker.com/pappayacloud/hardware-trust-agent"
        }
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}