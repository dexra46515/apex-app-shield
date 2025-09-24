-- Create tables for real cloud deployment functionality

-- Cloud provider credentials (encrypted)
CREATE TABLE public.cloud_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('aws', 'gcp', 'azure', 'digitalocean', 'vercel', 'railway')),
    credential_name TEXT NOT NULL,
    encrypted_credentials JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cloud_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies for cloud credentials
CREATE POLICY "Users can manage their own cloud credentials" 
ON public.cloud_credentials 
FOR ALL 
USING (auth.uid() = user_id);

-- Real deployment tracking
CREATE TABLE public.live_deployments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    deployment_model TEXT NOT NULL,
    cloud_provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'deploying' CHECK (status IN ('deploying', 'active', 'failed', 'updating', 'terminated')),
    infrastructure_id TEXT, -- Cloud resource ID (ECS task, Cloud Run service, etc.)
    public_url TEXT,
    internal_endpoints JSONB,
    deployment_config JSONB NOT NULL,
    deployment_logs JSONB,
    cost_estimate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    terminated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.live_deployments ENABLE ROW LEVEL SECURITY;

-- RLS policies for deployments
CREATE POLICY "Users can view deployments for their customers" 
ON public.live_deployments 
FOR SELECT 
USING (
    customer_id IN (
        SELECT id FROM public.customer_deployments 
        WHERE customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

CREATE POLICY "Users can manage deployments for their customers" 
ON public.live_deployments 
FOR ALL 
USING (
    customer_id IN (
        SELECT id FROM public.customer_deployments 
        WHERE customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Deployment artifacts storage
CREATE TABLE public.deployment_artifacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    deployment_id UUID NOT NULL REFERENCES public.live_deployments(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('docker_image', 'config_files', 'infrastructure_template', 'ssl_certificate')),
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    checksum TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deployment_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for artifacts
CREATE POLICY "Users can access artifacts for their deployments" 
ON public.deployment_artifacts 
FOR ALL 
USING (
    deployment_id IN (
        SELECT id FROM public.live_deployments 
        WHERE customer_id IN (
            SELECT id FROM public.customer_deployments 
            WHERE customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
);

-- Create storage bucket for deployment artifacts
INSERT INTO storage.buckets (id, name, public) VALUES ('deployment-artifacts', 'deployment-artifacts', false);

-- Storage policies for deployment artifacts
CREATE POLICY "Users can manage their deployment artifacts" 
ON storage.objects 
FOR ALL 
USING (
    bucket_id = 'deployment-artifacts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add triggers for updated_at
CREATE TRIGGER update_cloud_credentials_updated_at
    BEFORE UPDATE ON public.cloud_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_deployments_updated_at
    BEFORE UPDATE ON public.live_deployments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();