import * as ImageManipulator from "expo-image-manipulator";
import { BASE_URL } from "../env/baseUrl";
import { GroceryScanResponse } from "./aiApi";
import { Storage } from "./storage";

/**
 * Upload and scan grocery/receipt image via backend proxy
 * Works reliably on iOS and Android mobile devices
 */
export async function scanImageViaProxy({
  uri,
  scanType,
}: {
  uri: string;
  scanType: "groceries" | "receipt";
}): Promise<GroceryScanResponse> {
  console.log('[scanImageViaProxy] Starting scan for type:', scanType);

  const token = await Storage.getItem("access_token");
  if (!token) {
    console.log('Not authenticated. Please log in again.');
  }

  const formData = new FormData();
  
  // Add scan type to FormData so backend knows what to scan
  formData.append('scan_type', scanType);

  // MOBILE (iOS/Android): Compress using expo-image-manipulator
  console.log('[scanImageViaProxy] Mobile platform, compressing...');
  
  const manipulated = await ImageManipulator.manipulateAsync(
    uri as string, 
    [{ resize: { width: 1600 } }], // Larger size for receipt OCR
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  const filename = `${scanType}.jpg`;
  const type = 'image/jpeg';

  // @ts-ignore - React Native FormData accepts { uri, type, name }
  formData.append("file", { 
    uri: manipulated.uri, 
    name: filename, 
    type 
  });

  console.log('[scanImageViaProxy] Uploading to /chat/scan-grocery-proxy');
  
  const res = await fetch(`${BASE_URL}/chat/scan-grocery-proxy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - browser/fetch sets it automatically with boundary
    },
    body: formData,
  });

  console.log('[scanImageViaProxy] Response status:', res.status);

  if (!res.ok) {
    const errorText = await res.text();
    console.log('ERROR [scanImageViaProxy] Scan failed:', errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Scan failed' };
    }
    
    if (res.status === 401) {
      console.log('UNAUTHORIZED');
    }
    
    console.log(errorData.message || errorData.detail || `Scan failed with status ${res.status}`);
  }

  const result = await res.json();
  console.log('[scanImageViaProxy] Scan successful:', result.total_items, 'items found');

  return result as GroceryScanResponse;
}
