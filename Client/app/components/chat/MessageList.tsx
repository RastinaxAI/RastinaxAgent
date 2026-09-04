'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '~/context/ChatContext';
import { MessageBubble } from '~/components/chat/MessageBubble';
import { LOGO_URL } from '~/lib/constants';

export function MessageList() {
  const { messages, isGenerating } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isGenerating]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col space-y-6 px-4 py-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isGenerating && (
        <div className="flex items-start gap-3 fade-in-up">
          <img
            src={LOGO_URL}
            alt="Rastinax"
            className="logo-img-sm mt-1 flex-shrink-0"
          />
          <div className="msg-ai flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
