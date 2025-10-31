/**
 * ============================================
 * CHAT HOOKS - React Query Integration
 * ============================================
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
 * Send a message
 */
export function useSendMessage(options?: UseMutationOptions<ChatResponse, ApiError, SendMessageInput>) {
  const queryClient = useQueryClient();

  return useMutation<ChatResponse, ApiError, SendMessageInput>({
    mutationFn: (input: SendMessageInput) => chatApi.sendMessage(input),
    onMutate: async (newMessage) => {
      // Optimistically add user message to UI
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
      // Rollback on error
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
 * Quick AI query hook (no conversation history)
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
