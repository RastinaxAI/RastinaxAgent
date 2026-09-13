import type {
  ChatRequest,
  ChatStreamResult,
  ConversationDetail,
  ConversationSummary,
} from '~/types/chat';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredBaseUrl || '/api/v1'
).replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'object' && payload !== null) {
    const data = payload as Record<string, unknown>;
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
  }

  return fallback;
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === 'AbortError'
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Unable to connect to the backend service.',
      0,
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Some upstream failures do not return JSON.
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload, `Backend request failed (${response.status}).`),
      response.status,
      payload,
    );
  }

  return payload as T;
}

export interface ChatStreamOptions {
  signal?: AbortSignal;
  /** Called for every decoded chunk with the chunk and the full text so far. */
  onChunk?: (chunk: string, fullText: string) => void;
}

/**
 * Sends a chat message and streams the assistant response.
 *
 * The endpoint answers with `text/plain` streaming content, so the body
 * must be read chunk by chunk (never with response.json()). Conversation,
 * visitor and user-message identifiers are exposed through response
 * headers and are read before the body is consumed.
 */
export async function streamChat(
  payload: ChatRequest,
  options: ChatStreamOptions = {},
): Promise<ChatStreamResult> {
  const body: ChatRequest = {
    message: payload.message,
    ...(payload.visitor_id ? { visitor_id: payload.visitor_id } : {}),
    ...(payload.conversation_id
      ? { conversation_id: payload.conversation_id }
      : {}),
  };

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (fetchError) {
    if (isAbortError(fetchError)) {
      return {
        conversationId: null,
        visitorId: null,
        userMessageId: null,
        text: '',
        aborted: true,
        incomplete: false,
      };
    }

    throw new ApiError(
      'Unable to connect to the backend service.',
      0,
    );
  }

  // Headers are available as soon as the response resolves,
  // before any stream chunk is read.
  const conversationId = response.headers.get('X-Conversation-ID');
  const visitorId = response.headers.get('X-Visitor-ID');
  const userMessageId = response.headers.get('X-User-Message-ID');

  if (!response.ok || !response.body) {
    let errorPayload: unknown = null;
    try {
      errorPayload = await response.json();
    } catch {
      try {
        errorPayload = await response.text();
      } catch {
        // Ignore unreadable error bodies.
      }
    }

    throw new ApiError(
      getErrorMessage(
        errorPayload,
        `Backend request failed (${response.status}).`,
      ),
      response.status,
      errorPayload,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let aborted = false;
  let incomplete = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;

      text += chunk;
      options.onChunk?.(chunk, text);
    }
  } catch (streamError) {
    if (isAbortError(streamError)) {
      aborted = true;
    } else {
      // HTTP headers were already sent, so a mid-stream failure
      // surfaces as a broken stream instead of an error status.
      incomplete = true;
    }
  }

  const remaining = decoder.decode();
  if (remaining) {
    text += remaining;
    options.onChunk?.(remaining, text);
  }

  return {
    conversationId,
    visitorId,
    userMessageId,
    text,
    aborted,
    incomplete,
  };
}

export function getConversations(visitorId: string) {
  const query = encodeURIComponent(visitorId);
  return requestJson<ConversationSummary[]>(
    `/conversations/?visitor_id=${query}`,
  );
}

export function getConversation(conversationId: string, visitorId: string) {
  const conversation = encodeURIComponent(conversationId);
  const visitor = encodeURIComponent(visitorId);
  return requestJson<ConversationDetail>(
    `/conversations/${conversation}/?visitor_id=${visitor}`,
  );
}
