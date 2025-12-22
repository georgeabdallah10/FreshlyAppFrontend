import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import ToastBanner from "@/components/generalMessage";
import { useUser } from "@/context/usercontext";
import type { ParsedAddress } from "@/hooks/useGooglePlaces";
import type { LocationObject } from "expo-location";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";

type ToastType = "success" | "error" | "confirm";
type ToastButton = {
  text: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
};
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  title?: string;
  buttons?: ToastButton[];
}

type LocationResult = {
  id: string;
  name: string;
  address: string;
};

const LocationScreens = () => {
  const router = useRouter();
  const { fromOnboarding } = useLocalSearchParams();
  const isOnboarding = fromOnboarding === "true";
  const userContext = useUser();
  
  const user = userContext?.user;
  const refreshUser = userContext?.refreshUser;
  const updateUserInfo = userContext?.updateUserInfo;
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  
  const [currentScreen, setCurrentScreen] = useState<"permission" | "search">(
    "permission"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [location, setLocation] = useState<LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasLocationPermission, setHasLocationPermission] = useState<
    boolean | null
  >(null);

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
  });

  const showToast = (
    type: ToastType,
    message: string,
    title?: string,
    buttons?: ToastButton[]
  ) => {
    setToast({ visible: true, type, message, title, buttons });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const handleSkip = () => {
    showToast(
      "confirm",
      "Without a location, features like grocery matching, local store recommendations, and delivery options won't be available.",
      "Skip Location Setup?",
      [
        {
          text: "Go Back",
          onPress: hideToast,
          style: "cancel",
        },
        {
          text: "Skip Anyway",
          onPress: () => {
            hideToast();
            if (isOnboarding) {
              router.replace("/(auth)/familyAuth");
            } else {
              router.replace("/(main)/(home)/main");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Mock search results
  const mockResults: LocationResult[] = [];

  useEffect(() => {
    if (searchQuery.length > 0) {
      setShowResults(true);
      setSearchResults(
        mockResults.filter((result) =>
          result.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setShowResults(false);
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleAllowLocation = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasLocationPermission(false);
        setErrorMsg("Permission to access location was denied");
        return;
      }
      setHasLocationPermission(true);
      // move to the search screen; don't fetch GPS yet
      setCurrentScreen("search");
    });
  };

  const handleManualEntry = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen("search");
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleBack = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen("permission");
      setSearchQuery("");
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleUseCurrentLocation = async () => {
    if (hasLocationPermission !== true) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }
      setHasLocationPermission(true);
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation(currentLocation);

    // Reverse geocode: convert coords -> readable address
    const [address] = await Location.reverseGeocodeAsync({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    });

    if (address) {
      console.log("Street:", address.street);
      console.log("City:", address.city);
      console.log("Region:", address.region);
      console.log("Country:", address.country);
      console.log("Postal Code:", address.postalCode);
    }
    if (updateUserInfo) {
      await updateUserInfo({
        location: `${address.street} ${address.city} ${address.region} ${address.postalCode} ${address.country}`,
      });
    }
    if (refreshUser) {
      await refreshUser();
    }
    showToast("success", "Location was successfully set");
    setTimeout(() => {
      if (isOnboarding) {
        router.replace("/(auth)/familyAuth");
      } else {
        router.replace("/(main)/(home)/main");
      }
    }, 1500);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleSelectLocation = (location: LocationResult) => {
    console.log("Selected location:", location);
  };

  const handleGooglePlacesSelect = async (address: ParsedAddress) => {
    console.log("Selected Google Places address:", address);
    
    // Format the full address
    const fullAddress = [
      address.streetNumber,
      address.street,
      address.city,
      address.state,
      address.zipCode,
    ]
      .filter(Boolean)
      .join(" ");

    try {
      // Update user location
      if (updateUserInfo) {
        await updateUserInfo({
          location: fullAddress || address.formattedAddress,
        });
      }
      if (refreshUser) {
        await refreshUser();
      }
      showToast("success", "Location was successfully set");
      setTimeout(() => {
        if (isOnboarding) {
          router.replace("/(auth)/familyAuth");
        } else {
          router.replace("/(main)/(home)/main");
        }
      }, 1500);
    } catch (error) {
      console.log("Error updating location:", error);
      showToast("error", "Failed to update location. Please try again.");
    }
  };

  if (currentScreen === "permission") {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.permissionContent, { opacity: fadeAnim }]}
        >
          {/* Location Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <View style={styles.locationPin}>
                <View style={styles.pinOuter}>
                  <View style={styles.pinInner} />
                </View>
              </View>
            </View>
          </View>

          {/* Title and Description */}
          <Text style={styles.permissionTitle}>What is Your Location?</Text>
          <Text style={styles.permissionSubtitle}>
            Get the best experience by{"\n"}enabling location services.
          </Text>

          {/* Allow Location Button */}
          <TouchableOpacity onPress={handleAllowLocation} activeOpacity={1}>
            <Animated.View
              style={[
                styles.allowButton,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Text style={styles.allowButtonText}>Allow Location Access</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Manual Entry Link */}
          <TouchableOpacity onPress={handleManualEntry} activeOpacity={0.6}>
            <Text style={styles.manualEntryText}>Enter Location Manually</Text>
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.6}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
        <ToastBanner
          visible={toast.visible}
          type={toast.type}
          message={toast.message}
          title={toast.title}
          buttons={toast.buttons}
          onHide={hideToast}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.searchContent, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.6}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.searchTitle}>Enter Your Location</Text>
        </View>

        {/* Google Places Autocomplete */}
        <View style={styles.autocompleteWrapper}>
          <GooglePlacesAutocomplete
            onSelectAddress={handleGooglePlacesSelect}
            placeholder="123 Main St, City, State..."
            autoFocus={true}
          />
        </View>

        {/* Use Current Location */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleUseCurrentLocation}
          activeOpacity={0.6}
        >
          <View style={styles.currentLocationIcon}>
            <Ionicons name="location-outline" size={18} color={palette.card} />
          </View>
          <Text style={styles.currentLocationText}>
            Use my current location
          </Text>
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.6}
          style={styles.skipButtonSearch}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

      </Animated.View>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={hideToast}
      />
    </View>
  );
};

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  card: colors.card,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  success: colors.success,
  error: colors.error,
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    permissionContent: {
      flex: 1,
      paddingHorizontal: 30,
      paddingTop: 120,
      alignItems: "center",
    },
    iconContainer: {
      marginBottom: 50,
    },
    iconCircle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: withAlpha(palette.success, 0.12),
      justifyContent: "center",
      alignItems: "center",
    },
    locationPin: {
      width: 80,
      height: 80,
      justifyContent: "center",
      alignItems: "center",
    },
    pinOuter: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 4,
      borderColor: palette.success,
      justifyContent: "center",
      alignItems: "center",
    },
    pinInner: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: palette.success,
    },
    permissionTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      marginBottom: 12,
    },
    permissionSubtitle: {
      fontSize: 16,
      color: palette.textMuted,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 60,
    },
    allowButton: {
      width: "100%",
      backgroundColor: palette.success,
      borderRadius: 12,
      paddingVertical: 18,
      justifyContent: "center",
      alignItems: "center",
      padding: 7,
      marginBottom: 24,
      shadowColor: palette.success,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    allowButtonText: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.card,
    },
    manualEntryText: {
      fontSize: 16,
      fontWeight: "500",
      color: palette.success,
    },
    skipButton: {
      marginTop: 40,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipButtonSearch: {
      alignSelf: "center",
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: palette.textMuted,
      textDecorationLine: "underline",
    },
    searchContent: {
      flex: 1,
      paddingTop: 60,
      backgroundColor: palette.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 30,
    },
    autocompleteWrapper: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    backIcon: {
      fontSize: 24,
      color: palette.text,
    },
    searchTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      marginRight: 40,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginHorizontal: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: palette.border,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchIconText: {
      fontSize: 20,
      color: palette.text,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: palette.text,
    },
    clearButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: palette.success,
      justifyContent: "center",
      alignItems: "center",
    },
    clearIcon: {
      fontSize: 14,
      color: palette.card,
      fontWeight: "600",
    },
    currentLocationButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginBottom: 20,
    },
    currentLocationIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: withAlpha(palette.success, 0.12),
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    currentLocationIconText: {
      fontSize: 16,
      color: palette.text,
    },
    currentLocationText: {
      fontSize: 16,
      fontWeight: "500",
      color: palette.text,
    },
    resultsContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    resultsHeader: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.textMuted,
      marginBottom: 16,
      letterSpacing: 1,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    resultIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: palette.card,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    resultIcon: {
      fontSize: 18,
      color: palette.text,
    },
    resultTextContainer: {
      flex: 1,
    },
    resultName: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 4,
    },
    resultAddress: {
      fontSize: 14,
      color: palette.textMuted,
    },
  });

export default LocationScreens;
