export type MessageRole = 'user' | 'assistant' | 'system';
export type ToolType = 'image' | 'video' | 'site';

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    created_at: string;
}

export interface ConversationSummary {
    id: string;
    title: string;
    last_message: {
        role: MessageRole;
        content: string;
        created_at: string;
    } | null;
    message_count: number;
    created_at: string;
    updated_at: string;
}

export interface ConversationDetail {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages: Message[];
}

export interface ChatRequest {
    message: string;
    visitor_id?: string;
    conversation_id?: string;
}

/**
 * Result of a streamed chat response. The backend answers
 * POST /api/v1/chat/ with a raw text stream and returns the
 * identifiers through response headers (X-Conversation-ID,
 * X-Visitor-ID, X-User-Message-ID).
 */
export interface ChatStreamResult {
    conversationId: string | null;
    visitorId: string | null;
    userMessageId: string | null;
    /** Full assistant text received from the stream. */
    text: string;
    /** True when the stream was stopped by the user (AbortController). */
    aborted: boolean;
    /** True when the stream ended abnormally before completion. */
    incomplete: boolean;
}

export type ChatSession = ConversationDetail;
