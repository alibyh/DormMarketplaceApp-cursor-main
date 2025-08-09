-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
-- Users can view conversations they are participants in
CREATE POLICY "Users can view their conversations" 
  ON conversations 
  FOR SELECT 
  USING (auth.uid() = ANY(participant_ids));

-- Users can create conversations if they are a participant
CREATE POLICY "Users can create conversations they participate in" 
  ON conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- Users can update conversations they are participants in
CREATE POLICY "Users can update their conversations" 
  ON conversations 
  FOR UPDATE 
  USING (auth.uid() = ANY(participant_ids));

-- Messages policies
-- Users can view messages from conversations they are participants in
CREATE POLICY "Users can view messages in their conversations" 
  ON messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.conversation_id = messages.conversation_id 
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- Users can insert messages into conversations they are participants in
CREATE POLICY "Users can insert messages in their conversations" 
  ON messages 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.conversation_id = messages.conversation_id 
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- Users can update messages they sent
CREATE POLICY "Users can update their own messages" 
  ON messages 
  FOR UPDATE 
  USING (auth.uid() = sender_id);