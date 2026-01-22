-- Add contact phone to event registrations and allow optional email
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE public.event_registrations
ALTER COLUMN participant_email DROP NOT NULL;
