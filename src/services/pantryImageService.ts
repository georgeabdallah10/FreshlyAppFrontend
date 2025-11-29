/**
 * Pantry Item Image Service
 *
 * Three-tier caching system for pantry item images:
 * 1. In-memory cache (instant, free)
 * 2. Supabase bucket check (fast, ~free)
 * 3. AI generation via backend (one-time cost: ~$0.02)
 *
 * Cost savings: ~99% (generate once per item, cached forever)
 */

import { BASE_URL } from "../env/baseUrl";
import { supabase } from "../supabase/client";
import { Storage } from "../utils/storage";

// Bucket configuration
const BUCKET_NAME = "pantryItems";

// In-memory cache for image URLs (instant, free)
// Now supports caching null (failure) with optional cooldown
const imageCache = new Map<
  string,
  { url: string | null; failedAt?: number; lastWarnedAt?: number }
>();

// Track pending requests to avoid duplicate API calls
const pendingRequests = new Map<string, Promise<string | null>>();

// Track which items have already logged 'waiting for pending request' for the current pending promise
const pendingRequestLogged = new Set<string>();

/**
 * Sanitize item name for use as filename
 * Example: "Fresh Tomatoes!" → "fresh-tomatoes"
 */
function sanitizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, ""); // Trim hyphens
}

/**
 * Check if image exists in Supabase bucket
 */
async function checkSupabaseImage(itemName: string): Promise<string | null> {
  try {
    const sanitized = sanitizeItemName(itemName);
    const filename = `${sanitized}.png`;

    // Try to get public URL
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);

    if (data?.publicUrl) {
      // Verify the file actually exists by checking if we can get it
      const { data: fileData, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(filename);

      if (!error && fileData) {
        console.log(`✅ Found existing pantry image in Supabase: ${itemName}`);
        return data.publicUrl;
      }
    }

    return null;
  } catch (error) {
    console.warn(
      `Could not check Supabase for pantry image: ${itemName}`,
      error
    );
    return null;
  }
}

/**
 * Generate AI image via backend and upload to Supabase
 * Note: Image generation is a standalone utility, not tied to conversations
 */
