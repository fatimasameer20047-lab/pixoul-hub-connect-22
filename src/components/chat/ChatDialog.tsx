import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  is_staff: boolean;
  is_read: boolean;
  created_at: string;
}

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationType: 'room_booking' | 'party_request' | 'event_organizer' | 'support';
  referenceId: string;
  title: string;
}

export function ChatDialog({ isOpen, onClose, conversationType, referenceId, title }: ChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const isStaff = isDemoMode;

  useEffect(() => {
    if (isOpen && user) {
      initializeChat();
    }
  }, [isOpen, user, referenceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      // First, try to find existing conversation
      const { data: existingConv, error: searchError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('reference_id', referenceId)
        .eq('conversation_type', conversationType)
        .single();

      let convId = existingConv?.id;

      // If no conversation exists, create one
      if (!convId && !searchError) {
        const { data: newConv, error: createError } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            conversation_type: conversationType,
            reference_id: referenceId,
            title: title,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        convId = newConv.id;
      }

      if (convId) {
        setConversationId(convId);
        await fetchMessages(convId);
      }
    } catch (error: any) {
      toast({
        title: "Error loading chat",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user) return;

    setSending(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message: newMessage.trim(),
          is_staff: isStaff,
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(conversationId);
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{title}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.sender_id === user?.id ? 'You' : (message.is_staff ? 'Staff' : 'User')}
                      </span>
                      {message.is_staff && message.sender_id !== user?.id && (
                        <Badge variant="secondary" className="text-xs">Staff</Badge>
                      )}
                    </div>
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <form onSubmit={sendMessage} className="flex gap-2 pt-4 border-t">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
            />
            <Button type="submit" size="sm" disabled={!newMessage.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}