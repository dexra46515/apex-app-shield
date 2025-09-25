import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: {
        summary?: string;
        parameters?: Array<{
          name: string;
          in: 'query' | 'path' | 'header' | 'body';
          required?: boolean;
          schema: {
            type: string;
            format?: string;
            enum?: string[];
            example?: any;
          };
        }>;
        requestBody?: {
          required?: boolean;
          content: {
            [contentType: string]: {
              schema: {
                type: string;
                properties?: { [key: string]: any };
                example?: any;
              };
            };
          };
        };
        responses: {
          [statusCode: string]: {
            description: string;
            content?: { [contentType: string]: any };
          };
        };
      };
    };
  };
  components?: {
    schemas?: { [name: string]: any };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      openApiSpec, 
      targetUrl, 
      testCount = 20, 
      includeAttacks = true,
      attackRatio = 0.3,
      customPayloads = []
    } = await req.json();

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Target URL is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`🚀 Generating ${testCount} requests for ${targetUrl}${openApiSpec ? ' using OpenAPI spec' : ' with generic patterns'}`);

    const results = await generateOpenAPITraffic(
      openApiSpec as OpenAPISpec, 
      targetUrl, 
      testCount, 
      includeAttacks, 
      attackRatio,
      customPayloads
    );

    // Store results in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await storeTestResults(supabase, results, targetUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${testCount} OpenAPI-driven requests`,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          attacks: results.filter(r => r.isAttack).length,
          blocked: results.filter(r => r.blocked).length
        },
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('OpenAPI Traffic Generator Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateOpenAPITraffic(
  spec: OpenAPISpec | null, 
  targetUrl: string, 
  testCount: number, 
  includeAttacks: boolean,
  attackRatio: number,
  customPayloads: string[]
): Promise<Array<any>> {
  const results: Array<any> = [];
  const baseUrl = new URL(targetUrl).origin;
  
  // Extract endpoints from OpenAPI spec or use generic endpoints
  const endpoints = spec ? extractEndpoints(spec) : getGenericEndpoints();
  console.log(`📋 ${spec ? `Found ${endpoints.length} endpoints in OpenAPI spec` : `Using ${endpoints.length} generic endpoints`}`);

  for (let i = 0; i < testCount; i++) {
    const shouldAttack = includeAttacks && Math.random() < attackRatio;
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    let requestData;
    if (shouldAttack) {
      requestData = generateAttackRequest(endpoint, baseUrl, customPayloads);
    } else {
      requestData = spec ? generateLegitRequest(endpoint, baseUrl, spec) : generateGenericRequest(endpoint, baseUrl);
    }

    const startTime = Date.now();
    
    try {
      console.log(`[${i+1}/${testCount}] ${requestData.method} ${requestData.url} ${shouldAttack ? '🚨' : '✅'}`);
      
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });

      const responseTime = Date.now() - startTime;
      const responseText = await response.text().catch(() => '');

      results.push({
        url: requestData.url,
        method: requestData.method,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        isAttack: shouldAttack,
        payload: shouldAttack ? (requestData as any).payload : null,
        success: response.ok,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
        blocked: response.status === 403 || response.status === 429 || responseText.includes('blocked'),
        responsePreview: responseText.substring(0, 200),
        endpoint: endpoint.path,
        generatedFrom: 'openapi',
        requestBody: requestData.body,
        requestHeaders: requestData.headers
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      results.push({
        url: requestData.url,
        method: requestData.method,
        status: 0,
        statusText: 'Request Failed',
        responseTime,
        isAttack: shouldAttack,
        payload: shouldAttack ? (requestData as any).payload : null,
        success: false,
        error: (error as Error).message,
        blocked: false,
        responsePreview: null,
        endpoint: endpoint.path,
        generatedFrom: 'openapi'
      });
    }

    // Small delay between requests
    if (i < testCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    }
  }

  return results;
}

function extractEndpoints(spec: OpenAPISpec) {
  const endpoints: Array<{
    path: string;
    method: string;
    operation: any;
  }> = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
        endpoints.push({
          path,
          method: method.toUpperCase(),
          operation
        });
      }
    }
  }

  return endpoints;
}

function generateLegitRequest(endpoint: any, baseUrl: string, spec: OpenAPISpec) {
  const url = new URL(endpoint.path.replace(/\{([^}]+)\}/g, (match: string, param: string) => {
    // Replace path parameters with realistic values
    return generateParameterValue(param, 'path');
  }), baseUrl);

  const headers: { [key: string]: string } = {
    'User-Agent': 'OpenAPI-Generator/1.0',
    'Accept': 'application/json, text/plain, */*'
  };

  let body = null;

  // Handle query parameters
  if (endpoint.operation.parameters) {
    endpoint.operation.parameters.forEach((param: any) => {
      if (param.in === 'query' && Math.random() > 0.3) { // 70% chance to include optional params
        url.searchParams.set(param.name, generateParameterValue(param.name, 'query', param.schema));
      } else if (param.in === 'header') {
        headers[param.name] = generateParameterValue(param.name, 'header', param.schema);
      }
    });
  }

  // Handle request body
  if (endpoint.operation.requestBody && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    const contentType = Object.keys(endpoint.operation.requestBody.content)[0];
    headers['Content-Type'] = contentType;
    
    const schema = endpoint.operation.requestBody.content[contentType]?.schema;
    if (schema) {
      body = JSON.stringify(generateBodyFromSchema(schema, spec));
    }
  }

  return {
    url: url.toString(),
    method: endpoint.method,
    headers,
    body
  };
}

