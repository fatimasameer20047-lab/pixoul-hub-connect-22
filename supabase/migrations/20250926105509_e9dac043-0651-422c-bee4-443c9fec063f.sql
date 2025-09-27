-- Update VIP room images with the new uploads
UPDATE public.rooms 
SET image_url = '/rooms/vip-room-1.png' 
WHERE name = 'VIP Room 1';

UPDATE public.rooms 
SET image_url = '/rooms/vip-room-2.png' 
WHERE name = 'VIP Room 2';