'use client';

import { Sidebar } from "~/components/layout/Sidebar";
import { Header } from "~/components/layout/Header";
import { WelcomeScreen } from "~/components/chat/WelcomeScreen";
import { ChatInput } from "~/components/chat/ChatInput";
import { MessageList } from "~/components/chat/MessageList";
import { useChat } from "~/context/ChatContext";

export default function ChatPage() {
  const {
    messages,
    isLoadingConversation,
    error,
    clearError,
  } = useChat();

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-area">
        <Header />

        <div className="chat-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          {isLoadingConversation && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-sm text-[var(--tx-m)]">
              <span className="flex items-center gap-2">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <MessageList />
          )}
        </div>

        {error && (
          <div className="chat-error-wrap px-3 pb-1 sm:px-4">
            <div
              className="chat-error mx-auto flex max-w-3xl items-start gap-3 rounded-xl px-3 py-2.5 text-sm"
              role="alert"
            >
              <i
                className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 leading-6">{error}</span>
              <button
                type="button"
                className="chat-error-close flex-shrink-0"
                onClick={clearError}
                aria-label="Dismiss"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <ChatInput />
      </main>
    </div>
  );
}
