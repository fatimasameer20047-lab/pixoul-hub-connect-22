-- Create tables for booking system

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'pc', 'vip', 'social'
  capacity INTEGER NOT NULL,
  hourly_rate DECIMAL(10,2),
  description TEXT,
  amenities TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Room bookings table
CREATE TABLE public.room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL,
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Party requests table
CREATE TABLE public.party_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  party_type TEXT NOT NULL CHECK (party_type IN ('birthday', 'graduation', 'other')),
  age INTEGER,
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  guest_count INTEGER NOT NULL,
  theme TEXT,
  special_notes TEXT,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed')),
  staff_notes TEXT,
  estimated_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Events and programs table
CREATE TABLE public.events_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event', 'program')),
  category TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  location TEXT,
  instructor TEXT,
  requirements TEXT[],
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Event registrations table
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events_programs(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  party_size INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Guides table
CREATE TABLE public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  game_name TEXT NOT NULL,
  category TEXT,
  age_rating TEXT,
  intensity_level TEXT CHECK (intensity_level IN ('low', 'medium', 'high')),
  duration_minutes INTEGER,
  overview TEXT NOT NULL,
  setup_instructions TEXT NOT NULL,
  how_to_play TEXT NOT NULL,
  tips_and_scoring TEXT,
  media_urls TEXT[],
  qr_code_data TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat conversations table (for staff-customer communication)
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('room_booking', 'party_request', 'event_organizer', 'support')),
  reference_id UUID, -- ID of the booking, party request, event, etc.
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Add update triggers
CREATE TRIGGER update_room_bookings_updated_at
  BEFORE UPDATE ON public.room_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_party_requests_updated_at
  BEFORE UPDATE ON public.party_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_programs_updated_at
  BEFORE UPDATE ON public.events_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Rooms - public read access
CREATE POLICY "Rooms are viewable by everyone" ON public.rooms FOR SELECT USING (true);

-- Room bookings - users can view their own bookings, staff can view all
CREATE POLICY "Users can view their own bookings" ON public.room_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bookings" ON public.room_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookings" ON public.room_bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Booking staff can view all bookings" ON public.room_bookings FOR ALL USING (public.has_role(auth.uid(), 'booking'));

-- Party requests - users can view their own, booking staff can view all
CREATE POLICY "Users can view their own party requests" ON public.party_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own party requests" ON public.party_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own party requests" ON public.party_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Booking staff can view all party requests" ON public.party_requests FOR ALL USING (public.has_role(auth.uid(), 'booking'));

-- Events/Programs - public read access
CREATE POLICY "Events are viewable by everyone" ON public.events_programs FOR SELECT USING (true);
CREATE POLICY "Events staff can manage events" ON public.events_programs FOR ALL USING (public.has_role(auth.uid(), 'events_programs'));

-- Event registrations - users can view their own, events staff can view all
CREATE POLICY "Users can view their own registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own registrations" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own registrations" ON public.event_registrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Events staff can view all registrations" ON public.event_registrations FOR ALL USING (public.has_role(auth.uid(), 'events_programs'));

-- Guides - public read access
CREATE POLICY "Guides are viewable by everyone" ON public.guides FOR SELECT USING (true);

-- Chat conversations - users can view their own conversations, staff can view relevant conversations
CREATE POLICY "Users can view their own conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id OR auth.uid() = staff_user_id);
CREATE POLICY "Users can create conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can view relevant conversations" ON public.chat_conversations FOR ALL USING (
  auth.uid() = staff_user_id OR 
  (conversation_type = 'room_booking' AND public.has_role(auth.uid(), 'booking')) OR
  (conversation_type = 'party_request' AND public.has_role(auth.uid(), 'booking')) OR
  (conversation_type = 'event_organizer' AND public.has_role(auth.uid(), 'events_programs')) OR
  (conversation_type = 'support' AND public.has_role(auth.uid(), 'support'))
);

-- Chat messages - users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR staff_user_id = auth.uid())
  )
);
CREATE POLICY "Users can send messages in their conversations" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR staff_user_id = auth.uid())
  )
);

