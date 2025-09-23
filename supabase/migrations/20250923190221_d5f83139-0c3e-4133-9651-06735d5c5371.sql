-- Add missing advanced WAF features tables

-- AI Anomaly Detection
CREATE TABLE public.ai_anomaly_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  source_ip INET NOT NULL,
  anomaly_score DECIMAL(5,2) NOT NULL,
  behavior_pattern JSONB NOT NULL,
  ai_analysis_result JSONB NOT NULL,
  threat_level TEXT CHECK (threat_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  mitigation_action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deception Mesh (Honeypots)
CREATE TABLE public.honeypots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('web', 'api', 'database', 'file', 'login')) NOT NULL,
  endpoint_path TEXT NOT NULL,
  decoy_response JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.honeypot_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  honeypot_id UUID NOT NULL REFERENCES public.honeypots(id) ON DELETE CASCADE,
  source_ip INET NOT NULL,
  user_agent TEXT,
  request_method TEXT NOT NULL,
  request_headers JSONB,
  request_body TEXT,
  threat_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adaptive Security Rules
CREATE TABLE public.adaptive_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  condition_pattern JSONB NOT NULL,
  action_type TEXT CHECK (action_type IN ('block', 'rate_limit', 'monitor', 'redirect', 'captcha')) NOT NULL,
  action_parameters JSONB DEFAULT '{}',
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  learning_confidence DECIMAL(3,2) DEFAULT 0.5,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Device Attestation
CREATE TABLE public.device_attestations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL UNIQUE,
  attestation_token TEXT NOT NULL,
  trust_level TEXT CHECK (trust_level IN ('trusted', 'suspicious', 'untrusted')) NOT NULL DEFAULT 'suspicious',
  platform_info JSONB NOT NULL,
  security_features JSONB NOT NULL,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed')) NOT NULL DEFAULT 'pending',
  last_verified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Schema Violations (extends existing api_schemas)
CREATE TABLE public.schema_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_schema_id UUID NOT NULL REFERENCES public.api_schemas(id) ON DELETE CASCADE,
  source_ip INET NOT NULL,
  violation_type TEXT CHECK (violation_type IN ('request_invalid', 'response_invalid', 'missing_field', 'type_mismatch', 'extra_field')) NOT NULL,
  violation_details JSONB NOT NULL,
  request_data JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BOLA Prevention
CREATE TABLE public.user_access_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  access_method TEXT NOT NULL,
  authorization_valid BOOLEAN NOT NULL,
  ownership_verified BOOLEAN NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Geo/ASN Blocking
CREATE TABLE public.geo_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code CHAR(2),
  region TEXT,
  asn INTEGER,
  organization TEXT,
  restriction_type TEXT CHECK (restriction_type IN ('block', 'monitor', 'rate_limit')) NOT NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Custom Security Rules Engine
CREATE TABLE public.custom_security_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  rule_category TEXT CHECK (rule_category IN ('input_validation', 'authentication', 'authorization', 'data_protection', 'rate_limiting', 'bot_detection', 'threat_intelligence')) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  match_count INTEGER NOT NULL DEFAULT 0,
  last_matched TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SIEM Integration Logs
CREATE TABLE public.siem_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')) NOT NULL,
  event_data JSONB NOT NULL,
  correlation_id TEXT,
  exported_to_siem BOOLEAN NOT NULL DEFAULT false,
  export_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Compliance Reporting
CREATE TABLE public.compliance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT CHECK (report_type IN ('pci_dss', 'gdpr', 'hipaa', 'sox', 'iso27001')) NOT NULL,
  report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  compliance_score DECIMAL(5,2) NOT NULL,
  findings JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  report_data JSONB NOT NULL,
  generated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honeypots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honeypot_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siem_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to read all security data)
CREATE POLICY "Allow authenticated read access" ON public.ai_anomaly_detections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.honeypots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.honeypot_interactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.adaptive_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.device_attestations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.schema_violations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.user_access_patterns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.geo_restrictions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.custom_security_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.siem_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.compliance_reports FOR SELECT USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX idx_ai_anomaly_detections_ip ON public.ai_anomaly_detections(source_ip);
CREATE INDEX idx_ai_anomaly_detections_created_at ON public.ai_anomaly_detections(created_at);
CREATE INDEX idx_honeypot_interactions_ip ON public.honeypot_interactions(source_ip);
CREATE INDEX idx_honeypot_interactions_created_at ON public.honeypot_interactions(created_at);
CREATE INDEX idx_adaptive_rules_active ON public.adaptive_rules(is_active);
CREATE INDEX idx_device_attestations_fingerprint ON public.device_attestations(device_fingerprint);
CREATE INDEX idx_schema_violations_ip ON public.schema_violations(source_ip);
CREATE INDEX idx_user_access_patterns_user_id ON public.user_access_patterns(user_id);
CREATE INDEX idx_user_access_patterns_created_at ON public.user_access_patterns(created_at);
CREATE INDEX idx_geo_restrictions_active ON public.geo_restrictions(is_active);
CREATE INDEX idx_custom_security_rules_active ON public.custom_security_rules(is_active);
CREATE INDEX idx_siem_events_created_at ON public.siem_events(created_at);
CREATE INDEX idx_compliance_reports_created_at ON public.compliance_reports(created_at);

-- Insert default honeypots
INSERT INTO public.honeypots (name, type, endpoint_path, decoy_response) VALUES
('Admin Panel Honeypot', 'web', '/admin', '{"status": "success", "message": "Admin panel loaded", "users": [{"id": 1, "username": "admin", "role": "administrator"}]}'),
('API Key Honeypot', 'api', '/api/keys', '{"api_keys": [{"key": "sk-fake123456789", "name": "production", "permissions": ["read", "write"]}]}'),
('Database Backup Honeypot', 'file', '/backups/db.sql', '{"file": "database_backup_2024.sql", "size": "2.1GB", "created": "2024-01-15"}'),
('Login Honeypot', 'login', '/wp-admin', '{"status": "success", "redirect": "/dashboard", "session": "sess_fake123"}'),
('Config File Honeypot', 'file', '/.env', '{"database_url": "fake://user:pass@host/db", "api_key": "fake_key_123"}');

-- Insert default geo restrictions (block high-risk countries)
INSERT INTO public.geo_restrictions (country_code, restriction_type, reason) VALUES
('CN', 'monitor', 'High volume of automated attacks'),
('RU', 'monitor', 'High volume of automated attacks'),
('KP', 'block', 'Sanctions and security policy');

-- Triggers for updated_at
CREATE TRIGGER update_custom_security_rules_updated_at
BEFORE UPDATE ON public.custom_security_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();