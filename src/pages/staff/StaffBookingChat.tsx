import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChatThread } from '@/components/chat/ChatThread';
import { supabase } from '@/integrations/supabase/client';

export default function StaffBookingChat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!conversationId) return;
      const { data } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', conversationId)
        .in('conversation_type', ['room_booking', 'party_request'])
        .maybeSingle();
      setValid(!!data);
    };
    verify();
  }, [conversationId]);

  if (!conversationId || !valid) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Chat not found.</p>
        <button className="text-primary text-sm mt-2" onClick={() => navigate('/staff/rooms')}>
          Back to Booking Messages
        </button>
      </div>
    );
  }

  return (
    <ChatThread
      conversationId={conversationId}
      isStaff
      backPath="/staff/rooms"
      heading="Booking Chat"
    />
  );
}
