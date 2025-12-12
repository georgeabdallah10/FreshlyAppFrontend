// api/user/uploadViaBackend.ts
import * as ImageManipulator from "expo-image-manipulator";
import { BASE_URL } from "../env/baseUrl";
import { Storage } from "../utils/storage";

export async function uploadAvatarViaProxy({
  uri,
  appUserId,
}: {
  uri: string;
  appUserId: string;
}) {
  console.log('[uploadAvatarViaProxy] Starting upload for userId:', appUserId);

  const token = await Storage.getItem("access_token");
  if (!token) {
    console.log('Not authenticated. Please log in again.');
  }

  const formData = new FormData();
  
  // Add user_id to FormData (backend expects this)
  formData.append('user_id', appUserId);

  // Mobile: Aggressively compress to stay under 1MB
  const manipulated = await ImageManipulator.manipulateAsync(
    uri as string, 
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
    console.log('ERROR [uploadAvatarViaProxy] Upload failed:', errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Upload failed' };
    }
    
    console.log(errorData.message || errorData.detail || `Upload failed with status ${res.status}`);
  }

  const result = await res.json();
  console.log('[uploadAvatarViaProxy] Upload successful:', result);

  return result as { bucket: string; path: string; publicUrl: string; url?: string };
}