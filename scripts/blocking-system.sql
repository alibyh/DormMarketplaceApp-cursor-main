-- Blocking System Implementation
-- This script creates the necessary tables and policies for user blocking functionality

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_both_ids ON blocked_users(blocker_id, blocked_id);

-- Enable RLS on blocked_users table
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users table
-- Users can only see their own blocking relationships
CREATE POLICY "Users can view their own blocking relationships" ON blocked_users
    FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- Users can only create blocking relationships where they are the blocker
CREATE POLICY "Users can block other users" ON blocked_users
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can only delete their own blocking relationships (unblock)
CREATE POLICY "Users can unblock users they blocked" ON blocked_users
    FOR DELETE USING (auth.uid() = blocker_id);

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_uuid UUID, blocked_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users 
        WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users blocked by a specific user
CREATE OR REPLACE FUNCTION get_blocked_users(user_uuid UUID)
RETURNS TABLE(blocked_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT bu.blocked_id 
    FROM blocked_users bu 
    WHERE bu.blocker_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users who blocked a specific user
CREATE OR REPLACE FUNCTION get_blockers(user_uuid UUID)
RETURNS TABLE(blocker_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT bu.blocker_id 
    FROM blocked_users bu 
    WHERE bu.blocked_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update conversations table RLS to exclude blocked users
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        (auth.uid() = user1_id OR auth.uid() = user2_id OR 
         auth.uid() = buyer_id OR auth.uid() = seller_id OR
         auth.uid() = ANY(participant_ids)) AND
        NOT EXISTS (
            SELECT 1 FROM blocked_users 
            WHERE (blocker_id = auth.uid() AND blocked_id IN (
                COALESCE(user1_id, '00000000-0000-0000-0000-000000000000'::UUID),
                COALESCE(user2_id, '00000000-0000-0000-0000-000000000000'::UUID),
                COALESCE(buyer_id, '00000000-0000-0000-0000-000000000000'::UUID),
                COALESCE(seller_id, '00000000-0000-0000-0000-000000000000'::UUID)
            )) OR
            (blocked_id = auth.uid() AND blocker_id IN (
                COALESCE(user1_id, '00000000-0000-0000-0000-000000000000'::UUID),
                COALESCE(user2_id, '00000000-0000-0000-0000-000000000000'::UUID),
                COALESCE(buyer_id, '00000000-0000-0000-0000-000000000000'::UUID),
                COALESCE(seller_id, '00000000-0000-0000-0000-000000000000'::UUID)
            ))
        )
    );

-- Update messages table RLS to exclude blocked users
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.conversation_id = messages.conversation_id
            AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id OR 
                 auth.uid() = c.buyer_id OR auth.uid() = c.seller_id OR
                 auth.uid() = ANY(c.participant_ids))
            AND NOT EXISTS (
                SELECT 1 FROM blocked_users bu
                WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id IN (
                    COALESCE(c.user1_id, '00000000-0000-0000-0000-000000000000'::UUID),
                    COALESCE(c.user2_id, '00000000-0000-0000-0000-000000000000'::UUID),
                    COALESCE(c.buyer_id, '00000000-0000-0000-0000-000000000000'::UUID),
                    COALESCE(c.seller_id, '00000000-0000-0000-0000-000000000000'::UUID)
                )) OR
                (bu.blocked_id = auth.uid() AND bu.blocker_id IN (
                    COALESCE(c.user1_id, '00000000-0000-0000-0000-000000000000'::UUID),
                    COALESCE(c.user2_id, '00000000-0000-0000-0000-000000000000'::UUID),
                    COALESCE(c.buyer_id, '00000000-0000-0000-0000-000000000000'::UUID),
                    COALESCE(c.seller_id, '00000000-0000-0000-0000-000000000000'::UUID)
                ))
            )
        )
    );

-- Update products table RLS to exclude blocked users' products
DROP POLICY IF EXISTS "Users can view all products" ON products;
CREATE POLICY "Users can view all products" ON products
    FOR SELECT USING (
        NOT EXISTS (
            SELECT 1 FROM blocked_users 
            WHERE (blocker_id = auth.uid() AND blocked_id = products.user_id) OR
                  (blocked_id = auth.uid() AND blocker_id = products.user_id)
        )
    );

-- Update buy_orders table RLS to exclude blocked users' buy orders
DROP POLICY IF EXISTS "Users can view all buy orders" ON buy_orders;
CREATE POLICY "Users can view all buy orders" ON buy_orders
    FOR SELECT USING (
        NOT EXISTS (
            SELECT 1 FROM blocked_users 
            WHERE (blocker_id = auth.uid() AND blocked_id = buy_orders.user_id) OR
                  (blocked_id = auth.uid() AND blocker_id = buy_orders.user_id)
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blockers(UUID) TO authenticated;
