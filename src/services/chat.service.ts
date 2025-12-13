/**
 * ============================================
 * CHAT API SERVICE
 * ============================================
 *
 * CONVERSATION LIFECYCLE RULES (STRICT):
 * 1. conversation_id must be REQUIRED for follow-up messages
 * 2. system prompt may ONLY be sent on NEW conversations (no conversation_id)
 * 3. Frontend sends ONLY the new user message (no history resends)
 * 4. Only clear conversation_id when user explicitly starts "New Chat"
 */

import { apiClient } from '../client/apiClient';

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  conversationId?: number;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  lastMessage?: string;
}

export interface ChatResponse {
  reply: string;
  conversation_id: number;
  message_id: number;
}

export interface SendMessageInput {
  prompt: string;
  system?: string;
  conversationId?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Send a message to the AI chat
 *
 * CRITICAL CONVERSATION LIFECYCLE RULES:
 * 1. If conversationId is provided: This is a FOLLOW-UP message
 *    - Send ONLY: { prompt, conversation_id }
 *    - Do NOT send system prompt (backend manages context)
 * 2. If conversationId is undefined: This is a NEW conversation
 *    - Send: { prompt, system } to initialize the conversation
 *    - Backend will return a conversation_id to lock in
 */
export async function sendMessage(input: SendMessageInput): Promise<ChatResponse> {
  // Build payload based on conversation state
  const payload: {
    prompt: string;
    conversation_id?: number;
    system?: string;
  } = { prompt: input.prompt };

  if (input.conversationId !== undefined) {
    // FOLLOW-UP MESSAGE: Include conversation_id, NEVER include system
    payload.conversation_id = input.conversationId;

    if (input.system) {
      console.warn('[chatApi.sendMessage] WARNING: system prompt ignored for follow-up message');
    }
  } else {
    // NEW CONVERSATION: system prompt is allowed (optional)
    if (input.system) {
      payload.system = input.system;
    }
  }

  return await apiClient.post<ChatResponse>('/chat', payload);
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  return await apiClient.get<Conversation[]>('/chat/conversations');
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(id: number): Promise<Conversation> {
  return await apiClient.get<Conversation>(`/chat/conversations/${id}`);
}

/**
 * Get messages for a specific conversation
 */
export async function getConversationMessages(conversationId: number): Promise<ChatMessage[]> {
  return await apiClient.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: number): Promise<void> {
  await apiClient.delete(`/chat/conversations/${id}`);
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(id: number, title: string): Promise<Conversation> {
  return await apiClient.patch<Conversation>(`/chat/conversations/${id}`, { title });
}

/**
 * askAI - ONE-OFF AI queries (no conversation history)
 *
 * USE ONLY FOR:
 * - Quick meal generation in quickMeals.tsx
 * - Dev tools or one-off utilities
 *
 * DO NOT USE FOR:
 * - Main chat screen (use sendMessage with conversation_id instead)
 *
 * This function intentionally does NOT track conversations.
 * Each call is independent with no history.
 */
export async function askAI(prompt: string, system?: string): Promise<string> {
  console.log('[chatApi.askAI] One-off query (no conversation tracking)');
  // Direct POST without conversation_id - creates ephemeral interaction
  const response = await apiClient.post<ChatResponse>('/chat', {
    prompt,
    system,
    // No conversation_id - this is intentional for one-off queries
  });
  return response.reply;
}

/**
 * Generate meal suggestions via AI
 */
export async function generateMealSuggestions(preferences: any): Promise<string> {
  return await apiClient.post<string>('/chat/meal-suggestions', preferences);
}

/**
 * Get recipe from AI
 */
export async function getRecipeFromAI(mealName: string): Promise<string> {
  return await apiClient.post<string>('/chat/recipe', { meal_name: mealName });
}

// ============================================
// EXPORT ALL
// ============================================

export const chatApi = {
  sendMessage,
  getConversations,
  getConversation,
  getConversationMessages,
  deleteConversation,
  updateConversationTitle,
  askAI,
  generateMealSuggestions,
  getRecipeFromAI,
};

export default chatApi;
