-- Database Clear SQL Commands
-- Run these in your Supabase SQL Editor to clear data while preserving schema
-- Tables: users, cards, reveals, stats

-- IMPORTANT: Run these commands in the correct order to respect foreign key constraints

-- 1. Clear reveals table first (has foreign key to cards)
DELETE FROM reveals;

-- 2. Clear cards table second (has foreign key to users)  
DELETE FROM cards;

-- 3. Clear users table third
DELETE FROM users;

-- 4. Clear stats table last
DELETE FROM stats;

-- Optional: Reset any auto-increment sequences if you have them
-- (Uncomment if you have sequences that need resetting)
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE cards_id_seq RESTART WITH 1;
-- ALTER SEQUENCE reveals_id_seq RESTART WITH 1;
-- ALTER SEQUENCE stats_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'cards' as table_name, COUNT(*) as row_count FROM cards  
UNION ALL
SELECT 'reveals' as table_name, COUNT(*) as row_count FROM reveals
UNION ALL
SELECT 'stats' as table_name, COUNT(*) as row_count FROM stats;
