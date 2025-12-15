import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send } from 'lucide-react';

type Message = {
  id: string;
  message: string;
  is_staff: boolean;
  sender_id: string;
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
  conversation_type: string;
  reference_id: string | null;
};

interface ChatThreadProps {
  conversationId: string;
  isStaff: boolean;
  backPath?: string;
  heading?: string;
}

export function ChatThread({ conversationId, isStaff, backPath, heading }: ChatThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const markMessagesRead = async (convId: string) => {
    if (!user) return;
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .neq('sender_id', user.id);
  };

  const fetchConversation = async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, conversation_type, reference_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (error || !data) {
      toast({
        title: 'Chat not found',
        description: error?.message || 'Conversation is unavailable',
        variant: 'destructive',
      });
      return;
    }
    setConversation(data as Conversation);
  };

  const fetchMessages = async () => {
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
      return;
    }
    setMessages((data as Message[]) || []);
    await markMessagesRead(conversationId);
    scrollToBottom(false);
  };

  const scrollToBottom = (smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message: text,
        is_staff: isStaff,
      });
    if (error) {
      toast({
        title: 'Send failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (conversationId) {
      fetchConversation();
      fetchMessages();
      channel = supabase
        .channel(`chat-thread-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const msg = payload.new as Message;
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== user?.id) {
              markMessagesRead(conversationId);
            }
            scrollToBottom(true);
          }
        )
        .subscribe();
    }
    setLoading(false);
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] max-w-3xl mx-auto px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        {backPath && (
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">{heading || conversation?.title || 'Chat'}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 border rounded-lg p-3 bg-card" ref={listRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-lg ${
                msg.sender_id === user?.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm leading-snug">{msg.message}</p>
              <p className="text-[11px] opacity-70 mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No messages yet.</p>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="mt-3 border rounded-lg px-3 py-2 flex items-center gap-2"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="h-11"
        />
        <Button type="submit" disabled={!newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
