-- Advanced Differentiators Database Schema

-- TLS/JA3 Fingerprinting and Encrypted Flow Analysis
CREATE TABLE public.tls_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ja3_hash TEXT NOT NULL,
  ja3_string TEXT NOT NULL,
  tls_version TEXT NOT NULL,
  cipher_suites JSONB NOT NULL,
  extensions JSONB NOT NULL,
  source_ip INET NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  threat_score INTEGER NOT NULL DEFAULT 0,
  is_malicious BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Encrypted Flow Analysis
CREATE TABLE public.encrypted_flow_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_signature TEXT NOT NULL,
  packet_sizes JSONB NOT NULL,
  timing_patterns JSONB NOT NULL,
  source_ip INET NOT NULL,
  destination_ip INET,
  protocol TEXT NOT NULL,
  flow_direction TEXT NOT NULL,
  anomaly_score NUMERIC NOT NULL DEFAULT 0,
  pattern_type TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_level NUMERIC NOT NULL DEFAULT 0.5,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Shadow/Canary Rule Deployment Pipeline
CREATE TABLE public.rule_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL,
  deployment_phase TEXT NOT NULL DEFAULT 'shadow', -- shadow, canary, production
  traffic_percentage NUMERIC NOT NULL DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  success_rate NUMERIC NOT NULL DEFAULT 0,
  false_positive_rate NUMERIC NOT NULL DEFAULT 0,
  performance_impact NUMERIC NOT NULL DEFAULT 0,
  auto_promote BOOLEAN NOT NULL DEFAULT true,
  promotion_criteria JSONB NOT NULL DEFAULT '{"min_success_rate": 0.95, "max_false_positive": 0.05}'::jsonb,
  current_status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Dynamic Honeypot Generation
CREATE TABLE public.dynamic_honeypots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  honeypot_id UUID NOT NULL,
  api_schema JSONB NOT NULL,
  endpoint_pattern TEXT NOT NULL,
  response_templates JSONB NOT NULL,
  interaction_rules JSONB NOT NULL,
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  learning_source TEXT,
  effectiveness_score NUMERIC NOT NULL DEFAULT 0,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ttl TIMESTAMP WITH TIME ZONE
);

-- TTP (Tactics, Techniques, Procedures) Collection
CREATE TABLE public.attack_ttp_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  honeypot_interaction_id UUID,
  mitre_tactic TEXT NOT NULL,
  mitre_technique TEXT NOT NULL,
  technique_id TEXT NOT NULL,
  attack_pattern JSONB NOT NULL,
  payload_analysis JSONB NOT NULL,
  behavioral_signature JSONB NOT NULL,
  persistence_methods JSONB,
  lateral_movement JSONB,
  data_exfiltration JSONB,
  detected_tools TEXT[],
  attack_timeline JSONB NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  severity_level TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Predictive DDoS Analysis
CREATE TABLE public.ddos_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_window TEXT NOT NULL, -- 5min, 15min, 1hour
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  target_time TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_volume NUMERIC NOT NULL,
  predicted_attack_type TEXT NOT NULL,
  confidence_level NUMERIC NOT NULL DEFAULT 0,
  risk_factors JSONB NOT NULL,
  mitigation_recommendations JSONB NOT NULL,
  actual_volume NUMERIC,
  prediction_accuracy NUMERIC,
  early_indicators JSONB NOT NULL,
  source_patterns JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Request Burst Forecasting
CREATE TABLE public.traffic_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_time TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_requests_per_second NUMERIC NOT NULL,
  predicted_bandwidth NUMERIC NOT NULL,
  confidence_interval JSONB NOT NULL,
  model_version TEXT NOT NULL,
  feature_importance JSONB NOT NULL,
  seasonal_factors JSONB NOT NULL,
  anomaly_probability NUMERIC NOT NULL DEFAULT 0,
  recommended_scaling JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_tls_fingerprints_ja3_hash ON public.tls_fingerprints(ja3_hash);
