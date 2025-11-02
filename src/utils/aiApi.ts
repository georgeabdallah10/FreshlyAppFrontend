// AI API utilities for meal planning features
import { BASE_URL } from "../env/baseUrl";
import { Storage } from "./storage";

async function getAuthHeaders() {
  const token = await Storage.getItem("access_token");
  if (!token) throw new Error("Not authenticated: missing access token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ==================== Types ====================

export type GroceryItem = {
  name: string;
  quantity: string;
  category: string;
  confidence: number;
};

export type GroceryScanResponse = {
  items: GroceryItem[];
  total_items: number;
  analysis_notes?: string;
};

// ==================== Utility Functions ====================

/**
 * Convert a file/blob to base64 string (without data URL prefix)
 */
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Convert image URI to base64 (for React Native)
 */
export const imageUriToBase64 = async (uri: string): Promise<string> => {
  try {
    console.log('[imageUriToBase64] Fetching URI:', uri);
    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    console.log('[imageUriToBase64] Converting to blob...');
    const blob = await response.blob();
    console.log('[imageUriToBase64] Blob size:', blob.size, 'type:', blob.type);
    
    console.log('[imageUriToBase64] Converting to base64...');
    const base64 = await fileToBase64(blob);
    console.log('[imageUriToBase64] Conversion complete');
    
    return base64;
  } catch (error) {
    console.error('[imageUriToBase64] Error:', error);
    throw new Error(`Failed to convert image URI to base64: ${error instanceof Error ? error.message : error}`);
  }
};

// ==================== API Functions ====================

/**
 * Scan grocery image and get detected items
 * 
 * @param imageData - Base64 encoded image string (without data URL prefix)
 * @returns Detected grocery items with confidence scores
 */
export async function scanGroceryImage(
  imageData: string
): Promise<GroceryScanResponse> {
  const headers = await getAuthHeaders();
  
  console.log('[AI API] Scanning grocery image...');
  
  const response = await fetch(`${BASE_URL}/chat/scan-grocery`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image_data: imageData }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (response.status === 503) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }
    const errorText = await response.text();
    throw new Error(`Scan failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[AI API] Scan successful:', data.total_items, 'items found');
  
  return data;
}

/**
 * Get confidence level category for UI styling
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Get color for confidence score
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#00A86B'; // Green
  if (confidence >= 0.5) return '#FFA500'; // Orange/Yellow
  return '#FF3B30'; // Red
}
