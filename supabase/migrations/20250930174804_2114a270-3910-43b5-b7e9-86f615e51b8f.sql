-- Add new staff roles to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'booking';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'events_programs';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'snacks';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'gallery';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'guides';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support';