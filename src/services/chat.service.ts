/**
 * ============================================
 * CHAT API SERVICE
 * ============================================
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
 */
export async function sendMessage(input: SendMessageInput): Promise<ChatResponse> {
  return await apiClient.post<ChatResponse>('/chat', {
    prompt: input.prompt,
    system: input.system,
    conversation_id: input.conversationId,
  });
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
 * Quick AI query (without conversation history)
 */
export async function askAI(prompt: string, system?: string): Promise<string> {
  const response = await sendMessage({ prompt, system });
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
