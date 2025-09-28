-- Add policy to allow viewing basic profile info for public content
CREATE POLICY "Basic profile info is viewable by everyone for public content" 
ON public.profiles 
FOR SELECT 
USING (true);