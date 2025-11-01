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
      
      // Check file size and compress if needed
      const maxSize = 2 * 1024 * 1024; // 2MB
      console.log('[uploadAvatarViaProxy] Original blob size:', blob.size, 'bytes');
      
      if (blob.size > maxSize) {
        console.log('[uploadAvatarViaProxy] File too large, compressing...');
        // Create canvas to resize/compress image
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
        
        // Resize to max 1024x1024
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;
        
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
        
        // Convert to compressed JPEG
        const compressedBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
        });
        
        console.log('[uploadAvatarViaProxy] Compressed size:', compressedBlob.size, 'bytes');
        formData.append("file", new File([compressedBlob], "avatar.jpg", { type: "image/jpeg" }));
      } else {
        formData.append("file", new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" }));
      }
    } else {
      // Mobile: Re-encode to JPEG and compress aggressively
      const manipulated = await ImageManipulator.manipulateAsync(
        uri, 
        [{ resize: { width: 1024 } }], // Resize to max 1024px width
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // More compression
      );
      
      const filename = manipulated.uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // @ts-ignore - React Native FormData accepts { uri, type, name }
      formData.append("file", { 
        uri: manipulated.uri, 
        name: filename, 
        type 
      });
    }
  } else {
    // Web: File object already provided - may need compression
    const file = uri as File;
    const maxSize = 2 * 1024 * 1024; // 2MB
    console.log('[uploadAvatarViaProxy] File size:', file.size, 'bytes');
    
    if (file.size > maxSize) {
      console.log('[uploadAvatarViaProxy] File too large, compressing...');
      // Use canvas to compress
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      
      let width = img.width;
      let height = img.height;
      const maxDim = 1024;
      
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
      
      const compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
      });
      
      console.log('[uploadAvatarViaProxy] Compressed size:', compressedBlob.size, 'bytes');
      formData.append("file", new File([compressedBlob], "avatar.jpg", { type: "image/jpeg" }));
    } else {
      formData.append("file", file);
    }
  }

  console.log('[uploadAvatarViaProxy] Uploading to /storage/avatar/proxy');

  const res = await fetch(`${BASE_URL}/storage/avatar/proxy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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