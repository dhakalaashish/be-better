import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function QA() {
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
      // TODO: Call QA edge function
      // For now, simulate response
      setTimeout(() => {
        const assistantMessage: Message = {
          role: 'assistant',
          content: "I'm analyzing your habits and patterns. This feature will be fully connected to your event logs soon!",
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast.error('Failed to get response');
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
