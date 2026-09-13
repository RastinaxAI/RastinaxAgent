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
  streamChat,
} from '~/api/chatApi';
import { useUI } from '~/context/UIContext';
import { STORAGE_KEYS } from '~/lib/constants';
import type {
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
  /** Live text of the assistant response currently being typed out. */
  streamingAssistantText: string;
  isLoadingConversation: boolean;
  isLoadingConversations: boolean;
  isReady: boolean;
  error: string | null;
  clearError: () => void;
  createNewChat: () => void;
  selectChat: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  stopGeneration: () => void;
  sendMessage: (text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const createId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

// ============================================================
// Word-by-word typewriter display
//
// Network chunks land in targetTextRef at full speed; a ticker
// then reveals the text word by word so the response types out
// gently. If the buffer grows too far behind (fast model or
// short ticks), more than one word is revealed per tick so the
// display never lags noticeably behind the network.
// ============================================================

const TYPE_TICK_MS = 70;
const TYPE_CATCHUP_CHARS = 120;

const WHITESPACE = /\s/;

function revealNextWord(text: string, from: number) {
  let i = from;
  while (i < text.length && WHITESPACE.test(text[i])) i++;
  while (i < text.length && !WHITESPACE.test(text[i])) i++;
  while (i < text.length && WHITESPACE.test(text[i])) i++;
  return i;
}

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

function getStreamCutMessage(lang: 'fa' | 'en') {
  return lang === 'fa'
    ? 'پاسخ به‌صورت ناقص قطع شد؛ ممکن است بخشی از پاسخ ذخیره نشده باشد.'
    : 'The response stream was cut off; part of the answer may be missing.';
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
  const [streamingText, setStreamingText] = useState('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const langRef = useRef(lang);
  const requestSequence = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Typewriter state: target grows with network chunks, displayed
  // text catches up word by word through the ticker below.
  const targetTextRef = useRef('');
  const displayedCharsRef = useRef(0);
  const streamEndedRef = useRef(false);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizeStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    stopTicker();
    tickerRef.current = setInterval(() => {
      const target = targetTextRef.current;

      if (displayedCharsRef.current >= target.length) {
        if (streamEndedRef.current) {
          stopTicker();
          finalizeStreamRef.current?.();
        }
        return;
      }

      const behind = target.length - displayedCharsRef.current;
      const wordsToReveal = behind > TYPE_CATCHUP_CHARS * 2 ? 3 : behind > TYPE_CATCHUP_CHARS ? 2 : 1;

      let next = displayedCharsRef.current;
      for (let w = 0; w < wordsToReveal && next < target.length; w++) {
        next = revealNextWord(target, next);
      }

      displayedCharsRef.current = next;
      setStreamingText(target.slice(0, next));
    }, TYPE_TICK_MS);
  }, [stopTicker]);

  const resetTypewriter = useCallback(() => {
    stopTicker();
    finalizeStreamRef.current = null;
    streamEndedRef.current = true;
    targetTextRef.current = '';
    displayedCharsRef.current = 0;
    setStreamingText('');
  }, [stopTicker]);

  // Stop the ticker when the provider unmounts.
  useEffect(() => stopTicker, [stopTicker]);

  const loadConversations = useCallback(
    async (currentVisitorId: string, showError = true) => {
      setIsLoadingConversations(true);
      try {
        const data = await getConversations(currentVisitorId);
        setChats(data);
        return data;
      } catch (requestError) {
        if (showError) {
          setError(getFriendlyError(requestError, langRef.current));
        }
        return null;
      } finally {
        setIsLoadingConversations(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const sequence = requestSequence.current;

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
      }

      if (!storedVisitorId) {
        if (!cancelled) setIsReady(true);
        return;
      }

      const summaries = await loadConversations(storedVisitorId);
      if (cancelled || sequence !== requestSequence.current) return;

      if (!storedConversationId) {
        setIsReady(true);
        return;
      }

      const hasStoredConversation = summaries?.some(
        (conversation) => conversation.id === storedConversationId,
      );

      if (!hasStoredConversation && summaries !== null) {
        removeStoredValue(STORAGE_KEYS.conversationId);
        setActiveChatId(null);
        setIsReady(true);
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
        setError(getFriendlyError(requestError, langRef.current));
      } finally {
        if (!cancelled && sequence === requestSequence.current) {
          setIsLoadingConversation(false);
          setIsReady(true);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  const createNewChat = useCallback(() => {
    requestSequence.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    resetTypewriter();
    setIsGenerating(false);
    setIsLoadingConversation(false);
    setIsLoadingConversations(false);
    setIsReady(true);
    setActiveChatId(null);
    setMessages([]);
    setError(null);
    removeStoredValue(STORAGE_KEYS.conversationId);
  }, [resetTypewriter]);

  const stopGeneration = useCallback(() => {
    // While the stream is active this aborts the request; while the
    // typewriter is still draining it flushes the remaining words.
    abortRef.current?.abort();
    displayedCharsRef.current = targetTextRef.current.length;
  }, []);

  const selectChat = useCallback(
    async (id: string) => {
      if (
        isGenerating ||
        isLoadingConversation ||
        isLoadingConversations ||
        id === activeChatId
      ) {
        return;
      }
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
      isLoadingConversations,
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
        isLoadingConversations ||
        !isReady
      ) {
        return;
      }

      const conversationIdAtSend = activeChatId;
      const visitorIdAtSend = visitorId;
      const previousMessageCount = messages.length;
      const sequence = ++requestSequence.current;
      const previousSummary = chats.find(
        (conversation) => conversation.id === conversationIdAtSend,
      );
      const optimisticMessage: Message = {
        id: `optimistic-${createId()}`,
        role: 'user',
        content: trimmedText,
        created_at: new Date().toISOString(),
      };

      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setMessages((current) => [...current, optimisticMessage]);

      targetTextRef.current = '';
      displayedCharsRef.current = 0;
      streamEndedRef.current = false;
      setStreamingText('');
      setIsGenerating(true);
      startTicker();

      try {
        const result = await streamChat(
          {
            message: trimmedText,
            ...(visitorIdAtSend ? { visitor_id: visitorIdAtSend } : {}),
            ...(conversationIdAtSend
              ? { conversation_id: conversationIdAtSend }
              : {}),
          },
          {
            signal: controller.signal,
            onChunk: (_chunk, fullText) => {
              if (sequence !== requestSequence.current) return;
              targetTextRef.current = fullText;
            },
          },
        );

        if (sequence !== requestSequence.current) return;

        // Persist the identifiers returned through the response headers.
        if (result.visitorId) {
          setVisitorId(result.visitorId);
          writeStoredValue(STORAGE_KEYS.visitorId, result.visitorId);
        }

        const effectiveConversationId =
          result.conversationId ?? conversationIdAtSend;

        if (result.conversationId) {
          setActiveChatId(result.conversationId);
          writeStoredValue(
            STORAGE_KEYS.conversationId,
            result.conversationId,
          );
        }

        // Attach the real server-side id to the optimistic user message.
        if (result.userMessageId) {
          const serverUserMessageId = result.userMessageId;
          setMessages((current) =>
            current.map((message) =>
              message.id === optimisticMessage.id
                ? { ...message, id: serverUserMessageId }
                : message,
            ),
          );
        }

        if (result.incomplete) {
          setError(getStreamCutMessage(langRef.current));
        }

        // Network side is complete; the typewriter keeps typing until
        // the whole text is revealed, then finalizes below.
        targetTextRef.current = result.text || targetTextRef.current;
        streamEndedRef.current = true;

        finalizeStreamRef.current = () => {
          if (sequence !== requestSequence.current) return;

          // The backend persists the assistant message only after the
          // stream completes successfully. An aborted stream therefore
          // stays local-only and may disappear after a page reload.
          const assistantText = targetTextRef.current;

          if (assistantText.trim()) {
            setMessages((current) => [
              ...current,
              {
                id: `assistant-${createId()}`,
                role: 'assistant',
                content: assistantText,
                created_at: new Date().toISOString(),
              },
            ]);
          }

          // Update the sidebar entry immediately; the background refresh
          // below then syncs the server-side title and message count.
          if (effectiveConversationId) {
            const nowIso = new Date().toISOString();
            const summary: ConversationSummary = {
              id: effectiveConversationId,
              title: previousSummary?.title || trimmedText.slice(0, 100),
              last_message: {
                role: 'assistant',
                content: assistantText || trimmedText,
                created_at: nowIso,
              },
              message_count:
                Math.max(
                  previousMessageCount,
                  previousSummary?.message_count ?? 0,
                ) + 2,
              created_at: previousSummary?.created_at || nowIso,
              updated_at: nowIso,
            };
            setChats((current) => [
              summary,
              ...current.filter(
                (conversation) => conversation.id !== summary.id,
              ),
            ]);
          }

          const visitorIdFinal = result.visitorId ?? visitorIdAtSend;
          if (visitorIdFinal && !result.incomplete) {
            void loadConversations(visitorIdFinal, false);
          }

          setIsGenerating(false);
          setStreamingText('');
          abortRef.current = null;
          finalizeStreamRef.current = null;
        };
      } catch (requestError) {
        // Errors before the stream starts: the backend did not persist
        // the user message either, so remove the optimistic one.
        stopTicker();
        finalizeStreamRef.current = null;
        streamEndedRef.current = true;

        if (sequence !== requestSequence.current) return;

        setMessages((current) =>
          current.filter((message) => message.id !== optimisticMessage.id),
        );

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
        setIsGenerating(false);
        setStreamingText('');
        abortRef.current = null;
      }
    },
    [
      activeChatId,
      chats,
      isGenerating,
      isLoadingConversation,
      isLoadingConversations,
      isReady,
      lang,
      loadConversations,
      messages,
      startTicker,
      stopTicker,
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
        streamingAssistantText: streamingText,
        isLoadingConversation,
        isLoadingConversations,
        isReady,
        error,
        clearError: () => setError(null),
        createNewChat,
        selectChat,
        refreshConversations,
        stopGeneration,
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