function generateAttackRequest(endpoint: any, baseUrl: string, customPayloads: string[]) {
  const attackPayloads = [
    // SQL Injection
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1 UNION SELECT password FROM admin",
    
    // XSS
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img onerror='alert(1)' src='x'>",
    
    // Path Traversal
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    
    // Command Injection
    "; cat /etc/passwd",
    "| whoami",
    "&& dir",
    
    // LDAP Injection
    "*)(uid=*))(|(uid=*",
    
    // XML Injection
    "<?xml version='1.0'?><!DOCTYPE root [<!ENTITY test SYSTEM 'file:///etc/passwd'>]><root>&test;</root>",
    
    ...customPayloads
  ];

  const payload = attackPayloads[Math.floor(Math.random() * attackPayloads.length)];
  
  // Inject payload into different parts of the request
  const injectionPoints = ['path', 'query', 'body'];
  const injectionPoint = injectionPoints[Math.floor(Math.random() * injectionPoints.length)];

  let url = baseUrl + endpoint.path;
  let body = null;
  const headers: { [key: string]: string } = {
    'User-Agent': 'AttackBot/1.0 ' + payload.substring(0, 50),
    'Accept': 'application/json'
  };

  switch (injectionPoint) {
    case 'path':
      url = url.replace(/\{([^}]+)\}/g, payload);
      break;
    
    case 'query':
      const urlObj = new URL(url);
      urlObj.searchParams.set('q', payload);
      urlObj.searchParams.set('search', payload);
      url = urlObj.toString();
      break;
    
    case 'body':
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          test: payload,
          data: payload,
          input: payload
        });
      }
      break;
  }

  return {
    url,
    method: endpoint.method,
    headers,
    body,
    payload
  };
}

function generateParameterValue(paramName: string, paramType: string, schema?: any): string {
  // Generate realistic values based on parameter name and type
  const nameBasedValues: { [key: string]: string[] } = {
    id: ['123', '456', '789'],
    userId: ['user123', 'user456'],
    email: ['test@example.com', 'user@domain.com'],
    name: ['John Doe', 'Jane Smith'],
    phone: ['+1234567890', '555-0123'],
    date: ['2024-01-01', '2023-12-31'],
    limit: ['10', '50', '100'],
    offset: ['0', '10', '20'],
    sort: ['asc', 'desc'],
    filter: ['active', 'inactive'],
    category: ['tech', 'business', 'science']
  };

  const lowerName = paramName.toLowerCase();
  
  // Check for name-based patterns
  for (const [pattern, values] of Object.entries(nameBasedValues)) {
    if (lowerName.includes(pattern)) {
      return values[Math.floor(Math.random() * values.length)];
    }
  }

  // Use schema if available
  if (schema) {
    if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    }
    if (schema.example) {
      return String(schema.example);
    }
    if (schema.type === 'integer') {
      return String(Math.floor(Math.random() * 1000) + 1);
    }
    if (schema.type === 'boolean') {
      return Math.random() > 0.5 ? 'true' : 'false';
    }
  }

  // Default values
  return paramType === 'query' ? 'test_value' : 'default';
}

function generateBodyFromSchema(schema: any, spec: OpenAPISpec): any {
  if (schema.example) {
    return schema.example;
  }

  if (schema.type === 'object' && schema.properties) {
    const body: any = {};
    
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      body[propName] = generateValueFromSchema(propSchema as any);
    }
    
    return body;
  }

  if (schema.$ref) {
    // Resolve reference
    const refPath = schema.$ref.replace('#/', '').split('/');
    let refSchema = spec;
    for (const part of refPath) {
      refSchema = (refSchema as any)[part];
    }
    return generateBodyFromSchema(refSchema, spec);
  }

  return generateValueFromSchema(schema);
}

function generateValueFromSchema(schema: any): any {
  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.enum) {
    return schema.enum[Math.floor(Math.random() * schema.enum.length)];
  }

  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') return 'test@example.com';
      if (schema.format === 'date') return '2024-01-01';
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
      return 'test_string';
    
    case 'integer':
    case 'number':
      return Math.floor(Math.random() * 1000) + 1;
    
    case 'boolean':
      return Math.random() > 0.5;
    
    case 'array':
      return [generateValueFromSchema(schema.items || { type: 'string' })];
    
    case 'object':
      if (schema.properties) {
        const obj: any = {};
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          obj[propName] = generateValueFromSchema(propSchema);
        }
        return obj;
      }
      return {};
    
    default:
      return 'default_value';
  }
}

