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
      const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
      formData.append("file", file);
    } else {
      // Mobile: Re-encode to JPEG and compress
      const manipulated = await ImageManipulator.manipulateAsync(
        uri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
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
    // Web: File object already provided
    formData.append("file", uri);
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