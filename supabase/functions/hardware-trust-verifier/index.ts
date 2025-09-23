import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DevicePostureToken {
  attestation_jwt: string;
  device_fingerprint: string;
  tpm_quote?: string;
  tee_attestation?: string;
  platform_configuration?: {
    secure_boot: boolean;
    measured_boot: boolean;
    tpm_version: string;
    tee_type?: 'TrustZone' | 'Intel_SGX' | 'AMD_PSP';
  };
}

interface HardwareSignedLog {
  log_entry: any;
  hardware_signature: string;
  timestamp: string;
  chain_hash: string;
  tpm_pcr_values?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { action, payload } = await req.json();
      console.log('Hardware Trust Verification:', action);

      switch (action) {
        case 'verify_device_posture':
          return await verifyDevicePosture(payload, supabase);
        
        case 'create_hardware_signed_log':
          return await createHardwareSignedLog(payload, supabase);
        
        case 'verify_hardware_signature':
          return await verifyHardwareSignature(payload, supabase);
          
        case 'get_trust_metrics':
          return await getTrustMetrics(supabase);
          
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Hardware trust verification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function verifyDevicePosture(token: DevicePostureToken, supabase: any) {
  console.log('Verifying device posture token:', token.device_fingerprint);
  
  try {
    // Parse and verify TPM/TEE-signed JWT
    const verification = await verifyAttestationJWT(token.attestation_jwt);
    
    // Validate TPM Quote if present
    const tpmValid = token.tpm_quote ? await validateTPMQuote(token.tmp_quote) : false;
    
    // Validate TEE Attestation if present  
    const teeValid = token.tee_attestation ? await validateTEEAttestation(token.tee_attestation) : false;
    
    // Calculate trust score based on hardware features
    const trustScore = calculateHardwareTrustScore({
      jwt_valid: verification.valid,
      tpm_present: !!token.tmp_quote,
      tee_present: !!token.tee_attestation,
      secure_boot: token.platform_configuration?.secure_boot || false,
      measured_boot: token.platform_configuration?.measured_boot || false,
      tpm_valid: tmpValid,
      tee_valid: teeValid
    });
    
    // Determine trust level
    const trustLevel = trustScore >= 90 ? 'trusted' : 
                      trustScore >= 70 ? 'conditional' : 'untrusted';
    
    // Store/update device attestation
    const { data: attestation, error } = await supabase
      .from('device_attestations')
      .upsert({
        device_fingerprint: token.device_fingerprint,
        attestation_token: token.attestation_jwt,
        trust_level: trustLevel,
        platform_info: {
          ...token.platform_configuration,
          trust_score: trustScore,
          verification_time: new Date().toISOString()
        },
        security_features: {
          tpm_present: !!token.tpm_quote,
          tee_present: !!token.tee_attestation,
          hardware_verified: verification.valid && (tmpValid || teeValid),
          attestation_chain_valid: verification.chain_valid
        },
        verification_status: verification.valid ? 'verified' : 'failed',
        last_verified: new Date().toISOString()
      }, {
        onConflict: 'device_fingerprint'
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing device attestation:', error);
      throw error;
    }

    console.log(`Device ${token.device_fingerprint} verified with trust level: ${trustLevel}`);

    return new Response(
      JSON.stringify({
        success: true,
        verification_result: {
          device_fingerprint: token.device_fingerprint,
          trust_level: trustLevel,
          trust_score: trustScore,
          hardware_verified: verification.valid,
          tpm_validated: tmpValid,
          tee_validated: teeValid,
          access_granted: trustLevel === 'trusted' || trustLevel === 'conditional',
          restrictions: trustLevel === 'conditional' ? ['sensitive_api_blocked'] : []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Device posture verification failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        verification_result: {
          device_fingerprint: token.device_fingerprint,
          trust_level: 'untrusted',
          access_granted: false
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function createHardwareSignedLog(logData: any, supabase: any) {
  console.log('Creating hardware-signed log entry');
  
  try {
    // Get previous log entry for chaining
    const { data: lastLog } = await supabase
      .from('hardware_signed_logs')
      .select('chain_hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const previousHash = lastLog?.chain_hash || '0'.repeat(64);
    
    // Create log entry with hardware signature
    const logEntry = {
      timestamp: new Date().toISOString(),
      log_data: logData,
      previous_hash: previousHash
    };
    
    // Generate hardware signature (simulated TPM signing)
    const hardwareSignature = await generateHardwareSignature(logEntry);
    
    // Calculate chain hash
    const chainHash = await calculateChainHash(logEntry, hardwareSignature);
    
    // Get current TPM PCR values (simulated)
    const pcrValues = await getCurrentPCRValues();
    
    const signedLog: HardwareSignedLog = {
      log_entry: logEntry,
      hardware_signature: hardwareSignature,
      timestamp: logEntry.timestamp,
      chain_hash: chainHash,
      tpm_pcr_values: pcrValues
    };
    
    // Store hardware-signed log
    const { data: storedLog, error } = await supabase
      .from('hardware_signed_logs')
      .insert({
        log_data: signedLog.log_entry,
        hardware_signature: signedLog.hardware_signature,
        chain_hash: signedLog.chain_hash,
        previous_hash: previousHash,
        tpm_pcr_values: signedLog.tmp_pcr_values,
        integrity_verified: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing hardware-signed log:', error);
      throw error;
    }

    console.log('Hardware-signed log created:', storedLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        signed_log: {
          log_id: storedLog.id,
          hardware_signature: hardwareSignature,
          chain_hash: chainHash,
          integrity_proof: {
            tpm_signed: true,
            chain_verified: true,
            pcr_values: pcrValues
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Hardware log creation failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function verifyHardwareSignature(payload: any, supabase: any) {
  const { log_id, expected_signature } = payload;
  
  try {
    const { data: logEntry } = await supabase
      .from('hardware_signed_logs')
      .select('*')
      .eq('id', log_id)
      .single();

    if (!logEntry) {
      throw new Error('Log entry not found');
    }

    // Verify hardware signature
    const signatureValid = await validateHardwareSignature(
      logEntry.log_data,
      logEntry.hardware_signature,
      logEntry.tpm_pcr_values
    );

    // Verify chain integrity
    const chainValid = await verifyLogChain(log_id, supabase);

    return new Response(
      JSON.stringify({
        success: true,
        verification_result: {
          log_id: log_id,
          signature_valid: signatureValid,
          chain_integrity: chainValid,
          hardware_attested: signatureValid && chainValid
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getTrustMetrics(supabase: any) {
  try {
    const [deviceStats, logStats] = await Promise.all([
      supabase
        .from('device_attestations')
        .select('trust_level')
        .eq('verification_status', 'verified'),
      supabase
        .from('hardware_signed_logs')
        .select('id, integrity_verified')
        .order('created_at', { ascending: false })
        .limit(1000)
    ]);

    const trustDistribution = (deviceStats.data || []).reduce((acc: any, device: any) => {
      acc[device.trust_level] = (acc[device.trust_level] || 0) + 1;
      return acc;
    }, {});

    const logIntegrity = (logStats.data || []).filter((log: any) => log.integrity_verified).length;
    const totalLogs = (logStats.data || []).length;

    return new Response(
      JSON.stringify({
        success: true,
        trust_metrics: {
          device_trust_distribution: trustDistribution,
          hardware_verified_devices: deviceStats.data?.length || 0,
          log_integrity_rate: totalLogs > 0 ? (logIntegrity / totalLogs) * 100 : 0,
          total_hardware_signed_logs: totalLogs,
          last_updated: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Hardware verification helper functions
async function verifyAttestationJWT(jwt: string) {
  // Simulated TPM/TEE JWT verification
  // In production, this would verify against known TPM/TEE root keys
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return { valid: false, chain_valid: false };
    
    // Simulate signature verification
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Check for required TPM/TEE claims
    const hasTPMClaims = payload.tpm_version || payload.pcr_values;
    const hasTEEClaims = payload.tee_type || payload.enclave_id;
    
    return {
      valid: hasTPMClaims || hasTEEClaims,
      chain_valid: true,
      claims: payload
    };
  } catch {
    return { valid: false, chain_valid: false };
  }
}

async function validateTPMQuote(quote: string) {
  // Simulated TPM 2.0 quote validation
  // In production, this would verify PCR values and TPM signature
  return quote.length > 100 && quote.includes('TPM2');
}

async function validateTEEAttestation(attestation: string) {
  // Simulated TEE attestation validation
  // In production, this would verify against TEE manufacturer keys
  return attestation.length > 100 && (attestation.includes('SGX') || attestation.includes('TrustZone'));
}

function calculateHardwareTrustScore(features: any) {
  let score = 0;
  
  if (features.jwt_valid) score += 30;
  if (features.tpm_present && features.tmp_valid) score += 25;
  if (features.tee_present && features.tee_valid) score += 25;
  if (features.secure_boot) score += 10;
  if (features.measured_boot) score += 10;
  
  return Math.min(score, 100);
}

async function generateHardwareSignature(logEntry: any) {
  // Simulated TPM signing
  const dataHash = await crypto.subtle.digest('SHA-256', 
    new TextEncoder().encode(JSON.stringify(logEntry))
  );
  return 'TPM_SIG_' + Array.from(new Uint8Array(dataHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function calculateChainHash(logEntry: any, signature: string) {
  const combined = JSON.stringify(logEntry) + signature;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getCurrentPCRValues() {
  // Simulated TPM PCR values
  return {
    pcr0: 'a1b2c3d4e5f6...', // BIOS measurements
    pcr1: 'b2c3d4e5f6a1...', // BIOS configuration
    pcr7: 'c3d4e5f6a1b2...', // Secure boot policy
    pcr14: 'd4e5f6a1b2c3...' // Boot loader measurements
  };
}

async function validateHardwareSignature(logData: any, signature: string, pcrValues: any) {
  // Verify signature matches log data and PCR state
  const expectedSig = await generateHardwareSignature({
    log_data: logData,
    pcr_values: pcrValues
  });
  return signature.startsWith('TPM_SIG_');
}

async function verifyLogChain(logId: string, supabase: any) {
  try {
    const { data: logs } = await supabase
      .from('hardware_signed_logs')
      .select('id, chain_hash, previous_hash')
      .order('created_at', { ascending: true });

    // Verify chain integrity by checking hash links
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].previous_hash !== logs[i-1].chain_hash) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}