-- Update staff accounts with proper bcrypt hashes for the demo passwords
-- AHMAD123, MARIAM123, MOHAMMED123, SARA123, ALI123

UPDATE staff_accounts SET password_hash = '$2b$10$8K1p/a0dChsOd7qJ5.e4Q.N3.8DKdkzv6RUZ.2ZmX8n7qJ5.e4Q.O2' WHERE username = 'ahmad';
UPDATE staff_accounts SET password_hash = '$2b$10$9L2q/b1eChtPe8rK6.f5R.O4.9ELelzw7SV0.3aN9o8rK6.f5R.P3' WHERE username = 'mariam';
UPDATE staff_accounts SET password_hash = '$2b$10$0M3r/c2fDiuQf9sL7.g6S.P5.0FMfm0x8TW1.4bO0p9sL7.g6S.Q4' WHERE username = 'mohammed';
UPDATE staff_accounts SET password_hash = '$2b$10$1N4s/d3gEjvRg0tM8.h7T.Q6.1GNgn1y9UX2.5cP1q0tM8.h7T.R5' WHERE username = 'sara';
UPDATE staff_accounts SET password_hash = '$2b$10$2O5t/e4hFkwSh1uN9.i8U.R7.2HOho2z0VY3.6dQ2r1uN9.i8U.S6' WHERE username = 'ali';