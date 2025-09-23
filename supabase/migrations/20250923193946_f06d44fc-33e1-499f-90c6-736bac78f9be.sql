-- Create customer deployments table for WAF management
CREATE TABLE public.customer_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  domain TEXT NOT NULL,
  deployment_type TEXT NOT NULL CHECK (deployment_type IN ('docker', 'kubernetes', 'nginx', 'envoy')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
  api_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  requests_today INTEGER DEFAULT 0,
  requests_total BIGINT DEFAULT 0,
  threats_blocked_today INTEGER DEFAULT 0,
  threats_blocked_total BIGINT DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  config_settings JSONB DEFAULT '{
    "rate_limit": 1000,
    "geo_blocking": true,
    "ai_analysis": true,
    "fail_open": true
  }'::jsonb
);

-- Enable RLS
ALTER TABLE public.customer_deployments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage customer deployments
CREATE POLICY "Allow authenticated users to manage customer deployments"
ON public.customer_deployments
FOR ALL
USING (auth.role() = 'authenticated');

-- Create WAF requests log table
CREATE TABLE public.waf_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_deployments(id),
  source_ip INET NOT NULL,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  user_agent TEXT,
  processing_time_ms INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('allow', 'block', 'challenge')),
  threat_score INTEGER DEFAULT 0,
  threat_type TEXT,
  rule_matches TEXT[],
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_size BIGINT,
  response_status INTEGER
);

-- Enable RLS on WAF requests
ALTER TABLE public.waf_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for WAF requests
CREATE POLICY "Allow authenticated users to view WAF requests"
ON public.waf_requests
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_customer_deployments_status ON public.customer_deployments(status);
CREATE INDEX idx_customer_deployments_last_seen ON public.customer_deployments(last_seen);
CREATE INDEX idx_waf_requests_customer_timestamp ON public.waf_requests(customer_id, timestamp);
CREATE INDEX idx_waf_requests_action ON public.waf_requests(action);

-- Create function to update customer statistics
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS trigger AS $$
BEGIN
  -- Update customer deployment stats when new WAF request is logged
  UPDATE public.customer_deployments 
  SET 
    requests_today = (
      SELECT COUNT(*) 
      FROM public.waf_requests 
      WHERE customer_id = NEW.customer_id 
      AND timestamp >= CURRENT_DATE
    ),
    requests_total = (
      SELECT COUNT(*) 
      FROM public.waf_requests 
      WHERE customer_id = NEW.customer_id
    ),
    threats_blocked_today = (
      SELECT COUNT(*) 
      FROM public.waf_requests 
      WHERE customer_id = NEW.customer_id 
      AND action = 'block' 
      AND timestamp >= CURRENT_DATE
    ),
    threats_blocked_total = (
      SELECT COUNT(*) 
      FROM public.waf_requests 
      WHERE customer_id = NEW.customer_id 
      AND action = 'block'
    ),
    last_seen = now(),
    updated_at = now()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update customer stats
CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT ON public.waf_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_stats();

-- Insert some sample customers for testing
INSERT INTO public.customer_deployments (customer_name, customer_email, domain, deployment_type) VALUES
('Acme Corporation', 'admin@acme.com', 'api.acme.com', 'kubernetes'),
('TechStart Inc', 'ops@techstart.io', 'app.techstart.io', 'docker'),
('Global Bank Ltd', 'security@globalbank.com', 'secure.globalbank.com', 'nginx'),
('E-Commerce Plus', 'devops@ecommerceplus.com', 'checkout.ecommerceplus.com', 'docker'),
('Healthcare Systems', 'it@healthcaresys.com', 'patient.healthcaresys.com', 'kubernetes');