async function storeTestResults(supabase: any, results: any[], targetUrl: string) {
  try {
    const domain = new URL(targetUrl).hostname;
    
    // Get or create customer deployment
    let { data: customer } = await supabase
      .from('customer_deployments')
      .select('*')
      .eq('domain', domain)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from('customer_deployments')
        .insert({
          customer_name: `OpenAPI Test: ${domain}`,
          domain: domain,
          deployment_type: 'openapi_test'
        })
        .select()
        .single();
      customer = newCustomer;
    }

    if (!customer) return;

    // Store WAF requests
    const wafRequests = results.map(result => ({
      customer_id: customer.id,
      source_ip: '127.0.0.1',
      request_path: result.endpoint,
      request_method: result.method,
      user_agent: 'OpenAPI-Generator/1.0',
      response_status: result.status,
      processing_time_ms: result.responseTime,
      action: result.blocked ? 'block' : 'allow',
      threat_type: result.isAttack ? 'openapi_attack_test' : null,
      threat_score: result.isAttack ? 75 : 5,
      rule_matches: result.isAttack ? ['OPENAPI_ATTACK_SIMULATION'] : []
    }));

    await supabase.from('waf_requests').insert(wafRequests);

    // Store security events for attacks
    const securityEvents = results
      .filter(r => r.isAttack)
      .map(result => ({
        event_type: 'security_test',
        severity: 'medium',
        source_ip: '127.0.0.1',
        request_method: result.method,
        request_path: result.endpoint,
        threat_type: 'openapi_attack_simulation',
        payload: result.payload,
        blocked: result.blocked,
        response_status: result.status,
        user_agent: 'OpenAPI-Generator/1.0'
      }));

    if (securityEvents.length > 0) {
      await supabase.from('security_events').insert(securityEvents);
    }

    console.log(`✅ Stored ${wafRequests.length} WAF requests and ${securityEvents.length} security events`);
    
  } catch (error) {
    console.error('❌ Error storing test results:', error);
  }
}

function getGenericEndpoints() {
  // Generic endpoints for testing when no OpenAPI spec is provided
  return [
    { path: '/', method: 'GET', operation: {} },
    { path: '/api', method: 'GET', operation: {} },
    { path: '/api/users', method: 'GET', operation: {} },
    { path: '/api/users/{id}', method: 'GET', operation: {} },
    { path: '/api/users', method: 'POST', operation: {} },
    { path: '/api/users/{id}', method: 'PUT', operation: {} },
    { path: '/api/users/{id}', method: 'DELETE', operation: {} },
    { path: '/api/products', method: 'GET', operation: {} },
    { path: '/api/products/{id}', method: 'GET', operation: {} },
    { path: '/api/search', method: 'GET', operation: {} },
    { path: '/login', method: 'POST', operation: {} },
    { path: '/register', method: 'POST', operation: {} },
    { path: '/logout', method: 'POST', operation: {} },
    { path: '/profile', method: 'GET', operation: {} },
    { path: '/admin', method: 'GET', operation: {} },
    { path: '/dashboard', method: 'GET', operation: {} },
    { path: '/settings', method: 'GET', operation: {} },
    { path: '/contact', method: 'POST', operation: {} },
    { path: '/about', method: 'GET', operation: {} },
    { path: '/health', method: 'GET', operation: {} }
  ];
}

function generateGenericRequest(endpoint: any, baseUrl: string) {
  const url = new URL(endpoint.path.replace(/\{([^}]+)\}/g, (match: string, param: string) => {
    // Replace path parameters with realistic values
    return generateParameterValue(param, 'path');
  }), baseUrl);

  const headers: { [key: string]: string } = {
    'User-Agent': 'Generic-Traffic-Generator/1.0',
    'Accept': 'application/json, text/html, */*'
  };

  let body = null;

  // Add some generic query parameters for GET requests
  if (endpoint.method === 'GET' && Math.random() > 0.5) {
    const queryParams = ['limit', 'offset', 'sort', 'filter', 'search', 'page'];
    const param = queryParams[Math.floor(Math.random() * queryParams.length)];
    url.searchParams.set(param, generateParameterValue(param, 'query'));
  }

  // Add generic body for POST/PUT/PATCH requests  
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    headers['Content-Type'] = 'application/json';
    
    const genericBodies = [
      { name: 'Test User', email: 'test@example.com' },
      { title: 'Test Item', description: 'Test description', status: 'active' },
      { username: 'testuser', password: 'password123' },
      { query: 'test search', category: 'general' },
      { message: 'Hello world', priority: 'normal' }
    ];
    
    body = JSON.stringify(genericBodies[Math.floor(Math.random() * genericBodies.length)]);
  }

  return {
    url: url.toString(),
    method: endpoint.method,
    headers,
    body
  };
}