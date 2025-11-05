
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
}

/**
 * MealImage Component
 * 
 * Displays meal image with automatic fallback to initials
 * Features:
 * - Automatic image fetching from service
 * - Loading state
 * - Error handling with initials fallback
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
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(providedImageUrl || null);
  const [isLoading, setIsLoading] = useState(!providedImageUrl);
  const [hasError, setHasError] = useState(false);

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
        
        const url = await getMealImage(mealName, conversationId);
        
        if (mounted) {
          if (url) {
            setImageUrl(url);
          } else {
            setHasError(true);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[MealImage] Error fetching image:", error);
        if (mounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      mounted = false;
    };
  }, [mealName, providedImageUrl, conversationId]);

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
