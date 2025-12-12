
import {
  GOOGLE_PLACES_API_KEY,
  GOOGLE_PLACES_AUTOCOMPLETE_URL,
  GOOGLE_PLACE_DETAILS_URL,
  PLACES_CONFIG,
  validateApiKey,
} from '@/src/config/googlePlaces';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  postal_code?: string;
  country?: string;
}

export interface ParsedAddress {
  streetNumber: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  formattedAddress: string;
}

interface CacheEntry {
  data: PlacePrediction[];
  timestamp: number;
}

interface SessionCache {
  [key: string]: CacheEntry;
}

/**
 * Hook for Google Places Autocomplete with cost optimization
 * 
 * Features:
 * - Session token management (reduces API costs)
 * - Debounced input (400ms default)
 * - Local caching (5 minutes)
 * - Location biasing
 * - Type and country restrictions
 * - Minimal field requests
 */
export const useGooglePlaces = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Session token - unique per autocomplete session, resets after selection
  const sessionTokenRef = useRef<string>(generateSessionToken());
  const cacheRef = useRef<SessionCache>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Generate a unique session token
  function generateSessionToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get cached predictions if available and not expired
  const getCachedPredictions = (input: string): PlacePrediction[] | null => {
    const cached = cacheRef.current[input];
    if (cached && Date.now() - cached.timestamp < PLACES_CONFIG.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  };

  // Cache predictions
  const cachePredictions = (input: string, data: PlacePrediction[]) => {
    cacheRef.current[input] = {
      data,
      timestamp: Date.now(),
    };
  };

  // Get user's current location for biasing results
  const getUserLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (currentLocationRef.current) {
      return currentLocationRef.current;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
        currentLocationRef.current = coords;
        return coords;
      }
    } catch (err) {
      console.warn('Could not get user location for biasing:', err);
    }
    return null;
  };

  /**
   * Fetch autocomplete predictions from Google Places API
   */
  const fetchPredictions = useCallback(async (input: string) => {
    if (!validateApiKey()) {
      setError('API key not configured');
      return;
    }

    if (input.length < PLACES_CONFIG.MIN_SEARCH_LENGTH) {
      setPredictions([]);
      return;
    }

    // Check cache first
    const cached = getCachedPredictions(input);
    if (cached) {
      setPredictions(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get user location for biasing (optional but improves results)
      const location = await getUserLocation();

      // Build request URL
      const params = new URLSearchParams({
        input,
        key: GOOGLE_PLACES_API_KEY,
        sessiontoken: sessionTokenRef.current,
        types: PLACES_CONFIG.TYPES,
        components: `country:${PLACES_CONFIG.COUNTRY}`,
      });

      // Add location bias if available
      if (location) {
        params.append('location', `${location.lat},${location.lng}`);
        params.append('radius', '50000'); // 50km radius
      }

      const response = await fetch(`${GOOGLE_PLACES_AUTOCOMPLETE_URL}?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        const results = data.predictions || [];
        setPredictions(results);
        cachePredictions(input, results);
      } else if (data.status === 'ZERO_RESULTS') {
        setPredictions([]);
      } else {
        console.log(data.error_message || `API error: ${data.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch predictions';
      setError(errorMessage);
      console.log('Google Places Autocomplete error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Debounced search function
   */
  const searchPlaces = useCallback((input: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(input);
    }, PLACES_CONFIG.DEBOUNCE_DELAY);
  }, [fetchPredictions]);

  /**
   * Parse address components from Google Place Details
   */
  const parseAddressComponents = (
    addressComponents: any[]
  ): AddressComponents => {
    const components: AddressComponents = {};

    addressComponents.forEach((component) => {
      const types = component.types;

      if (types.includes('street_number')) {
        components.street_number = component.long_name;
      }
      if (types.includes('route')) {
        components.route = component.long_name;
      }
      if (types.includes('locality')) {
        components.locality = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        components.administrative_area_level_1 = component.short_name;
      }
      if (types.includes('postal_code')) {
        components.postal_code = component.long_name;
      }
      if (types.includes('country')) {
        components.country = component.long_name;
      }
    });

    return components;
  };

  /**
   * Fetch place details after user selects a prediction
   * Only called once per selection, with minimal fields for cost optimization
   */
  const getPlaceDetails = async (
    placeId: string
  ): Promise<ParsedAddress | null> => {
    if (!validateApiKey()) {
      setError('API key not configured');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        sessiontoken: sessionTokenRef.current,
        fields: PLACES_CONFIG.PLACE_DETAILS_FIELDS,
      });

      const response = await fetch(`${GOOGLE_PLACE_DETAILS_URL}?${params}`);
      const data = await response.json();

      if (data.status === 'OK') {
        const result = data.result;
        const components = parseAddressComponents(result.address_components);

        // Reset session token after successful detail fetch
        sessionTokenRef.current = generateSessionToken();

        return {
          streetNumber: components.street_number || '',
          street: components.route || '',
          city: components.locality || '',
          state: components.administrative_area_level_1 || '',
          zipCode: components.postal_code || '',
          country: components.country || '',
          formattedAddress: result.formatted_address || '',
        };
      } else {
        console.log(data.error_message || `API error: ${data.status}`);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch place details';
      setError(errorMessage);
      console.log('Google Place Details error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear predictions and reset state
   */
  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setError(null);
  }, []);

  /**
   * Reset session token (call after user cancels or completes form)
   */
  const resetSession = useCallback(() => {
    sessionTokenRef.current = generateSessionToken();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    predictions,
    isLoading,
    error,
    searchPlaces,
    getPlaceDetails,
    clearPredictions,
    resetSession,
  };
};
