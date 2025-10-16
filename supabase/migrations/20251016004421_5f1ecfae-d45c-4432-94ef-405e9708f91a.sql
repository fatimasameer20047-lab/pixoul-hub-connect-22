-- Add server-side validation function for booking times
CREATE OR REPLACE FUNCTION public.validate_booking_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  booking_datetime timestamp;
  buffer_time timestamp;
BEGIN
  -- Construct the full booking datetime
  booking_datetime := (NEW.booking_date::date + NEW.start_time::time);
  
  -- Add 30 minute buffer to current time
  buffer_time := now() + interval '30 minutes';
  
  -- Check if booking is in the future with buffer
  IF booking_datetime <= buffer_time THEN
    RAISE EXCEPTION 'Booking time must be at least 30 minutes in the future'
      USING ERRCODE = '23P01';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS validate_booking_time_trigger ON public.room_bookings;
CREATE TRIGGER validate_booking_time_trigger
  BEFORE INSERT OR UPDATE ON public.room_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_time();

-- Update chat_conversations RLS to allow staff to see relevant conversations
DROP POLICY IF EXISTS "Staff can view relevant conversations" ON public.chat_conversations;
CREATE POLICY "Staff can view relevant conversations"
ON public.chat_conversations
FOR ALL
USING (
  auth.uid() = user_id 
  OR auth.uid() = staff_user_id
  OR (is_staff_with_role(auth.uid(), 'booking') AND conversation_type IN ('room_booking', 'party_request'))
  OR (is_staff_with_role(auth.uid(), 'events_programs') AND conversation_type = 'event_organizer')
  OR (is_staff_with_role(auth.uid(), 'support') AND conversation_type = 'support')
);

-- Update chat_messages RLS to ensure staff can send messages to their assigned conversations
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can send messages in their conversations"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.staff_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND conversation_type = 'room_booking' 
      AND is_staff_with_role(auth.uid(), 'booking')
    )
    OR EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND conversation_type = 'party_request' 
      AND is_staff_with_role(auth.uid(), 'booking')
    )
    OR EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND conversation_type = 'event_organizer' 
      AND is_staff_with_role(auth.uid(), 'events_programs')
    )
    OR EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND conversation_type = 'support' 
      AND is_staff_with_role(auth.uid(), 'support')
    )
  )
);

-- Update chat_messages view policy to allow staff to see messages in their assigned conversations  
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (
      chat_conversations.user_id = auth.uid()
      OR chat_conversations.staff_user_id = auth.uid()
      OR (conversation_type IN ('room_booking', 'party_request') AND is_staff_with_role(auth.uid(), 'booking'))
      OR (conversation_type = 'event_organizer' AND is_staff_with_role(auth.uid(), 'events_programs'))
      OR (conversation_type = 'support' AND is_staff_with_role(auth.uid(), 'support'))
    )
  )
);