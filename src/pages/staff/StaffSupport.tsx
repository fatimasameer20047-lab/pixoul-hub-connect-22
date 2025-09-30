import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  status: string;
  last_message_at: string;
  profiles: {
    name: string;
  };
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  is_staff: boolean;
  created_at: string;
}

export default function StaffSupport() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('conversation_type', 'support')
      .order('last_message_at', { ascending: false });

    if (error) {
      toast({ title: "Error loading conversations", description: error.message, variant: "destructive" });
    } else {
      // Fetch profile names separately
      const convWithProfiles = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', conv.user_id)
            .single();
          
          return {
            ...conv,
            profiles: profile || { name: 'Guest' }
          };
        })
      );
      setConversations(convWithProfiles);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: "Error loading messages", description: error.message, variant: "destructive" });
    } else {
      setMessages(data || []);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        message: newMessage,
        is_staff: true,
      });

    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
    } else {
      setNewMessage('');
      fetchMessages(selectedConversation);
      fetchConversations();
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Management</h1>
        <p className="text-muted-foreground">Manage guest inquiries and feedback</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Active Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.map((conv) => (
              <Button
                key={conv.id}
                variant={selectedConversation === conv.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedConversation(conv.id)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{conv.profiles?.name || 'Guest'}</div>
                  <div className="text-xs opacity-70">
                    {new Date(conv.last_message_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                  {conv.status}
                </Badge>
              </Button>
            ))}
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedConv ? `Chat with ${selectedConv.profiles?.name || 'Guest'}` : 'Select a conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 h-96 overflow-y-auto space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_staff ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          msg.is_staff
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a conversation to start chatting
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
