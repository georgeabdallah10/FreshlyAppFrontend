// Hook for managing pantry item images from Supabase
import { useUser } from '@/context/usercontext';
import { supabase } from '@/src/supabase/client';
import { useEffect, useState } from 'react';

const PANTRY_ITEMS_BUCKET = 'pantry_items';

export type PantryImageState = {
  url: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook to manage pantry item image URLs
 * Fetches image from Supabase storage: {userID}/{pantryItemID}/name.jpg
 */
export function usePantryImage(pantryItemId: number | string, itemName: string) {
  const userContext = useUser();
  const user = userContext?.user;
  const [imageState, setImageState] = useState<PantryImageState>({
    url: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id || !pantryItemId || !itemName) {
      setImageState({ url: null, loading: false, error: null });
      return;
    }

    fetchPantryImage();
  }, [user?.id, pantryItemId, itemName]);

  const fetchPantryImage = async () => {
    try {
      if (!user?.id) return;
      
      setImageState(prev => ({ ...prev, loading: true, error: null }));

      // Normalize item name for filename (lowercase, replace spaces)
      const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');
      const imagePath = `${user.id}/${pantryItemId}/${normalizedName}.jpg`;

      console.log('[Pantry Image] Fetching:', imagePath);

      // Get public URL from Supabase storage
      const { data } = supabase.storage
        .from(PANTRY_ITEMS_BUCKET)
        .getPublicUrl(imagePath);

      if (data?.publicUrl) {
        // Verify the image exists by checking if it loads
        const imageExists = await checkImageExists(data.publicUrl);
        
        if (imageExists) {
          console.log('[Pantry Image] Found:', data.publicUrl);
          setImageState({ url: data.publicUrl, loading: false, error: null });
        } else {
          console.log('[Pantry Image] Not found yet (may still be generating)');
          setImageState({ url: null, loading: false, error: null });
        }
      } else {
        setImageState({ url: null, loading: false, error: 'Failed to get image URL' });
      }
    } catch (error) {
      console.log('[Pantry Image] Error:', error);
      setImageState({
        url: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const refresh = () => {
    fetchPantryImage();
  };

  return {
    imageUrl: imageState.url,
    loading: imageState.loading,
    error: imageState.error,
    refresh,
  };
}

/**
 * Hook to manage multiple pantry item images efficiently
 */
export function usePantryImages(
  items: Array<{ id: number | string; name: string }>
) {
  const userContext = useUser();
  const user = userContext?.user;
  const [imageStates, setImageStates] = useState<Map<string | number, PantryImageState>>(
    new Map()
  );

  useEffect(() => {
    if (!user?.id || items.length === 0) return;

    items.forEach(item => {
      if (!imageStates.has(item.id)) {
        fetchItemImage(item.id, item.name);
      }
    });
  }, [user?.id, items]);

  const fetchItemImage = async (itemId: number | string, itemName: string) => {
    try {
      if (!user?.id) return;
      
      setImageStates(prev => new Map(prev).set(itemId, {
        url: null,
        loading: true,
        error: null,
      }));

      const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');
      const imagePath = `${user.id}/${itemId}/${normalizedName}.jpg`;

      const { data } = supabase.storage
        .from(PANTRY_ITEMS_BUCKET)
        .getPublicUrl(imagePath);

      if (data?.publicUrl) {
        const imageExists = await checkImageExists(data.publicUrl);
        
        setImageStates(prev => new Map(prev).set(itemId, {
          url: imageExists ? data.publicUrl : null,
          loading: false,
          error: null,
        }));
      } else {
        setImageStates(prev => new Map(prev).set(itemId, {
          url: null,
          loading: false,
          error: 'Failed to get image URL',
        }));
      }
    } catch (error) {
      setImageStates(prev => new Map(prev).set(itemId, {
        url: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const refreshImage = (itemId: number | string, itemName: string) => {
    fetchItemImage(itemId, itemName);
  };

  const getImageState = (itemId: number | string): PantryImageState => {
    return imageStates.get(itemId) || { url: null, loading: false, error: null };
  };

  return {
    getImageState,
    refreshImage,
  };
}