CREATE INDEX idx_tls_fingerprints_source_ip ON public.tls_fingerprints(source_ip);
CREATE INDEX idx_encrypted_flow_patterns_source_ip ON public.encrypted_flow_patterns(source_ip);
CREATE INDEX idx_encrypted_flow_patterns_detected_at ON public.encrypted_flow_patterns(detected_at);
CREATE INDEX idx_rule_deployments_rule_id ON public.rule_deployments(rule_id);
CREATE INDEX idx_rule_deployments_phase ON public.rule_deployments(deployment_phase);
CREATE INDEX idx_dynamic_honeypots_honeypot_id ON public.dynamic_honeypots(honeypot_id);
CREATE INDEX idx_attack_ttp_patterns_technique_id ON public.attack_ttp_patterns(technique_id);
CREATE INDEX idx_ddos_predictions_target_time ON public.ddos_predictions(target_time);
CREATE INDEX idx_traffic_forecasts_forecast_time ON public.traffic_forecasts(forecast_time);

-- Enable RLS
ALTER TABLE public.tls_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_flow_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_honeypots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_ttp_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddos_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_forecasts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access" ON public.tls_fingerprints FOR ALL USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow authenticated read access" ON public.encrypted_flow_patterns FOR ALL USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow authenticated read access" ON public.rule_deployments FOR ALL USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow authenticated read access" ON public.dynamic_honeypots FOR ALL USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow authenticated read access" ON public.attack_ttp_patterns FOR ALL USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow authenticated read access" ON public.ddos_predictions FOR ALL USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Allow authenticated read access" ON public.traffic_forecasts FOR ALL USING (auth.role() = 'authenticated'::text);

-- Create functions for automated honeypot management
CREATE OR REPLACE FUNCTION public.auto_generate_honeypot_api()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generate API schema when honeypot is created
    IF NEW.type = 'api_endpoint' AND NEW.decoy_response IS NOT NULL THEN
        INSERT INTO public.dynamic_honeypots (
            honeypot_id,
            api_schema,
            endpoint_pattern,
            response_templates,
            interaction_rules,
            learning_source
        ) VALUES (
            NEW.id,
            jsonb_build_object(
                'endpoints', jsonb_build_array(
                    jsonb_build_object(
                        'path', NEW.endpoint_path,
                        'methods', ARRAY['GET', 'POST'],
                        'parameters', jsonb_build_object()
                    )
                )
            ),
            NEW.endpoint_path,
            jsonb_build_object('default', NEW.decoy_response),
            jsonb_build_object(
                'log_level', 'detailed',
                'response_delay', '100-500ms',
                'capture_payload', true
            ),
            'manual_creation'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto honeypot generation
CREATE TRIGGER auto_generate_honeypot_api_trigger
    AFTER INSERT ON public.honeypots
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_honeypot_api();

-- Function to promote rules through deployment pipeline
CREATE OR REPLACE FUNCTION public.evaluate_rule_promotion()
RETURNS void AS $$
DECLARE
    deployment_record RECORD;
BEGIN
    -- Check canary deployments for promotion
    FOR deployment_record IN 
        SELECT * FROM public.rule_deployments 
        WHERE deployment_phase = 'canary' 
        AND current_status = 'active'
        AND start_time < now() - INTERVAL '1 hour'
    LOOP
        -- Check promotion criteria
        IF deployment_record.success_rate >= (deployment_record.promotion_criteria->>'min_success_rate')::numeric
           AND deployment_record.false_positive_rate <= (deployment_record.promotion_criteria->>'max_false_positive')::numeric
           AND deployment_record.auto_promote = true THEN
            
            -- Promote to production
            UPDATE public.rule_deployments 
            SET 
                deployment_phase = 'production',
                traffic_percentage = 100,
                end_time = now()
            WHERE id = deployment_record.id;
            
            -- Update adaptive rule to active
            UPDATE public.adaptive_rules 
            SET is_active = true 
            WHERE id = deployment_record.rule_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;