-- Clean up demo data from customer_deployments table
DELETE FROM customer_deployments 
WHERE customer_email IN ('admin@acme.com', 'ops@techstart.io', 'devops@ecommerceplus.com', 'security@globalbank.com', 'it@healthcaresys.com')
   OR customer_email = '' 
   OR customer_email IS NULL;