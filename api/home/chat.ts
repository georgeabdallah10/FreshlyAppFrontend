// api/home/chat.ts  (React Native frontend)
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Get auth token
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

// Legacy chat (no auth required)
export async function askAI({
  prompt,   
  system,      
}: {
  prompt: string;
  system: string;
}): Promise<string> {
  const resp = await fetch(`${BASE_URL}/chat/legacy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt}),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.reply ?? "";
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
    throw new Error('Authentication required');
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
  if (!token) return [];

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
    throw new Error('Authentication required');
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
    throw new Error('Authentication required');
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
    throw new Error('Authentication required');
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
    throw new Error('Authentication required');
  }

  const resp = await fetch(`${BASE_URL}/chat/conversations/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
}