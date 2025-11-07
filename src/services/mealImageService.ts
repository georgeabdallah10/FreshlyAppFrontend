import { BASE_URL } from "@/src/env/baseUrl";
import { Storage } from "@/src/utils/storage";
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
 * Check if image exists in Supabase bucket
 */
async function checkImageInBucket(filename: string): Promise<string | null> {
  try {
    // List files in the bucket root
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        search: filename,
      });

    if (error) {
      console.error("[MealImageService] Error checking bucket:", error);
      return null;
    }

    // Check if file exists
    const fileExists = data?.some(file => file.name === filename);
    
    if (fileExists) {
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename);
      
      console.log(`[MealImageService] ✅ Found existing image: ${filename}`);
      return urlData.publicUrl;
    }

    return null;
  } catch (error) {
    console.error("[MealImageService] Error in checkImageInBucket:", error);
    return null;
  }
}

/**
 * Generate AI image for meal using backend endpoint
 */
async function generateMealImage(
  mealName: string,
  conversationId: number = 0
): Promise<string | null> {
  try {
    const token = await Storage.getItem("access_token");
    
    // Create a descriptive prompt for better AI images
    const prompt = `A delicious, appetizing photo of ${mealName}, professional food photography, well-plated, high quality, restaurant-style presentation`;

    console.log(`[MealImageService] 🎨 Generating image for: ${mealName}`);

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
        conversationID: conversationId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MealImageService] Generate image failed:", errorText);
      return null;
    }

    const data = await response.json();
    
    // Assuming backend returns { url: string } or similar
    const imageUrl = data.url || data.image_url || data.imageUrl;
    
    if (!imageUrl) {
      console.error("[MealImageService] No image URL in response:", data);
      return null;
    }

    console.log(`[MealImageService] ✅ Image generated successfully`);
    return imageUrl;
  } catch (error) {
    console.error("[MealImageService] Error generating image:", error);
    return null;
  }
}

/**
 * Download image from URL and upload to Supabase bucket
 */
async function uploadImageToBucket(
  imageUrl: string,
  filename: string
): Promise<string | null> {
  try {
    console.log(`[MealImageService] ⬆️ Uploading image to bucket: ${filename}`);

    // Download the image (React Native compatible)
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase bucket root
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, uint8Array, {
        contentType: "image/png",
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error("[MealImageService] Upload error:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    console.log(`[MealImageService] ✅ Image uploaded successfully`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("[MealImageService] Error uploading to bucket:", error);
    return null;
  }
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
 * @param conversationId - Optional conversation ID for context
 * @returns Image URL or null if failed
 */
export async function getMealImage(
  mealName: string,
  conversationId: number = 0
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
          console.log(`[MealImageService] 💾 Cache hit: ${mealName}`);
          cacheHitLastLog.set(cacheKey, now);
        }
      }
      return cached.url;
    } else if (cached.failedAt) {
      const now = Date.now();
      if (now - cached.failedAt < COOLDOWN_MS) {
        console.warn(`[MealImageService] ⏳ Skipping retry for failed meal image: ${mealName}`);
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
        console.log(`[MealImageService] ⏳ Waiting for pending request: ${mealName}`);
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
      console.log(`[MealImageService] 🆕 No existing image, generating new one...`);
      const generatedUrl = await generateMealImage(mealName, conversationId);
      
      if (!generatedUrl) {
        console.error(`[MealImageService] Failed to generate image for: ${mealName}`);
        imageCache.set(cacheKey, { url: null, failedAt: Date.now() });
        return null;
      }

      // Upload to bucket for future use (important for cost savings!)
      const bucketUrl = await uploadImageToBucket(generatedUrl, filename);
      
      if (bucketUrl) {
        // Cache the bucket URL (more permanent than generated URL)
        imageCache.set(cacheKey, { url: bucketUrl });
        return bucketUrl;
      } else {
        // If upload failed, still cache the generated URL
        imageCache.set(cacheKey, { url: generatedUrl });
        return generatedUrl;
      }
    } catch (error) {
      console.error(`[MealImageService] Error in getMealImage:`, error);
      imageCache.set(cacheKey, { url: null, failedAt: Date.now() });
      return null;
    } finally {
      // Clean up pending request and waiting log
      pendingRequests.delete(cacheKey);
      waitingLogShown.delete(cacheKey);
      lastLogTimes.delete(cacheKey);
      cacheHitLastLog.delete(cacheKey);
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
  console.log(`[MealImageService] 📦 Batch fetching ${mealNames.length} images`);

  const results = await Promise.allSettled(
    mealNames.map(name => getMealImage(name))
  );

  const imageMap = new Map<string, string | null>();
  
  mealNames.forEach((name, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      imageMap.set(name, result.value);
    } else {
      console.error(`[MealImageService] Failed to fetch image for ${name}:`, result.reason);
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
  console.log(`[MealImageService] 🔄 Preloading ${mealNames.length} images in background`);
  
  // Don't await - let it run in background
  getMealImagesBatch(mealNames).catch(error => {
    console.error("[MealImageService] Error in preload:", error);
  });
}

/**
 * Clear in-memory cache (useful for debugging or memory management)
 */
export function clearImageCache(): void {
  console.log(`[MealImageService] 🗑️ Clearing cache (${imageCache.size} items)`);
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
