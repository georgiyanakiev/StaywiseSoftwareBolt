-- Normalize maintenance_requests statuses to canonical values:
-- reported, in_progress, completed
-- Old values: pending -> reported, open -> reported, resolved -> completed

UPDATE public.maintenance_requests SET status = 'reported' WHERE status = 'pending';
UPDATE public.maintenance_requests SET status = 'reported' WHERE status = 'open';
UPDATE public.maintenance_requests SET status = 'completed' WHERE status = 'resolved';

-- Add CHECK constraint for valid statuses
ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_status_check
  CHECK (status IN ('reported', 'in_progress', 'completed'));

-- Add CHECK constraint for valid categories
ALTER TABLE public.maintenance_requests
  DROP CONSTRAINT IF EXISTS maintenance_requests_category_check;
ALTER TABLE public.maintenance_requests
  ADD CONSTRAINT maintenance_requests_category_check
  CHECK (category IN ('plumbing', 'electrical', 'hvac', 'furniture', 'appliance', 'structural', 'it', 'electronics', 'carpentry', 'cleaning', 'other'));
