-- Step 1: Drop the bad FK constraint on guest_communications.guest_profile_id
ALTER TABLE public.guest_communications
  DROP CONSTRAINT guest_communications_guest_profile_id_fkey;

-- Step 2: Fix existing rows - map guest_profile_id from guests.id to guest_profiles.id
UPDATE public.guest_communications gc
SET guest_profile_id = gp.id
FROM public.guest_profiles gp
WHERE gc.guest_profile_id = gp.guest_id;

-- Step 3: Recreate the FK pointing to guest_profiles
ALTER TABLE public.guest_communications
  ADD CONSTRAINT guest_communications_guest_profile_id_fkey
  FOREIGN KEY (guest_profile_id) REFERENCES public.guest_profiles(id) ON DELETE CASCADE;
