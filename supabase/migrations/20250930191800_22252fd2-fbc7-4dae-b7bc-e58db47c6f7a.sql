-- Update RLS policy for chat_messages to allow support staff to send messages
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON chat_messages;

CREATE POLICY "Users can send messages in their conversations"
ON chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Users can send messages in their own conversations
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND chat_conversations.user_id = auth.uid()
    )
    OR
    -- Staff assigned to the conversation can send messages
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND chat_conversations.staff_user_id = auth.uid()
    )
    OR
    -- Support staff can send messages in support conversations
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND chat_conversations.conversation_type = 'support'
      AND is_staff_with_role(auth.uid(), 'support')
    )
  )
);