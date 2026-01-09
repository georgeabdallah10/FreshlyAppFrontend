// api/home/chat.ts  (React Native frontend)
// ============================================
// CONVERSATION LIFECYCLE RULES (STRICT):
// 1. conversation_id must be REQUIRED for follow-up messages
// 2. system prompt may ONLY be sent on NEW conversations (no conversation_id)
// 3. Frontend sends ONLY the new user message (no history resends)
// 4. Only clear conversation_id when user explicitly starts "New Chat"
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../env/baseUrl";

// Types for chat API
export type ChatMessage = {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  image_url?: string | null; // URL to persisted image in Supabase Storage
};

export type Conversation = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

export type ChatResponse = {
  reply: string;
  conversation_id: number;
  message_id: number;
  meal?: any; // Optional structured meal object from backend
};

// Get auth token from AsyncStorage
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.log('ERROR [Chat] Error retrieving auth token:', error);
    return null;
  }
}

// Get appropriate base URL based on platform
function getBaseUrl(): string {
  // Always use direct backend URL - CORS should be handled on backend
  return BASE_URL;
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
export async function askAI({
  prompt,
  system,
}: {
  prompt: string;
  system: string;
}): Promise<string> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[askAI] Authentication required - please log in');
    throw new Error('Authentication required');
  }

  const baseUrl = getBaseUrl();
  console.log('[askAI] One-off query (no conversation tracking)');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    const resp = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      // One-off query: send system + prompt, no conversation_id
      body: JSON.stringify({ prompt, system }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.log('[askAI] Error response:', errorText);
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    return data.reply;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.log('[askAI] Request timed out after 50 seconds');
      throw new Error('TIMEOUT');
    }

    console.log('[askAI] Fetch error:', error);
    throw error;
  }
}

/**
 * sendMessage - MAIN CHAT with conversation lifecycle
 *
 * CRITICAL RULES:
 * 1. If conversationId is provided: Do NOT send system (backend manages context)
 * 2. If conversationId is undefined: This starts a NEW conversation, system is allowed
 * 3. NEVER include message history - backend is the source of truth
 * 4. Payload: { prompt, conversation_id?, system? (first msg only), image? (optional base64) }
 *
 * MULTIMODAL SUPPORT:
 * - If image is provided, it's sent as a base64 string alongside the text prompt
 * - Backend validates image format (jpg/png/webp) and size
 * - Text (prompt) is REQUIRED when sending an image
 */
export async function sendMessage({
  prompt,
  system,
  conversationId,
  image,
  signal,
}: {
  prompt: string;
  system?: string;
  conversationId?: number;
  image?: string; // Optional base64-encoded image data
  signal?: AbortSignal; // Optional abort signal for cancellation
}): Promise<ChatResponse> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[sendMessage] Authentication required - please log in');
    throw new Error('Authentication required');
  }

  const baseUrl = getBaseUrl();

  // CRITICAL: Build payload based on conversation state
  const payload: {
    prompt: string;
    conversation_id?: number;
    system?: string;
    image?: string;
  } = { prompt };

  if (conversationId !== undefined) {
    // FOLLOW-UP MESSAGE: Include conversation_id, NEVER include system
    payload.conversation_id = conversationId;

    // Log warning if system was passed for a follow-up (should not happen)
    if (system) {
      console.warn('[sendMessage] WARNING: system prompt ignored for follow-up message (conversation_id exists)');
    }

    console.log('[sendMessage] Follow-up message in conversation:', conversationId);
  } else {
    // NEW CONVERSATION: system prompt is allowed (optional)
    if (system) {
      payload.system = system;
    }
    console.log('[sendMessage] Starting NEW conversation');
  }

  // MULTIMODAL: Include image if provided
  if (image) {
    payload.image = image;
    console.log('[sendMessage] Including image attachment (base64)');
  }

  // Create AbortController for timeout (if no external signal provided)
  const timeoutController = signal ? null : new AbortController();
  const timeoutId = timeoutController ? setTimeout(() => timeoutController.abort(), 50000) : null; // 50 second timeout

  // Use external signal if provided, otherwise use timeout controller
  const abortSignal = signal || timeoutController?.signal;

  try {
    const resp = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    if (timeoutId) clearTimeout(timeoutId);
    console.log('[sendMessage] Response status:', resp.status);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.log('[sendMessage] Error response:', errorText);
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    console.log('[sendMessage] Success, conversation_id:', data.conversation_id);
    return data;
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      if (signal?.aborted) {
        console.log('[sendMessage] Request was cancelled by user');
        throw new Error('CANCELLED');
      } else {
        console.log('[sendMessage] Request timed out after 50 seconds');
        throw new Error('TIMEOUT');
      }
    }

    console.log('[sendMessage] Fetch error:', error);
    throw error;
  }
}

// Get all conversations
export async function getConversations(): Promise<Conversation[]> {
  const token = await getAuthToken();
  if (!token) {
    console.log('Authentication required - please log in');
  }

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) console.log(`HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// Get specific conversation with messages
export async function getConversation(id: number): Promise<{
  conversation: Conversation;
  messages: ChatMessage[];
}> {
  const token = await getAuthToken();
  if (!token) {
    console.log('Authentication required - please log in');
  }

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations/${id}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) console.log(`HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// Create new conversation
export async function createConversation(title?: string): Promise<Conversation> {
  const token = await getAuthToken();
  if (!token) {
    console.log('Authentication required - please log in');
  }

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ title }),
  });
  
  if (!resp.ok) console.log(`HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// Update conversation title
export async function updateConversationTitle(id: number, title: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    console.log('Authentication required - please log in');
  }

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations/${id}/title?title=${encodeURIComponent(title)}`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`
    },
  });
  
  if (!resp.ok) console.log(`HTTP ${resp.status}: ${await resp.text()}`);
}

// Delete conversation
export async function deleteConversation(id: number): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    console.log('Authentication required - please log in');
  }

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) console.log(`HTTP ${resp.status}: ${await resp.text()}`);
}