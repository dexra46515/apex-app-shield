-- Hardware-Signed Logs table for cryptographic proof
CREATE TABLE public.hardware_signed_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    log_data JSONB NOT NULL,
    hardware_signature TEXT NOT NULL,
    chain_hash TEXT NOT NULL UNIQUE,
    previous_hash TEXT NOT NULL,
    tpm_pcr_values JSONB,
    integrity_verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced Device Attestations for TPM/TEE support
ALTER TABLE public.device_attestations 
ADD COLUMN IF NOT EXISTS tpm_version TEXT,
ADD COLUMN IF NOT EXISTS tee_type TEXT CHECK (tee_type IN ('TrustZone', 'Intel_SGX', 'AMD_PSP')),
ADD COLUMN IF NOT EXISTS hardware_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pcr_values JSONB,
ADD COLUMN IF NOT EXISTS attestation_chain_valid BOOLEAN DEFAULT false;

-- Update trust_level enum to include 'conditional'
ALTER TABLE public.device_attestations 
DROP CONSTRAINT IF EXISTS device_attestations_trust_level_check;

ALTER TABLE public.device_attestations 
ADD CONSTRAINT device_attestations_trust_level_check 
CHECK (trust_level IN ('trusted', 'conditional', 'suspicious', 'untrusted'));

-- Hardware Trust Metrics table
CREATE TABLE public.hardware_trust_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    device_fingerprint TEXT,
    measurement_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    attestation_source TEXT CHECK (attestation_source IN ('TPM', 'TEE', 'HSM', 'manual')),
    trust_chain_depth INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_hardware_logs_chain ON public.hardware_signed_logs(chain_hash);
CREATE INDEX idx_hardware_logs_timestamp ON public.hardware_signed_logs(created_at);
CREATE INDEX idx_device_attestations_hardware ON public.device_attestations(hardware_verified, trust_level);
CREATE INDEX idx_trust_metrics_device ON public.hardware_trust_metrics(device_fingerprint, measurement_time);

-- RLS Policies
ALTER TABLE public.hardware_signed_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_trust_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to hardware logs" 
ON public.hardware_signed_logs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read access to trust metrics" 
ON public.hardware_trust_metrics 
FOR SELECT 
USING (auth.role() = 'authenticated');