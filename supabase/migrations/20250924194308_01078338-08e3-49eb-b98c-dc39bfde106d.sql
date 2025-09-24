-- Developer-Centric WAF Features Database Schema

-- GitOps Security Policies Table
CREATE TABLE public.gitops_security_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  repository_url TEXT NOT NULL,
  branch_name TEXT NOT NULL DEFAULT 'main',
  policy_file_path TEXT NOT NULL DEFAULT '.waf/security-policies.yaml',
  git_provider TEXT NOT NULL DEFAULT 'github', -- github, gitlab, bitbucket
  access_token_encrypted TEXT, -- encrypted git access token
  webhook_secret TEXT,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'pending', -- pending, synced, failed
  policy_version TEXT,
  auto_deploy BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Local Development WAF Configurations
CREATE TABLE public.dev_waf_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  config_name TEXT NOT NULL,
  framework TEXT NOT NULL, -- express, fastify, next, django, laravel, etc.
  config_template JSONB NOT NULL,
  middleware_code TEXT NOT NULL, -- actual code to inject
  docker_config TEXT, -- dockerfile/compose config
  npm_package_config JSONB, -- package.json additions
  environment_vars JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CI/CD Security Test Results
CREATE TABLE public.cicd_security_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  repository_url TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  pipeline_id TEXT, -- github actions run id, gitlab pipeline id, etc.
  test_suite_name TEXT NOT NULL,
  test_results JSONB NOT NULL,
  security_score INTEGER NOT NULL DEFAULT 0,
  vulnerabilities_found INTEGER NOT NULL DEFAULT 0,
  test_duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running', -- running, passed, failed, error
  error_message TEXT,
  artifacts_url TEXT, -- link to test artifacts/reports
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Real-time Debug Sessions
CREATE TABLE public.debug_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  session_name TEXT NOT NULL,
  target_domain TEXT NOT NULL,
  debug_mode TEXT NOT NULL DEFAULT 'live', -- live, replay, trace
  filters JSONB NOT NULL DEFAULT '{}', -- ip, path, method filters
  capture_settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  events_captured INTEGER NOT NULL DEFAULT 0,
  session_duration_minutes INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Real-time Debug Events (linked to sessions)
CREATE TABLE public.debug_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.debug_sessions(id) ON DELETE CASCADE,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_ip INET NOT NULL,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_headers JSONB,
  request_body TEXT,
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  rule_matches JSONB, -- which security rules were triggered
  processing_stack_trace JSONB, -- actual stack trace of processing
  threat_analysis JSONB,
  action_taken TEXT NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gitops_security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_waf_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cicd_security_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can manage their GitOps policies" ON public.gitops_security_policies
  FOR ALL USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can manage dev WAF configs" ON public.dev_waf_configs
  FOR ALL USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can view CI/CD test results" ON public.cicd_security_tests
  FOR ALL USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can manage debug sessions" ON public.debug_sessions
  FOR ALL USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can view debug events" ON public.debug_events
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.debug_sessions 
      WHERE auth.role() = 'authenticated'::text
    )
  );

-- Triggers for updated_at timestamps
CREATE TRIGGER update_gitops_policies_updated_at
  BEFORE UPDATE ON public.gitops_security_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dev_waf_configs_updated_at
  BEFORE UPDATE ON public.dev_waf_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_gitops_policies_customer_id ON public.gitops_security_policies(customer_id);
CREATE INDEX idx_dev_waf_configs_customer_id ON public.dev_waf_configs(customer_id);
CREATE INDEX idx_cicd_tests_customer_id ON public.cicd_security_tests(customer_id);
CREATE INDEX idx_debug_sessions_customer_id ON public.debug_sessions(customer_id);
CREATE INDEX idx_debug_events_session_id ON public.debug_events(session_id);
CREATE INDEX idx_debug_events_timestamp ON public.debug_events(event_timestamp);