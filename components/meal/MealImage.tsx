
import { getMealImage, getMealInitials } from "@/src/services/mealImageService";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";

interface MealImageProps {
  mealName: string;
  imageUrl?: string | null; // If provided, use this instead of fetching
  size?: number;
  style?: ViewStyle;
  showLoading?: boolean;
  conversationId?: number;
  onError?: (message: string) => void; // Optional callback for error handling
  silent?: boolean; // If true, suppress error notifications
}

/**
 * MealImage Component
 * 
 * Displays meal image with automatic fallback to initials
 * Features:
 * - Automatic image fetching from service
 * - Loading state
 * - Error handling with initials fallback
 * - Toast notifications on failure
 * - Caching through service layer
 * - Customizable size and style
 */
export const MealImage: React.FC<MealImageProps> = ({
  mealName,
  imageUrl: providedImageUrl,
  size = 60,
  style,
  showLoading = true,
  conversationId = 0,
  onError,
  silent = false,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(providedImageUrl || null);
  const [isLoading, setIsLoading] = useState(!providedImageUrl);
  const [hasError, setHasError] = useState(false);
  const [errorNotified, setErrorNotified] = useState(false);

  const initials = getMealInitials(mealName);

  useEffect(() => {
    // If image URL is provided, use it directly
    if (providedImageUrl) {
      setImageUrl(providedImageUrl);
      setIsLoading(false);
      return;
    }

    // Otherwise, fetch from service
    let mounted = true;

    const fetchImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setErrorNotified(false);
        
        const url = await getMealImage(mealName, conversationId);
        
        if (mounted) {
          if (url) {
            setImageUrl(url);
            setHasError(false);
          } else {
            setHasError(true);
            // Notify parent of error
            if (!silent && onError && !errorNotified) {
              onError(`Unable to load image for "${mealName}". Showing initials instead.`);
              setErrorNotified(true);
            }
          }
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error("[MealImage] Error fetching image:", error);
        if (mounted) {
          setHasError(true);
          setIsLoading(false);
          
          // Determine error message
          let errorMsg = `Unable to generate image for "${mealName}". Showing initials instead.`;
          
          if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
            errorMsg = `Network error loading image for "${mealName}". Check your connection.`;
          } else if (error?.message?.includes('timeout')) {
            errorMsg = `Image generation timed out for "${mealName}". Please try again.`;
          } else if (error?.message?.includes('401') || error?.message?.includes('403')) {
            errorMsg = `Authentication error loading image for "${mealName}".`;
          }

          // Notify parent of error
          if (!silent && onError && !errorNotified) {
            onError(errorMsg);
            setErrorNotified(true);
          }
        }
      }
    };

    fetchImage();

    return () => {
      mounted = false;
    };
  }, [mealName, providedImageUrl, conversationId, onError, silent]);

  const containerSize = { width: size, height: size, borderRadius: size / 6 };

  // Loading state
  if (isLoading && showLoading) {
    return (
      <View style={[styles.container, containerSize, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#00C853" />
      </View>
    );
  }

  // Show image if available and no error
  if (imageUrl && !hasError) {
    return (
      <View style={[styles.container, containerSize, style]}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, containerSize]}
          onError={() => {
            console.warn(`[MealImage] Failed to load image for: ${mealName}`);
            setHasError(true);
          }}
        />
      </View>
    );
  }

  // Fallback to initials
  return (
    <View style={[styles.container, containerSize, styles.initialsContainer, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initialsContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00C853",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
