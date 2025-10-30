// api/home/chat.ts  (React Native frontend)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { BASE_URL } from "../env/baseUrl";

// Types for chat API
export type ChatMessage = {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
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
};

// Get auth token from appropriate storage
async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // Web: Check sessionStorage first, then localStorage as fallback
      const sessionToken = sessionStorage.getItem('access_token');
      if (sessionToken) return sessionToken;
      
      const localToken = localStorage.getItem('access_token');
      return localToken;
    } else {
      // Mobile: Use AsyncStorage
      return await AsyncStorage.getItem('access_token');
    }
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
}

// Updated askAI to use authenticated chat only
export async function askAI({
  prompt,   
  system,      
}: {
  prompt: string;
  system: string;
}): Promise<string> {
  // Always use authenticated chat now
  const result = await sendMessage({ prompt, system });
  return result.reply;
}

// Authenticated chat with history
export async function sendMessage({
  prompt,
  system,
  conversationId,
}: {
  prompt: string;
  system?: string;
  conversationId?: number;
}): Promise<ChatResponse> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const resp = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ prompt, system, conversation_id: conversationId }),
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// Get all conversations
export async function getConversations(): Promise<Conversation[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const resp = await fetch(`${BASE_URL}/chat/conversations`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// Get specific conversation with messages
export async function getConversation(id: number): Promise<{
  conversation: Conversation;
  messages: ChatMessage[];
}> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const resp = await fetch(`${BASE_URL}/chat/conversations/${id}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// Create new conversation
export async function createConversation(title?: string): Promise<Conversation> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const resp = await fetch(`${BASE_URL}/chat/conversations`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ title }),
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  return await resp.json();
}

// Update conversation title
export async function updateConversationTitle(id: number, title: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const resp = await fetch(`${BASE_URL}/chat/conversations/${id}/title`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ title }),
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
}

// Delete conversation
export async function deleteConversation(id: number): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const resp = await fetch(`${BASE_URL}/chat/conversations/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
}