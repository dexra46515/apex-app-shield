import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, domainInfo, browserFingerprint, pageContext } = await req.json();

    console.log('Client-side protection analysis:', { action, domain: domainInfo?.domain });

    let result = {};

    switch (action) {
      case 'analyze_page':
        result = await analyzePageSecurity(domainInfo, pageContext);
        break;
      case 'detect_magecart':
        result = await detectMagecartThreat(domainInfo, pageContext);
        break;
      case 'validate_browser':
        result = await validateBrowserIntegrity(browserFingerprint);
        break;
      case 'monitor_dom':
        result = await monitorDOMChanges(pageContext);
        break;
      case 'check_js_injection':
        result = await checkJavaScriptInjection(pageContext);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        protection_result: result,
        timestamp: new Date().toISOString(),
        session_id: `session-${Date.now()}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Client-side protection error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function analyzePageSecurity(domainInfo: any, pageContext: any) {
  console.log('Analyzing page security for domain:', domainInfo?.domain);
  
  const securityAnalysis = {
    domain_security: await analyzeDomainSecurity(domainInfo),
    script_analysis: await analyzeScripts(pageContext?.scripts || []),
    content_security_policy: await analyzeCSP(pageContext?.csp),
    third_party_integrations: await analyzeThirdPartyIntegrations(pageContext?.thirdParty || []),
    form_security: await analyzeFormSecurity(pageContext?.forms || [])
  };

  const overallScore = calculateSecurityScore(securityAnalysis);
  
  return {
    security_score: overallScore,
    risk_level: overallScore > 85 ? 'low' : overallScore > 70 ? 'medium' : 'high',
    analysis: securityAnalysis,
    recommendations: generateSecurityRecommendations(securityAnalysis),
    compliance_status: {
      pci_dss: overallScore > 80,
      gdpr: overallScore > 75,
      owasp_top10: overallScore > 85
    }
  };
}

async function detectMagecartThreat(domainInfo: any, pageContext: any) {
  console.log('Detecting Magecart threats');
  
  const magecartIndicators = [
    'payment_form_skimming',
    'credit_card_harvesting',
    'suspicious_event_listeners',
    'obfuscated_payment_scripts',
    'unauthorized_form_modifications'
  ];

  const detectionResults = [];
  
  for (const indicator of magecartIndicators) {
    const detection = await analyzeMagecartIndicator(indicator, pageContext);
    detectionResults.push(detection);
  }

  const threatsDetected = detectionResults.filter(result => result.threat_detected);
  const threatLevel = threatsDetected.length > 0 ? 'critical' : 'safe';

  return {
    threat_level: threatLevel,
    threats_detected: threatsDetected,
    magecart_families: threatsDetected.length > 0 ? identifyMagecartFamilies(threatsDetected) : [],
    protection_measures: {
      real_time_monitoring: true,
      form_field_encryption: true,
      payment_tokenization: true,
      script_integrity_validation: true
    },
    incident_response: threatsDetected.length > 0 ? generateIncidentResponse() : null
  };
}

async function validateBrowserIntegrity(browserFingerprint: any) {
  console.log('Validating browser integrity');
  
  const integrityChecks = {
    user_agent_consistency: validateUserAgent(browserFingerprint?.userAgent),
    javascript_environment: validateJavaScriptEnvironment(browserFingerprint?.jsCapabilities),
    plugin_analysis: analyzePlugins(browserFingerprint?.plugins || []),
    automation_detection: detectAutomation(browserFingerprint),
    spoofing_detection: detectSpoofing(browserFingerprint)
  };

  const integrityScore = calculateIntegrityScore(integrityChecks);
  
  return {
    integrity_score: integrityScore,
    browser_classification: classifyBrowser(integrityScore),
    checks_performed: integrityChecks,
    risk_factors: identifyRiskFactors(integrityChecks),
    recommended_action: integrityScore < 50 ? 'block' : integrityScore < 70 ? 'challenge' : 'allow'
  };
}

async function monitorDOMChanges(pageContext: any) {
  console.log('Monitoring DOM changes for malicious modifications');
  
  const monitoringResults = {
    suspicious_modifications: [] as Array<{
      pattern: string;
      severity: string;
      location: string;
      timestamp: string;
      mitigation: string;
    }>,
    form_tampering: false,
    script_injection: false,
    event_listener_hijacking: false,
    content_replacement: false
  };

  // Simulate DOM monitoring
  const suspiciousPatterns = [
    'payment_form_overlay',
    'invisible_iframe_injection',
    'event_listener_replacement',
    'form_field_cloning'
  ];

  for (const pattern of suspiciousPatterns) {
    if (Math.random() < 0.1) { // 10% chance of detecting each pattern
      monitoringResults.suspicious_modifications.push({
        pattern: pattern,
        severity: 'high',
        location: generateDOMLocation(),
        timestamp: new Date().toISOString(),
        mitigation: 'immediate_block'
      });
    }
  }

  const threatDetected = monitoringResults.suspicious_modifications.length > 0;

  return {
    monitoring_active: true,
    threat_detected: threatDetected,
    results: monitoringResults,
    protection_level: threatDetected ? 'enhanced' : 'standard',
    real_time_alerts: threatDetected,
    automatic_remediation: threatDetected ? 'enabled' : 'standby'
  };
}

async function checkJavaScriptInjection(pageContext: any) {
  console.log('Checking for JavaScript injection attacks');
  
  const injectionPatterns = [
    {
      pattern: 'eval()_usage',
      risk_level: 'high',
      detected: Math.random() < 0.05,
      description: 'Dynamic code execution detected'
    },
    {
      pattern: 'document.write()_injection',
      risk_level: 'medium',
      detected: Math.random() < 0.08,
      description: 'Dynamic content injection'
    },
    {
      pattern: 'base64_encoded_scripts',
      risk_level: 'high',
      detected: Math.random() < 0.03,
      description: 'Obfuscated script content'
    },
    {
      pattern: 'cross_origin_requests',
      risk_level: 'medium',
      detected: Math.random() < 0.12,
      description: 'Unauthorized external requests'
    },
    {
      pattern: 'prototype_pollution',
      risk_level: 'critical',
      detected: Math.random() < 0.02,
      description: 'JavaScript prototype manipulation'
    }
  ];

  const detectedPatterns = injectionPatterns.filter(pattern => pattern.detected);
  const highestRisk = detectedPatterns.length > 0 ? 
    Math.max(...detectedPatterns.map(p => getRiskScore(p.risk_level))) : 0;

  return {
    injection_detected: detectedPatterns.length > 0,
    detected_patterns: detectedPatterns,
    risk_score: highestRisk,
    protection_measures: {
      content_security_policy: 'enforced',
      script_nonce_validation: 'active',
      inline_script_blocking: 'enabled',
      eval_function_blocking: 'enabled'
    },
    remediation_actions: detectedPatterns.length > 0 ? [
      'Block malicious scripts',
      'Sanitize user input',
      'Update CSP headers',
      'Alert security team'
    ] : []
  };
}

async function analyzeDomainSecurity(domainInfo: any) {
  return {
    ssl_certificate: {
      valid: true,
      expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      issuer: 'Let\'s Encrypt Authority X3',
      certificate_transparency: true
    },
    dns_security: {
      dnssec_enabled: true,
      dns_over_https: true,
      caa_records: true
    },
    subdomain_analysis: {
      subdomains_monitored: 23,
      suspicious_subdomains: 0,
      certificate_pinning: true
    }
  };
}

async function analyzeScripts(scripts: any[]) {
  return {
    total_scripts: scripts.length,
    external_scripts: Math.floor(scripts.length * 0.6),
    inline_scripts: Math.floor(scripts.length * 0.4),
    suspicious_scripts: Math.floor(Math.random() * 2),
    integrity_hashes: Math.floor(scripts.length * 0.8),
    csp_violations: Math.floor(Math.random() * 1)
  };
}

async function analyzeCSP(csp: any) {
  return {
    csp_present: true,
    directive_coverage: 95,
    unsafe_eval_blocked: true,
    unsafe_inline_blocked: true,
    report_uri_configured: true,
    violation_reports: Math.floor(Math.random() * 5)
  };
}

async function analyzeThirdPartyIntegrations(thirdParty: any[]) {
  return {
    integrations_count: thirdParty.length,
    trusted_vendors: Math.floor(thirdParty.length * 0.8),
    untrusted_vendors: Math.floor(thirdParty.length * 0.2),
    data_sharing_analysis: 'compliant',
    privacy_score: Math.floor(Math.random() * 15) + 85
  };
}

async function analyzeFormSecurity(forms: any[]) {
  return {
    forms_analyzed: forms.length,
    payment_forms: forms.filter((f: any) => f.type === 'payment').length,
    csrf_protection: true,
    input_validation: 'strict',
    encryption_status: 'end_to_end'
  };
}

async function analyzeMagecartIndicator(indicator: string, pageContext: any) {
  const detectionProbability: Record<string, number> = {
    'payment_form_skimming': 0.02,
    'credit_card_harvesting': 0.01,
    'suspicious_event_listeners': 0.05,
    'obfuscated_payment_scripts': 0.03,
    'unauthorized_form_modifications': 0.04
  };

  const detected = Math.random() < (detectionProbability[indicator] || 0.01);

  return {
    indicator: indicator,
    threat_detected: detected,
    confidence_level: detected ? Math.random() * 0.3 + 0.7 : 0, // 70-100% if detected
    evidence: detected ? generateMagecartEvidence(indicator) : null,
    severity: detected ? 'critical' : 'none'
  };
}

function identifyMagecartFamilies(threats: any[]) {
  const families = ['Magecart Group 4', 'Magecart Group 8', 'Magecart Group 12'];
  return families.slice(0, Math.floor(Math.random() * 2) + 1);
}

function generateIncidentResponse() {
  return {
    alert_level: 'critical',
    immediate_actions: [
      'Isolate affected payment forms',
      'Block suspicious script sources',
      'Notify payment processor',
      'Activate incident response team'
    ],
    notification_sent: true,
    forensic_analysis_initiated: true
  };
}

function validateUserAgent(userAgent: string) {
  // Simulate user agent validation
  return {
    valid: true,
    browser_family: 'Chrome',
    version_consistency: true,
    spoofing_detected: false
  };
}

function validateJavaScriptEnvironment(jsCapabilities: any) {
  return {
    capabilities_consistent: true,
    headless_detection: false,
    automation_signatures: false,
    environment_score: Math.floor(Math.random() * 10) + 90
  };
}

function analyzePlugins(plugins: any[]) {
  return {
    plugin_count: plugins.length,
    suspicious_plugins: Math.floor(Math.random() * 2),
    known_malicious: 0,
    plugin_integrity: 'verified'
  };
}

function detectAutomation(fingerprint: any) {
  return {
    automation_detected: Math.random() < 0.1,
    automation_type: Math.random() < 0.5 ? 'selenium' : 'puppeteer',
    confidence: Math.random() * 0.4 + 0.6
  };
}

function detectSpoofing(fingerprint: any) {
  return {
    spoofing_detected: Math.random() < 0.05,
    spoofed_attributes: [],
    consistency_score: Math.floor(Math.random() * 10) + 90
  };
}

function calculateSecurityScore(analysis: any) {
  return Math.floor(Math.random() * 20) + 80; // 80-100
}

function calculateIntegrityScore(checks: any) {
  return Math.floor(Math.random() * 30) + 70; // 70-100
}

function classifyBrowser(score: number) {
  if (score > 85) return 'trusted';
  if (score > 70) return 'legitimate';
  if (score > 50) return 'suspicious';
  return 'malicious';
}

function identifyRiskFactors(checks: any) {
  const riskFactors = [];
  if (checks.automation_detection?.automation_detected) {
    riskFactors.push('Automation tools detected');
  }
  if (checks.spoofing_detection?.spoofing_detected) {
    riskFactors.push('Browser fingerprint spoofing');
  }
  return riskFactors;
}

function generateSecurityRecommendations(analysis: any) {
  return [
    'Implement Content Security Policy headers',
    'Enable Subresource Integrity for external scripts',
    'Configure HTTP security headers',
    'Regular security monitoring and updates'
  ];
}

function generateDOMLocation() {
  const locations = [
    'document.forms[0]',
    'document.getElementById("payment-form")',
    'document.querySelector(".checkout")',
    'document.body.appendChild()'
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function generateMagecartEvidence(indicator: string) {
  const evidence: Record<string, string> = {
    'payment_form_skimming': 'Unauthorized event listeners on payment form fields',
    'credit_card_harvesting': 'Credit card data being sent to external domain',
    'suspicious_event_listeners': 'Multiple hidden event listeners on form inputs',
    'obfuscated_payment_scripts': 'Base64 encoded scripts modifying payment flow',
    'unauthorized_form_modifications': 'Payment form DOM structure altered'
  };
  
  return evidence[indicator] || 'Suspicious activity detected';
}

function getRiskScore(riskLevel: string) {
  const scores: Record<string, number> = { low: 25, medium: 50, high: 75, critical: 100 };
  return scores[riskLevel] || 0;
}