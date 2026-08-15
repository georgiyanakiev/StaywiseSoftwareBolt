-- Add 'simulated' to allowed statuses for channel_sync_logs
ALTER TABLE public.channel_sync_logs
  DROP CONSTRAINT IF EXISTS channel_sync_logs_status_check;
ALTER TABLE public.channel_sync_logs
  ADD CONSTRAINT channel_sync_logs_status_check
  CHECK (status IN ('success', 'failed', 'partial', 'simulated'));

-- Add missing dates_affected column
ALTER TABLE public.channel_sync_logs
  ADD COLUMN IF NOT EXISTS dates_affected integer DEFAULT 0;
