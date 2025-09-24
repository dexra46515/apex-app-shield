import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    let result;
    switch (action) {
      case 'store':
        result = await storeCredentials(params);
        break;
      case 'list':
        result = await listCredentials(params);
        break;
      case 'validate':
        result = await validateCredentials(params);
        break;
      case 'delete':
        result = await deleteCredentials(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Credential management error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: 'Failed to manage cloud credentials'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function storeCredentials({ provider, credentialName, credentials, userId }: any) {
  // Encrypt credentials (simplified - in production use proper encryption)
  const encryptedCredentials = btoa(JSON.stringify(credentials));
  
  const { data, error } = await supabase
    .from('cloud_credentials')
    .insert({
      user_id: userId,
      provider,
      credential_name: credentialName,
      encrypted_credentials: { data: encryptedCredentials },
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    credential_id: data.id,
    message: `${provider} credentials stored successfully`
  };
}

async function listCredentials({ userId }: any) {
  const { data, error } = await supabase
    .from('cloud_credentials')
    .select('id, provider, credential_name, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    success: true,
    credentials: data
  };
}

async function validateCredentials({ credentialId, provider }: any) {
  const { data: credentials } = await supabase
    .from('cloud_credentials')
    .select('encrypted_credentials')
    .eq('id', credentialId)
    .single();

  if (!credentials) {
    throw new Error('Credentials not found');
  }

  // Validate credentials against cloud provider API
  const decryptedCreds = JSON.parse(atob(credentials.encrypted_credentials.data));
  
  let isValid = false;
  try {
    switch (provider) {
      case 'aws':
        isValid = await validateAWSCredentials(decryptedCreds);
        break;
      case 'gcp':
        isValid = await validateGCPCredentials(decryptedCreds);
        break;
      case 'azure':
        isValid = await validateAzureCredentials(decryptedCreds);
        break;
      case 'digitalocean':
        isValid = await validateDOCredentials(decryptedCreds);
        break;
      case 'vercel':
        isValid = await validateVercelCredentials(decryptedCreds);
        break;
      case 'railway':
        isValid = await validateRailwayCredentials(decryptedCreds);
        break;
    }
  } catch (error) {
    console.error('Validation error:', error);
  }

  return {
    success: true,
    is_valid: isValid,
    provider
  };
}

async function deleteCredentials({ credentialId, userId }: any) {
  const { error } = await supabase
    .from('cloud_credentials')
    .update({ is_active: false })
    .eq('id', credentialId)
    .eq('user_id', userId);

  if (error) throw error;

  return {
    success: true,
    message: 'Credentials deleted successfully'
  };
}

async function validateAWSCredentials(creds: any): Promise<boolean> {
  try {
    const response = await fetch('https://sts.amazonaws.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSSecurityTokenServiceV20110615.GetCallerIdentity'
      },
      body: JSON.stringify({})
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateGCPCredentials(creds: any): Promise<boolean> {
  try {
    const response = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${creds.projectId}`, {
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateAzureCredentials(creds: any): Promise<boolean> {
  try {
    const response = await fetch(`https://management.azure.com/subscriptions/${creds.subscriptionId}?api-version=2020-01-01`, {
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateDOCredentials(creds: any): Promise<boolean> {
  try {
    const response = await fetch('https://api.digitalocean.com/v2/account', {
      headers: {
        'Authorization': `Bearer ${creds.apiToken}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateVercelCredentials(creds: any): Promise<boolean> {
  try {
    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${creds.token}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateRailwayCredentials(creds: any): Promise<boolean> {
  try {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'query { me { id } }'
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}