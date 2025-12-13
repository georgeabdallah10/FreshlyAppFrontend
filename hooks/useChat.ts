/**
 * ============================================
 * CHAT HOOKS - React Query Integration
 * ============================================
 *
 * CONVERSATION LIFECYCLE RULES (STRICT):
 * 1. conversation_id must be REQUIRED for follow-up messages
 * 2. system prompt may ONLY be sent on NEW conversations (no conversation_id)
 * 3. Frontend sends ONLY the new user message (no history resends)
 * 4. Only clear conversation_id when user explicitly starts "New Chat"
 *
 * NOTE: These hooks follow the same patterns as the direct service functions.
 * If using these hooks, ensure you manage conversation_id correctly:
 * - For new chats: Don't pass conversationId
 * - For follow-ups: Always pass conversationId, never pass system
 */

import { ApiError } from '@/src/client/apiClient';
import { invalidateQueries, queryKeys } from '@/src/config/queryClient';
import {
    chatApi,
    ChatMessage,
    ChatResponse,
    Conversation,
    SendMessageInput,
} from '@/src/services/chat.service';
import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get all conversations
 */
export function useConversations(options?: Omit<UseQueryOptions<Conversation[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<Conversation[], ApiError>({
    queryKey: queryKeys.chat.conversations(),
    queryFn: () => chatApi.getConversations(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

/**
 * Get a specific conversation
 */
export function useConversation(id: number, options?: Omit<UseQueryOptions<Conversation, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<Conversation, ApiError>({
    queryKey: queryKeys.chat.conversation(id),
    queryFn: () => chatApi.getConversation(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Get messages for a conversation
 */
export function useConversationMessages(conversationId: number, options?: Omit<UseQueryOptions<ChatMessage[], ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery<ChatMessage[], ApiError>({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: () => chatApi.getConversationMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 1000 * 30, // 30 seconds - chat messages should be relatively fresh
    ...options,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Send a message (MAIN CHAT with conversation lifecycle)
 *
 * USAGE RULES:
 * - NEW CONVERSATION: Call with { prompt, system } (no conversationId)
 *   The response will contain conversation_id to lock in for follow-ups
 * - FOLLOW-UP MESSAGE: Call with { prompt, conversationId } (no system)
 *   System prompt is managed by backend
 *
 * IMPORTANT: This hook manages optimistic updates automatically.
 * Never re-append user messages after receiving AI response.
 */
export function useSendMessage(options?: UseMutationOptions<ChatResponse, ApiError, SendMessageInput>) {
  const queryClient = useQueryClient();

  return useMutation<ChatResponse, ApiError, SendMessageInput>({
    mutationFn: (input: SendMessageInput) => {
      // Warn if system is passed for follow-up messages
      if (input.conversationId !== undefined && input.system) {
        console.warn('[useSendMessage] WARNING: system prompt should not be passed for follow-up messages');
      }
      return chatApi.sendMessage(input);
    },
    onMutate: async (newMessage) => {
      // Optimistically add user message to UI (only if we have a conversation)
      if (newMessage.conversationId) {
        await queryClient.cancelQueries({ queryKey: queryKeys.chat.messages(newMessage.conversationId) });

        const previousMessages = queryClient.getQueryData<ChatMessage[]>(
          queryKeys.chat.messages(newMessage.conversationId)
        );

        const optimisticMessage: ChatMessage = {
          id: Date.now(),
          content: newMessage.prompt,
          role: 'user',
          timestamp: new Date().toISOString(),
          conversationId: newMessage.conversationId,
        };

        queryClient.setQueryData<ChatMessage[]>(
          queryKeys.chat.messages(newMessage.conversationId),
          (old) => [...(old || []), optimisticMessage]
        );

        return { previousMessages };
      }
    },
    onSuccess: (data, variables) => {
      // Add AI response to messages
      if (data.conversation_id) {
        const aiMessage: ChatMessage = {
          id: data.message_id,
          content: data.reply,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          conversationId: data.conversation_id,
        };

        queryClient.setQueryData<ChatMessage[]>(
          queryKeys.chat.messages(data.conversation_id),
          (old) => [...(old || []), aiMessage]
        );

        // Invalidate conversations list to update last message
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      }
    },
    onError: (err, variables, context: any) => {
      // Rollback optimistic update on error - PRESERVE conversation_id
      // Only rollback the messages, never clear conversation state
      if (variables.conversationId && context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.chat.messages(variables.conversationId),
          context.previousMessages
        );
      }
    },
    ...options,
  });
}

/**
 * Delete a conversation
 */
export function useDeleteConversation(options?: UseMutationOptions<void, ApiError, number>) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, number>({
    mutationFn: (id: number) => chatApi.deleteConversation(id),
    onSuccess: () => {
      invalidateQueries.chat();
    },
    ...options,
  });
}

/**
 * Update conversation title
 */
export function useUpdateConversationTitle(options?: UseMutationOptions<Conversation, ApiError, { id: number; title: string }>) {
  const queryClient = useQueryClient();

  return useMutation<Conversation, ApiError, { id: number; title: string }>({
    mutationFn: ({ id, title }) => chatApi.updateConversationTitle(id, title),
    onSuccess: (data) => {
      invalidateQueries.conversation(data.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
    ...options,
  });
}

/**
 * useAskAI - ONE-OFF AI queries (no conversation history)
 *
 * USE ONLY FOR:
 * - Quick meal generation in quickMeals.tsx
 * - Dev tools or one-off utilities
 *
 * DO NOT USE FOR:
 * - Main chat screen (use useSendMessage with conversation_id instead)
 *
 * This hook intentionally does NOT track conversations.
 * Each call is independent with no history.
 */
export function useAskAI(options?: UseMutationOptions<string, ApiError, { prompt: string; system?: string }>) {
  return useMutation<string, ApiError, { prompt: string; system?: string }>({
    mutationFn: ({ prompt, system }) => chatApi.askAI(prompt, system),
    ...options,
  });
}

/**
 * Generate meal suggestions
 */
export function useGenerateMealSuggestions(options?: UseMutationOptions<string, ApiError, any>) {
  return useMutation<string, ApiError, any>({
    mutationFn: (preferences: any) => chatApi.generateMealSuggestions(preferences),
    ...options,
  });
}

/**
 * Get recipe from AI
 */
export function useGetRecipeFromAI(options?: UseMutationOptions<string, ApiError, string>) {
  return useMutation<string, ApiError, string>({
    mutationFn: (mealName: string) => chatApi.getRecipeFromAI(mealName),
    ...options,
  });
}
