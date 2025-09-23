-- Create WAF configuration table
CREATE TABLE public.waf_configuration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waf_configuration ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage WAF configuration
CREATE POLICY "Allow authenticated users to manage WAF configuration"
ON public.waf_configuration
FOR ALL
USING (auth.role() = 'authenticated');

-- Insert default WAF configuration
INSERT INTO public.waf_configuration (config_key, config_value, description) VALUES
('global_settings', '{
  "globalRateLimit": 1000,
  "enableGeoBlocking": true,
  "enableAIAnalysis": true,
  "failOpenMode": true,
  "logLevel": "info",
  "maxProcessingTime": 100
}', 'Global WAF configuration settings'),
('security_rules', '{
  "owaspEnabled": true,
  "botDetectionEnabled": true,
  "rateLimitingEnabled": true,
  "geoBlockingEnabled": true
}', 'Security rules configuration'),
('monitoring_settings', '{
  "realTimeMonitoring": true,
  "alertThreshold": 50,
  "retentionDays": 30,
  "enableMetrics": true
}', 'Monitoring and alerting configuration');

-- Create performance metrics table
CREATE TABLE public.waf_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on metrics
ALTER TABLE public.waf_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for metrics
CREATE POLICY "Allow authenticated users to view WAF metrics"
ON public.waf_metrics
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert some sample metrics
INSERT INTO public.waf_metrics (metric_name, metric_value, metric_unit) VALUES
('cpu_usage_percent', 23.5, 'percent'),
('memory_usage_percent', 67.2, 'percent'),
('average_response_time', 45.3, 'milliseconds'),
('requests_per_second', 1247, 'rps'),
('threats_blocked_rate', 0.7, 'percent');