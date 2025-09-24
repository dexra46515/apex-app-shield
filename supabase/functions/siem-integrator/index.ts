import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SIEMConfig {
  type: 'splunk' | 'elastic' | 'qradar' | 'arcsight' | 'sentinel';
  endpoint: string;
  auth_token?: string;
  api_key?: string;
  username?: string;
  password?: string;
  index_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { action, config, batch_size = 100 } = await req.json();

      switch (action) {
        case 'export_events':
          return await exportEventsToSIEM(supabase, config, batch_size);
        case 'test_connection':
          return await testSIEMConnection(config);
        case 'configure_integration':
          return await configureSIEMIntegration(supabase, config);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }

    // GET request - return SIEM integration status
    const { data: siemEvents } = await supabase
      .from('siem_events')
      .select('exported_to_siem, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const totalEvents = siemEvents?.length || 0;
    const exportedEvents = siemEvents?.filter(e => e.exported_to_siem).length || 0;
    const exportRate = totalEvents > 0 ? (exportedEvents / totalEvents) * 100 : 0;

    return new Response(
      JSON.stringify({
        success: true,
        siem_status: {
          total_events: totalEvents,
          exported_events: exportedEvents,
          export_rate: exportRate,
          last_export: siemEvents?.[0]?.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('SIEM Integrator Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function exportEventsToSIEM(supabase: any, config: SIEMConfig, batchSize: number) {
  try {
    // Get unexported SIEM events
    const { data: unexportedEvents, error } = await supabase
      .from('siem_events')
      .select('*')
      .eq('exported_to_siem', false)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      throw error;
    }

    if (!unexportedEvents || unexportedEvents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No events to export', exported_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let exportedCount = 0;
    const exportErrors = [];

    for (const event of unexportedEvents) {
      try {
        const success = await sendEventToSIEM(event, config);
        
        if (success) {
          // Mark as exported
          await supabase
            .from('siem_events')
            .update({ 
              exported_to_siem: true, 
              export_timestamp: new Date().toISOString() 
            })
            .eq('id', event.id);
          
          exportedCount++;
        } else {
          exportErrors.push({ event_id: event.id, error: 'Export failed' });
        }
      } catch (exportError) {
        console.error(`Failed to export event ${event.id}:`, exportError);
        exportErrors.push({ event_id: event.id, error: exportError instanceof Error ? exportError.message : 'Unknown error' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        exported_count: exportedCount,
        total_events: unexportedEvents.length,
        errors: exportErrors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error exporting events to SIEM:', error);
    throw error;
  }
}

async function sendEventToSIEM(event: any, config: SIEMConfig): Promise<boolean> {
  const siemPayload = formatEventForSIEM(event, config.type);

  try {
    let response;
    
    switch (config.type) {
      case 'splunk':
        response = await sendToSplunk(siemPayload, config);
        break;
      case 'elastic':
        response = await sendToElastic(siemPayload, config);
        break;
      case 'qradar':
        response = await sendToQRadar(siemPayload, config);
        break;
      case 'arcsight':
        response = await sendToArcSight(siemPayload, config);
        break;
      case 'sentinel':
        response = await sendToSentinel(siemPayload, config);
        break;
      default:
        throw new Error(`Unsupported SIEM type: ${config.type}`);
    }

    return response.ok;
  } catch (error) {
    console.error(`Error sending to ${config.type}:`, error);
    return false;
  }
}

function formatEventForSIEM(event: any, siemType: string) {
  const baseEvent = {
    timestamp: event.created_at,
    event_type: event.event_type,
    event_source: event.event_source,
    severity: event.severity,
    correlation_id: event.correlation_id,
    event_data: event.event_data
  };

  switch (siemType) {
    case 'splunk':
      return {
        time: new Date(event.created_at).getTime() / 1000,
        source: 'waf_security_platform',
        sourcetype: 'waf:security:event',
        index: 'security',
        event: baseEvent
      };

    case 'elastic':
      return {
        '@timestamp': event.created_at,
        'event.type': event.event_type,
        'event.category': 'security',
        'event.severity': event.severity,
        'source.application': 'waf_security_platform',
        'waf': baseEvent
      };

    case 'qradar':
      return {
        message: JSON.stringify(baseEvent),
        timestamp: new Date(event.created_at).getTime(),
        severity: getSeverityNumber(event.severity),
        category: 'Security Event'
      };

    case 'arcsight':
      return {
        name: `WAF Security Event - ${event.event_type}`,
        deviceVendor: 'Custom',
        deviceProduct: 'WAF Security Platform',
        deviceVersion: '1.0',
        signatureId: event.event_type,
        severity: getSeverityNumber(event.severity),
        message: JSON.stringify(baseEvent)
      };

    case 'sentinel':
      return {
        TimeGenerated: event.created_at,
        EventType: event.event_type,
        EventSource: event.event_source,
        Severity: event.severity,
        EventData: JSON.stringify(event.event_data),
        CorrelationId: event.correlation_id
      };

    default:
      return baseEvent;
  }
}

async function sendToSplunk(payload: any, config: SIEMConfig) {
  return await fetch(`${config.endpoint}/services/collector/event`, {
    method: 'POST',
    headers: {
      'Authorization': `Splunk ${config.auth_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

async function sendToElastic(payload: any, config: SIEMConfig) {
  const index = config.index_name || 'waf-security';
  return await fetch(`${config.endpoint}/${index}/_doc`, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${config.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

async function sendToQRadar(payload: any, config: SIEMConfig) {
  return await fetch(`${config.endpoint}/api/siem/events`, {
    method: 'POST',
    headers: {
      'SEC': config.auth_token!,
      'Content-Type': 'application/json',
      'Version': '10.0'
    },
    body: JSON.stringify([payload])
  });
}

async function sendToArcSight(payload: any, config: SIEMConfig) {
  // ArcSight CEF format
  const cefMessage = `CEF:0|${payload.deviceVendor}|${payload.deviceProduct}|${payload.deviceVersion}|${payload.signatureId}|${payload.name}|${payload.severity}|msg=${payload.message}`;
  
  return await fetch(`${config.endpoint}/cef/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`,
      'Content-Type': 'text/plain'
    },
    body: cefMessage
  });
}

async function sendToSentinel(payload: any, config: SIEMConfig) {
  return await fetch(`${config.endpoint}/api/logs?api-version=2016-04-01`, {
    method: 'POST',
    headers: {
      'Authorization': `SharedKey ${config.auth_token}`,
      'Content-Type': 'application/json',
      'Log-Type': 'WAFSecurityEvent'
    },
    body: JSON.stringify([payload])
  });
}

async function testSIEMConnection(config: SIEMConfig) {
  try {
    const testEvent = {
      event_type: 'connection_test',
      event_source: 'waf_siem_integrator',
      severity: 'info',
      created_at: new Date().toISOString(),
      event_data: { message: 'SIEM connection test' }
    };

    const success = await sendEventToSIEM(testEvent, config);
    
    return new Response(
      JSON.stringify({
        success: success,
        message: success ? 'SIEM connection successful' : 'SIEM connection failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'SIEM connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function configureSIEMIntegration(supabase: any, config: SIEMConfig) {
  try {
    // Store SIEM configuration (encrypt sensitive data in production)
    await supabase
      .from('waf_config')
      .upsert({
        config_key: 'siem_integration',
        config_value: config,
        category: 'integration',
        description: `${config.type.toUpperCase()} SIEM integration configuration`
      }, { onConflict: 'config_key' });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${config.type.toUpperCase()} integration configured successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to configure SIEM integration',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function getSeverityNumber(severity: string): number {
  switch (severity.toLowerCase()) {
    case 'critical': return 10;
    case 'high': return 8;
    case 'medium': return 5;
    case 'low': return 3;
    case 'info': return 1;
    default: return 1;
  }
}