async function generateAndUploadImage(
  itemName: string
): Promise<string | null> {
  try {
    console.log(`🎨 Generating AI image for pantry item: ${itemName}`);

    // Get auth token
    const token = await Storage.getItem("access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Call backend to generate image
    const response = await fetch(`${BASE_URL}/chat/generate-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: `A professional photograph of ${itemName}, grocery store quality, clean white background, well-lit, high quality product photography`,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      }),
    });

    if (!response.ok) {
      console.error(`❌ Image generation failed: ${response.status}`);
      return null;
    }

    const result = await response.json();
    // Backend now returns only { image_url, prompt }
    const imageUrl = result.image_url;
    if (!imageUrl) {
      console.error(`❌ No image_url in response:`, result);
      return null;
    }

    // Download the generated image
    const imageResponse = await fetch(imageUrl);
    let imageBlob: Uint8Array;
    try {
      if (typeof imageResponse.arrayBuffer === "function") {
        const arrayBuffer = await imageResponse.arrayBuffer();
        imageBlob = new Uint8Array(arrayBuffer);
      } else {
        console.warn("⚠️ arrayBuffer() not supported in this environment, using base64 fallback.");
        const base64Data = await imageResponse.text();
        const binary = atob(base64Data);
        imageBlob = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          imageBlob[i] = binary.charCodeAt(i);
        }
      }
    } catch (e) {
      console.error("⚠️ Failed to read image response data; using safe fallback.", e);
      const base64Data = await imageResponse.text();
      const binary = atob(base64Data);
      imageBlob = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        imageBlob[i] = binary.charCodeAt(i);
      }
    }
    // Upload to Supabase bucket root
    const sanitized = sanitizeItemName(itemName);
    const filename = `${sanitized}.png`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, imageBlob, {
        contentType: "image/png",
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.log("Another Error");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    const publicUrl = urlData?.publicUrl;

    if (publicUrl) {
      console.log(`✅ Generated and uploaded pantry image: ${itemName}`);
      return publicUrl;
    }

    return null;
  } catch (error) {
    console.error(`Failed to generate pantry image for ${itemName}:`, error);
    return null;
  }
}

/**
 * Get pantry item image URL (with 3-tier caching)
 *
 * @param itemName - Name of the pantry item
 * @returns Image URL or null if generation fails
 */
export async function getPantryItemImage(
  itemName: string
): Promise<string | null> {
  if (!itemName?.trim()) {
    return null;
  }

  const cacheKey = sanitizeItemName(itemName);
  const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown for retry after failure

  // 1. Check in-memory cache
  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey)!;
    if (cached.url) {
      if (!cached.lastWarnedAt) {
        console.log(`💾 Cache hit for pantry item: ${itemName}`);
        imageCache.set(cacheKey, { ...cached, lastWarnedAt: Date.now() });
      }
      return cached.url;
    } else if (cached.failedAt) {
      // If last failure was recent, skip retry
      const now = Date.now();
      if (now - cached.failedAt < COOLDOWN_MS) {
        // Only log once per cooldown period
        if (
          !cached.lastWarnedAt ||
          now - cached.lastWarnedAt > COOLDOWN_MS / 2
        ) {
          console.warn(
            `⏳ Skipping retry for failed pantry image: ${itemName}`
          );
          imageCache.set(cacheKey, { ...cached, lastWarnedAt: now });
        }
        return null;
      }
      // else, allow retry (fall through)
    }
  }

  // 2. Check if request is already pending (avoid duplicates)
  if (pendingRequests.has(cacheKey)) {
    if (!pendingRequestLogged.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request: ${itemName}`);
      pendingRequestLogged.add(cacheKey);
    }
    return pendingRequests.get(cacheKey)!;
  }

  // 3. Start new request
  const requestPromise = (async () => {
    try {
      // Check Supabase bucket first
      let imageUrl = await checkSupabaseImage(itemName);

      // If not in bucket, generate new image
      if (!imageUrl) {
        imageUrl = await generateAndUploadImage(itemName);
      }

      // Cache the result (even if null to avoid repeated failures)
      if (imageUrl) {
        imageCache.set(cacheKey, { url: imageUrl });
      } else {
        imageCache.set(cacheKey, { url: null, failedAt: Date.now() });
      }

      return imageUrl;
    } finally {
      // Clean up pending request and log tracker
      pendingRequests.delete(cacheKey);
      pendingRequestLogged.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Preload multiple pantry item images in background
 * Call this when loading a list of items to warm up the cache
 */
export async function preloadPantryImages(itemNames: string[]): Promise<void> {
  const uniqueNames = [...new Set(itemNames.filter(Boolean))];
  console.log(`🔄 Preloading ${uniqueNames.length} pantry item images...`);

  // Only call getPantryItemImage if not already pending
  const promises = uniqueNames
    .map((name) => {
      const cacheKey = sanitizeItemName(name);
      if (pendingRequests.has(cacheKey)) {
        // Already pending, skip
        return null;
      }
      return getPantryItemImage(name).catch((err) => {
        console.warn(`Failed to preload image for ${name}:`, err);
        return null;
      });
    })
    .filter(Boolean) as Promise<any>[];

  // Fire and forget (don't block UI)
  Promise.all(promises).then(() => {
    console.log(`✅ Preloaded pantry item images`);
  });
}

export function clearPantryImageCache(): void {
  imageCache.clear();
  console.log("🗑️ Cleared pantry image cache");
}

/**
 * Mark a pantry item image as failed (e.g., if the image URL is broken)
 * This will cache a failure for the item for the cooldown period
 */
export function markPantryImageAsFailed(itemName: string) {
  const cacheKey = sanitizeItemName(itemName);
  imageCache.set(cacheKey, { url: null, failedAt: Date.now() });
}

/**
 * Get pantry item initials for fallback display
 * Example: "Fresh Tomatoes" → "FT"
 */
export function getPantryItemInitials(itemName: string): string {
  if (!itemName?.trim()) {
    return "??";
  }

  const words = itemName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "??";
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  // Take first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Batch processing: Get images for multiple items
 * Returns a map of itemName -> imageUrl
 */
export async function batchGetPantryImages(
  itemNames: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const uniqueNames = [...new Set(itemNames.filter(Boolean))];

  await Promise.all(
    uniqueNames.map(async (name) => {
      const url = await getPantryItemImage(name);
      results.set(name, url);
    })
  );

  return results;
}
