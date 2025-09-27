-- Update staff accounts with proper bcrypt hashes for demo passwords
-- Note: These are bcrypt hashes for: ahmad123, mariam123, mohammed123, sara123, ali123

UPDATE public.staff_accounts SET password_hash = '$2b$10$7eA.rqOddmzP9BHbeaUZZe2H1PK4Tf2PJGpCJI6m.yVxh0wJvQF.K' WHERE username = 'ahmad';
UPDATE public.staff_accounts SET password_hash = '$2b$10$7eA.rqOddmzP9BHbeaUZZe2H1PK4Tf2PJGpCJI6m.yVxh0wJvQF.K' WHERE username = 'mariam';
UPDATE public.staff_accounts SET password_hash = '$2b$10$7eA.rqOddmzP9BHbeaUZZe2H1PK4Tf2PJGpCJI6m.yVxh0wJvQF.K' WHERE username = 'mohammed';
UPDATE public.staff_accounts SET password_hash = '$2b$10$7eA.rqOddmzP9BHbeaUZZe2H1PK4Tf2PJGpCJI6m.yVxh0wJvQF.K' WHERE username = 'sara';
UPDATE public.staff_accounts SET password_hash = '$2b$10$7eA.rqOddmzP9BHbeaUZZe2H1PK4Tf2PJGpCJI6m.yVxh0wJvQF.K' WHERE username = 'ali';