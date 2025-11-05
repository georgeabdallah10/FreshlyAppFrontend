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

  const baseUrl = getBaseUrl();
  console.log('Sending message to:', `${baseUrl}/chat`);
  console.log('Token exists:', !!token);
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout
  
  try {
    const resp = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ prompt, system, conversation_id: conversationId }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('Response status:', resp.status);
    console.log('Response headers:', resp.headers);
    
    if (!resp.ok) {
      const errorText = await resp.text();
      console.log('ERROR [Chat] Error response:', errorText);
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }
    return await resp.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.log('ERROR [Chat] Request timed out after 50 seconds');
      throw new Error('TIMEOUT');
    }
    
    console.log('ERROR [Chat] Fetch error:', error);
    throw error;
  }
}

// Get all conversations
export async function getConversations(): Promise<Conversation[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations`, {
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

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations/${id}`, {
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

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations`, {
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

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations/${id}/title?title=${encodeURIComponent(title)}`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`
    },
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
}

// Delete conversation
export async function deleteConversation(id: number): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required - please log in');
  }

  const baseUrl = getBaseUrl();
  const resp = await fetch(`${baseUrl}/chat/conversations/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
}