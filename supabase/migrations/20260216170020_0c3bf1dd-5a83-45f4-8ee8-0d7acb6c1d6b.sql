
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule recurring transactions processing at midnight Thai time (17:00 UTC)
SELECT cron.schedule(
  'process-recurring-transactions-midnight',
  '0 17 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://vpoldjlbrkzvxqlgwvgk.supabase.co/functions/v1/process-recurring-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwb2xkamxicmt6dnhxbGd3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTYxMTksImV4cCI6MjA4MzY3MjExOX0.BoYlulzDqHy7R_OdAFMducaO0xDB3UewREMgg5vYats"}'::jsonb,
        body:='{"time": "midnight-thai"}'::jsonb
    ) AS request_id;
  $$
);
