import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { BASE_URL } from "../env/baseUrl";
import { GroceryScanResponse } from "./aiApi";
import { Storage } from "./storage";

/**
 * Upload and scan grocery/receipt image via backend proxy
 * Works reliably across iOS Safari, Android, and desktop web
 */
export async function scanImageViaProxy({
  uri,
  scanType,
}: {
  uri: string | File;
  scanType: "groceries" | "receipt";
}): Promise<GroceryScanResponse> {
  console.log('[scanImageViaProxy] Starting scan for type:', scanType);

  const token = await Storage.getItem("access_token");
  if (!token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const formData = new FormData();
  
  // Add scan type to FormData so backend knows what to scan
  formData.append('scan_type', scanType);

  if (typeof uri === "string") {
    if (Platform.OS === "web") {
      // WEB: Handle blob:, data:, or http: URIs
      console.log('[scanImageViaProxy] Web platform, URI type:', uri.substring(0, 20));
      
      let blob: Blob;
      
      if (uri.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(uri);
        blob = await response.blob();
      } else if (uri.startsWith('blob:') || uri.startsWith('http')) {
        // Fetch blob or http URL
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        blob = await response.blob();
      } else {
        throw new Error('Unsupported URI format on web');
      }
      
      console.log('[scanImageViaProxy] Original blob size:', blob.size, 'bytes');
      
      // Compress image for web to reduce payload size
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
      
      // Resize to max 1600x1600 for receipt scanning (needs more detail than avatars)
      let width = img.width;
      let height = img.height;
      const maxDim = 1600;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG with 75% quality (better quality for OCR)
      let compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.75);
      });
      
      // If still too large (>2MB), compress more
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (compressedBlob.size > maxSize) {
        console.log('[scanImageViaProxy] Still too large, compressing further...');
        compressedBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.6);
        });
      }
      
      console.log('[scanImageViaProxy] Final compressed size:', compressedBlob.size, 'bytes');
      formData.append("file", new File([compressedBlob], `${scanType}.jpg`, { type: "image/jpeg" }));
      
    } else {
      // MOBILE (iOS/Android): Compress using expo-image-manipulator
      console.log('[scanImageViaProxy] Mobile platform, compressing...');
      
      const manipulated = await ImageManipulator.manipulateAsync(
        uri, 
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
    }
  } else {
    // WEB: File object provided directly
    const file = uri as File;
    console.log('[scanImageViaProxy] File object provided, size:', file.size, 'bytes');
    
    // Compress image for consistent handling
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
    
    // Resize to max 1600x1600
    let width = img.width;
    let height = img.height;
    const maxDim = 1600;
    
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = (height / width) * maxDim;
        width = maxDim;
      } else {
        width = (width / height) * maxDim;
        height = maxDim;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx?.drawImage(img, 0, 0, width, height);
    
    // Compress to JPEG with 75% quality
    let compressedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.75);
    });
    
    // If still too large (>2MB), compress more
    const maxSize = 2 * 1024 * 1024;
    if (compressedBlob.size > maxSize) {
      console.log('[scanImageViaProxy] Still too large, compressing further...');
      compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.6);
      });
    }
    
    console.log('[scanImageViaProxy] Final compressed size:', compressedBlob.size, 'bytes');
    formData.append("file", new File([compressedBlob], `${scanType}.jpg`, { type: "image/jpeg" }));
  }

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
    console.error('[scanImageViaProxy] Scan failed:', errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Scan failed' };
    }
    
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    
    throw new Error(errorData.message || errorData.detail || `Scan failed with status ${res.status}`);
  }

  const result = await res.json();
  console.log('[scanImageViaProxy] Scan successful:', result.total_items, 'items found');

  return result as GroceryScanResponse;
}
