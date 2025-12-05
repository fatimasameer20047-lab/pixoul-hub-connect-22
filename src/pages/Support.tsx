import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
}

export default function Support() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      initializeConversation();
    }
  }, [user]);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();

    const channel = supabase
      .channel(`support-messages-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as Message;
          setMessages((prev) => {
            // de-dupe if already present
            if (prev.some(m => m.id === msg.id)) return prev;
            const next = [...prev.filter(m => m.id !== pendingId), msg];
            maybeAutoScroll();
            return next;
          });
          setPendingId(null);
        }
        if (payload.eventType === 'UPDATE') {
          const msg = payload.new as Message;
          setMessages((prev) => prev.map(m => m.id === msg.id ? msg : m));
        }
        if (payload.eventType === 'DELETE') {
          const msg = payload.old as Message;
          setMessages((prev) => prev.filter(m => m.id !== msg.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const atBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 200; // px from bottom counts as "near bottom"
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const scrollToBottom = (smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  const maybeAutoScroll = () => {
    if (atBottom()) {
      scrollToBottom(true);
    } else {
      setNewCount((c) => c + 1);
    }
  };

  const initializeConversation = async () => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('conversation_type', 'support')
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
      } else {
        // Create new conversation
        const { data: newConv, error } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            conversation_type: 'support',
            title: 'Support Request',
            status: 'active',
            reference_id: null,
          })
          .select('id')
          .single();

        if (error) throw error;
        setConversationId(newConv.id);
      }
    } catch (error: any) {
      toast({
        title: "Error initializing conversation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
      // Make sure we start at bottom on initial load
      setTimeout(() => scrollToBottom(false), 0);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    try {
      // Optimistic add with a temporary id
      const tempId = `temp-${Date.now()}`;
      setPendingId(tempId);
      const optimistic: Message = {
        id: tempId,
        message: newMessage,
        is_staff: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom(true);
      const pendingText = newMessage;
      setNewMessage('');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message: pendingText,
          is_staff: false,
        })
        .select('*')
        .single();

      if (error) throw error;
      // Replace optimistic with saved row (INSERT realtime may also arrive, but we de-dupe)
      setMessages((prev) => prev.map(m => m.id === tempId ? (data as any) : m));
      setPendingId(null);

      // Update conversation last_message_at
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
      // Rollback optimistic
      setMessages((prev) => prev.filter(m => m.id !== pendingId));
      setPendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-x-hidden">
      {/* MOBILE: Full-screen chat layout */}
      <div className="px-4 py-2 border-b md:hidden flex items-center gap-2 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <MessageCircle className="h-5 w-5" />
        <h2 className="text-base font-semibold">Support & Feedback</h2>
      </div>

      {/* Messages scroll area; padded at bottom for composer + bottom nav */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 space-y-3 bg-muted/20 pb-[calc(64px+env(safe-area-inset-bottom))]"
        onScroll={() => {
          if (atBottom() && newCount > 0) setNewCount(0);
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet. Start a conversation with our support team!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_staff ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-lg ${
                  msg.is_staff
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {msg.is_staff && (
                  <p className="text-xs font-semibold mb-1 opacity-70">Support Team</p>
                )}
                <p className="text-sm leading-snug">{msg.message}</p>
                <p className="text-[11px] opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}

        {/* New messages pill when user is not at bottom */}
        {newCount > 0 && (
          <div className="sticky bottom-24 flex justify-center">
            <button
              onClick={() => { scrollToBottom(true); setNewCount(0); }}
              className="px-3 py-1 rounded-full text-xs bg-primary/90 text-primary-foreground shadow"
            >
              {newCount} new message{newCount > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Sticky composer pinned to bottom; respects iOS safe-area and sits above bottom tab bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="sticky bottom-0 inset-x-0 z-10 bg-background/95 backdrop-blur border-t px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
      >
        <div className="mx-auto max-w-screen-sm w-full flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="h-10 flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()} className="h-10 px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
