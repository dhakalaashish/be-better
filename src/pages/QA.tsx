import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY;

export default function QA() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help you reflect on your habits and progress. Ask me anything about your journey!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1️⃣ Fetch user's events
      const { data: userEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id);
      if (eventsError) throw eventsError;

      // 2️⃣ Fetch user's logs
      const { data: userLogs, error: logsError } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (logsError) throw logsError;

      // 3️⃣ Fetch user goals
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('goals')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      const userGoals = profile?.goals || [];

      // 4️⃣ Send to backend with full chat context
      const response = await fetch(`${BACKEND_URL}/qa_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': ACCESS_KEY,
        },
        body: JSON.stringify({
          user: {
            id: user.id,
            name: user.user_metadata?.name || 'User',
            goals: userGoals,
          },
          events: userEvents || [],
          logs: userLogs || [],
          conversation_history: messages.concat(userMessage),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch assistant response');
      }

      const data = await response.json();
      const assistantReply: Message = {
        role: 'assistant',
        content: data.response || "I'm thinking about your progress...",
      };

      // 5️⃣ Append assistant response to chat
      setMessages(prev => [...prev, assistantReply]);
    } catch (error) {
      toast.error('Failed to get response');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pb-20 pt-8 px-4 max-w-lg mx-auto flex flex-col h-[calc(100vh-5rem)]">
      <h1 className="text-2xl font-bold mb-6">Q&A Assistant</h1>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[80%] shadow-md ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card'
              }`}
            >
              <CardContent className="p-3">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </CardContent>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="shadow-md">
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ask about your progress..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
