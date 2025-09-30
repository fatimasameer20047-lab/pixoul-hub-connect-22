-- Create function to check if user has staff email with specific role
CREATE OR REPLACE FUNCTION public.is_staff_with_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = _user_id;
  
  -- Check if email matches staff pattern
  IF user_email LIKE '%@staffportal.com' THEN
    -- Extract staff name from email (e.g., 'sara' from 'sara@staffportal.com')
    CASE lower(split_part(user_email, '@', 1))
      WHEN 'sara' THEN RETURN _role = 'booking';
      WHEN 'ahmed' THEN RETURN _role = 'events_programs';
      WHEN 'farah' THEN RETURN _role = 'snacks';
      WHEN 'ali' THEN RETURN _role = 'gallery';
      WHEN 'noor' THEN RETURN _role = 'guides';
      WHEN 'mohamed' THEN RETURN _role = 'support';
      ELSE RETURN FALSE;
    END CASE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Drop ALL existing staff-related policies
DROP POLICY IF EXISTS "Snacks staff can manage snacks" ON public.snacks;
DROP POLICY IF EXISTS "Booking staff can manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "Guides staff can manage guides" ON public.guides;
DROP POLICY IF EXISTS "Guides staff can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Gallery staff can manage all posts" ON public.gallery_items;
DROP POLICY IF EXISTS "Events staff can manage registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Events staff can manage events and registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Events staff can manage events" ON public.events_programs;
DROP POLICY IF EXISTS "Staff can view relevant conversations" ON public.chat_conversations;

-- Recreate policies using the new staff function
CREATE POLICY "Snacks staff can manage snacks"
ON public.snacks
FOR ALL
USING (is_staff_with_role(auth.uid(), 'snacks'));

CREATE POLICY "Booking staff can manage rooms"
ON public.rooms
FOR ALL
USING (is_staff_with_role(auth.uid(), 'booking'));

CREATE POLICY "Guides staff can manage guides"
ON public.guides
FOR ALL
USING (is_staff_with_role(auth.uid(), 'guides'));

CREATE POLICY "Guides staff can manage announcements"
ON public.announcements
FOR ALL
USING (is_staff_with_role(auth.uid(), 'guides'));

CREATE POLICY "Gallery staff can manage all posts"
ON public.gallery_items
FOR ALL
USING (is_staff_with_role(auth.uid(), 'gallery'));

CREATE POLICY "Events staff can manage registrations"
ON public.event_registrations
FOR ALL
USING (is_staff_with_role(auth.uid(), 'events_programs'));

CREATE POLICY "Events staff can manage events"
ON public.events_programs
FOR ALL
USING (is_staff_with_role(auth.uid(), 'events_programs'));

-- Update chat conversation policies for support staff
CREATE POLICY "Staff can view relevant conversations"
ON public.chat_conversations
FOR ALL
USING (
  auth.uid() = user_id OR
  auth.uid() = staff_user_id OR
  is_staff_with_role(auth.uid(), 'booking') AND conversation_type IN ('room_booking', 'party_request') OR
  is_staff_with_role(auth.uid(), 'events_programs') AND conversation_type = 'event_organizer' OR
  is_staff_with_role(auth.uid(), 'support') AND conversation_type = 'support'
);