'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  ApiError,
  getConversation,
  getConversations,
  sendMessage as sendMessageToApi,
} from '~/api/chatApi';
import { useUI } from '~/context/UIContext';
import { STORAGE_KEYS } from '~/lib/constants';
import type {
  ChatResponse,
  ConversationDetail,
  ConversationSummary,
  Message,
} from '~/types/chat';

interface ChatContextType {
  chats: ConversationSummary[];
  activeChatId: string | null;
  activeChat: ConversationDetail | undefined;
  visitorId: string | null;
  messages: Message[];
  isGenerating: boolean;
  isLoadingConversation: boolean;
  isLoadingConversations: boolean;
  isReady: boolean;
  error: string | null;
  clearError: () => void;
  createNewChat: () => void;
  selectChat: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const createId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

function getFriendlyError(error: unknown, lang: 'fa' | 'en') {
  const messages =
    lang === 'fa'
      ? {
          network:
            'ارتباط با بک‌اند برقرار نشد. اجرای Django و آدرس API را بررسی کنید.',
          badRequest: 'درخواست نامعتبر بود. متن پیام را بررسی کنید.',
          forbidden: 'به این گفتگو دسترسی ندارید.',
          notFound: 'این گفتگو پیدا نشد؛ یک گفتگوی جدید شروع کنید.',
          unavailable:
            'سرویس هوش مصنوعی موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.',
          generic: 'ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.',
        }
      : {
          network:
            'Could not connect to the backend. Check Django and the API URL.',
          badRequest:
            'The request was not valid. Check your message and try again.',
          forbidden: 'You do not have access to this conversation.',
          notFound: 'This conversation was not found. Start a new chat.',
          unavailable:
            'The AI service is temporarily unavailable. Please try again soon.',
          generic: 'The message could not be sent. Please try again.',
        };

  if (!(error instanceof ApiError)) return messages.generic;
  if (error.status === 0) return messages.network;
  if (error.status === 400) return messages.badRequest;
  if (error.status === 403) return messages.forbidden;
  if (error.status === 404) return messages.notFound;
  if (error.status === 503 || error.status >= 500) {
    return messages.unavailable;
  }
  return messages.generic;
}

function makeSummary(
  response: ChatResponse,
  previous: ConversationSummary | undefined,
  firstMessage: string,
  previousMessageCount: number,
): ConversationSummary {
  const title = previous?.title || firstMessage.slice(0, 100);
  const createdAt = previous?.created_at || response.user_message.created_at;

  return {
    id: response.conversation_id,
    title,
    last_message: {
      role: response.assistant_message.role,
      content: response.assistant_message.content,
      created_at: response.assistant_message.created_at,
    },
    message_count: (previous?.message_count || previousMessageCount) + 2,
    created_at: createdAt,
    updated_at: response.assistant_message.created_at,
  };
}

function readStoredValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in private browsing contexts.
  }
}

