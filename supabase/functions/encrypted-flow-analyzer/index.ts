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

    const { flow_data, source_ip, destination_ip } = await req.json();

    console.log('Processing encrypted flow analysis for:', source_ip);

    // If no flow data provided, generate mock data for testing
    const flowData = flow_data || {
      packet_sizes: [64, 128, 256, 512, 1024, 256, 128],
      timing_patterns: {
        inter_arrival_times: [10, 15, 12, 18, 20, 14],
        burst_patterns: ['consistent', 'variable'],
        flow_duration: 30000
      },
      protocol: 'TLS',
      direction: 'bidirectional',
      packet_count: 47,
      total_bytes: 12500,
      duration: 30000
    };

    const sourceIP = source_ip || '192.168.1.100';
    const destinationIP = destination_ip || '203.0.113.50';

    // Analyze flow patterns without decrypting
    const flowSignature = generateFlowSignature(flowData);
    const anomalyScore = analyzeFlowAnomalies(flowData);
    const patternType = classifyFlowPattern(flowData);
    const confidenceLevel = calculateConfidenceLevel(flowData, anomalyScore);

    // Store flow pattern analysis
    const { data: flowPattern, error: insertError } = await supabase
      .from('encrypted_flow_patterns')
      .insert({
        flow_signature: flowSignature,
        packet_sizes: flowData.packet_sizes || [],
        timing_patterns: flowData.timing_patterns || {},
        source_ip: sourceIP,
        destination_ip: destinationIP,
        protocol: flowData.protocol || 'TCP',
        flow_direction: flowData.direction || 'bidirectional',
        anomaly_score: anomalyScore,
        pattern_type: patternType,
        confidence_level: confidenceLevel,
        metadata: {
          total_packets: flowData.packet_count || 0,
          total_bytes: flowData.total_bytes || 0,
          session_duration: flowData.duration || 0,
          analysis_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing encrypted flow pattern:', insertError);
      throw new Error('Failed to store flow analysis');
    }

    // Generate threat intelligence from patterns
    const threatIntelligence = await generateThreatIntelligence(flowPattern, supabase);

    console.log('Encrypted flow analysis completed:', {
      signature: flowSignature,
      anomaly_score: anomalyScore,
      pattern_type: patternType
    });

    return new Response(
      JSON.stringify({
        success: true,
        flow_analysis: {
          id: flowPattern.id,
          flow_signature: flowSignature,
          anomaly_score: anomalyScore,
          pattern_type: patternType,
          confidence_level: confidenceLevel,
          threat_indicators: getThreatIndicators(flow_data, anomalyScore),
          behavioral_analysis: analyzeBehavioralPatterns(flow_data),
          recommended_actions: getFlowRecommendations(anomalyScore, patternType)
        },
        threat_intelligence: threatIntelligence
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Encrypted Flow Analyzer Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function generateFlowSignature(flowData: any): string {
  // Create unique signature based on flow characteristics
  const characteristics = [
    flowData.packet_count || 0,
    flowData.average_packet_size || 0,
    flowData.inter_arrival_time || 0,
    flowData.flow_duration || 0,
    flowData.bytes_per_second || 0
  ];
  
  return btoa(characteristics.join('|')).substring(0, 32);
}

function analyzeFlowAnomalies(flowData: any): number {
  let anomalyScore = 0;
  
  // Analyze packet size distribution
  if (flowData.packet_sizes) {
    const sizes = flowData.packet_sizes;
    const avgSize = sizes.reduce((a: number, b: number) => a + b, 0) / sizes.length;
    const variance = sizes.reduce((acc: number, size: number) => acc + Math.pow(size - avgSize, 2), 0) / sizes.length;
    
    // High variance in packet sizes can indicate tunneling or covert channels
    if (variance > 1000) anomalyScore += 25;
  }
  
  // Analyze timing patterns
  if (flowData.timing_patterns) {
    const timing = flowData.timing_patterns;
    
    // Regular intervals might indicate automated traffic
    if (timing.regularity_score > 0.8) anomalyScore += 20;
    
    // Very fast or very slow patterns
    if (timing.average_interval < 10 || timing.average_interval > 10000) {
      anomalyScore += 15;
    }
  }
  
  // Analyze flow characteristics
  if (flowData.total_bytes > 100000000) { // > 100MB
    anomalyScore += 20; // Potential data exfiltration
  }
  
  if (flowData.packet_count > 10000 && flowData.duration < 60) {
    anomalyScore += 30; // High packet rate - potential DDoS
  }
  
  return Math.min(100, anomalyScore);
}

function classifyFlowPattern(flowData: any): string {
  const packetCount = flowData.packet_count || 0;
  const duration = flowData.duration || 0;
  const totalBytes = flowData.total_bytes || 0;
  
  if (packetCount > 1000 && duration < 10) {
    return 'potential_ddos';
  }
  
  if (totalBytes > 50000000 && duration > 300) { // > 50MB over 5 minutes
    return 'data_exfiltration';
  }
  
  if (flowData.timing_patterns?.regularity_score > 0.9) {
    return 'automated_traffic';
  }
  
  if (flowData.packet_sizes?.every((size: number) => size < 100)) {
    return 'covert_channel';
  }
  
  if (packetCount < 10 && totalBytes < 1000) {
    return 'reconnaissance';
  }
  
  return 'normal_traffic';
}

function calculateConfidenceLevel(flowData: any, anomalyScore: number): number {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence with more data points
  if (flowData.packet_count > 100) confidence += 0.2;
  if (flowData.duration > 60) confidence += 0.1;
  
  // Higher confidence with clear anomaly indicators
  if (anomalyScore > 50) confidence += 0.2;
  
  // Lower confidence with insufficient data
  if (flowData.packet_count < 10) confidence -= 0.3;
  
  return Math.max(0.1, Math.min(1.0, confidence));
}

async function generateThreatIntelligence(flowPattern: any, supabase: any) {
  try {
    // Look for similar patterns in the past
    const { data: similarPatterns } = await supabase
      .from('encrypted_flow_patterns')
      .select('*')
      .eq('pattern_type', flowPattern.pattern_type)
      .gte('anomaly_score', 50)
      .limit(10);

    return {
      pattern_frequency: similarPatterns?.length || 0,
      threat_correlation: flowPattern.anomaly_score > 70 ? 'high' : 'medium',
      historical_context: {
        similar_incidents: similarPatterns?.length || 0,
        first_seen: flowPattern.detected_at,
        geographical_spread: 'analyzing...'
      }
    };
  } catch (error) {
    console.error('Error generating threat intelligence:', error);
    return { pattern_frequency: 0, threat_correlation: 'unknown' };
  }
}

function getThreatIndicators(flowData: any, anomalyScore: number): string[] {
  const indicators = [];
  
  if (anomalyScore > 70) indicators.push('high_anomaly_score');
  if (flowData.packet_count > 10000) indicators.push('high_packet_volume');
  if (flowData.total_bytes > 100000000) indicators.push('large_data_transfer');
  if (flowData.timing_patterns?.regularity_score > 0.8) indicators.push('automated_pattern');
  
  return indicators;
}

function analyzeBehavioralPatterns(flowData: any) {
  return {
    communication_pattern: flowData.direction || 'bidirectional',
    data_transfer_pattern: flowData.total_bytes > flowData.packet_count * 1000 ? 'bulk_transfer' : 'interactive',
    timing_behavior: flowData.timing_patterns?.regularity_score > 0.7 ? 'regular' : 'irregular',
    session_characteristics: {
      duration: flowData.duration || 0,
      intensity: flowData.packet_count / (flowData.duration || 1)
    }
  };
}

function getFlowRecommendations(anomalyScore: number, patternType: string): string[] {
  const recommendations = [];
  
  if (anomalyScore > 80) {
    recommendations.push('immediate_investigation', 'block_source_ip');
  } else if (anomalyScore > 60) {
    recommendations.push('enhanced_monitoring', 'rate_limiting');
  }
  
  switch (patternType) {
    case 'potential_ddos':
      recommendations.push('activate_ddos_protection', 'scale_infrastructure');
      break;
    case 'data_exfiltration':
      recommendations.push('investigate_data_access', 'monitor_egress_traffic');
      break;
    case 'covert_channel':
      recommendations.push('deep_packet_inspection', 'network_segmentation');
      break;
  }
  
  return recommendations;
}