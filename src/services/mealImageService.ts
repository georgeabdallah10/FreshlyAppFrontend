import { BASE_URL } from "@/src/env/baseUrl";
import { Storage } from "@/src/utils/storage";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from "../supabase/client";

/**
 * Meal Image Service
 * 
 * Features:
 * - In-memory cache to avoid duplicate API calls
 * - Supabase bucket check before generating new images
 * - Automatic image generation with AI
 * - Cost optimization through caching and deduplication
 */

const BUCKET_NAME = "Meals";
const DEBUG_LOGS = false;
const lastLogTimes = new Map<string, number>();
const cacheHitLastLog = new Map<string, number>();

// In-memory cache: { mealName: { url: string|null, failedAt?: number } }
// This prevents repeated calls within the same app session
const imageCache = new Map<string, { url: string | null, failedAt?: number }>();

// Track in-flight requests to prevent duplicate simultaneous calls
const pendingRequests = new Map<string, Promise<string | null>>();

// Track which cacheKeys have already logged the waiting message
const waitingLogShown = new Set<string>();

// Track if we've checked bucket existence (prevents repeated checks)
let bucketInitialized = false;

/**
 * Ensure the Supabase bucket exists and is accessible
 * This only runs once per app session
 * Note: Bucket must allow public INSERT or have no RLS for anon uploads
 */
async function ensureBucketExists(): Promise<boolean> {
  if (bucketInitialized) {
    return true;
  }

  try {
    // Try to list the bucket to check if it exists and is accessible
    const { error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    if (listError) {
      console.log(`[MealImageService] ERROR: Bucket "${BUCKET_NAME}" error:`, listError.message);
      console.log(`[MealImageService] Setup required: The "${BUCKET_NAME}" bucket is not accessible`);
      console.log(
        `[MealImageService] Fix: Ensure bucket RLS policies allow anon/public INSERT (like pantryItems bucket)`
      );
      return false;
    }

    bucketInitialized = true;
    console.log(`[MealImageService] OK: Bucket "${BUCKET_NAME}" is accessible`);
    return true;
  } catch (error) {
    console.log(`[MealImageService] ERROR: Error checking bucket:`, error);
    return false;
  }
}

/**
 * Sanitize meal name for use as filename
 * - Removes special characters
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 */
function sanitizeMealName(mealName: string): string {
  return mealName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove duplicate hyphens
    .substring(0, 100); // Limit length
}

/**
 * Compress and resize image to reduce file size for reliable uploads
 * - Resizes to max 512px width (maintains aspect ratio)
 * - Converts to JPEG with 0.75 quality
 * - Target: <300KB file size
 */
async function compressImage(imageUrl: string): Promise<Uint8Array | null> {
  try {
    console.log(`[MealImageService] Starting compression for image...`);

    // Step 1: Download to temp file (ImageManipulator needs file URI)
    const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!cacheDir) {
      console.log('[MealImageService] No cache directory available');
      return null;
    }
    const tempPath = `${cacheDir}temp-meal-${Date.now()}.png`;
    console.log(`[MealImageService] Downloading to temp: ${tempPath}`);

    const downloadResult = await FileSystem.downloadAsync(imageUrl, tempPath);

    if (downloadResult.status !== 200) {
      console.log(`[MealImageService] Download failed with status ${downloadResult.status}`);
      return null;
    }

    const originalInfo = await FileSystem.getInfoAsync(downloadResult.uri);
    if (!originalInfo.exists || !originalInfo.size) {
      console.log('[MealImageService] Downloaded file is invalid');
      return null;
    }

    const originalSizeMB = (originalInfo.size / (1024 * 1024)).toFixed(2);
    console.log(`[MealImageService] Original size: ${originalSizeMB}MB`);

    // Step 2: Compress with ImageManipulator
    const manipResult = await ImageManipulator.manipulateAsync(
      downloadResult.uri,
      [
        { resize: { width: 512 } }, // Resize to 512px width, maintain aspect ratio
      ],
      {
        compress: 0.75, // 75% quality
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log(`[MealImageService] OK: Compressed to: ${manipResult.uri}`);

    // Step 3: Read compressed file as base64
    const compressedBase64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Step 4: Convert base64 to Uint8Array
    const binaryString = atob(compressedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const compressedSizeMB = (bytes.length / (1024 * 1024)).toFixed(2);
    const compressedSizeKB = (bytes.length / 1024).toFixed(0);
    console.log(`[MealImageService] OK: Compressed size: ${compressedSizeMB}MB (${compressedSizeKB}KB)`);
    console.log(
      `[MealImageService] Size reduction: ${((1 - bytes.length / originalInfo.size) * 100).toFixed(1)}%`
    );

    // Step 5: Cleanup temp files
    try {
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
      await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
      console.log(`[MealImageService] Cleaned up temp files`);
    } catch (cleanupError) {
      console.warn(`[MealImageService] WARN: Cleanup failed:`, cleanupError);
    }

    return bytes;
  } catch (error) {
    console.log(`[MealImageService] ERROR: Compression failed:`, error);
    return null;
  }
}

/**
 * Check if image exists in Supabase bucket
 * Checks for both .jpg (compressed) and .png (legacy) formats
 */
async function checkImageInBucket(filename: string): Promise<string | null> {
  try {
    // Check for compressed JPEG first (new format)
    const jpgFilename = filename.replace(/\.png$/, '.jpg');

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        search: jpgFilename,
      });

    if (error) {
      console.log("[MealImageService] Error checking bucket:", error);
      return null;
    }

    // Check if JPEG exists
    if (data?.some(file => file.name === jpgFilename)) {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(jpgFilename);

      console.log(`[MealImageService] OK: Found existing image: ${jpgFilename}`);
      return urlData.publicUrl;
    }

    // Fallback: Check for legacy PNG format
    const { data: pngData } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        search: filename,
      });

    if (pngData?.some(file => file.name === filename)) {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename);

      console.log(`[MealImageService] OK: Found existing legacy PNG image: ${filename}`);
      return urlData.publicUrl;
    }

    return null;
  } catch (error) {
    console.log("[MealImageService] Error in checkImageInBucket:", error);
    return null;
  }
}

