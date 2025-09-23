-- Fix security warnings by properly dropping dependencies first

-- Drop triggers first
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.waf_requests;
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON public.waf_requests;
DROP TRIGGER IF EXISTS trigger_enrich_security_event_geo ON public.security_events;

-- Now drop functions with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS public.update_customer_stats() CASCADE;
DROP FUNCTION IF EXISTS public.enrich_security_event_geo() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate update_updated_at_column with security definer
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate update_customer_stats with security definer
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;

-- Recreate enrich_security_event_geo with security definer
CREATE OR REPLACE FUNCTION public.enrich_security_event_geo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Simple IP to country mapping (basic implementation)
    -- Default to 'Unknown' if no match
    NEW.country_code := 'Unknown';
    
    -- Basic IP range mappings for demonstration
    -- US IP ranges (simplified)
    IF (NEW.source_ip >= '8.0.0.0'::inet AND NEW.source_ip <= '8.255.255.255'::inet) OR
       (NEW.source_ip >= '4.0.0.0'::inet AND NEW.source_ip <= '4.255.255.255'::inet) THEN
        NEW.country_code := 'US';
    -- Chinese IP ranges (simplified)
    ELSIF (NEW.source_ip >= '1.0.0.0'::inet AND NEW.source_ip <= '1.255.255.255'::inet) OR
          (NEW.source_ip >= '14.0.0.0'::inet AND NEW.source_ip <= '14.255.255.255'::inet) THEN
        NEW.country_code := 'CN';
    -- Russian IP ranges (simplified)
    ELSIF (NEW.source_ip >= '5.0.0.0'::inet AND NEW.source_ip <= '5.255.255.255'::inet) OR
          (NEW.source_ip >= '37.0.0.0'::inet AND NEW.source_ip <= '37.255.255.255'::inet) THEN
        NEW.country_code := 'RU';
    -- UK IP ranges (simplified)
    ELSIF (NEW.source_ip >= '2.0.0.0'::inet AND NEW.source_ip <= '2.255.255.255'::inet) OR
          (NEW.source_ip >= '81.0.0.0'::inet AND NEW.source_ip <= '81.255.255.255'::inet) THEN
        NEW.country_code := 'GB';
    -- German IP ranges (simplified)
    ELSIF (NEW.source_ip >= '3.0.0.0'::inet AND NEW.source_ip <= '3.255.255.255'::inet) OR
          (NEW.source_ip >= '62.0.0.0'::inet AND NEW.source_ip <= '62.255.255.255'::inet) THEN
        NEW.country_code := 'DE';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_update_customer_stats
    AFTER INSERT ON public.waf_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_stats();

CREATE TRIGGER trigger_enrich_security_event_geo
    BEFORE INSERT ON public.security_events
    FOR EACH ROW
    EXECUTE FUNCTION public.enrich_security_event_geo();