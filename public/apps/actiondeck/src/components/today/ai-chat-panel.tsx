'use client';

import { useState, useRef, useEffect } from 'react';
import { useToday } from '@/context/today-context';
import { useProjects } from '@/context/project-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleTodayChat } from '@/lib/actions';

export function AIChatPanel() {
  const { isChatOpen, setChatOpen, chatHistory, addChatMessage, clearChatHistory, items, currentDate } = useToday();
  const { projects } = useProjects();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message
    addChatMessage({ role: 'user', content: userMessage });

    setIsLoading(true);

    try {
      const result = await handleTodayChat({
        message: userMessage,
        chatHistory: chatHistory.map((m) => ({ role: m.role, content: m.content })),
        currentSchedule: items,
        availableProjects: projects.map((p) => ({
          name: p.name,
          deadline: p.deadline,
          importance: p.importance,
          tasks: p.tasks,
        })),
        currentDate,
        currentTimeMinute: new Date().getHours() * 60 + new Date().getMinutes(),
      });

      if (result.success && result.data) {
        addChatMessage({ role: 'assistant', content: result.data.response });
      } else {
        addChatMessage({
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        });
      }
    } catch (error) {
      console.error('[chat] Error:', error);
      addChatMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isChatOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 right-6 h-12 w-12 rounded-full shadow-lg z-40"
        onClick={() => setChatOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="w-80 flex-shrink-0 flex flex-col h-[calc(100vh-200px)] max-h-[600px]">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-1">
            {chatHistory.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearChatHistory}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setChatOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 pt-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-3" ref={scrollRef}>
          <div className="space-y-3">
            {chatHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Ask me about your schedule!</p>
                <p className="text-xs mt-1">I can help prioritize, suggest times, or answer questions.</p>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3 rounded-lg text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-4'
                      : 'bg-muted mr-4'
                  )}
                >
                  {msg.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3 flex-shrink-0">
          <Input
            placeholder="Ask about your day..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
