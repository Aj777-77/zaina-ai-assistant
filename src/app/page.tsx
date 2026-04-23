'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import QuickActions from '@/components/QuickActions';
import ChatRegistration from '@/components/chat/ChatRegistration';
import ZainLogo from '@/lib/Assets/Zain-Logo-White.svg';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UserData {
  name: string;
  phone: string;
}

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m Zaina, your AI shopping assistant for Zain Bahrain. I can help you find the perfect phone, plan, or accessories. What are you looking for today?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRegister = (data: UserData) => {
    setUserData(data);
    setIsRegistered(true);
  };







      /// Fistt Input is user message, then call API, then  assistant response or error message
  const handleSendMessage = async (content: string) => { 
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };

   // Add it to screen immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },

              // Send full message history (user + assistant turns)
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          userData, // Pass userData to store in Backend
          model: 'gpt-4o'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Add assistant response
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Show error message
        const errorMessage: Message = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${data.error}. Please try again.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I couldn\'t process your request. Please make sure the server is running.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 relative">
      {/* Header */}
      <header className="absolute top-0 w-full text-white z-50 bg-transparent pointer-events-none">
        <div className="w-full px-6 py-5 lg:px-10 lg:py-8 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src={ZainLogo} alt="Zain Logo" className="h-9 w-auto object-contain" priority />
            </div>
            {isRegistered && userData && (
              <div className="text-sm bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md text-zinc-200 font-medium shadow-sm">
                Hello, {userData.name}!
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {!isRegistered ? (
        <ChatRegistration onRegister={handleRegister} />
      ) : (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto pt-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}

              {/* Show quick actions only on first load */}
              {messages.length === 1 && !isLoading && (
                <div className="mt-6">
                  <p className="text-sm text-zinc-400 mb-3 font-medium">Quick suggestions:</p>
                  <QuickActions onSelect={handleSendMessage} disabled={isLoading} />
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        Z
                      </div>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </>
      )}
    </div>
  );
}