/**
 * Generate AI image for meal using backend endpoint
 * Note: Image generation is a standalone utility, not tied to conversations
 */
async function generateMealImage(
  mealName: string
): Promise<string | null> {
  try {
    const token = await Storage.getItem("access_token");

    // Create a descriptive prompt for better AI images
    const prompt = `A delicious, appetizing photo of ${mealName}, professional food photography, well-plated, high quality, restaurant-style presentation`;

    console.log(`[MealImageService] Generating image for: ${mealName}`);

    const response = await fetch(`${BASE_URL}/chat/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt,
        size: "1024x1024",
        quality: "standard",
        style: "natural", // or "vivid" for more dramatic images
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[MealImageService] Generate image failed:", errorText);
      return null;
    }

    const data = await response.json();

    // Backend now returns only { image_url, prompt }
    const imageUrl = data.image_url;

    if (!imageUrl) {
      console.log("[MealImageService] No image_url in response:", data);
      return null;
    }

    console.log(`[MealImageService] OK: Image generated successfully`);
    return imageUrl;
  } catch (error) {
    console.log("[MealImageService] Error generating image:", error);
    return null;
  }
}

/**
 * Download, compress, and upload image to Supabase bucket with retry logic
 * - Downloads DALL-E image
 * - Compresses to JPEG (~512px, quality 0.75)
 * - Uploads compressed version to Supabase
 */
async function uploadImageToBucket(
  imageUrl: string,
  filename: string,
  retries: number = 3
): Promise<string | null> {
  let lastError: any = null;

  // Change extension from .png to .jpg for compressed images
  const compressedFilename = filename.replace(/\.png$/, '.jpg');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[MealImageService] Retry attempt ${attempt}/${retries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(
        `[MealImageService] Uploading image to bucket: ${compressedFilename} (attempt ${attempt}/${retries})`
      );

      // Compress the image (downloads, resizes, compresses to JPEG)
      const compressedBytes = await compressImage(imageUrl);

      if (!compressedBytes || compressedBytes.length === 0) {
        console.log("[MealImageService] Compressed image is empty or null");
        lastError = new Error("Compressed image is empty");
        continue; // Retry
      }

      const sizeMB = (compressedBytes.length / (1024 * 1024)).toFixed(2);
      const sizeKB = (compressedBytes.length / 1024).toFixed(0);

      // Upload compressed JPEG to Supabase
      console.log(`[MealImageService] Uploading ${sizeMB}MB (${sizeKB}KB) to Supabase...`);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(compressedFilename, compressedBytes, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.log(`[MealImageService] ERROR: Supabase upload error (attempt ${attempt}/${retries}):`, {
          name: error.name,
          message: error.message,
          statusCode: (error as any).statusCode,
          fullError: error,
        });

        // Check if file actually exists despite error (sometimes upload succeeds but returns error)
        console.log(`[MealImageService] Checking if file actually exists despite error...`);
        const { data: fileData, error: listError } = await supabase.storage
          .from(BUCKET_NAME)
          .list('', { search: compressedFilename });

        if (!listError && fileData?.some(f => f.name === compressedFilename)) {
          console.log(`[MealImageService] OK: File exists in bucket despite error. Using it.`);
          // File is there, proceed to get URL
        } else {
          console.log(`[MealImageService] ERROR: File does not exist. Error is real.`);
          lastError = error;
          continue; // Retry
        }
      } else {
        console.log(`[MealImageService] OK: Supabase upload successful:`, data);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(compressedFilename);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        console.log("[MealImageService] Failed to get public URL after upload");
        lastError = new Error("Failed to get public URL after upload");
        continue; // Retry
      }

      console.log(`[MealImageService] OK: Image uploaded successfully on attempt ${attempt}/${retries}`);
      console.log(`[MealImageService] Public URL: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.log(`[MealImageService] Error uploading to bucket (attempt ${attempt}/${retries}):`, error);
      lastError = error;

      // Don't retry on certain errors
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('permission') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
          console.log(`[MealImageService] ERROR: Permission error - aborting retries`);
          break;
        }
      }
    }
  }

  // All retries failed
  console.log(`[MealImageService] ERROR: Failed to upload after ${retries} attempts:`, lastError);
  return null;
}

