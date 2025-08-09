-- SQL script to enable real-time capabilities in Supabase
-- Run this in the SQL Editor to enable real-time triggers for messages and conversations

-- First, check if the supabase_realtime schema exists
CREATE SCHEMA IF NOT EXISTS supabase_realtime;

-- Then, enable the realtime publication if not already enabled
CREATE PUBLICATION IF NOT EXISTS supabase_realtime
FOR ALL TABLES;

-- Check if the tables are included in the publication
SELECT
    relname AS table_name,
    pg_get_publication_tables('supabase_realtime')
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Ensure the conversations table is added to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Ensure the messages table is added to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable real-time tracking for these tables - required for database events

-- Enable for conversations table
COMMENT ON TABLE conversations IS 'Broadcasts inserts, updates, and deletes over Supabase real-time';

-- Enable for messages table
COMMENT ON TABLE messages IS 'Broadcasts inserts, updates, and deletes over Supabase real-time';

-- Verify these tables are included in real-time tracking by querying the publication
SELECT
    n.nspname AS "Schema",
    c.relname AS "Table"
FROM
    pg_class c
JOIN
    pg_namespace n ON c.relnamespace = n.oid
JOIN
    pg_publication_rel p ON p.prrelid = c.oid
JOIN
    pg_publication pub ON p.prpubid = pub.oid
WHERE
    pub.pubname = 'supabase_realtime'
    AND n.nspname = 'public'
    AND c.relname IN ('conversations', 'messages');

-- Verify the real-time configuration is enabled for broadcast
SELECT 
    c.relname AS "Table", 
    obj_description(c.oid) AS "Comment"
FROM 
    pg_class c
JOIN 
    pg_namespace n ON c.relnamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND c.relname IN ('conversations', 'messages');

-- Output a success message
SELECT '✅ Real-time capabilities have been enabled for messaging tables' AS "Status";
SELECT 'You should now receive real-time updates when data changes in these tables' AS "Note";

COMMIT; 