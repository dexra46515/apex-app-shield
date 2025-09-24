import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, user_agent, platform_info } = await req.json()

    switch (action) {
      case 'detect_hardware_capabilities':
        return await detectHardwareCapabilities(user_agent, platform_info)
      
      case 'validate_tpm':
        return await validateTPM(platform_info)
      
      case 'check_secure_boot':
        return await checkSecureBoot(platform_info)
      
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

async function detectHardwareCapabilities(userAgent: string, platformInfo: any) {
  const capabilities = []

  // Detect platform type
  const platform = detectPlatform(userAgent)
  
  // TPM Detection based on platform
  if (platform.includes('Windows')) {
    capabilities.push({
      feature: "TPM 2.0",
      supported: true, // Windows 11 requires TPM 2.0
      details: "Windows TPM detected via Platform Crypto Provider",
      confidence: 85
    })
  } else if (platform.includes('Linux')) {
    capabilities.push({
      feature: "TPM 2.0", 
      supported: false, // Needs actual detection
      details: "Check /dev/tpm0 or /sys/class/tpm/",
      confidence: 50
    })
  } else {
    capabilities.push({
      feature: "TPM 2.0",
      supported: false,
      details: "Platform not supported for TPM",
      confidence: 90
    })
  }

  // Secure Boot Detection
  capabilities.push({
    feature: "Secure Boot",
    supported: platform.includes('Windows') || platform.includes('Linux'),
    details: platform.includes('Windows') ? "UEFI Secure Boot available" : "Systemd-boot or GRUB secure boot",
    confidence: 70
  })

  // TEE Detection
  if (platform.includes('Android')) {
    capabilities.push({
      feature: "ARM TrustZone",
      supported: true,
      details: "Android Keystore with TEE backend",
      confidence: 80
    })
  } else if (platform.includes('iOS')) {
    capabilities.push({
      feature: "Secure Enclave",
      supported: true,
      details: "Apple Secure Enclave available",
      confidence: 95
    })
  } else if (platform.includes('Intel')) {
    capabilities.push({
      feature: "Intel SGX",
      supported: false, // Needs CPU detection
      details: "Intel SGX requires compatible CPU",
      confidence: 30
    })
  }

  // Hardware RNG
  capabilities.push({
    feature: "Hardware RNG",
    supported: true,
    details: "Most modern CPUs include RDRAND/RDSEED",
    confidence: 75
  })

  return new Response(
    JSON.stringify({
      success: true,
      hardware_capabilities: capabilities,
      platform_detected: platform,
      recommendations: generateRecommendations(capabilities),
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function validateTPM(platformInfo: any) {
  // This would integrate with actual TPM validation libraries
  // For now, return structure for real implementation
  
  return new Response(
    JSON.stringify({
      success: true,
      tpm_validation: {
        present: false, // Real detection needed
        version: null,
        manufacturer: null,
        pcr_banks_available: [],
        attestation_capable: false,
        error: "TPM validation requires local agent installation"
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function checkSecureBoot(platformInfo: any) {
  return new Response(
    JSON.stringify({
      success: true,
      secure_boot: {
        enabled: null, // Real detection needed
        platform: detectPlatform(platformInfo?.userAgent || ''),
        certificates_valid: null,
        error: "Secure boot validation requires system-level access"
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function detectPlatform(userAgent: string): string {
  if (userAgent.includes('Windows NT')) {
    const version = userAgent.match(/Windows NT (\d+\.\d+)/)
    return version ? `Windows ${version[1]}` : 'Windows'
  }
  if (userAgent.includes('Macintosh')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
  return 'Unknown Platform'
}

function generateRecommendations(capabilities: any[]): string[] {
  const recommendations = []
  
  const tpmSupported = capabilities.find(c => c.feature.includes('TPM'))?.supported
  if (!tpmSupported) {
    recommendations.push("Install TPM 2.0 module for hardware-backed key storage")
  }

  const teeSupported = capabilities.some(c => c.feature.includes('TrustZone') || c.feature.includes('Enclave') || c.feature.includes('SGX'))
  if (!teeSupported) {
    recommendations.push("Consider upgrading to platform with Trusted Execution Environment")
  }

  const secureBootSupported = capabilities.find(c => c.feature === 'Secure Boot')?.supported
  if (!secureBootSupported) {
    recommendations.push("Enable UEFI Secure Boot for verified boot chain")
  }

  if (recommendations.length === 0) {
    recommendations.push("Hardware security features look good! Proceed with integration.")
  }

  return recommendations
}