/**
 * Get or generate meal image with full caching strategy
 *
 * Flow:
 * 1. Check in-memory cache (instant)
 * 2. Check if already being fetched (prevent duplicates)
 * 3. Check Supabase bucket (fast)
 * 4. Generate new image if not found (slow, costs money)
 * 5. Upload generated image to bucket (for future use)
 * 6. Cache the result
 *
 * @param mealName - Name of the meal
 * @returns Image URL or null if failed
 */
export async function getMealImage(
  mealName: string
): Promise<string | null> {
  if (!mealName || mealName.trim() === "") {
    console.warn("[MealImageService] Empty meal name provided");
    return null;
  }

  const sanitizedName = sanitizeMealName(mealName);
  const filename = `${sanitizedName}.png`;
  const cacheKey = sanitizedName;
  const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown for retry after failure

  // 1. Check in-memory cache (instant, free)
  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey)!;
    if (cached.url) {
      if (DEBUG_LOGS) {
        const now = Date.now();
        const last = cacheHitLastLog.get(cacheKey) || 0;
        if (now - last > 30000) { // at most once every 30s per cached meal
          console.log(`[MealImageService] Cache hit: ${mealName}`);
          cacheHitLastLog.set(cacheKey, now);
        }
      }
      return cached.url;
    } else if (cached.failedAt) {
      const now = Date.now();
      if (now - cached.failedAt < COOLDOWN_MS) {
        console.warn(`[MealImageService] Skipping retry for failed meal image: ${mealName}`);
        return null;
      }
      // else, allow retry (fall through)
    }
  }

  // 2. Check if already being fetched (prevent duplicate calls)
  if (pendingRequests.has(cacheKey)) {
    if (DEBUG_LOGS) {
      const now = Date.now();
      const lastLog = lastLogTimes.get(cacheKey) || 0;
      if (now - lastLog > 10000) { // log at most once every 10s per meal
        console.log(`[MealImageService] Waiting for pending request: ${mealName}`);
        lastLogTimes.set(cacheKey, now);
      }
    }
    return await pendingRequests.get(cacheKey)!;
  }

  // 3. Create the fetch promise
  const fetchPromise = (async () => {
    try {
      // Check Supabase bucket (fast, free)
      const existingUrl = await checkImageInBucket(filename);
      if (existingUrl) {
        imageCache.set(cacheKey, { url: existingUrl });
        return existingUrl;
      }

      // Generate new image (slow, costs money)
      console.log(`[MealImageService] No existing image, generating new one...`);
      const generatedUrl = await generateMealImage(mealName);
      
      if (!generatedUrl) {
        console.log(`[MealImageService] Failed to generate image for: ${mealName}`);
        imageCache.set(cacheKey, { url: null, failedAt: Date.now() });
        return null;
      }

      // Upload to bucket for future use (important for cost savings!)
      const bucketUrl = await uploadImageToBucket(generatedUrl, filename);

      if (bucketUrl) {
        // Cache the bucket URL (permanent storage)
        imageCache.set(cacheKey, { url: bucketUrl });
        return bucketUrl;
      } else {
        // CRITICAL: Don't cache temporary generated URLs - they expire!
        // Mark as failed so we retry later, but return temp URL for immediate use
        console.warn(`[MealImageService] WARN: Upload failed for ${mealName}, will retry next time`);
        imageCache.set(cacheKey, { url: null, failedAt: Date.now() });
        return generatedUrl; // Return temp URL for immediate use only
      }
    } catch (error) {
      console.log(`[MealImageService] Error in getMealImage:`, error);
      imageCache.set(cacheKey, { url: null, failedAt: Date.now() });
      return null;
    } finally {
      // Clean up pending request and waiting log
      pendingRequests.delete(cacheKey);
      waitingLogShown.delete(cacheKey);
      // Don't delete lastLogTimes and cacheHitLastLog - they're for rate-limiting logs
    }
  })();

  // Store pending request
  pendingRequests.set(cacheKey, fetchPromise);

  return await fetchPromise;
}

