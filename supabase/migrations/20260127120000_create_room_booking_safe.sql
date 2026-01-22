-- Safe room booking creation to prevent overlaps (allows back-to-back)
create or replace function public.create_room_booking_safe(
  p_user_id uuid,
  p_room_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_duration_hours integer,
  p_total_amount numeric,
  p_status text,
  p_payment_status text,
  p_notes text,
  p_contact_phone text,
  p_contact_email text,
  p_booking_source text default null,
  p_package_label text default null
) returns public.room_bookings
language plpgsql
as $$
declare
  v_booking public.room_bookings;
begin
  -- serialize concurrent inserts for the same room/day
  perform pg_advisory_xact_lock(hashtext(p_room_id::text || ':' || p_booking_date::text));

  -- check overlap using half-open range [start, end)
  if exists (
    select 1
    from public.room_bookings rb
    where rb.room_id = p_room_id
      and rb.booking_date = p_booking_date
      and rb.status is not null
      and rb.status not in ('cancelled', 'canceled', 'rejected')
      and tsrange(rb.booking_date + rb.start_time, rb.booking_date + rb.end_time, '[)')
          && tsrange(p_booking_date + p_start_time, p_booking_date + p_end_time, '[)')
  ) then
    raise exception 'TIME_SLOT_ALREADY_BOOKED' using errcode = '23P01';
  end if;

  insert into public.room_bookings (
    user_id,
    room_id,
    booking_date,
    start_time,
    end_time,
    duration_hours,
    total_amount,
    status,
    payment_status,
    notes,
    contact_phone,
    contact_email,
    booking_source,
    package_label
  ) values (
    p_user_id,
    p_room_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_duration_hours,
    p_total_amount,
    p_status,
    p_payment_status,
    p_notes,
    p_contact_phone,
    p_contact_email,
    p_booking_source,
    p_package_label
  )
  returning * into v_booking;

  return v_booking;
end;
$$;
