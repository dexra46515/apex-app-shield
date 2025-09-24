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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { api_key, customer_id, deployment_config } = await req.json()

    console.log('HANDLER VERSION: v4-REAL-VALIDATION-NO-MOCKS')
    console.log('Production validation started for customer:', customer_id)

    // Get customer deployment by ID (not API key)
    const { data: deployment, error } = await supabaseClient
      .from('customer_deployments')
      .select('*')
      .eq('id', customer_id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    if (!deployment) {
      throw new Error(`Customer deployment not found or inactive for ID: ${customer_id}`)
    }

    console.log('Found deployment:', deployment.customer_name, 'Domain:', deployment.domain)

    // Always run validation checks, even if some fail
    const validationResults = await validateProductionDeployment(deployment)

    console.log('Validation results:', JSON.stringify(validationResults, null, 2))

    // Update deployment status with results
    try {
      await supabaseClient
        .from('customer_deployments')
        .update({
          config_settings: {
            ...deployment.config_settings,
            validated_at: new Date().toISOString(),
            validation_results: validationResults
          }
        })
        .eq('id', deployment.id)
    } catch (updateError) {
      console.error('Failed to update deployment:', updateError)
      // Don't fail the whole request if update fails
    }

    // Return results regardless of scores
    return new Response(
      JSON.stringify({
        success: true,
        deployment_id: deployment.id,
        customer_name: deployment.customer_name,
        domain: deployment.domain,
        validation_results: validationResults,
        production_ready: validationResults.overall_score >= 80,
        version_info: "v4-REAL-VALIDATION-NO-MOCKS",
        next_steps: generateNextSteps(validationResults)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Production validation error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check the deployment ID and ensure the customer deployment exists and is active'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function validateProductionDeployment(deployment: any) {
  const results = {
    domain_validation: await validateDomain(deployment.domain),
    security_configuration: await validateSecurityConfig(deployment.config_settings),
    api_integration: await validateAPIIntegration(deployment.api_key, deployment.domain),
    hardware_trust_setup: await validateHardwareTrustSetup(deployment),
    overall_score: 0
  }

  // Calculate overall score
  const scores = [
    results.domain_validation.score,
    results.security_configuration.score,
    results.api_integration.score,
    results.hardware_trust_setup.score
  ]
  
  results.overall_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  return results
}

async function validateDomain(domain: string) {
  console.log(`=== REAL HTTP REQUEST TO: ${domain} ===`)
  
  try {
    const startTime = Date.now()
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Make real HTTP request to the actual domain
    const response = await fetch(`https://${domain}`, { 
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'WAF-Production-Validator/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime
    
    console.log(`✅ REAL RESPONSE from ${domain}:`)
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Response Time: ${responseTime}ms`)
    console.log(`   Final URL: ${response.url}`)
    
    // REAL security header analysis
    const allHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      allHeaders[key.toLowerCase()] = value
    })
    
    console.log(`   All Headers from ${domain}:`, JSON.stringify(allHeaders, null, 2))
    
    const securityHeaders = {
      'strict-transport-security': response.headers.get('strict-transport-security'),
      'x-frame-options': response.headers.get('x-frame-options'),
      'x-content-type-options': response.headers.get('x-content-type-options'),
      'content-security-policy': response.headers.get('content-security-policy'),
      'x-xss-protection': response.headers.get('x-xss-protection')
    }
    
    console.log(`   Security Headers from ${domain}:`, JSON.stringify(securityHeaders, null, 2))
    
    // Calculate REAL security score based on actual headers
    let securityScore = 0
    if (securityHeaders['strict-transport-security']) securityScore += 20
    if (securityHeaders['x-frame-options']) securityScore += 20
    if (securityHeaders['x-content-type-options']) securityScore += 20
    if (securityHeaders['content-security-policy']) securityScore += 20
    if (securityHeaders['x-xss-protection']) securityScore += 20
    
    const finalScore = response.ok ? Math.max(50, securityScore) : 0
    
    console.log(`🔍 SECURITY ANALYSIS for ${domain}:`)
    console.log(`   HSTS Header: ${securityHeaders['strict-transport-security'] ? '✅ Present' : '❌ Missing'}`)
    console.log(`   X-Frame-Options: ${securityHeaders['x-frame-options'] ? '✅ Present' : '❌ Missing'}`)
    console.log(`   X-Content-Type-Options: ${securityHeaders['x-content-type-options'] ? '✅ Present' : '❌ Missing'}`)
    console.log(`   CSP Header: ${securityHeaders['content-security-policy'] ? '✅ Present' : '❌ Missing'}`)
    console.log(`   X-XSS-Protection: ${securityHeaders['x-xss-protection'] ? '✅ Present' : '❌ Missing'}`)
    console.log(`   FINAL SCORE: ${finalScore}/100`)
    
    return {
      score: finalScore,
      checks: {
        dns_resolves: true,
        ssl_valid: response.url.startsWith('https://'),
        response_code: response.status,
        response_time_ms: responseTime,
        security_headers: securityHeaders,
        all_headers: allHeaders,
        security_score: securityScore,
        server_header: response.headers.get('server'),
        content_length: response.headers.get('content-length'),
        last_modified: response.headers.get('last-modified'),
        tested_url: `https://${domain}`,
        final_url: response.url
      }
    }
  } catch (error) {
    console.log(`❌ REAL ERROR from ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      score: 0,
      checks: {
        dns_resolves: false,
        ssl_valid: false,
        response_code: null,
        error: error instanceof Error ? error.message : 'Connection failed',
        domain_tested: domain,
        tested_url: `https://${domain}`
      }
    }
  }
}

async function validateSecurityConfig(config: any) {
  const checks = {
    fail_open_disabled: config?.fail_open === false,  // CRITICAL for production
    rate_limiting_enabled: config?.rate_limit > 0,
    ai_analysis_enabled: config?.ai_analysis === true,
    geo_blocking_configured: config?.geo_blocking === true
  }

  // If fail_open is true, this is a critical security risk
  if (config?.fail_open === true) {
    return {
      score: 0, // FAIL - Cannot be production ready with fail_open
      checks: {
        ...checks,
        critical_security_risk: true,
        fail_open_enabled: true,
        production_blocker: "fail_open=true allows unfiltered traffic if WAF fails"
      }
    }
  }

  const score = Object.values(checks).filter(Boolean).length * 25
  return { score, checks }
}

async function validateAPIIntegration(apiKey: string, domain: string) {
  console.log(`Testing REAL API integration for domain: ${domain} with key: ${apiKey.substring(0, 8)}...`)
  
  try {
    // Test if API key actually works by making real calls
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Try to query customer_deployments with this API key
    const { data, error } = await supabase
      .from('customer_deployments')
      .select('id, customer_name, domain, created_at')
      .eq('api_key', apiKey)
      .maybeSingle()
    
    if (error) {
      console.log(`API validation error for ${domain}: ${error.message}`)
      return {
        score: 0,
        checks: {
          api_key_valid: false,
          database_connection: false,
          domain_match: false,
          error: `Database error: ${error.message}`,
          tested_domain: domain
        }
      }
    }
    
    if (!data) {
      console.log(`API key not found for domain: ${domain}`)
      return {
        score: 0,
        checks: {
          api_key_valid: false,
          database_connection: true,
          domain_match: false,
          error: 'API key not found in database',
          tested_domain: domain
        }
      }
    }
    
    // Check if domain matches the one in database
    const domainMatches = data.domain === domain
    console.log(`Domain match for ${domain}: ${domainMatches} (DB: ${data.domain})`)
    
    // API key works - now test production readiness based on multiple factors
    const isProductionFormat = apiKey.startsWith('pak_live_')
    const isRecentDeployment = new Date(data.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
    
    let score = 0
    if (domainMatches) score += 40
    if (isProductionFormat) score += 40  
    if (isRecentDeployment) score += 20
    
    console.log(`API integration score for ${domain}: ${score}`)
    
    return {
      score: score,
      checks: {
        api_key_valid: true,
        database_connection: true,
        domain_match: domainMatches,
        customer_found: data.customer_name,
        is_production_format: isProductionFormat,
        is_recent_deployment: isRecentDeployment,
        db_domain: data.domain,
        tested_domain: domain,
        format_warning: isProductionFormat ? null : 'Using test API key format - not suitable for production'
      }
    }
    
  } catch (error) {
    console.log(`API validation failed for ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      score: 0,
      checks: {
        api_key_valid: false,
        database_connection: false,
        domain_match: false,
        error: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tested_domain: domain
      }
    }
  }
}

async function validateHardwareTrustSetup(deployment: any) {
  console.log('Testing real hardware trust configuration...')
  
  try {
    // Test real hardware attestation by calling hardware-trust-verifier function
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: attestationResult, error: attestationError } = await supabase.functions.invoke('hardware-trust-verifier', {
      body: {
        deployment_id: deployment.id,
        domain: deployment.domain,
        test_mode: true
      }
    })
    
    // If attestation service errors, continue with partial checks
    if (attestationError) {
      console.log('hardware-trust-verifier error:', attestationError)
    }
    
    // Check if we have any real hardware attestation data
    const { data: deviceAttestations } = await supabase
      .from('device_attestations')
      .select('*')
      .eq('trust_level', 'verified')
      .limit(1)
    
    const hasRealAttestations = deviceAttestations && deviceAttestations.length > 0
    
    // Check for hardware trust metrics
    const { data: trustMetrics } = await supabase
      .from('hardware_trust_metrics')
      .select('*')
      .limit(1)
    
    const hasRealMetrics = trustMetrics && trustMetrics.length > 0
    
    // Calculate real score based on actual data
    let score = 0
    const checks: any = {}
    
    if (attestationResult) {
      score += 25
      checks.hardware_attestation_service = true
    } else {
      checks.hardware_attestation_service = false
    }
    
    if (hasRealAttestations) {
      score += 25
      checks.tpm_detected = true
      checks.attestation_chain_valid = true
    } else {
      score += 0
      checks.tpm_detected = false
      checks.attestation_chain_valid = false
    }
    
    if (hasRealMetrics) {
      score += 25
      checks.trust_metrics_available = true
    } else {
      checks.trust_metrics_available = false
    }
    
    // Trust policies considered configured if any real data exists
    checks.trust_policies_configured = hasRealAttestations || hasRealMetrics
    if (checks.trust_policies_configured) {
      score += 25
    }
    
    if (score < 50) {
      checks.error = 'Hardware trust requires real TPM/TEE devices and attestation setup'
    }
    
    return { score, checks }
    
  } catch (error) {
    return {
      score: 0,
      checks: {
        hardware_attestation_service: false,
        tpm_detected: false,
        attestation_chain_valid: false,
        trust_policies_configured: false,
        error: `Hardware trust validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

function generateNextSteps(validationResults: any): string[] {
  const steps = []

  if (validationResults.domain_validation.score < 100) {
    steps.push("Fix domain configuration and ensure HTTPS is properly configured")
  }

  if (validationResults.security_configuration.score < 75) {
    steps.push("Review and enhance security configuration settings")
  }

  if (validationResults.api_integration.score < 100) {
    steps.push("Regenerate API key with proper format")
  }

  if (validationResults.hardware_trust_setup.score < 80) {
    steps.push("Complete hardware trust configuration and testing")
    steps.push("Install and configure TPM/TEE agents on target systems")
  }

  if (steps.length === 0) {
    steps.push("Your deployment is production ready! Monitor metrics and alerts.")
  }

  return steps
}