function removeStoredValue(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore unavailable localStorage.
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { lang } = useUI();
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadConversations = useCallback(
    async (currentVisitorId: string, showError = true) => {
      setIsLoadingConversations(true);
      try {
        const data = await getConversations(currentVisitorId);
        setChats(data);
        return data;
      } catch (requestError) {
        if (showError) {
          setError(getFriendlyError(requestError, lang));
        }
        return null;
      } finally {
        setIsLoadingConversations(false);
      }
    },
    [lang],
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedVisitorId = readStoredValue(STORAGE_KEYS.visitorId);
      const storedConversationId = readStoredValue(
        STORAGE_KEYS.conversationId,
      );

      if (!storedVisitorId) {
        removeStoredValue(STORAGE_KEYS.conversationId);
      }

      if (!cancelled) {
        setVisitorId(storedVisitorId);
        setActiveChatId(storedVisitorId ? storedConversationId : null);
        setIsReady(true);
      }

      if (!storedVisitorId) return;

      const summaries = await loadConversations(storedVisitorId);
      if (cancelled) return;

      if (!storedConversationId) return;

      const hasStoredConversation = summaries?.some(
        (conversation) => conversation.id === storedConversationId,
      );

      if (!hasStoredConversation && summaries !== null) {
        removeStoredValue(STORAGE_KEYS.conversationId);
        setActiveChatId(null);
        return;
      }

      setIsLoadingConversation(true);
      try {
        const detail = await getConversation(
          storedConversationId,
          storedVisitorId,
        );
        if (!cancelled) {
          setMessages(detail.messages);
          setChats((current) =>
            current.map((conversation) =>
              conversation.id === detail.id
                ? {
                    ...conversation,
                    title: detail.title,
                    created_at: detail.created_at,
                    updated_at: detail.updated_at,
                    message_count: detail.messages.length,
                    last_message:
                      detail.messages.length > 0
                        ? (() => {
                            const last = detail.messages.at(-1)!;
                            return {
                              role: last.role,
                              content: last.content,
                              created_at: last.created_at,
                            };
                          })()
                        : null,
                  }
                : conversation,
            ),
          );
        }
      } catch (requestError) {
        if (cancelled) return;
        removeStoredValue(STORAGE_KEYS.conversationId);
        setActiveChatId(null);
        setMessages([]);
        setError(getFriendlyError(requestError, lang));
      } finally {
        if (!cancelled) setIsLoadingConversation(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [lang, loadConversations]);

  const createNewChat = useCallback(() => {
    requestSequence.current += 1;
    setActiveChatId(null);
    setMessages([]);
    setError(null);
    removeStoredValue(STORAGE_KEYS.conversationId);
  }, []);

  const selectChat = useCallback(
    async (id: string) => {
      if (isGenerating || isLoadingConversation || id === activeChatId) return;
      if (!visitorId) {
        setError(
          lang === 'fa'
            ? 'شناسه بازدیدکننده پیدا نشد؛ ابتدا یک پیام جدید ارسال کنید.'
            : 'No visitor identity was found. Send a new message first.',
        );
        return;
      }

      const sequence = ++requestSequence.current;
      setError(null);
      setActiveChatId(id);
      setMessages([]);
      writeStoredValue(STORAGE_KEYS.conversationId, id);
      setIsLoadingConversation(true);

      try {
        const detail = await getConversation(id, visitorId);
        if (sequence !== requestSequence.current) return;

        setMessages(detail.messages);
        setChats((current) => {
          const exists = current.some(
            (conversation) => conversation.id === detail.id,
          );
          const summary: ConversationSummary = {
            id: detail.id,
            title: detail.title,
            last_message:
              detail.messages.length > 0
                ? (() => {
                    const last = detail.messages.at(-1)!;
                    return {
                      role: last.role,
                      content: last.content,
                      created_at: last.created_at,
                    };
                  })()
                : null,
            message_count: detail.messages.length,
            created_at: detail.created_at,
            updated_at: detail.updated_at,
          };

          return exists
            ? current.map((conversation) =>
                conversation.id === detail.id ? summary : conversation,
              )
            : [summary, ...current];
        });
      } catch (requestError) {
        if (sequence !== requestSequence.current) return;
        setActiveChatId(null);
        setMessages([]);
        removeStoredValue(STORAGE_KEYS.conversationId);
        setError(getFriendlyError(requestError, lang));

        if (
          requestError instanceof ApiError &&
          (requestError.status === 403 || requestError.status === 404)
        ) {
          await loadConversations(visitorId, false);
        }
      } finally {
        if (sequence === requestSequence.current) {
          setIsLoadingConversation(false);
        }
      }
    },
    [
      activeChatId,
      isGenerating,
      isLoadingConversation,
      lang,
      loadConversations,
      visitorId,
    ],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (
        !trimmedText ||
        isGenerating ||
        isLoadingConversation ||
        !isReady
      ) {
        return;
      }

      const conversationIdAtSend = activeChatId;
      const visitorIdAtSend = visitorId;
      const previousMessages = messages;
      const previousSummary = chats.find(
        (conversation) => conversation.id === conversationIdAtSend,
      );
      const optimisticMessage: Message = {
        id: `optimistic-${createId()}`,
        role: 'user',
        content: trimmedText,
        created_at: new Date().toISOString(),
      };

      setError(null);
      setMessages((current) => [...current, optimisticMessage]);
      setIsGenerating(true);

      try {
        const response = await sendMessageToApi({
          message: trimmedText,
          ...(visitorIdAtSend ? { visitor_id: visitorIdAtSend } : {}),
          ...(conversationIdAtSend
            ? { conversation_id: conversationIdAtSend }
            : {}),
        });

        setMessages([
          ...previousMessages,
          response.user_message,
          response.assistant_message,
        ]);
        setActiveChatId(response.conversation_id);

        if (response.visitor_id) {
          setVisitorId(response.visitor_id);
          writeStoredValue(STORAGE_KEYS.visitorId, response.visitor_id);
        }
        writeStoredValue(
          STORAGE_KEYS.conversationId,
          response.conversation_id,
        );

        const summary = makeSummary(
          response,
          previousSummary,
          trimmedText,
          previousMessages.length,
        );
        setChats((current) => [
          summary,
          ...current.filter(
            (conversation) => conversation.id !== summary.id,
          ),
        ]);

        if (response.visitor_id) {
          await loadConversations(response.visitor_id, false);
        }
      } catch (requestError) {
        setMessages(previousMessages);

        if (
          requestError instanceof ApiError &&
          (requestError.status === 403 || requestError.status === 404)
        ) {
          setActiveChatId(null);
          removeStoredValue(STORAGE_KEYS.conversationId);
          if (visitorIdAtSend) {
            await loadConversations(visitorIdAtSend, false);
          }
        }

        setError(getFriendlyError(requestError, lang));
      } finally {
        setIsGenerating(false);
      }
    },
    [
      activeChatId,
      chats,
      isGenerating,
      isLoadingConversation,
      isReady,
      lang,
      loadConversations,
      messages,
      visitorId,
    ],
  );

  const refreshConversations = useCallback(async () => {
    if (!visitorId) {
      setChats([]);
      return;
    }
    await loadConversations(visitorId);
  }, [loadConversations, visitorId]);

  const activeChat = useMemo(() => {
    const summary = chats.find(
      (conversation) => conversation.id === activeChatId,
    );
    if (!summary) return undefined;

    return {
      ...summary,
      messages,
    };
  }, [activeChatId, chats, messages]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        activeChat,
        visitorId,
        messages,
        isGenerating,
        isLoadingConversation,
        isLoadingConversations,
        isReady,
        error,
        clearError: () => setError(null),
        createNewChat,
        selectChat,
        refreshConversations,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
