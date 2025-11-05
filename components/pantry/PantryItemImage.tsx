/**
 * PantryItemImage Component
 * 
 * Displays pantry item images with smart fallback system:
 * 1. Try to fetch AI-generated image from service
 * 2. Show loading spinner while fetching
 * 3. Fall back to initials on error (green background)
 * 4. Show toast notification on failure
 * 
 * Usage:
 * <PantryItemImage itemName="Fresh Tomatoes" size={56} onError={(msg) => showToast('error', msg)} />
 */

import { getPantryItemImage, getPantryItemInitials } from '@/src/services/pantryImageService';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

interface PantryItemImageProps {
  itemName: string;
  imageUrl?: string; // Optional: if item already has image URL from backend
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  onError?: (message: string) => void; // Optional callback for error handling
  silent?: boolean; // If true, suppress error notifications
}

export default function PantryItemImage({
  itemName,
  imageUrl,
  size = 56,
  borderColor = '#E0E0E0',
  borderWidth = 2,
  onError,
  silent = false,
}: PantryItemImageProps) {
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorNotified, setErrorNotified] = useState(false);

  // Determine which image to use
  const finalImageUrl = imageUrl || generatedUrl;
  const shouldFetchImage = !imageUrl && itemName;

  useEffect(() => {
    if (!shouldFetchImage) return;

    let isMounted = true;
    setLoading(true);
    setError(false);
    setErrorNotified(false);

    getPantryItemImage(itemName)
      .then((url) => {
        if (isMounted) {
          if (url) {
            setGeneratedUrl(url);
            setError(false);
          } else {
            setError(true);
            // Notify parent of error
            if (!silent && onError && !errorNotified) {
              onError(`Unable to load image for "${itemName}". Showing initials instead.`);
              setErrorNotified(true);
            }
          }
        }
      })
      .catch((err) => {
        console.warn(`Failed to load pantry image for ${itemName}:`, err);
        if (isMounted) {
          setError(true);
          // Determine error message
          let errorMsg = `Unable to generate image for "${itemName}". Showing initials instead.`;
          
          if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
            errorMsg = `Network error loading image for "${itemName}". Check your connection.`;
          } else if (err?.message?.includes('timeout')) {
            errorMsg = `Image generation timed out for "${itemName}". Please try again.`;
          } else if (err?.message?.includes('401') || err?.message?.includes('403')) {
            errorMsg = `Authentication error loading image for "${itemName}".`;
          }

          // Notify parent of error
          if (!silent && onError && !errorNotified) {
            onError(errorMsg);
            setErrorNotified(true);
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [itemName, shouldFetchImage, onError, silent]);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor,
  };

  // Loading state
  if (loading && !finalImageUrl) {
    return (
      <View style={[styles.container, styles.loadingContainer, containerStyle]}>
        <ActivityIndicator size="small" color="#00C853" />
      </View>
    );
  }

  // Error state or no image - show initials
  if (error || !finalImageUrl) {
    const initials = getPantryItemInitials(itemName);
    return (
      <View style={[styles.container, styles.initialsContainer, containerStyle]}>
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      </View>
    );
  }

  // Success state - show image
  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: finalImageUrl }}
        style={[styles.image, { borderRadius: size / 2 }]}
        resizeMode="cover"
        onError={() => {
          console.warn(`Failed to load image from URL: ${finalImageUrl}`);
          setError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    backgroundColor: '#F7F8FA',
  },
  initialsContainer: {
    backgroundColor: '#00C853',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
