-- WAF Platform Database Schema

-- Security Events and Traffic Logs
CREATE TABLE public.security_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type TEXT NOT NULL CHECK (event_type IN ('block', 'allow', 'monitor', 'alert')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source_ip INET NOT NULL,
    destination_ip INET,
    user_agent TEXT,
    request_method TEXT,
    request_path TEXT,
    request_headers JSONB,
    response_status INTEGER,
    response_size BIGINT,
    rule_id UUID,
    threat_type TEXT,
    country_code TEXT,
    asn INTEGER,
    blocked BOOLEAN DEFAULT false,
    payload TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security Rules Engine
CREATE TABLE public.security_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('owasp', 'api', 'bot', 'ddos', 'custom')),
    category TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API Schema Validation
CREATE TABLE public.api_schemas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    path_pattern TEXT NOT NULL,
    method TEXT NOT NULL,
    schema_definition JSONB NOT NULL,
    validation_enabled BOOLEAN DEFAULT true,
    strict_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threat Intelligence
CREATE TABLE public.threat_intelligence (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET,
    domain TEXT,
    hash_value TEXT,
    threat_type TEXT NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    source TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IP Reputation and GeoLocation
CREATE TABLE public.ip_reputation (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reputation_score INTEGER CHECK (reputation_score >= 0 AND reputation_score <= 100),
    country_code CHAR(2),
    asn INTEGER,
    is_tor BOOLEAN DEFAULT false,
    is_proxy BOOLEAN DEFAULT false,
    is_vpn BOOLEAN DEFAULT false,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate Limiting and DDoS Protection
CREATE TABLE public.rate_limit_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    path_pattern TEXT,
    method TEXT,
    limit_type TEXT NOT NULL CHECK (limit_type IN ('requests_per_second', 'requests_per_minute', 'requests_per_hour', 'concurrent_connections')),
    limit_value INTEGER NOT NULL,
    window_size INTEGER NOT NULL,
    source_criteria TEXT NOT NULL CHECK (source_criteria IN ('ip', 'user_agent', 'api_key', 'session')),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bot Detection and Mitigation
CREATE TABLE public.bot_signatures (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    signature_type TEXT NOT NULL CHECK (signature_type IN ('user_agent', 'behavior', 'fingerprint')),
    pattern TEXT NOT NULL,
    bot_type TEXT NOT NULL CHECK (bot_type IN ('good', 'bad', 'suspicious')),
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Real-time Alerts and Notifications
CREATE TABLE public.security_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    source_ip INET,
    rule_id UUID REFERENCES public.security_rules(id),
    event_count INTEGER DEFAULT 1,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged BOOLEAN DEFAULT false,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WAF Configuration Settings
CREATE TABLE public.waf_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Sessions and Authentication
CREATE TABLE public.user_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'viewer')),
    display_name TEXT,
    email TEXT,
    last_login TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waf_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view security events" ON public.security_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert security events" ON public.security_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can manage security rules" ON public.security_rules FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage API schemas" ON public.api_schemas FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can view threat intelligence" ON public.threat_intelligence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage IP reputation" ON public.ip_reputation FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage rate limit rules" ON public.rate_limit_rules FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage bot signatures" ON public.bot_signatures FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage security alerts" ON public.security_alerts FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage WAF config" ON public.waf_config FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage their own profile" ON public.user_profiles FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_security_events_timestamp ON public.security_events(timestamp DESC);
CREATE INDEX idx_security_events_source_ip ON public.security_events(source_ip);
CREATE INDEX idx_security_events_threat_type ON public.security_events(threat_type);
CREATE INDEX idx_security_rules_enabled ON public.security_rules(enabled) WHERE enabled = true;
CREATE INDEX idx_threat_intelligence_ip ON public.threat_intelligence(ip_address);
CREATE INDEX idx_ip_reputation_ip ON public.ip_reputation(ip_address);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);

-- Real-time subscriptions
ALTER TABLE public.security_events REPLICA IDENTITY FULL;
ALTER TABLE public.security_alerts REPLICA IDENTITY FULL;

-- Insert default WAF configuration
INSERT INTO public.waf_config (config_key, config_value, description, category) VALUES
('owasp_protection', '{"enabled": true, "paranoia_level": 2}', 'OWASP Top 10 protection settings', 'security'),
('ddos_protection', '{"enabled": true, "threshold": 1000, "window": 60}', 'DDoS protection configuration', 'security'),
('bot_protection', '{"enabled": true, "challenge_suspicious": true}', 'Bot detection and mitigation', 'security'),
('api_validation', '{"enabled": true, "strict_mode": false}', 'API schema validation settings', 'api'),
('logging', '{"level": "info", "retention_days": 30}', 'Logging configuration', 'system'),
('notifications', '{"email_alerts": true, "webhook_url": null}', 'Alert notification settings', 'alerts');

-- Insert default security rules
INSERT INTO public.security_rules (name, description, rule_type, category, severity, conditions, actions) VALUES
('SQL Injection Protection', 'Detects and blocks SQL injection attempts', 'owasp', 'injection', 'high', 
 '{"patterns": ["union.*select", "drop.*table", "exec.*xp_"], "fields": ["query", "body", "headers"]}',
 '{"action": "block", "log": true, "alert": true}'),
('XSS Protection', 'Cross-site scripting attack prevention', 'owasp', 'xss', 'high',
 '{"patterns": ["<script", "javascript:", "onload="], "fields": ["body", "query", "headers"]}',
 '{"action": "block", "log": true, "alert": true}'),
('Rate Limiting', 'Prevents excessive requests from single source', 'ddos', 'rate_limit', 'medium',
 '{"requests_per_minute": 100, "source": "ip"}',
 '{"action": "rate_limit", "log": true}'),
('Bot Detection', 'Identifies and manages bot traffic', 'bot', 'automation', 'low',
 '{"user_agent_patterns": ["bot", "crawler", "spider"], "behavior_score_threshold": 80}',
 '{"action": "challenge", "log": true}');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER update_security_rules_updated_at BEFORE UPDATE ON public.security_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_api_schemas_updated_at BEFORE UPDATE ON public.api_schemas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ip_reputation_updated_at BEFORE UPDATE ON public.ip_reputation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_waf_config_updated_at BEFORE UPDATE ON public.waf_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();