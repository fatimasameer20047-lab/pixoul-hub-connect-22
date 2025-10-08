-- Create function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_room_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM room_bookings
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND status = 'confirmed'
      AND id != COALESCE(p_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (p_start_time < end_time AND p_end_time > start_time)
      )
  );
END;
$$;

-- Create function to get available time slots for a room on a date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_room_id uuid,
  p_booking_date date
)
RETURNS TABLE(
  start_time time,
  end_time time
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operating_start time := '10:00:00';
  operating_end time := '23:00:00';
BEGIN
  -- Return all time slots that don't conflict with confirmed bookings
  RETURN QUERY
  WITH booked_slots AS (
    SELECT rb.start_time, rb.end_time
    FROM room_bookings rb
    WHERE rb.room_id = p_room_id
      AND rb.booking_date = p_booking_date
      AND rb.status = 'confirmed'
    ORDER BY rb.start_time
  )
  SELECT 
    CASE 
      WHEN LAG(bs.end_time) OVER (ORDER BY bs.start_time) IS NULL 
      THEN operating_start
      ELSE LAG(bs.end_time) OVER (ORDER BY bs.start_time)
    END as start_time,
    bs.start_time as end_time
  FROM booked_slots bs
  WHERE CASE 
    WHEN LAG(bs.end_time) OVER (ORDER BY bs.start_time) IS NULL 
    THEN operating_start
    ELSE LAG(bs.end_time) OVER (ORDER BY bs.start_time)
  END < bs.start_time
  UNION ALL
  SELECT 
    COALESCE((SELECT MAX(end_time) FROM booked_slots), operating_start) as start_time,
    operating_end as end_time
  WHERE COALESCE((SELECT MAX(end_time) FROM booked_slots), operating_start) < operating_end;
END;
$$;

-- Create trigger function to validate bookings
CREATE OR REPLACE FUNCTION validate_booking_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check for conflicts on confirmed bookings
  IF NEW.status = 'confirmed' THEN
    IF check_booking_conflict(
      NEW.room_id,
      NEW.booking_date,
      NEW.start_time,
      NEW.end_time,
      NEW.id
    ) THEN
      RAISE EXCEPTION 'This room is not available at that time. Please choose another time slot.'
        USING ERRCODE = '23P01';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on room_bookings
DROP TRIGGER IF EXISTS check_booking_conflict_trigger ON room_bookings;
CREATE TRIGGER check_booking_conflict_trigger
  BEFORE INSERT OR UPDATE ON room_bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_conflict();

-- Enable realtime for room_bookings (set replica identity)
ALTER TABLE room_bookings REPLICA IDENTITY FULL;