-- Seed initial data
INSERT INTO public.rooms (name, type, capacity, hourly_rate, description, amenities) VALUES
  ('PC Room 1', 'pc', 6, 25.00, 'High-performance gaming PCs with VR capabilities', ARRAY['6 Gaming PCs', 'VR Headsets', 'Comfortable Seating']),
  ('PC Room 2', 'pc', 6, 25.00, 'High-performance gaming PCs with VR capabilities', ARRAY['6 Gaming PCs', 'VR Headsets', 'Comfortable Seating']),
  ('PC Room 3', 'pc', 8, 30.00, 'Larger PC gaming room for bigger groups', ARRAY['8 Gaming PCs', 'VR Headsets', 'Group Seating']),
  ('PC Room 4', 'pc', 8, 30.00, 'Larger PC gaming room for bigger groups', ARRAY['8 Gaming PCs', 'VR Headsets', 'Group Seating']),
  ('VIP Room', 'vip', 4, 50.00, 'Premium private gaming experience', ARRAY['4 High-end PCs', 'Premium VR', 'Private Lounge', 'Refreshments']),
  ('Social Gaming Room', 'social', 12, 40.00, 'Perfect for parties and group events', ARRAY['Console Gaming', 'VR Stations', 'Party Setup', 'Sound System']);

INSERT INTO public.events_programs (title, description, type, category, event_date, start_time, duration_minutes, max_participants, price, instructor) VALUES
  ('VR Tournament Championship', 'Compete in the ultimate VR gaming tournament with prizes for winners', 'event', 'Tournament', CURRENT_DATE + INTERVAL '7 days', '18:00', 180, 32, 15.00, 'Alex Chen'),
  ('Beginner VR Workshop', 'Learn the basics of VR gaming in a friendly environment', 'program', 'Educational', CURRENT_DATE + INTERVAL '3 days', '14:00', 90, 12, 10.00, 'Sarah Kim'),
  ('Friday Night Social', 'Weekly social gaming event with snacks and drinks', 'event', 'Social', CURRENT_DATE + INTERVAL '5 days', '19:00', 240, 20, 5.00, 'Mike Rodriguez'),
  ('Advanced VR Programming', '4-week course on VR development and game design', 'program', 'Educational', CURRENT_DATE + INTERVAL '10 days', '16:00', 120, 8, 80.00, 'Dr. Lisa Park');

INSERT INTO public.guides (title, game_name, category, age_rating, intensity_level, duration_minutes, overview, setup_instructions, how_to_play, tips_and_scoring) VALUES
  ('Beat Saber Mastery', 'Beat Saber', 'Rhythm', 'E10+', 'medium', 15, 'Master the art of rhythmic saber slashing in this addictive VR rhythm game.', 'Put on your VR headset and grab both controllers. Ensure you have enough space to move your arms freely.', 'Slash the colored blocks with the corresponding saber colors in rhythm with the music. Avoid red obstacles and follow the arrow directions.', 'Start with slower songs and gradually increase difficulty. Focus on wrist movements rather than full arm swings to maintain accuracy and reduce fatigue.'),
  ('Half-Life Alyx Guide', 'Half-Life: Alyx', 'Adventure', 'T', 'high', 45, 'Navigate the immersive world of Half-Life in VR with Alyx Vance in this groundbreaking adventure.', 'Ensure VR headset is properly calibrated. This game requires room-scale VR with at least 2x2 meters of space.', 'Use hand tracking to interact with objects, solve puzzles, and combat enemies. Utilize cover and strategic movement to survive encounters.', 'Take your time exploring environments for hidden supplies. Use teleport movement to reduce motion sickness. Practice reloading weapons in safe areas.'),
  ('Superhot VR Tactics', 'Superhot VR', 'Action', 'T', 'high', 20, 'Master time manipulation and strategic combat in this innovative action game.', 'Stand in center of play area. Ensure controllers are fully charged as this game requires precise hand movements.', 'Time only moves when you move. Plan each action carefully, dodge bullets in slow motion, and eliminate enemies strategically.', 'Move slowly to buy time for planning. Grab and throw objects as weapons. Use your environment for cover and tactical advantage.');
