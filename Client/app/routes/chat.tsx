'use client';

import { Sidebar } from "~/components/layout/Sidebar";
import { Header } from "~/components/layout/Header";
import { WelcomeScreen } from "~/components/chat/WelcomeScreen";
import { ChatInput } from "~/components/chat/ChatInput";
import { MessageList } from "~/components/chat/MessageList";
import { useChat } from "~/context/ChatContext";

export default function ChatPage() {
  const { activeChatId, activeChat } = useChat();

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-area">
        <Header />

        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          {activeChatId === null || !activeChat ? (
            <WelcomeScreen />
          ) : activeChat.messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <MessageList />
          )}
        </div>

        <ChatInput />
      </main>
    </div>
  );
}
