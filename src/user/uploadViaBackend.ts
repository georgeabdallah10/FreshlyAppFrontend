// api/user/uploadViaBackend.ts
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { BASE_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

export async function uploadAvatarViaProxy({
  uri,
  appUserId,
}: {
  uri: string | File;
  appUserId: string;
}) {
  console.log('[uploadAvatarViaProxy] Starting upload for userId:', appUserId);

  const token = await Storage.getItem("access_token");
  if (!token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const formData = new FormData();

  if (typeof uri === "string") {
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      console.log('[uploadAvatarViaProxy] Original blob size:', blob.size, 'bytes');
      
      // ALWAYS compress for web to ensure file size < 1MB (backend limit)
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
      
      // Aggressively resize to max 800x800 to stay under 1MB
      let width = img.width;
      let height = img.height;
      const maxDim = 800; // Reduced from 1024
      
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
      
      // Aggressively compress to JPEG with 60% quality
      let compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.6);
      });
      
      // If still too large, compress more
      const maxSize = 900 * 1024; // 900KB to be safe
      if (compressedBlob.size > maxSize) {
        console.log('[uploadAvatarViaProxy] Still too large, compressing further...');
        compressedBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.4);
        });
      }
      
      console.log('[uploadAvatarViaProxy] Final compressed size:', compressedBlob.size, 'bytes');
      formData.append("file", new File([compressedBlob], "avatar.jpg", { type: "image/jpeg" }))
    } else {
      // Mobile: Aggressively compress to stay under 1MB
      const manipulated = await ImageManipulator.manipulateAsync(
        uri, 
        [{ resize: { width: 800 } }], // Resize to max 800px width
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Aggressive compression
      );
      
      const filename = 'avatar.jpg';
      const type = 'image/jpeg';

      // @ts-ignore - React Native FormData accepts { uri, type, name }
      formData.append("file", { 
        uri: manipulated.uri, 
        name: filename, 
        type 
      });
    }
  } else {
    // Web: File object already provided - ALWAYS compress
    const file = uri as File;
    console.log('[uploadAvatarViaProxy] File size:', file.size, 'bytes');
    
    // ALWAYS compress for web to ensure file size < 1MB
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
    
    // Aggressively resize to max 800x800
    let width = img.width;
    let height = img.height;
    const maxDim = 800;
    
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
    
    // Aggressively compress to JPEG with 60% quality
    let compressedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.6);
    });
    
    // If still too large, compress more
    const maxSize = 900 * 1024; // 900KB to be safe
    if (compressedBlob.size > maxSize) {
      console.log('[uploadAvatarViaProxy] Still too large, compressing further...');
      compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.4);
      });
    }
    
    console.log('[uploadAvatarViaProxy] Final compressed size:', compressedBlob.size, 'bytes');
    formData.append("file", new File([compressedBlob], "avatar.jpg", { type: "image/jpeg" }));
  }

  console.log('[uploadAvatarViaProxy] Uploading to /storage/avatar/proxy');

  const res = await fetch(`${BASE_URL}/storage/avatar/proxy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      'X-User-ID': appUserId, // Backend requires this header (case-sensitive)
      // Don't set Content-Type - browser/fetch sets it automatically with boundary
    },
    body: formData,
  });

  console.log('[uploadAvatarViaProxy] Response status:', res.status);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[uploadAvatarViaProxy] Upload failed:', errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Upload failed' };
    }
    
    throw new Error(errorData.message || errorData.detail || `Upload failed with status ${res.status}`);
  }

  const result = await res.json();
  console.log('[uploadAvatarViaProxy] Upload successful:', result);

  return result as { bucket: string; path: string; publicUrl: string; url?: string };
}