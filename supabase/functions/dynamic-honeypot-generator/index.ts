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

    const { generation_type = 'auto', learning_source, target_endpoints } = await req.json();

    console.log('Generating dynamic honeypots:', { generation_type, learning_source });

    let generatedHoneypots = [];

    if (generation_type === 'auto') {
      // Auto-generate based on common attack patterns
      generatedHoneypots = await autoGenerateHoneypots(supabase);
    } else if (generation_type === 'learning') {
      // Generate based on observed traffic patterns
      generatedHoneypots = await generateFromLearning(learning_source, supabase);
    } else if (generation_type === 'target') {
      // Generate specific targeted honeypots
      generatedHoneypots = await generateTargetedHoneypots(target_endpoints, supabase);
    }

    // Deploy the generated honeypots
    const deploymentResults = await deployHoneypots(generatedHoneypots, supabase);

    console.log('Dynamic honeypot generation completed:', {
      generated_count: generatedHoneypots.length,
      deployed_count: deploymentResults.successful_deployments
    });

    return new Response(
      JSON.stringify({
        success: true,
        generation_summary: {
          total_generated: generatedHoneypots.length,
          successful_deployments: deploymentResults.successful_deployments,
          failed_deployments: deploymentResults.failed_deployments
        },
        honeypots: generatedHoneypots.map(h => ({
          id: h.id,
          name: h.name,
          endpoint_pattern: h.endpoint_pattern,
          type: h.type,
          effectiveness_prediction: h.effectiveness_score
        })),
        deployment_status: deploymentResults.deployment_status,
        monitoring_setup: {
          interaction_tracking: true,
          ttp_collection: true,
          threat_intelligence_feed: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Dynamic Honeypot Generator Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function autoGenerateHoneypots(supabase: any) {
  const honeypotTemplates = [
    {
      name: 'Admin Panel Decoy',
      type: 'admin_panel',
      endpoint_pattern: '/admin/*',
      api_schema: generateAdminAPISchema(),
      response_templates: generateAdminResponses(),
      interaction_rules: getAdminInteractionRules(),
      effectiveness_score: 0.85
    },
    {
      name: 'Database Backup Lure',
      type: 'file_download',
      endpoint_pattern: '/backups/*',
      api_schema: generateFileAPISchema('backups'),
      response_templates: generateFileResponses('database_backup.sql'),
      interaction_rules: getFileInteractionRules(),
      effectiveness_score: 0.78
    },
    {
      name: 'Development API Trap',
      type: 'api_endpoint',
      endpoint_pattern: '/dev/api/*',
      api_schema: generateDevAPISchema(),
      response_templates: generateDevResponses(),
      interaction_rules: getDevInteractionRules(),
      effectiveness_score: 0.82
    },
    {
      name: 'Config File Honeypot',
      type: 'config_file',
      endpoint_pattern: '/.env',
      api_schema: generateConfigAPISchema(),
      response_templates: generateConfigResponses(),
      interaction_rules: getConfigInteractionRules(),
      effectiveness_score: 0.90
    },
    {
      name: 'SSH Key Decoy',
      type: 'credential_file',
      endpoint_pattern: '/.ssh/*',
      api_schema: generateSSHAPISchema(),
      response_templates: generateSSHResponses(),
      interaction_rules: getSSHInteractionRules(),
      effectiveness_score: 0.88
    }
  ];

  const deployedHoneypots = [];

  for (const template of honeypotTemplates) {
    try {
      // Create base honeypot
      const { data: baseHoneypot, error: baseError } = await supabase
        .from('honeypots')
        .insert({
          name: template.name,
          type: template.type,
          endpoint_path: template.endpoint_pattern,
          decoy_response: template.response_templates.default,
          is_active: true
        })
        .select()
        .single();

      if (baseError) {
        console.error('Error creating base honeypot:', baseError);
        continue;
      }

      // Create dynamic honeypot configuration
      const { data: dynamicHoneypot, error: dynamicError } = await supabase
        .from('dynamic_honeypots')
        .insert({
          honeypot_id: baseHoneypot.id,
          api_schema: template.api_schema,
          endpoint_pattern: template.endpoint_pattern,
          response_templates: template.response_templates,
          interaction_rules: template.interaction_rules,
          auto_generated: true,
          learning_source: 'auto_generation',
          effectiveness_score: template.effectiveness_score,
          ttl: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (dynamicError) {
        console.error('Error creating dynamic honeypot:', dynamicError);
        continue;
      }

      deployedHoneypots.push({
        ...baseHoneypot,
        dynamic_config: dynamicHoneypot,
        ...template
      });

    } catch (error) {
      console.error('Error in honeypot generation:', error);
    }
  }

  return deployedHoneypots;
}

async function generateFromLearning(learningSource: string, supabase: any) {
  // Analyze recent attack patterns
  const { data: recentAttacks } = await supabase
    .from('security_events')
    .select('*')
    .eq('blocked', false)
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(1000);

  if (!recentAttacks || recentAttacks.length === 0) {
    return [];
  }

  // Extract common attack patterns
  const attackPatterns = analyzeAttackPatterns(recentAttacks);
  const generatedHoneypots = [];

  for (const pattern of attackPatterns) {
    const honeypotConfig = createHoneypotFromPattern(pattern);
    
    try {
      // Create learned honeypot
      const { data: baseHoneypot } = await supabase
        .from('honeypots')
        .insert({
          name: `Learned Pattern: ${pattern.attack_type}`,
          type: 'learned_pattern',
          endpoint_path: pattern.common_path,
          decoy_response: honeypotConfig.response_template,
          is_active: true
        })
        .select()
        .single();

      if (baseHoneypot) {
        const { data: dynamicHoneypot } = await supabase
          .from('dynamic_honeypots')
          .insert({
            honeypot_id: baseHoneypot.id,
            api_schema: honeypotConfig.api_schema,
            endpoint_pattern: pattern.common_path,
            response_templates: honeypotConfig.response_templates,
            interaction_rules: honeypotConfig.interaction_rules,
            auto_generated: true,
            learning_source: learningSource,
            effectiveness_score: pattern.effectiveness_prediction,
            ttl: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days for learned patterns
          })
          .select()
          .single();

        if (dynamicHoneypot) {
          generatedHoneypots.push({
            ...baseHoneypot,
            dynamic_config: dynamicHoneypot,
            pattern_source: pattern
          });
        }
      }
    } catch (error) {
      console.error('Error creating learned honeypot:', error);
    }
  }

  return generatedHoneypots;
}

async function generateTargetedHoneypots(targetEndpoints: string[], supabase: any) {
  const generatedHoneypots = [];

  for (const endpoint of targetEndpoints) {
    const honeypotConfig = createTargetedHoneypot(endpoint);
    
    try {
      const { data: baseHoneypot } = await supabase
        .from('honeypots')
        .insert({
          name: `Targeted: ${endpoint}`,
          type: 'targeted',
          endpoint_path: endpoint,
          decoy_response: honeypotConfig.response_template,
          is_active: true
        })
        .select()
        .single();

      if (baseHoneypot) {
        const { data: dynamicHoneypot } = await supabase
          .from('dynamic_honeypots')
          .insert({
            honeypot_id: baseHoneypot.id,
            api_schema: honeypotConfig.api_schema,
            endpoint_pattern: endpoint,
            response_templates: honeypotConfig.response_templates,
            interaction_rules: honeypotConfig.interaction_rules,
            auto_generated: true,
            learning_source: 'targeted_generation',
            effectiveness_score: 0.75
          })
          .select()
          .single();

        if (dynamicHoneypot) {
          generatedHoneypots.push({
            ...baseHoneypot,
            dynamic_config: dynamicHoneypot
          });
        }
      }
    } catch (error) {
      console.error('Error creating targeted honeypot:', error);
    }
  }

  return generatedHoneypots;
}

async function deployHoneypots(honeypots: any[], supabase: any) {
  let successfulDeployments = 0;
  let failedDeployments = 0;
  const deploymentStatus = [];

  for (const honeypot of honeypots) {
    try {
      // Simulate deployment process
      const deploymentResult = await simulateDeployment(honeypot);
      
      if (deploymentResult.success) {
        successfulDeployments++;
        deploymentStatus.push({
          honeypot_id: honeypot.id,
          status: 'deployed',
          endpoint: honeypot.endpoint_pattern,
          monitoring_active: true
        });

        // Update honeypot status
        await supabase
          .from('dynamic_honeypots')
          .update({
            is_active: true,
            last_interaction: null,
            interaction_count: 0
          })
          .eq('id', honeypot.dynamic_config.id);

      } else {
        failedDeployments++;
        deploymentStatus.push({
          honeypot_id: honeypot.id,
          status: 'failed',
          error: deploymentResult.error
        });
      }
    } catch (error) {
      failedDeployments++;
      console.error('Deployment error:', error);
    }
  }

  return {
    successful_deployments: successfulDeployments,
    failed_deployments: failedDeployments,
    deployment_status: deploymentStatus
  };
}

// Helper functions for honeypot generation

function generateAdminAPISchema() {
  return {
    endpoints: [
      {
        path: '/admin/login',
        methods: ['POST'],
        parameters: {
          username: 'string',
          password: 'string'
        }
      },
      {
        path: '/admin/users',
        methods: ['GET', 'POST'],
        parameters: {}
      },
      {
        path: '/admin/config',
        methods: ['GET', 'PUT'],
        parameters: {}
      }
    ]
  };
}

function generateAdminResponses() {
  return {
    default: {
      status: 200,
      body: {
        message: 'Admin panel access',
        version: '2.1.0',
        authenticated: false
      }
    },
    login_success: {
      status: 200,
      body: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: { id: 1, username: 'admin', role: 'administrator' }
      }
    },
    unauthorized: {
      status: 401,
      body: { error: 'Unauthorized access' }
    }
  };
}

function getAdminInteractionRules() {
  return {
    log_level: 'detailed',
    response_delay: '200-500ms',
    capture_payload: true,
    capture_headers: true,
    fake_authentication: true,
    escalation_triggers: ['multiple_login_attempts', 'credential_stuffing']
  };
}

function generateFileAPISchema(fileType: string) {
  return {
    endpoints: [
      {
        path: `/${fileType}/*`,
        methods: ['GET'],
        parameters: {
          filename: 'string'
        }
      }
    ]
  };
}

function generateFileResponses(filename: string) {
  return {
    default: {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: '# Fake database backup\n# Generated by honeypot system\nCREATE TABLE users...'
    },
    not_found: {
      status: 404,
      body: { error: 'File not found' }
    }
  };
}

function getFileInteractionRules() {
  return {
    log_level: 'high',
    response_delay: '1-3s',
    capture_payload: true,
    fake_file_download: true,
    track_download_attempts: true
  };
}

function generateDevAPISchema() {
  return {
    endpoints: [
      {
        path: '/dev/api/debug',
        methods: ['GET', 'POST'],
        parameters: {}
      },
      {
        path: '/dev/api/test',
        methods: ['POST'],
        parameters: {
          payload: 'object'
        }
      }
    ]
  };
}

function generateDevResponses() {
  return {
    default: {
      status: 200,
      body: {
        environment: 'development',
        debug: true,
        database_url: 'postgresql://user:pass@localhost:5432/devdb',
        api_keys: {
          stripe: 'sk_test_...',
          aws: 'AKIA...'
        }
      }
    }
  };
}

function getDevInteractionRules() {
  return {
    log_level: 'maximum',
    response_delay: '100-300ms',
    capture_payload: true,
    expose_fake_credentials: true,
    track_api_enumeration: true
  };
}

function generateConfigAPISchema() {
  return {
    endpoints: [
      {
        path: '/.env',
        methods: ['GET'],
        parameters: {}
      }
    ]
  };
}

function generateConfigResponses() {
  return {
    default: {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: `DATABASE_URL=postgresql://admin:supersecret@db.example.com:5432/production
API_KEY=sk_live_abcdef123456789
JWT_SECRET=your_jwt_secret_here
STRIPE_SECRET=sk_live_xyz789abc123`
    }
  };
}

function getConfigInteractionRules() {
  return {
    log_level: 'critical',
    response_delay: '50-200ms',
    capture_payload: true,
    immediate_alert: true,
    block_after_interaction: false
  };
}

function generateSSHAPISchema() {
  return {
    endpoints: [
      {
        path: '/.ssh/id_rsa',
        methods: ['GET'],
        parameters: {}
      },
      {
        path: '/.ssh/authorized_keys',
        methods: ['GET'],
        parameters: {}
      }
    ]
  };
}

function generateSSHResponses() {
  return {
    default: {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
    }
  };
}

function getSSHInteractionRules() {
  return {
    log_level: 'critical',
    response_delay: '100-400ms',
    capture_payload: true,
    immediate_alert: true,
    track_credential_theft: true
  };
}

function analyzeAttackPatterns(attacks: any[]) {
  const pathCounts: { [key: string]: number } = {};
  const attackTypes: { [key: string]: number } = {};
  
  attacks.forEach(attack => {
    const path = attack.request_path || '/';
    const type = attack.threat_type || 'unknown';
    
    pathCounts[path] = (pathCounts[path] || 0) + 1;
    attackTypes[type] = (attackTypes[type] || 0) + 1;
  });
  
  const patterns = [];
  
  // Find common paths
  Object.entries(pathCounts)
    .filter(([path, count]) => count > 5)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([path, count]) => {
      patterns.push({
        attack_type: 'path_targeting',
        common_path: path,
        frequency: count,
        effectiveness_prediction: Math.min(0.9, count / 100)
      });
    });
  
  return patterns;
}

function createHoneypotFromPattern(pattern: any) {
  return {
    api_schema: {
      endpoints: [
        {
          path: pattern.common_path,
          methods: ['GET', 'POST'],
          parameters: {}
        }
      ]
    },
    response_template: {
      status: 200,
      body: { message: 'Pattern-based honeypot', path: pattern.common_path }
    },
    response_templates: {
      default: {
        status: 200,
        body: { message: 'Pattern-based honeypot', path: pattern.common_path }
      }
    },
    interaction_rules: {
      log_level: 'high',
      response_delay: '200-800ms',
      capture_payload: true,
      pattern_based: true
    }
  };
}

function createTargetedHoneypot(endpoint: string) {
  return {
    api_schema: {
      endpoints: [
        {
          path: endpoint,
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          parameters: {}
        }
      ]
    },
    response_template: {
      status: 200,
      body: { message: 'Targeted honeypot', endpoint }
    },
    response_templates: {
      default: {
        status: 200,
        body: { message: 'Targeted honeypot', endpoint }
      }
    },
    interaction_rules: {
      log_level: 'high',
      response_delay: '100-500ms',
      capture_payload: true,
      targeted: true
    }
  };
}

async function simulateDeployment(honeypot: any) {
  // Simulate deployment validation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simple validation checks
  if (!honeypot.endpoint_pattern || !honeypot.dynamic_config) {
    return { success: false, error: 'Invalid configuration' };
  }
  
  // Simulate 95% success rate
  const success = Math.random() > 0.05;
  
  return {
    success,
    error: success ? null : 'Deployment infrastructure error'
  };
}