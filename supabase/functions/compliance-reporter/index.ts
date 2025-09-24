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

    const { report_type, start_date, end_date, generated_by } = await req.json();

    console.log(`Generating ${report_type} compliance report from ${start_date} to ${end_date}`);

    let report;
    switch (report_type) {
      case 'pci_dss':
        report = await generatePCIDSSReport(supabase, start_date, end_date);
        break;
      case 'gdpr':
        report = await generateGDPRReport(supabase, start_date, end_date);
        break;
      case 'hipaa':
        report = await generateHIPAAReport(supabase, start_date, end_date);
        break;
      case 'sox':
        report = await generateSOXReport(supabase, start_date, end_date);
        break;
      case 'iso_27001':
        report = await generateISO27001Report(supabase, start_date, end_date);
        break;
      default:
        throw new Error(`Unsupported report type: ${report_type}`);
    }

    // Store compliance report
    const { data: reportRecord, error: reportError } = await supabase
      .from('compliance_reports')
      .insert({
        report_type: report_type,
        report_period_start: start_date,
        report_period_end: end_date,
        compliance_score: report.compliance_score,
        findings: report.findings,
        recommendations: report.recommendations,
        report_data: report.detailed_data,
        generated_by: generated_by
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error storing compliance report:', reportError);
      throw reportError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_id: reportRecord.id,
        report: report,
        download_url: `/compliance-reports/${reportRecord.id}/download`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Compliance Reporter Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function generatePCIDSSReport(supabase: any, startDate: string, endDate: string) {
  const findings = [];
  const recommendations = [];
  let complianceScore = 100;

  // PCI DSS Requirement 6.5.1: Injection flaws
  const { count: sqlInjectionCount } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('threat_type', 'sql_injection')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (sqlInjectionCount && sqlInjectionCount > 0) {
    complianceScore -= 10;
    findings.push({
      requirement: '6.5.1',
      description: 'SQL Injection vulnerabilities detected',
      severity: 'high',
      count: sqlInjectionCount,
      impact: 'Potential unauthorized access to cardholder data'
    });
    recommendations.push('Implement input validation and parameterized queries');
  }

  // PCI DSS Requirement 6.5.7: Cross-site scripting (XSS)
  const { count: xssCount } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('threat_type', 'xss_attack')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (xssCount && xssCount > 0) {
    complianceScore -= 8;
    findings.push({
      requirement: '6.5.7',
      description: 'Cross-site scripting vulnerabilities detected',
      severity: 'medium',
      count: xssCount,
      impact: 'Potential session hijacking and data theft'
    });
    recommendations.push('Implement output encoding and CSP headers');
  }

  // PCI DSS Requirement 1.1: Firewall configuration standards
  const { count: blockedEvents } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('blocked', true)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const { count: totalEvents } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const blockingRate = totalEvents ? (blockedEvents / totalEvents) * 100 : 0;

  return {
    compliance_score: Math.max(0, complianceScore),
    findings: findings,
    recommendations: recommendations,
    detailed_data: {
      total_security_events: totalEvents,
      blocked_events: blockedEvents,
      blocking_rate: blockingRate,
      sql_injection_attempts: sqlInjectionCount,
      xss_attempts: xssCount,
      assessment_period: `${startDate} to ${endDate}`
    }
  };
}

async function generateGDPRReport(supabase: any, startDate: string, endDate: string) {
  const findings = [];
  const recommendations = [];
  let complianceScore = 100;

  // GDPR Article 32: Security of processing
  const { count: securityIncidents } = await supabase
    .from('security_alerts')
    .select('*', { count: 'exact', head: true })
    .in('severity', ['high', 'critical'])
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (securityIncidents && securityIncidents > 0) {
    complianceScore -= 15;
    findings.push({
      article: '32',
      description: 'High/Critical security incidents detected',
      severity: 'high',
      count: securityIncidents,
      impact: 'Potential data breach requiring notification within 72 hours'
    });
    recommendations.push('Implement incident response procedures and breach notification protocols');
  }

  // GDPR Article 25: Data protection by design and by default
  const { count: dataExposureEvents } = await supabase
    .from('schema_violations')
    .select('*', { count: 'exact', head: true })
    .eq('violation_type', 'extra_field')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (dataExposureEvents && dataExposureEvents > 0) {
    complianceScore -= 10;
    findings.push({
      article: '25',
      description: 'Potential data exposure through API schema violations',
      severity: 'medium',
      count: dataExposureEvents,
      impact: 'Unintended personal data disclosure'
    });
    recommendations.push('Review API schemas to ensure minimal data exposure');
  }

  return {
    compliance_score: Math.max(0, complianceScore),
    findings: findings,
    recommendations: recommendations,
    detailed_data: {
      security_incidents: securityIncidents,
      data_exposure_events: dataExposureEvents,
      assessment_period: `${startDate} to ${endDate}`,
      breach_notification_required: securityIncidents > 0
    }
  };
}

async function generateHIPAAReport(supabase: any, startDate: string, endDate: string) {
  const findings = [];
  const recommendations = [];
  let complianceScore = 100;

  // HIPAA 164.312(a)(1): Access control
  const { count: unauthorizedAccess } = await supabase
    .from('user_access_patterns')
    .select('*', { count: 'exact', head: true })
    .eq('authorization_valid', false)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (unauthorizedAccess && unauthorizedAccess > 0) {
    complianceScore -= 20;
    findings.push({
      standard: '164.312(a)(1)',
      description: 'Unauthorized access attempts detected',
      severity: 'critical',
      count: unauthorizedAccess,
      impact: 'Potential PHI exposure and HIPAA violation'
    });
    recommendations.push('Strengthen access controls and implement multi-factor authentication');
  }

  // HIPAA 164.312(b): Audit controls
  const { count: auditEvents } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  return {
    compliance_score: Math.max(0, complianceScore),
    findings: findings,
    recommendations: recommendations,
    detailed_data: {
      unauthorized_access_attempts: unauthorizedAccess,
      total_audit_events: auditEvents,
      assessment_period: `${startDate} to ${endDate}`
    }
  };
}

async function generateSOXReport(supabase: any, startDate: string, endDate: string) {
  const findings = [];
  const recommendations = [];
  let complianceScore = 100;

  // SOX Section 404: Internal controls over financial reporting
  const { count: criticalAlerts } = await supabase
    .from('security_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('severity', 'critical')
    .eq('resolved', false)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (criticalAlerts && criticalAlerts > 0) {
    complianceScore -= 25;
    findings.push({
      section: '404',
      description: 'Unresolved critical security alerts affecting internal controls',
      severity: 'critical',
      count: criticalAlerts,
      impact: 'Potential compromise of financial data integrity'
    });
    recommendations.push('Implement formal incident response and resolution procedures');
  }

  return {
    compliance_score: Math.max(0, complianceScore),
    findings: findings,
    recommendations: recommendations,
    detailed_data: {
      critical_unresolved_alerts: criticalAlerts,
      assessment_period: `${startDate} to ${endDate}`
    }
  };
}

async function generateISO27001Report(supabase: any, startDate: string, endDate: string) {
  const findings = [];
  const recommendations = [];
  let complianceScore = 100;

  // ISO 27001 A.12.6.1: Management of technical vulnerabilities
  const { count: vulnerabilities } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .in('threat_type', ['sql_injection', 'xss_attack', 'rce_attempt'])
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (vulnerabilities && vulnerabilities > 0) {
    complianceScore -= 15;
    findings.push({
      control: 'A.12.6.1',
      description: 'Technical vulnerabilities detected in web applications',
      severity: 'high',
      count: vulnerabilities,
      impact: 'Potential security compromise and information disclosure'
    });
    recommendations.push('Implement vulnerability scanning and patch management procedures');
  }

  // ISO 27001 A.12.4.1: Event logging
  const { count: loggedEvents } = await supabase
    .from('siem_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  return {
    compliance_score: Math.max(0, complianceScore),
    findings: findings,
    recommendations: recommendations,
    detailed_data: {
      detected_vulnerabilities: vulnerabilities,
      logged_security_events: loggedEvents,
      assessment_period: `${startDate} to ${endDate}`
    }
  };
}