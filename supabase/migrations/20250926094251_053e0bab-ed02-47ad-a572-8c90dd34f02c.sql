-- Add full_name field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN full_name TEXT;

-- Update the trigger function to use full_name from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile for customer users with full_name from metadata
  INSERT INTO public.profiles (user_id, name, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'name', 'User'),
    COALESCE(new.raw_user_meta_data ->> 'name', 'User')
  );
  
  -- Assign customer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer');
  
  RETURN new;
END;
$$;