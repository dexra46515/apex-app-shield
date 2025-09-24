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

    const { action, rule_id, deployment_phase } = await req.json();

    console.log('Processing rule deployment pipeline:', { action, rule_id, deployment_phase });

    let result;

    switch (action) {
      case 'deploy_shadow':
        result = await deployShadowRule(rule_id, supabase);
        break;
      case 'promote_to_canary':
        result = await promoteToCanary(rule_id, supabase);
        break;
      case 'promote_to_production':
        result = await promoteToProduction(rule_id, supabase);
        break;
      case 'evaluate_promotions':
        result = await evaluatePromotions(supabase);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Rule Deployment Pipeline Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function deployShadowRule(ruleId: string, supabase: any) {
  const { data: deployment } = await supabase
    .from('rule_deployments')
    .insert({
      rule_id: ruleId,
      deployment_phase: 'shadow',
      traffic_percentage: 0,
      success_rate: 0,
      false_positive_rate: 0,
      current_status: 'active'
    })
    .select()
    .single();

  return { deployment_id: deployment?.id, phase: 'shadow' };
}

async function promoteToCanary(ruleId: string, supabase: any) {
  const { data: deployment } = await supabase
    .from('rule_deployments')
    .update({
      deployment_phase: 'canary',
      traffic_percentage: 10,
      success_rate: Math.random() * 0.3 + 0.7, // Simulate 70-100% success
      false_positive_rate: Math.random() * 0.1 // Simulate 0-10% false positives
    })
    .eq('rule_id', ruleId)
    .select()
    .single();

  return { deployment_id: deployment?.id, phase: 'canary' };
}

async function promoteToProduction(ruleId: string, supabase: any) {
  const { data: deployment } = await supabase
    .from('rule_deployments')
    .update({
      deployment_phase: 'production',
      traffic_percentage: 100,
      end_time: new Date().toISOString()
    })
    .eq('rule_id', ruleId)
    .select()
    .single();

  await supabase
    .from('adaptive_rules')
    .update({ is_active: true })
    .eq('id', ruleId);

  return { deployment_id: deployment?.id, phase: 'production' };
}

async function evaluatePromotions(supabase: any) {
  await supabase.rpc('evaluate_rule_promotion');
  return { evaluation_completed: true };
}