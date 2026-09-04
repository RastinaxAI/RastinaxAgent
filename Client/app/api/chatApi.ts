import type {
  ChatRequest,
  ChatResponse,
  ConversationDetail,
  ConversationSummary,
} from '~/types/chat';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredBaseUrl || 'http://127.0.0.1:8001/api/v1'
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

export function sendMessage(payload: ChatRequest) {
  const body: ChatRequest = {
    message: payload.message,
    ...(payload.visitor_id ? { visitor_id: payload.visitor_id } : {}),
    ...(payload.conversation_id
      ? { conversation_id: payload.conversation_id }
      : {}),
  };

  return requestJson<ChatResponse>('/chat/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
