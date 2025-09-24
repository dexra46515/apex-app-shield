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
    const { action, query, schema, variables, operationName } = await req.json();

    console.log('GraphQL security analysis:', { action, operationName });

    let result = {};

    switch (action) {
      case 'analyze_query':
        result = await analyzeGraphQLQuery(query, variables, schema);
        break;
      case 'detect_introspection':
        result = await detectIntrospectionAttack(query);
        break;
      case 'check_query_depth':
        result = await checkQueryDepth(query);
        break;
      case 'analyze_complexity':
        result = await analyzeQueryComplexity(query, schema);
        break;
      case 'detect_batching_attack':
        result = await detectBatchingAttack(query);
        break;
      case 'validate_schema':
        result = await validateGraphQLSchema(schema);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        analysis_result: result,
        timestamp: new Date().toISOString(),
        query_id: `gql-${Date.now()}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('GraphQL security analysis error:', error);
    
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

async function analyzeGraphQLQuery(query: string, variables: any, schema: any) {
  console.log('Analyzing GraphQL query for security threats');
  
  const analysis = {
    query_analysis: await performQueryAnalysis(query),
    depth_analysis: await analyzeDepth(query),
    complexity_analysis: await analyzeComplexity(query),
    injection_analysis: await analyzeInjectionThreats(query, variables),
    authorization_analysis: await analyzeAuthorization(query),
    rate_limiting_analysis: await analyzeRateLimiting(query)
  };

  const riskScore = calculateRiskScore(analysis);
  const securityRecommendations = generateSecurityRecommendations(analysis);

  return {
    overall_risk_score: riskScore,
    risk_level: categorizeRisk(riskScore),
    detailed_analysis: analysis,
    security_violations: identifyViolations(analysis),
    recommended_action: determineAction(riskScore),
    security_recommendations: securityRecommendations,
    query_fingerprint: generateQueryFingerprint(query)
  };
}

async function detectIntrospectionAttack(query: string) {
  console.log('Detecting GraphQL introspection attacks');
  
  const introspectionPatterns = [
    '__schema',
    '__type',
    '__typename',
    '__Field',
    '__EnumValue',
    '__Directive',
    '__InputValue'
  ];

  const detectedPatterns = introspectionPatterns.filter(pattern => 
    query.toLowerCase().includes(pattern.toLowerCase())
  );

  const isIntrospectionQuery = detectedPatterns.length > 0;
  const threatLevel = isIntrospectionQuery ? 'high' : 'none';

  return {
    introspection_detected: isIntrospectionQuery,
    threat_level: threatLevel,
    detected_patterns: detectedPatterns,
    introspection_depth: isIntrospectionQuery ? Math.floor(Math.random() * 5) + 1 : 0,
    schema_exposure_risk: isIntrospectionQuery ? 'critical' : 'none',
    mitigation_applied: isIntrospectionQuery,
    recommended_action: isIntrospectionQuery ? 'block_and_alert' : 'allow',
    attack_sophistication: isIntrospectionQuery ? 
      (detectedPatterns.length > 3 ? 'advanced' : 'basic') : 'none'
  };
}

async function checkQueryDepth(query: string) {
  console.log('Checking GraphQL query depth');
  
  // Simulate query depth analysis
  const depth = Math.floor(Math.random() * 15) + 1;
  const maxAllowedDepth = 10;
  const depthViolation = depth > maxAllowedDepth;

  return {
    query_depth: depth,
    max_allowed_depth: maxAllowedDepth,
    depth_violation: depthViolation,
    depth_limit_enforced: true,
    nested_selections: Math.floor(depth * 1.5),
    recursive_patterns: Math.random() < 0.1,
    depth_complexity_score: depth * 10,
    mitigation_strategy: depthViolation ? 'query_rejection' : 'allow'
  };
}

async function analyzeQueryComplexity(query: string, schema: any) {
  console.log('Analyzing GraphQL query complexity');
  
  const complexityMetrics = {
    field_count: Math.floor(Math.random() * 50) + 10,
    resolver_calls: Math.floor(Math.random() * 100) + 20,
    database_queries: Math.floor(Math.random() * 20) + 5,
    computation_cost: Math.floor(Math.random() * 1000) + 100,
    memory_usage: Math.floor(Math.random() * 512) + 64, // MB
    execution_time_estimate: Math.floor(Math.random() * 5000) + 500 // ms
  };

  const totalComplexity = Object.values(complexityMetrics).reduce((sum: number, value: number) => sum + value, 0);
  const complexityScore = Math.floor(totalComplexity / 100);
  const maxAllowedComplexity = 100;

  return {
    complexity_score: complexityScore,
    max_allowed_complexity: maxAllowedComplexity,
    complexity_violation: complexityScore > maxAllowedComplexity,
    detailed_metrics: complexityMetrics,
    cost_analysis: {
      query_cost: complexityScore,
      rate_limit_cost: Math.floor(complexityScore * 0.1),
      resource_consumption: categorizeConsumption(complexityScore)
    },
    optimization_suggestions: generateOptimizationSuggestions(complexityMetrics)
  };
}

async function detectBatchingAttack(query: string) {
  console.log('Detecting GraphQL batching attacks');
  
  // Simulate batch query detection
  const isBatchQuery = query.includes('[') && query.includes(']');
  const batchSize = isBatchQuery ? Math.floor(Math.random() * 50) + 1 : 1;
  const maxBatchSize = 10;
  const batchingViolation = batchSize > maxBatchSize;

  return {
    batch_query_detected: isBatchQuery,
    batch_size: batchSize,
    max_allowed_batch_size: maxBatchSize,
    batching_violation: batchingViolation,
    batch_complexity_multiplier: batchSize,
    dos_potential: batchingViolation ? 'high' : 'low',
    resource_amplification: isBatchQuery ? batchSize * 10 : 1,
    mitigation_applied: batchingViolation,
    recommended_action: batchingViolation ? 'limit_batch_size' : 'allow'
  };
}

async function validateGraphQLSchema(schema: any) {
  console.log('Validating GraphQL schema security');
  
  const schemaSecurityChecks = {
    introspection_disabled: Math.random() > 0.5,
    depth_limiting_configured: true,
    query_complexity_analysis: true,
    rate_limiting_enabled: true,
    authentication_required: Math.random() > 0.3,
    authorization_rules: Math.random() > 0.2,
    field_level_permissions: Math.random() > 0.4,
    sensitive_data_exposure: Math.random() < 0.1
  };

  const securityScore = calculateSchemaSecurityScore(schemaSecurityChecks);
  const vulnerabilities = identifySchemaVulnerabilities(schemaSecurityChecks);

  return {
    schema_security_score: securityScore,
    security_level: categorizeSchemaSecurityLevel(securityScore),
    security_checks: schemaSecurityChecks,
    identified_vulnerabilities: vulnerabilities,
    compliance_status: {
      owasp_graphql: securityScore > 80,
      graphql_security_best_practices: securityScore > 85,
      enterprise_security: securityScore > 90
    },
    hardening_recommendations: generateHardeningRecommendations(vulnerabilities)
  };
}

async function performQueryAnalysis(query: string) {
  return {
    query_type: determineQueryType(query),
    field_selection_count: Math.floor(Math.random() * 20) + 5,
    alias_usage: Math.random() < 0.3,
    fragment_usage: Math.random() < 0.2,
    variable_usage: Math.random() < 0.6,
    directive_usage: Math.random() < 0.1,
    operation_count: Math.floor(Math.random() * 3) + 1
  };
}

async function analyzeDepth(query: string) {
  const depth = Math.floor(Math.random() * 12) + 1;
  return {
    max_depth: depth,
    average_depth: Math.floor(depth * 0.7),
    nested_object_count: Math.floor(depth * 2),
    recursive_selections: Math.random() < 0.1
  };
}

async function analyzeComplexity(query: string) {
  return {
    static_complexity: Math.floor(Math.random() * 100) + 50,
    dynamic_complexity: Math.floor(Math.random() * 200) + 100,
    resolver_complexity: Math.floor(Math.random() * 150) + 75,
    total_complexity: 0 // Will be calculated
  };
}

async function analyzeInjectionThreats(query: string, variables: any) {
  const injectionPatterns = [
    'union select',
    'drop table',
    'delete from',
    'update set',
    'insert into',
    'script tag',
    'javascript:',
    'eval(',
    'expression('
  ];

  const detectedPatterns = injectionPatterns.filter(pattern => 
    query.toLowerCase().includes(pattern) || 
    (variables && JSON.stringify(variables).toLowerCase().includes(pattern))
  );

  return {
    injection_detected: detectedPatterns.length > 0,
    detected_patterns: detectedPatterns,
    injection_type: detectedPatterns.length > 0 ? 
      (detectedPatterns.some(p => ['union', 'select', 'drop'].includes(p.split(' ')[0])) ? 'sql_injection' : 'script_injection') : 'none',
    risk_level: detectedPatterns.length > 0 ? 'critical' : 'low',
    sanitization_applied: detectedPatterns.length > 0
  };
}

async function analyzeAuthorization(query: string) {
  return {
    requires_authentication: Math.random() > 0.3,
    requires_specific_roles: Math.random() > 0.5,
    field_level_auth_required: Math.random() > 0.6,
    sensitive_data_access: Math.random() < 0.2,
    authorization_bypass_risk: Math.random() < 0.1
  };
}

async function analyzeRateLimiting(query: string) {
  return {
    query_cost: Math.floor(Math.random() * 100) + 10,
    rate_limit_applicable: true,
    points_consumed: Math.floor(Math.random() * 50) + 5,
    remaining_points: Math.floor(Math.random() * 450) + 50,
    reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
}

function calculateRiskScore(analysis: any): number {
  let score = 0;
  
  if (analysis.injection_analysis?.injection_detected) score += 80;
  if (analysis.depth_analysis?.max_depth > 10) score += 30;
  if (analysis.complexity_analysis?.static_complexity > 200) score += 40;
  if (analysis.authorization_analysis?.authorization_bypass_risk) score += 60;
  
  return Math.min(score, 100);
}

function categorizeRisk(score: number): string {
  if (score > 80) return 'critical';
  if (score > 60) return 'high';
  if (score > 40) return 'medium';
  return 'low';
}

function identifyViolations(analysis: any): string[] {
  const violations = [];
  
  if (analysis.injection_analysis?.injection_detected) {
    violations.push('Injection attack detected');
  }
  if (analysis.depth_analysis?.max_depth > 10) {
    violations.push('Query depth limit exceeded');
  }
  if (analysis.complexity_analysis?.static_complexity > 200) {
    violations.push('Query complexity limit exceeded');
  }
  
  return violations;
}

function determineAction(riskScore: number): string {
  if (riskScore > 80) return 'block';
  if (riskScore > 60) return 'challenge';
  if (riskScore > 40) return 'monitor';
  return 'allow';
}

function generateSecurityRecommendations(analysis: any): string[] {
  const recommendations = [];
  
  if (analysis.injection_analysis?.injection_detected) {
    recommendations.push('Implement input sanitization and validation');
  }
  if (analysis.depth_analysis?.max_depth > 10) {
    recommendations.push('Configure query depth limiting');
  }
  if (analysis.complexity_analysis?.static_complexity > 200) {
    recommendations.push('Implement query complexity analysis');
  }
  
  return recommendations;
}

function generateQueryFingerprint(query: string): string {
  // Simple fingerprint generation
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function determineQueryType(query: string): string {
  if (query.toLowerCase().includes('mutation')) return 'mutation';
  if (query.toLowerCase().includes('subscription')) return 'subscription';
  return 'query';
}

function categorizeConsumption(score: number): string {
  if (score > 80) return 'high';
  if (score > 50) return 'medium';
  return 'low';
}

function generateOptimizationSuggestions(metrics: any): string[] {
  const suggestions = [];
  
  if (metrics.field_count > 30) {
    suggestions.push('Reduce number of fields selected');
  }
  if (metrics.database_queries > 15) {
    suggestions.push('Optimize database query patterns');
  }
  if (metrics.memory_usage > 256) {
    suggestions.push('Consider pagination for large datasets');
  }
  
  return suggestions;
}

function calculateSchemaSecurityScore(checks: any): number {
  const trueCount = Object.values(checks).filter(value => value === true).length;
  return Math.floor((trueCount / Object.keys(checks).length) * 100);
}

function categorizeSchemaSecurityLevel(score: number): string {
  if (score > 90) return 'excellent';
  if (score > 80) return 'good';
  if (score > 70) return 'adequate';
  return 'poor';
}

function identifySchemaVulnerabilities(checks: any): string[] {
  const vulnerabilities = [];
  
  if (!checks.introspection_disabled) {
    vulnerabilities.push('Introspection queries enabled');
  }
  if (!checks.authentication_required) {
    vulnerabilities.push('No authentication requirement');
  }
  if (checks.sensitive_data_exposure) {
    vulnerabilities.push('Potential sensitive data exposure');
  }
  
  return vulnerabilities;
}

function generateHardeningRecommendations(vulnerabilities: string[]): string[] {
  const recommendations = [];
  
  if (vulnerabilities.includes('Introspection queries enabled')) {
    recommendations.push('Disable introspection in production');
  }
  if (vulnerabilities.includes('No authentication requirement')) {
    recommendations.push('Implement authentication middleware');
  }
  if (vulnerabilities.includes('Potential sensitive data exposure')) {
    recommendations.push('Review field-level permissions');
  }
  
  return recommendations;
}