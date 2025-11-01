// api/user/uploadPfp.ts
// Expo-safe helpers for uploading and fetching profile images with Supabase Storage.
// - Uses a single configured Supabase client (createSupabaseClient).
// - Avoids `File` type; works with `uri` on web + native.
// - Re-encodes to JPEG when picking an image (fixes HEIC).
// - Adds robust logging and public URL helpers for public buckets (like "users").

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { createSupabaseClient } from "../supabase/client";

type UploadImageUriParams = {
  uri: string;
  bucket: string;              // e.g., "users"
  path: string;                // e.g., `${userId}/profile.jpg`
  contentType?: string;        // default "image/jpeg"
  cacheSeconds?: number;       // default 3600
  upsert?: boolean;            // default true
};

const DEFAULT_BUCKET = "users"; // Changed from "users" - needs proper RLS policies (see SUPABASE_RLS_FIX.md)
const DEFAULT_FILE = "profile.jpg";

/** Small helper: build the canonical avatar path */
function buildAvatarPath(userId: string, fileName: string = DEFAULT_FILE, folder?: string) {
  const parts = [userId];
  if (folder) parts.push(folder.replace(/^\/|\/$/g, ""));
  const safeFile = fileName.toLowerCase().endsWith(".jpg") ? fileName : `${fileName}.jpg`;
  return parts.concat(safeFile).join("/");
}

/** Helper: return a public URL for a known bucket/path without listing */
export function getPublicUrlForPath(bucket: string, path: string) {
  const supabase = createSupabaseClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Generic helper: upload an image from a `uri` to Supabase Storage.
 * Works on Expo web + native. Avoids `File` type entirely.
 * Returns { path, publicUrl? } for convenience.
 */
export async function uploadImageUri({
  uri,
  bucket,
  path,
  contentType = "image/jpeg",
  cacheSeconds = 3600,
  upsert = true,
}: UploadImageUriParams): Promise<{ path: string; publicUrl?: string }> {
  const supabase = createSupabaseClient();

  // Read bytes from the local/remote URI
  const resp = await fetch(uri);
  const bytes = await resp.arrayBuffer();

  console.log("[uploadImageUri] uploading", { bucket, path, contentType, cacheSeconds, upsert });

  const { data, error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    cacheControl: String(cacheSeconds),
    upsert,
  });

  console.log("[uploadImageUri] result", { data, error });

  if (error) throw error;

  // For public buckets we can compute a URL immediately (no sign/list).
  let publicUrl: string | undefined;
  try {
    publicUrl = getPublicUrlForPath(bucket, data.path);
  } catch (e) {
    // noop, bucket may be private
  }

  return { path: data.path, publicUrl };
}

type PickAndUploadAvatarOptions = {
  userId?: string;       // optional; will fallback to current session user
  bucket?: string;       // default "users" (public)
  folder?: string;       // optional subfolder inside the bucket
  fileName?: string;     // default "profile.jpg" (JPEG)
  quality?: number;      // 0..1 (compression), default 0.9
  cacheSeconds?: number; // default 3600
};

/**
 * Opens image library, re-encodes image to JPEG, and uploads to `${userId}/[folder/]fileName`.
 * Returns `{ bucket, path, publicUrl? }` you can persist or use immediately.
 */
export async function pickAndUploadAvatar(options: PickAndUploadAvatarOptions = {}) {
  const {
    userId: userIdInput,
    bucket = DEFAULT_BUCKET,
    folder = "",
    fileName = DEFAULT_FILE,
    quality = 0.9,
    cacheSeconds = 3600,
  } = options;

  const supabase = createSupabaseClient();

  // Resolve userId
  let userId = userIdInput;
  if (!userId) {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      console.warn("[pickAndUploadAvatar] getUser error:", authErr.message);
    }
    userId = auth?.user?.id ?? undefined;
  }
  if (!userId) throw new Error("Not signed in or userId not provided.");

  // 1) Pick
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality, // hint for picker only
  });
  if (res.canceled || !res.assets?.length) {
    console.log("[pickAndUploadAvatar] cancelled by user");
    return null;
  }

  const asset = res.assets[0];

  // 2) Re-encode to JPEG to avoid HEIC and ensure consistent contentType
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 3) Build storage path (canonical)
  const path = buildAvatarPath(userId, fileName, folder);

  // 4) Upload
  const { path: uploadedPath, publicUrl } = await uploadImageUri({
    uri: manipulated.uri,
    bucket,
    path,
    contentType: "image/jpeg",
    cacheSeconds,
    upsert: true,
  });

  console.log("[pickAndUploadAvatar] uploaded", { bucket, uploadedPath, publicUrl });

  return { bucket, path: uploadedPath, publicUrl };
}

/**
 * Upload an avatar for a known user from an existing local/remote `uri`.
 * Re-encodes to JPEG, then uploads to `${userId}/[folder/]fileName`.
 * Returns `{ path, publicUrl? }`.
 */
export async function uploadAvatarFromUri(
  userId: string,
  uri: string,
  options?: {
    bucket?: string;       // default "users"
    folder?: string;       // optional subfolder
    fileName?: string;     // default "profile.jpg"
    quality?: number;      // 0..1 compression, default 0.9
    cacheSeconds?: number; // default 3600
  }
): Promise<{ path: string; publicUrl?: string }> {
  const {
    bucket = DEFAULT_BUCKET,
    folder,
    fileName = DEFAULT_FILE,
    quality = 0.9,
    cacheSeconds = 3600,
  } = options ?? {};

  if (!userId) throw new Error("uploadAvatarFromUri: userId is required");
  if (!uri) throw new Error("uploadAvatarFromUri: image uri is required");

  // Re-encode to JPEG to normalize formats (e.g., HEIC) and compress if needed
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );

  const path = buildAvatarPath(userId, fileName, folder);

  return uploadImageUri({
    uri: manipulated.uri,
    bucket,
    path,
    contentType: "image/jpeg",
    cacheSeconds,
    upsert: true,
  });
}

/**
 * Create a signed URL for a private bucket object.
 * `path` should be the object path inside the bucket (e.g., "<userId>/profile.jpg")
 */
export async function getAvatarSignedUrl(bucket: string, path: string, expiresInSec = 600) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Get a user's avatar URL by known convention `${userId}/profile.jpg`.
 * - If `signed: false` (default for your public "users" bucket), returns a direct public URL without listing.
 * - If `signed: true`, returns a signed URL for private buckets.
 */
export async function getUserAvatarUrl(
  userId: string,
  options?: {
    bucket?: string;        // default "users"
    fileName?: string;      // default "profile.jpg"
    folder?: string;        // optional subfolder
    signed?: boolean;       // default false (public bucket)
    expiresInSec?: number;  // default 600
  }
) {
  const {
    bucket = DEFAULT_BUCKET,
    fileName = DEFAULT_FILE,
    folder,
    signed = false, // your 'users' bucket is public
    expiresInSec = 600,
  } = options ?? {};

  const path = buildAvatarPath(userId, fileName, folder);

  if (!signed) {
    // Public bucket path -> direct URL without any network call
    return getPublicUrlForPath(bucket, path);
  }

  // Signed URL for private buckets
  return getAvatarSignedUrl(bucket, path, expiresInSec);
}

/** Debug utility to confirm client points at the expected project */
export async function debugPrintSupabaseEnv() {
  const supabase = createSupabaseClient();
  // @ts-ignore peeking private fields for debugging only
  console.log("[supabase env]", { restUrl: (supabase as any).restUrl, url: process.env.EXPO_PUBLIC_SUPABASE_URL });
}