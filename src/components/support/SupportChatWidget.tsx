// src/components/support/SupportChatWidget.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send, X, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supportChat, type ChatMessage as AiChatMessage } from '@/ai/flows/support-chat-flow';


type DisplayMessage = {
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
};

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add initial greeting message when chat opens for the first time
      const initialMessage: DisplayMessage = {
        text: "Hello! I'm your AI support assistant. How can I help you navigate the Dailybuy app today?",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialMessage]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-scroll to the bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);


  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: DisplayMessage = {
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Convert display messages to the format expected by the AI flow
      const chatHistory: AiChatMessage[] = newMessages.map(msg => ({
        role: msg.sender,
        content: [{ text: msg.text }],
      }));

      const aiResponseText = await supportChat(chatHistory);

      const aiResponseMessage: DisplayMessage = {
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiResponseMessage]);

    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorMessage: DisplayMessage = {
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Bubble Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        </Button>
      </div>

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm">
          <Card className="flex flex-col h-[60vh] shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-3">
                <Bot className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-lg">AI Support</CardTitle>
                  <p className="text-xs text-muted-foreground">Your guide to Dailybuy</p>
                </div>
              </div>
               <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4"/>
              </Button>
            </CardHeader>
            <CardContent className="flex-grow p-4 overflow-hidden">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                        <div key={index} className={cn('flex items-end gap-2', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                            {msg.sender === 'ai' && (
                                 <Avatar className="h-8 w-8">
                                    <AvatarFallback>AI</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                                msg.sender === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}>
                                <p>{msg.text}</p>
                                <p className={cn('text-xs mt-1', msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground' )}>
                                    {msg.timestamp}
                                </p>
                            </div>
                             {msg.sender === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>U</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-end gap-2 justify-start">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>AI</AvatarFallback>
                                </Avatar>
                                <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-muted flex items-center">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 border-t">
              <div className="flex w-full items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Ask about Dailybuy..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleInputKeyPress}
                  disabled={isLoading}
                />
                <Button type="submit" onClick={handleSendMessage} disabled={isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