/**
 * Batch fetch images for multiple meals
 * Uses Promise.allSettled to handle failures gracefully
 * 
 * @param mealNames - Array of meal names
 * @returns Map of meal name to image URL (or null if failed)
 */
export async function getMealImagesBatch(
  mealNames: string[]
): Promise<Map<string, string | null>> {
  console.log(`[MealImageService] Batch fetching ${mealNames.length} images`);

  const results = await Promise.allSettled(
    mealNames.map(name => getMealImage(name))
  );

  const imageMap = new Map<string, string | null>();
  
  mealNames.forEach((name, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      imageMap.set(name, result.value);
    } else {
      console.log(`[MealImageService] Failed to fetch image for ${name}:`, result.reason);
      imageMap.set(name, null);
    }
  });

  return imageMap;
}

/**
 * Preload images for meals (call this when meal list is loaded)
 * This runs in the background and doesn't block the UI
 * 
 * @param mealNames - Array of meal names to preload
 */
export async function preloadMealImages(mealNames: string[]): Promise<void> {
  console.log(`[MealImageService] Preloading ${mealNames.length} images in background`);
  
  // Don't await - let it run in background
  getMealImagesBatch(mealNames).catch(error => {
    console.log("[MealImageService] Error in preload:", error);
  });
}

/**
 * Clear in-memory cache (useful for debugging or memory management)
 */
export function clearImageCache(): void {
  console.log(`[MealImageService] Clearing cache (${imageCache.size} items)`);
  imageCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  return {
    size: imageCache.size,
    entries: Array.from(imageCache.keys()),
    pendingRequests: Array.from(pendingRequests.keys()),
  };
}

/**
 * Get meal initials as fallback when image is loading or failed
 */
export function getMealInitials(mealName: string): string {
  if (!mealName || mealName.trim() === "") {
    return "??";
  }

  const words = mealName.trim().split(/\s+/);
  
  if (words.length === 1) {
    // Single word: take first 2 characters
    return words[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple words: take first letter of first 2 words
    return (words[0][0] + words[1][0]).toUpperCase();
  }
}
