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

export interface ChatResponse {
    conversation_id: string;
    visitor_id: string | null;
    user_message: Message;
    assistant_message: Message;
}

export type ChatSession = ConversationDetail;
