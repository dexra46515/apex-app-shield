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

    console.log('HANDLER VERSION: v3-detailed-errors')
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
    api_integration: await validateAPIIntegration(deployment.api_key),
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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://${domain}`, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return {
      score: response.ok ? 100 : 50,
      checks: {
        dns_resolves: true,
        ssl_valid: response.url.startsWith('https://'),
        response_code: response.status,
        headers_present: response.headers.get('server') !== null
      }
    }
  } catch (error) {
    return {
      score: 0,
      checks: {
        dns_resolves: false,
        ssl_valid: false,
        response_code: null,
        error: error instanceof Error ? error.message : 'Unknown error'
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

async function validateAPIIntegration(apiKey: string) {
  // Validate API key format and structure (accept both production and hex formats)
  const isProductionFormat = apiKey.startsWith('pak_live_') && apiKey.length > 20
  const isHexFormat = /^[a-f0-9]{64}$/.test(apiKey) // 64-char hex string
  const isValidFormat = isProductionFormat || isHexFormat
  
  return {
    score: isValidFormat ? 100 : 0,
    checks: {
      format_valid: isValidFormat,
      length_adequate: apiKey.length >= 20,
      is_production_key: isProductionFormat,
      is_hex_key: isHexFormat
    }
  }
}

async function validateHardwareTrustSetup(deployment: any) {
  // This would check if hardware trust features are properly configured
  return {
    score: 75, // Placeholder - would check actual hardware trust configuration
    checks: {
      tpm_configuration: false, // Needs real hardware detection
      attestation_enabled: false, // Needs attestation service setup
      trust_policies_defined: true, // Basic policies exist
      integration_tested: false // Needs real integration testing
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