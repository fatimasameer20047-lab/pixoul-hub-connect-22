import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useStaff } from '@/contexts/StaffContext';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Conversation = {
  id: string;
  conversation_type: string;
  reference_id: string | null;
  title: string;
  user_id: string;
  last_message_at: string | null;
  status: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  message: string;
  is_staff: boolean | null;
  created_at: string | null;
};

const allowedTypes = ['room_booking', 'party_request', 'support'];

export function BookingMessages({ initialConversationId }: { initialConversationId?: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canManageRooms } = useStaff();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const markConversationRead = async (conversationId: string) => {
    if (!user) return;
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id);
  };

  const fetchConversations = async () => {
    setLoadingConversations(true);
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, conversation_type, reference_id, title, user_id, last_message_at, status')
      .in('conversation_type', allowedTypes)
      .order('last_message_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Unable to load conversations',
        description: error.message,
        variant: 'destructive',
      });
      setConversations([]);
    } else {
      setConversations((data as Conversation[]) || []);
    }
    setLoadingConversations(false);
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: 'Unable to load messages',
        description: error.message,
        variant: 'destructive',
      });
      setMessages([]);
    } else {
      setMessages((data as MessageRow[]) || []);
      await markConversationRead(conversationId);
    }
    setLoadingMessages(false);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (selectedId) {
      channel = supabase
        .channel(`chat-messages-${selectedId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedId}` },
          (payload) => {
            const msg = payload.new as MessageRow;
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== user?.id) {
              markConversationRead(selectedId);
            }
          }
        )
        .subscribe();

      fetchMessages(selectedId);
    } else {
      setMessages([]);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedId, user?.id]);

  useEffect(() => {
    let conversationChannel: ReturnType<typeof supabase.channel> | null = null;
    conversationChannel = supabase
      .channel('chat-conversations-booking')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations', filter: 'conversation_type=eq.room_booking' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations', filter: 'conversation_type=eq.party_request' },
        () => fetchConversations()
      )
      .subscribe();
    return () => {
      if (conversationChannel) supabase.removeChannel(conversationChannel);
    };
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedId) || null,
    [conversations, selectedId]
  );

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_staff: true,
        });
      if (error) throw error;

      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString(), staff_user_id: user.id })
        .eq('id', selectedConversation.id);

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Reply failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Booking Messages
        </CardTitle>
        {!canManageRooms && <Badge variant="secondary">View only</Badge>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 border rounded-lg p-3 space-y-2">
            {loadingConversations && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversations...
              </div>
            )}
            {!loadingConversations && conversations.length === 0 && (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            )}
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={`w-full text-left border rounded-lg p-3 hover:bg-muted/60 transition ${
                      selectedId === conv.id ? 'border-primary bg-muted' : 'border-border'
                    }`}
                  onClick={() => {
                    setSelectedId(conv.id);
                    navigate(`/staff/booking/messages/${conv.id}`);
                  }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{conv.title || 'Conversation'}</div>
                      <Badge variant="outline" className="text-[10px]">
                        {conv.conversation_type === 'room_booking' ? 'Room' : 'Party'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {conv.last_message_at
                        ? `${formatDistanceToNow(new Date(conv.last_message_at))} ago`
                        : 'No messages yet'}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:col-span-2 border rounded-lg p-3 flex flex-col min-h-[400px]">
            {!selectedConversation && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a conversation to view messages.
              </div>
            )}

            {selectedConversation && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">{selectedConversation.title}</div>
                  </div>
                  <Badge variant="outline">
                    {selectedConversation.conversation_type === 'room_booking'
                      ? 'Room Booking'
                      : selectedConversation.conversation_type === 'party_request'
                      ? 'Party Request'
                      : 'Support'}
                  </Badge>
                </div>

                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3">
                    {loadingMessages && (
                      <div className="text-sm text-muted-foreground">Loading messages...</div>
                    )}
                    {!loadingMessages &&
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.is_staff ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              msg.is_staff ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">
                                {msg.is_staff ? 'Staff' : 'Customer'}
                              </span>
                              <span className="text-[10px] opacity-80">
                                {msg.created_at
                                  ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })
                                  : ''}
                              </span>
                            </div>
                            <div>{msg.message}</div>
                          </div>
                        </div>
                      ))}
                    {!loadingMessages && messages.length === 0 && (
                      <p className="text-sm text-muted-foreground">No messages yet.</p>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={sendReply} className="flex gap-2 pt-3 border-t mt-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a reply..."
                    disabled={!canManageRooms || sending}
                  />
                  <Button type="submit" disabled={!newMessage.trim() || sending || !canManageRooms}>
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
