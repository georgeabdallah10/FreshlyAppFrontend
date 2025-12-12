// AI API utilities for meal planning features
import { BASE_URL } from "../env/baseUrl";
import { Storage } from "./storage";

async function getAuthHeaders() {
  const token = await Storage.getItem("access_token");
  if (!token) console.log("Not authenticated: missing access token");
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
 * Convert image URI to base64 (for React Native and Web)
 */
export const imageUriToBase64 = async (uri: string): Promise<string> => {
  try {
    console.log('[imageUriToBase64] Input length:', uri.length);
    console.log('[imageUriToBase64] Input start:', uri.substring(0, 100));
    
    // If it's already base64 (long string without URI schemes)
    if (uri.length > 1000 && !uri.includes(':')) {
      console.log('[imageUriToBase64] Already base64 string, returning as-is');
      return uri;
    }
    
    // For web, if it's already a data URL, extract the base64 part
    if (uri.startsWith('data:')) {
      console.log('[imageUriToBase64] Data URL detected, extracting base64...');
      const base64 = uri.split(',')[1];
      if (!base64) {
        console.log('Invalid data URL format');
        console.log('Invalid data URL format');
      }
      console.log('[imageUriToBase64] Base64 extracted, length:', base64.length);
      return base64;
    }
    
    // For URIs (blob:, file:, http:, etc.)
    if (uri.includes(':') && uri.length < 1000) {
      console.log('[imageUriToBase64] Fetching URI...');
      const response = await fetch(uri);
      
      if (!response.ok) {
        console.log(`Failed to fetch image: ${response.status} ${response.statusText}`);
        console.log(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      console.log('[imageUriToBase64] Converting to blob...');
      const blob = await response.blob();
      console.log('[imageUriToBase64] Blob size:', blob.size, 'type:', blob.type);
      
      if (blob.size === 0) {
        console.log('Blob is empty - image may not have loaded');
        console.log('Blob is empty - image may not have loaded');
      }
      
      console.log('[imageUriToBase64] Converting to base64...');
      const base64 = await fileToBase64(blob);
      console.log('[imageUriToBase64] Conversion complete, length:', base64.length);
      
      return base64;
    }
    
    // Fallback: assume it's already base64
    console.log('[imageUriToBase64] Assuming base64 format, returning as-is');
    return uri;
    
  } catch (error) {
    console.log('ERROR [imageUriToBase64] Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`Failed to convert image: ${errorMsg}`);
    throw error;
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
      console.log('UNAUTHORIZED');
    }
    if (response.status === 503) {
      console.log('Service temporarily unavailable. Please try again later.');
    }
    const errorText = await response.text();
    console.log(`Scan failed (${response.status}): ${errorText}`);
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
