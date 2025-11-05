import { GooglePlacesAutocomplete } from "@/components/GooglePlacesAutocomplete";
import { useUser } from "@/context/usercontext";
import type { ParsedAddress } from "@/hooks/useGooglePlaces";
import type { LocationObject } from "expo-location";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

type LocationResult = {
  id: string;
  name: string;
  address: string;
};

const LocationScreens = () => {
  const router = useRouter();
  const { user, refreshUser, updateUserInfo } = useUser();
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

    // 🗺️ Reverse geocode: convert coords → readable address
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
    await updateUserInfo({
      location: `${address.street} ${address.city} ${address.region} ${address.postalCode} ${address.country}`,
    });
    await refreshUser();
    alert("Locatoin was succesfully set");
    router.replace("/(home)/main");
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
      await updateUserInfo({
        location: fullAddress || address.formattedAddress,
      });
      await refreshUser();
      alert("Location was successfully set");
      router.replace("/(home)/main");
    } catch (error) {
      console.error("Error updating location:", error);
      alert("Failed to update location. Please try again.");
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
        </Animated.View>
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
            <Text style={styles.currentLocationIconText}>📍</Text>
          </View>
          <Text style={styles.currentLocationText}>
            Use my current location
          </Text>
        </TouchableOpacity>


      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#E8F8F2",
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
    borderColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
  },
  pinInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#00C853",
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: 12,
  },
  permissionSubtitle: {
    fontSize: 16,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 60,
  },
  allowButton: {
    width: "100%",
    backgroundColor: "#00C853",
    borderRadius: 12,
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    padding: 7,
    marginBottom: 24,
    shadowColor: "#00C853",
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
    color: "#FFFFFF",
  },
  manualEntryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#00C853",
  },
  searchContent: {
    flex: 1,
    paddingTop: 60,
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
    color: "#111111",
  },
  searchTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginRight: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchIconText: {
    fontSize: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111111",
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
  },
  clearIcon: {
    fontSize: 14,
    color: "#FFFFFF",
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
    backgroundColor: "#E8F8F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  currentLocationIconText: {
    fontSize: 16,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111111",
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B0B0B0",
    marginBottom: 16,
    letterSpacing: 1,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F7F8FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  resultIcon: {
    fontSize: 18,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: "#B0B0B0",
  },
});

export default LocationScreens;
