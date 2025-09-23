import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MITRE ATT&CK framework mappings
const MITRE_TACTICS = {
  'reconnaissance': 'TA0043',
  'resource_development': 'TA0042',
  'initial_access': 'TA0001',
  'execution': 'TA0002',
  'persistence': 'TA0003',
  'privilege_escalation': 'TA0004',
  'defense_evasion': 'TA0005',
  'credential_access': 'TA0006',
  'discovery': 'TA0007',
  'lateral_movement': 'TA0008',
  'collection': 'TA0009',
  'command_and_control': 'TA0011',
  'exfiltration': 'TA0010',
  'impact': 'TA0040'
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

    const { honeypot_interaction_id, attack_data } = await req.json();

    console.log('Processing TTP pattern collection for interaction:', honeypot_interaction_id);

    // Analyze attack for MITRE ATT&CK patterns
    const ttpAnalysis = await analyzeTTPPatterns(attack_data);
    
    // Extract tools and techniques
    const detectedTools = identifyAttackTools(attack_data);
    
    // Build attack timeline
    const attackTimeline = constructAttackTimeline(attack_data);
    
    // Calculate confidence score
    const confidenceScore = calculateTTPConfidence(ttpAnalysis, detectedTools, attackTimeline);

    // Store TTP pattern
    const { data: ttpPattern, error: insertError } = await supabase
      .from('attack_ttp_patterns')
      .insert({
        honeypot_interaction_id,
        mitre_tactic: ttpAnalysis.primary_tactic,
        mitre_technique: ttpAnalysis.primary_technique,
        technique_id: ttpAnalysis.technique_id,
        attack_pattern: ttpAnalysis.pattern_details,
        payload_analysis: ttpAnalysis.payload_analysis,
        behavioral_signature: ttpAnalysis.behavioral_signature,
        persistence_methods: ttpAnalysis.persistence_methods,
        lateral_movement: ttpAnalysis.lateral_movement,
        data_exfiltration: ttpAnalysis.data_exfiltration,
        detected_tools: detectedTools,
        attack_timeline: attackTimeline,
        confidence_score: confidenceScore,
        severity_level: determineSeverityLevel(ttpAnalysis, detectedTools)
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing TTP pattern:', insertError);
      throw new Error('Failed to store TTP analysis');
    }

    // Generate threat intelligence
    const threatIntelligence = await generateThreatIntelligence(ttpPattern, supabase);
    
    // Update honeypot effectiveness based on TTP collection
    await updateHoneypotEffectiveness(honeypot_interaction_id, ttpAnalysis, supabase);

    console.log('TTP pattern collection completed:', {
      technique_id: ttpAnalysis.technique_id,
      confidence_score: confidenceScore,
      detected_tools: detectedTools.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        ttp_analysis: {
          id: ttpPattern.id,
          mitre_mapping: {
            tactic: ttpAnalysis.primary_tactic,
            technique: ttpAnalysis.primary_technique,
            technique_id: ttpAnalysis.technique_id
          },
          attack_classification: {
            sophistication_level: classifyAttackSophistication(ttpAnalysis, detectedTools),
            automation_level: determineAutomationLevel(attackTimeline),
            threat_actor_profile: generateThreatActorProfile(ttpAnalysis, detectedTools)
          },
          behavioral_analysis: {
            signature: ttpAnalysis.behavioral_signature,
            patterns: ttpAnalysis.pattern_details,
            timeline: attackTimeline
          },
          tools_and_techniques: {
            detected_tools: detectedTools,
            techniques_used: extractTechniquesUsed(ttpAnalysis),
            persistence_methods: ttpAnalysis.persistence_methods,
            evasion_techniques: identifyEvasionTechniques(attack_data)
          },
          confidence_assessment: {
            overall_confidence: confidenceScore,
            evidence_strength: assessEvidenceStrength(attack_data),
            attribution_confidence: calculateAttributionConfidence(ttpAnalysis)
          }
        },
        threat_intelligence: threatIntelligence,
        defensive_recommendations: generateDefensiveRecommendations(ttpAnalysis, detectedTools)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('TTP Pattern Collector Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function analyzeTTPPatterns(attackData: any) {
  const patterns = {
    primary_tactic: 'reconnaissance',
    primary_technique: 'Active Scanning',
    technique_id: 'T1595',
    pattern_details: {},
    payload_analysis: {},
    behavioral_signature: {},
    persistence_methods: null,
    lateral_movement: null,
    data_exfiltration: null
  };

  // Analyze request patterns for MITRE mapping
  if (attackData.request_path) {
    const path = attackData.request_path.toLowerCase();
    
    // Initial Access patterns
    if (path.includes('/admin') || path.includes('/login')) {
      patterns.primary_tactic = 'initial_access';
      patterns.primary_technique = 'Valid Accounts';
      patterns.technique_id = 'T1078';
    }
    
    // Discovery patterns
    if (path.includes('/.env') || path.includes('/config') || path.includes('/.git')) {
      patterns.primary_tactic = 'discovery';
      patterns.primary_technique = 'System Information Discovery';
      patterns.technique_id = 'T1082';
    }
    
    // Credential Access patterns
    if (path.includes('/.ssh') || path.includes('/passwd') || path.includes('/shadow')) {
      patterns.primary_tactic = 'credential_access';
      patterns.primary_technique = 'Unsecured Credentials';
      patterns.technique_id = 'T1552';
    }
    
    // Collection patterns
    if (path.includes('/backup') || path.includes('/dump') || path.includes('/export')) {
      patterns.primary_tactic = 'collection';
      patterns.primary_technique = 'Data from Information Repositories';
      patterns.technique_id = 'T1213';
    }
  }

  // Analyze payload for techniques
  if (attackData.payload) {
    const payload = attackData.payload.toLowerCase();
    
    // SQL Injection
    if (payload.includes('union') || payload.includes('select') || payload.includes('drop')) {
      patterns.primary_tactic = 'initial_access';
      patterns.primary_technique = 'Exploit Public-Facing Application';
      patterns.technique_id = 'T1190';
      patterns.payload_analysis.sql_injection = true;
    }
    
    // Command Injection
    if (payload.includes('bash') || payload.includes('cmd') || payload.includes('powershell')) {
      patterns.primary_tactic = 'execution';
      patterns.primary_technique = 'Command and Scripting Interpreter';
      patterns.technique_id = 'T1059';
      patterns.payload_analysis.command_injection = true;
    }
    
    // XSS patterns
    if (payload.includes('<script') || payload.includes('javascript:') || payload.includes('onerror')) {
      patterns.primary_tactic = 'initial_access';
      patterns.primary_technique = 'Drive-by Compromise';
      patterns.technique_id = 'T1189';
      patterns.payload_analysis.xss_attempt = true;
    }
  }

  // Analyze behavioral patterns
  patterns.behavioral_signature = {
    request_frequency: attackData.request_frequency || 0,
    user_agent_pattern: analyzeUserAgent(attackData.user_agent),
    geographic_source: attackData.source_country || 'unknown',
    time_pattern: analyzeTimePattern(attackData.timestamp),
    session_characteristics: analyzeSessionCharacteristics(attackData)
  };

  // Check for persistence indicators
  if (attackData.payload && (
    attackData.payload.includes('crontab') ||
    attackData.payload.includes('systemd') ||
    attackData.payload.includes('registry')
  )) {
    patterns.persistence_methods = {
      technique: 'Scheduled Task/Job',
      technique_id: 'T1053',
      indicators: extractPersistenceIndicators(attackData.payload)
    };
  }

  // Check for lateral movement indicators
  if (attackData.payload && (
    attackData.payload.includes('ssh') ||
    attackData.payload.includes('rdp') ||
    attackData.payload.includes('smb')
  )) {
    patterns.lateral_movement = {
      technique: 'Remote Services',
      technique_id: 'T1021',
      protocols: extractLateralMovementProtocols(attackData.payload)
    };
  }

  // Check for data exfiltration indicators
  if (attackData.request_size > 1000000 || // Large requests
      (attackData.payload && attackData.payload.includes('wget')) ||
      (attackData.payload && attackData.payload.includes('curl'))) {
    patterns.data_exfiltration = {
      technique: 'Exfiltration Over Web Service',
      technique_id: 'T1567',
      methods: extractExfiltrationMethods(attackData)
    };
  }

  patterns.pattern_details = {
    attack_vector: determineAttackVector(attackData),
    complexity_level: assessComplexityLevel(attackData),
    automation_indicators: identifyAutomationIndicators(attackData),
    evasion_techniques: identifyEvasionTechniques(attackData)
  };

  return patterns;
}

function identifyAttackTools(attackData: any): string[] {
  const tools = [];
  
  if (attackData.user_agent) {
    const ua = attackData.user_agent.toLowerCase();
    
    // Common attack tools
    const toolSignatures = {
      'nmap': 'nmap',
      'sqlmap': 'sqlmap',
      'burp': 'burp suite',
      'nikto': 'nikto',
      'dirb': 'dirb',
      'gobuster': 'gobuster',
      'python-requests': 'python scripts',
      'curl': 'curl',
      'wget': 'wget',
      'masscan': 'masscan',
      'zap': 'owasp zap'
    };
    
    Object.entries(toolSignatures).forEach(([signature, tool]) => {
      if (ua.includes(signature)) {
        tools.push(tool);
      }
    });
  }
  
  if (attackData.payload) {
    const payload = attackData.payload.toLowerCase();
    
    // Payload-based tool detection
    if (payload.includes('metasploit') || payload.includes('meterpreter')) {
      tools.push('metasploit');
    }
    if (payload.includes('cobalt') || payload.includes('beacon')) {
      tools.push('cobalt strike');
    }
    if (payload.includes('empire') || payload.includes('powershell empire')) {
      tools.push('powershell empire');
    }
  }
  
  return tools;
}

function constructAttackTimeline(attackData: any) {
  const timeline = {
    start_time: attackData.timestamp || new Date().toISOString(),
    phases: [],
    duration: 0,
    event_count: 1
  };
  
  // Phase 1: Initial contact
  timeline.phases.push({
    phase: 'initial_contact',
    timestamp: attackData.timestamp || new Date().toISOString(),
    description: 'Initial request to honeypot',
    mitre_tactic: 'reconnaissance',
    details: {
      source_ip: attackData.source_ip,
      user_agent: attackData.user_agent,
      request_path: attackData.request_path
    }
  });
  
  // Phase 2: Probe/scan
  if (attackData.request_path && (
    attackData.request_path.includes('admin') ||
    attackData.request_path.includes('.env') ||
    attackData.request_path.includes('config')
  )) {
    timeline.phases.push({
      phase: 'active_scanning',
      timestamp: new Date(Date.now() + 1000).toISOString(),
      description: 'Active scanning for vulnerabilities',
      mitre_tactic: 'reconnaissance',
      mitre_technique: 'T1595'
    });
  }
  
  // Phase 3: Exploitation attempt
  if (attackData.payload) {
    timeline.phases.push({
      phase: 'exploitation_attempt',
      timestamp: new Date(Date.now() + 2000).toISOString(),
      description: 'Attempt to exploit discovered service',
      mitre_tactic: 'initial_access',
      mitre_technique: 'T1190',
      payload_sample: attackData.payload.substring(0, 100)
    });
  }
  
  return timeline;
}

function calculateTTPConfidence(ttpAnalysis: any, detectedTools: string[], attackTimeline: any): number {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence based on clear MITRE technique mapping
  if (ttpAnalysis.technique_id && ttpAnalysis.technique_id !== 'T1595') {
    confidence += 0.2;
  }
  
  // Increase confidence based on detected tools
  confidence += Math.min(0.3, detectedTools.length * 0.1);
  
  // Increase confidence based on payload analysis
  if (ttpAnalysis.payload_analysis && Object.keys(ttpAnalysis.payload_analysis).length > 0) {
    confidence += 0.15;
  }
  
  // Increase confidence based on timeline complexity
  if (attackTimeline.phases.length > 2) {
    confidence += 0.1;
  }
  
  // Increase confidence for persistence or lateral movement indicators
  if (ttpAnalysis.persistence_methods || ttpAnalysis.lateral_movement) {
    confidence += 0.15;
  }
  
  return Math.min(1.0, confidence);
}

function determineSeverityLevel(ttpAnalysis: any, detectedTools: string[]): string {
  let severityScore = 0;
  
  // High severity tactics
  const highSeverityTactics = ['initial_access', 'credential_access', 'lateral_movement', 'exfiltration'];
  if (highSeverityTactics.includes(ttpAnalysis.primary_tactic)) {
    severityScore += 3;
  }
  
  // Tool-based severity
  const advancedTools = ['metasploit', 'cobalt strike', 'powershell empire'];
  const detectedAdvancedTools = detectedTools.filter(tool => advancedTools.includes(tool));
  severityScore += detectedAdvancedTools.length * 2;
  
  // Persistence or lateral movement
  if (ttpAnalysis.persistence_methods || ttpAnalysis.lateral_movement) {
    severityScore += 2;
  }
  
  if (severityScore >= 5) return 'critical';
  if (severityScore >= 3) return 'high';
  if (severityScore >= 1) return 'medium';
  return 'low';
}

async function generateThreatIntelligence(ttpPattern: any, supabase: any) {
  try {
    // Find similar TTP patterns
    const { data: similarPatterns } = await supabase
      .from('attack_ttp_patterns')
      .select('*')
      .eq('technique_id', ttpPattern.technique_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    return {
      technique_frequency: similarPatterns?.length || 0,
      first_seen: ttpPattern.created_at,
      threat_actor_correlation: analyzeThreatActorCorrelation(ttpPattern),
      campaign_indicators: identifyCampaignIndicators(ttpPattern, similarPatterns || []),
      ioc_extraction: extractIOCs(ttpPattern),
      defensive_gaps: identifyDefensiveGaps(ttpPattern)
    };
  } catch (error) {
    console.error('Error generating threat intelligence:', error);
    return { technique_frequency: 0 };
  }
}

async function updateHoneypotEffectiveness(honeypotInteractionId: string, ttpAnalysis: any, supabase: any) {
  try {
    // Get honeypot interaction details
    const { data: interaction } = await supabase
      .from('honeypot_interactions')
      .select('honeypot_id')
      .eq('id', honeypotInteractionId)
      .single();

    if (interaction) {
      // Calculate effectiveness bonus based on TTP richness
      let effectivenessBonus = 0.05; // Base bonus
      
      if (ttpAnalysis.persistence_methods) effectivenessBonus += 0.1;
      if (ttpAnalysis.lateral_movement) effectivenessBonus += 0.1;
      if (ttpAnalysis.data_exfiltration) effectivenessBonus += 0.1;
      
      // Update dynamic honeypot effectiveness
      await supabase
        .from('dynamic_honeypots')
        .update({
          effectiveness_score: supabase.raw(`LEAST(1.0, effectiveness_score + ${effectivenessBonus})`),
          interaction_count: supabase.raw('interaction_count + 1'),
          last_interaction: new Date().toISOString()
        })
        .eq('honeypot_id', interaction.honeypot_id);
    }
  } catch (error) {
    console.error('Error updating honeypot effectiveness:', error);
  }
}

// Helper functions for analysis

function analyzeUserAgent(userAgent: string): any {
  if (!userAgent) return { type: 'unknown', suspicious: false };
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    return { type: 'bot', suspicious: false };
  }
  
  if (ua.includes('python') || ua.includes('curl') || ua.includes('wget')) {
    return { type: 'automated_tool', suspicious: true };
  }
  
  if (ua.includes('nmap') || ua.includes('masscan') || ua.includes('zmap')) {
    return { type: 'scanner', suspicious: true };
  }
  
  return { type: 'browser', suspicious: false };
}

function analyzeTimePattern(timestamp: string): any {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  
  return {
    hour_of_day: hour,
    day_of_week: dayOfWeek,
    is_business_hours: hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5,
    timezone: date.getTimezoneOffset()
  };
}

function analyzeSessionCharacteristics(attackData: any): any {
  return {
    request_method: attackData.request_method || 'GET',
    request_size: attackData.request_size || 0,
    has_payload: !!attackData.payload,
    payload_size: attackData.payload ? attackData.payload.length : 0,
    headers_count: attackData.request_headers ? Object.keys(attackData.request_headers).length : 0
  };
}

function extractPersistenceIndicators(payload: string): string[] {
  const indicators = [];
  
  if (payload.includes('crontab')) indicators.push('cron_job');
  if (payload.includes('systemd')) indicators.push('systemd_service');
  if (payload.includes('.bashrc') || payload.includes('.profile')) indicators.push('shell_startup');
  if (payload.includes('autostart')) indicators.push('autostart_entry');
  
  return indicators;
}

function extractLateralMovementProtocols(payload: string): string[] {
  const protocols = [];
  
  if (payload.includes('ssh')) protocols.push('ssh');
  if (payload.includes('rdp')) protocols.push('rdp');
  if (payload.includes('smb')) protocols.push('smb');
  if (payload.includes('winrm')) protocols.push('winrm');
  
  return protocols;
}

function extractExfiltrationMethods(attackData: any): string[] {
  const methods = [];
  
  if (attackData.payload && attackData.payload.includes('wget')) methods.push('http_download');
  if (attackData.payload && attackData.payload.includes('curl')) methods.push('http_upload');
  if (attackData.request_size > 1000000) methods.push('large_data_transfer');
  
  return methods;
}

function determineAttackVector(attackData: any): string {
  if (attackData.request_path && attackData.request_path.includes('admin')) {
    return 'web_application';
  }
  if (attackData.payload && attackData.payload.includes('ssh')) {
    return 'remote_service';
  }
  return 'network_service';
}

function assessComplexityLevel(attackData: any): string {
  let complexity = 0;
  
  if (attackData.payload && attackData.payload.length > 1000) complexity++;
  if (attackData.request_headers && Object.keys(attackData.request_headers).length > 10) complexity++;
  if (attackData.user_agent && attackData.user_agent.includes('python')) complexity++;
  
  if (complexity >= 3) return 'high';
  if (complexity === 2) return 'medium';
  return 'low';
}

function identifyAutomationIndicators(attackData: any): string[] {
  const indicators = [];
  
  if (attackData.user_agent && (
    attackData.user_agent.includes('python') ||
    attackData.user_agent.includes('curl') ||
    attackData.user_agent.includes('bot')
  )) {
    indicators.push('automated_user_agent');
  }
  
  if (attackData.request_frequency && attackData.request_frequency > 10) {
    indicators.push('high_frequency_requests');
  }
  
  return indicators;
}

function identifyEvasionTechniques(attackData: any): string[] {
  const techniques = [];
  
  if (attackData.user_agent && attackData.user_agent.includes('Mozilla')) {
    techniques.push('user_agent_spoofing');
  }
  
  if (attackData.payload && attackData.payload.includes('base64')) {
    techniques.push('payload_encoding');
  }
  
  return techniques;
}

function classifyAttackSophistication(ttpAnalysis: any, detectedTools: string[]): string {
  let sophisticationScore = 0;
  
  // Advanced tools
  const advancedTools = ['metasploit', 'cobalt strike', 'powershell empire'];
  sophisticationScore += detectedTools.filter(tool => advancedTools.includes(tool)).length * 2;
  
  // Multiple attack phases
  if (ttpAnalysis.persistence_methods) sophisticationScore++;
  if (ttpAnalysis.lateral_movement) sophisticationScore++;
  if (ttpAnalysis.data_exfiltration) sophisticationScore++;
  
  if (sophisticationScore >= 4) return 'advanced';
  if (sophisticationScore >= 2) return 'intermediate';
  return 'basic';
}

function determineAutomationLevel(attackTimeline: any): string {
  if (attackTimeline.phases.length > 3) return 'highly_automated';
  if (attackTimeline.phases.length > 1) return 'partially_automated';
  return 'manual';
}

function generateThreatActorProfile(ttpAnalysis: any, detectedTools: string[]): any {
  return {
    sophistication_level: classifyAttackSophistication(ttpAnalysis, detectedTools),
    preferred_tools: detectedTools,
    attack_patterns: [ttpAnalysis.primary_tactic, ttpAnalysis.primary_technique],
    geographic_indicators: ttpAnalysis.behavioral_signature.geographic_source,
    time_patterns: ttpAnalysis.behavioral_signature.time_pattern
  };
}

function extractTechniquesUsed(ttpAnalysis: any): string[] {
  const techniques = [ttpAnalysis.primary_technique];
  
  if (ttpAnalysis.persistence_methods) {
    techniques.push(ttpAnalysis.persistence_methods.technique);
  }
  
  if (ttpAnalysis.lateral_movement) {
    techniques.push(ttpAnalysis.lateral_movement.technique);
  }
  
  return techniques;
}

function assessEvidenceStrength(attackData: any): string {
  let evidenceScore = 0;
  
  if (attackData.payload && attackData.payload.length > 100) evidenceScore++;
  if (attackData.user_agent) evidenceScore++;
  if (attackData.request_headers) evidenceScore++;
  if (attackData.source_ip) evidenceScore++;
  
  if (evidenceScore >= 4) return 'strong';
  if (evidenceScore >= 2) return 'moderate';
  return 'weak';
}

function calculateAttributionConfidence(ttpAnalysis: any): number {
  let confidence = 0.3; // Base confidence
  
  if (ttpAnalysis.behavioral_signature.user_agent_pattern.suspicious) {
    confidence += 0.2;
  }
  
  if (ttpAnalysis.pattern_details.complexity_level === 'high') {
    confidence += 0.3;
  }
  
  return Math.min(1.0, confidence);
}

function analyzeThreatActorCorrelation(ttpPattern: any): any {
  // This would integrate with threat intelligence feeds in production
  return {
    potential_groups: ['APT-Generic', 'Cybercriminal'],
    confidence: 0.3,
    indicators: ['technique_overlap', 'tool_similarity']
  };
}

function identifyCampaignIndicators(ttpPattern: any, similarPatterns: any[]): any {
  return {
    campaign_correlation: similarPatterns.length > 5 ? 'likely' : 'unlikely',
    pattern_consistency: calculatePatternConsistency(similarPatterns),
    temporal_clustering: analyzeTemporalClustering(similarPatterns)
  };
}

function extractIOCs(ttpPattern: any): any {
  return {
    ip_addresses: [ttpPattern.behavioral_signature?.source_ip || ''].filter(Boolean),
    user_agents: [ttpPattern.behavioral_signature?.user_agent_pattern || ''].filter(Boolean),
    payload_hashes: [], // Would compute hashes in production
    file_paths: extractFilePathIOCs(ttpPattern)
  };
}

function identifyDefensiveGaps(ttpPattern: any): string[] {
  const gaps = [];
  
  if (ttpPattern.primary_tactic === 'initial_access') {
    gaps.push('insufficient_input_validation');
  }
  
  if (ttpPattern.persistence_methods) {
    gaps.push('inadequate_persistence_monitoring');
  }
  
  return gaps;
}

function generateDefensiveRecommendations(ttpAnalysis: any, detectedTools: string[]): string[] {
  const recommendations = [];
  
  // Tactic-specific recommendations
  switch (ttpAnalysis.primary_tactic) {
    case 'initial_access':
      recommendations.push('implement_web_application_firewall');
      recommendations.push('enhance_input_validation');
      break;
    case 'credential_access':
      recommendations.push('implement_credential_monitoring');
      recommendations.push('enforce_mfa');
      break;
    case 'discovery':
      recommendations.push('implement_file_integrity_monitoring');
      recommendations.push('restrict_directory_browsing');
      break;
  }
  
  // Tool-specific recommendations
  if (detectedTools.includes('nmap') || detectedTools.includes('masscan')) {
    recommendations.push('implement_network_segmentation');
    recommendations.push('deploy_intrusion_detection_system');
  }
  
  return recommendations;
}

// Additional helper functions
function calculatePatternConsistency(patterns: any[]): number {
  if (patterns.length < 2) return 0;
  
  // Simplified consistency calculation
  const techniques = patterns.map(p => p.technique_id);
  const uniqueTechniques = new Set(techniques);
  
  return 1 - (uniqueTechniques.size / techniques.length);
}

function analyzeTemporalClustering(patterns: any[]): any {
  if (patterns.length === 0) return { clustered: false };
  
  const timestamps = patterns.map(p => new Date(p.created_at).getTime());
  timestamps.sort();
  
  // Simple clustering analysis
  const intervals = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i] - timestamps[i-1]);
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
  
  return {
    clustered: variance < avgInterval * 0.5,
    avg_interval_hours: avgInterval / (1000 * 60 * 60),
    pattern_regularity: variance < avgInterval * 0.2 ? 'high' : 'low'
  };
}

function extractFilePathIOCs(ttpPattern: any): string[] {
  const paths = [];
  
  if (ttpPattern.attack_pattern?.request_path) {
    paths.push(ttpPattern.attack_pattern.request_path);
  }
  
  return paths;
}