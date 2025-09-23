-- Allow ISO 27001 report type in compliance_reports
ALTER TABLE public.compliance_reports
  DROP CONSTRAINT IF EXISTS compliance_reports_report_type_check;

ALTER TABLE public.compliance_reports
  ADD CONSTRAINT compliance_reports_report_type_check
  CHECK (report_type IN ('pci_dss','gdpr','hipaa','sox','iso_27001'));
