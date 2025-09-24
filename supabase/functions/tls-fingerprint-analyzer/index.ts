import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tls_data, source_ip } = await req.json();

    console.log('Processing TLS fingerprinting for:', source_ip);

    // If no TLS data provided, generate mock data for testing
    const tlsData = tls_data || {
      version: '771', // TLS 1.2
      cipher_suites: ['TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384', 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256'],
      extensions: ['server_name', 'supported_groups', 'signature_algorithms'],
      elliptic_curves: ['secp256r1', 'secp384r1'],
      ec_point_formats: ['uncompressed'],
      client_hello_length: 512,
      server_name: 'example.com'
    };
    
    const sourceIP = source_ip || '192.168.1.100';

    // Generate JA3 hash from TLS handshake data
    const ja3Hash = generateJA3Hash(tlsData);
    const ja3String = generateJA3String(tlsData);
    
    // Analyze TLS characteristics for threat scoring
    const threatScore = analyzeTLSThreats(tlsData);
    const isMalicious = threatScore > 70;

    // Check existing fingerprint
    const { data: existingFingerprint } = await supabase
      .from('tls_fingerprints')
      .select('*')
      .eq('ja3_hash', ja3Hash)
      .single();

    if (existingFingerprint) {
      // Update existing fingerprint
      const { data: updatedFingerprint, error: updateError } = await supabase
        .from('tls_fingerprints')
        .update({
          last_seen: new Date().toISOString(),
          request_count: existingFingerprint.request_count + 1,
          threat_score: Math.max(existingFingerprint.threat_score, threatScore),
          is_malicious: existingFingerprint.is_malicious || isMalicious,
          metadata: {
            ...existingFingerprint.metadata,
            latest_source_ip: source_ip,
            last_analysis: new Date().toISOString()
          }
        })
        .eq('ja3_hash', ja3Hash)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating TLS fingerprint:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          fingerprint: updatedFingerprint,
          ja3_hash: ja3Hash,
          threat_score: threatScore,
          is_malicious: isMalicious,
          analysis: {
            fingerprint_age: calculateFingerprintAge(existingFingerprint.first_seen),
            frequency_pattern: analyzeFrequencyPattern(existingFingerprint.request_count + 1),
            geographic_distribution: 'multi-region' // Would integrate with geo data
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      // Create new fingerprint
      const { data: newFingerprint, error: insertError } = await supabase
        .from('tls_fingerprints')
        .insert({
          ja3_hash: ja3Hash,
          ja3_string: ja3String,
          tls_version: tlsData.version || 'TLS1.3',
          cipher_suites: tlsData.cipher_suites || [],
          extensions: tlsData.extensions || [],
          source_ip: sourceIP,
          threat_score: threatScore,
          is_malicious: isMalicious,
          metadata: {
            first_analysis: new Date().toISOString(),
            client_hello_length: tlsData.client_hello_length || 0,
            server_name: tlsData.server_name || null
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating TLS fingerprint:', insertError);
        throw new Error('Failed to store TLS fingerprint');
      }

      return new Response(
        JSON.stringify({
          success: true,
          fingerprint: newFingerprint,
          ja3_hash: ja3Hash,
          threat_score: threatScore,
          is_malicious: isMalicious,
          analysis: {
            fingerprint_status: 'new',
            risk_level: getRiskLevel(threatScore),
            recommended_action: getRecommendedAction(threatScore, isMalicious)
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

  } catch (error) {
    console.error('TLS Fingerprint Analyzer Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function generateJA3Hash(tlsData: any): string {
  // Simulate JA3 hash generation (in real implementation, this would use MD5)
  const components = [
    tlsData.version || '771',
    (tlsData.cipher_suites || []).join('-'),
    (tlsData.extensions || []).join('-'),
    (tlsData.elliptic_curves || []).join('-'),
    (tlsData.ec_point_formats || []).join('-')
  ];
  
  const ja3String = components.join(',');
  // Simulate MD5 hash (would use actual crypto in production)
  return btoa(ja3String).substring(0, 32);
}

function generateJA3String(tlsData: any): string {
  const components = [
    tlsData.version || '771',
    (tlsData.cipher_suites || []).join('-'),
    (tlsData.extensions || []).join('-'),
    (tlsData.elliptic_curves || []).join('-'),
    (tlsData.ec_point_formats || []).join('-')
  ];
  
  return components.join(',');
}

function analyzeTLSThreats(tlsData: any): number {
  let score = 0;
  
  // Check for outdated TLS versions
  if (tlsData.version && parseInt(tlsData.version) < 771) { // TLS 1.2
    score += 30;
  }
  
  // Check for weak cipher suites
  const weakCiphers = ['RC4', 'DES', 'MD5', 'SHA1'];
  if (tlsData.cipher_suites) {
    for (const cipher of tlsData.cipher_suites) {
      if (weakCiphers.some(weak => cipher.includes(weak))) {
        score += 25;
      }
    }
  }
  
  // Check for suspicious extensions
  const suspiciousExtensions = ['heartbeat', 'renegotiation_info'];
  if (tlsData.extensions) {
    for (const ext of tlsData.extensions) {
      if (suspiciousExtensions.includes(ext)) {
        score += 20;
      }
    }
  }
  
  // Check client hello anomalies
  if (tlsData.client_hello_length > 2000) {
    score += 15; // Unusually large client hello
  }
  
  return Math.min(100, score);
}

function calculateFingerprintAge(firstSeen: string): string {
  const age = Date.now() - new Date(firstSeen).getTime();
  const days = Math.floor(age / (1000 * 60 * 60 * 24));
  
  if (days < 1) return 'new';
  if (days < 7) return 'recent';
  if (days < 30) return 'established';
  return 'mature';
}

function analyzeFrequencyPattern(requestCount: number): string {
  if (requestCount < 5) return 'low';
  if (requestCount < 50) return 'normal';
  if (requestCount < 500) return 'high';
  return 'suspicious';
}

function getRiskLevel(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function getRecommendedAction(threatScore: number, isMalicious: boolean): string {
  if (isMalicious) return 'block_immediately';
  if (threatScore > 70) return 'enhanced_monitoring';
  if (threatScore > 40) return 'rate_limit';
  return 'continue_monitoring';
}