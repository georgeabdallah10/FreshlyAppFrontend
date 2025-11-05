
/**
 * Google Places API Configuration
 * 
 * To use this feature:
 * 1. Get your API key from: https://console.cloud.google.com/
 * 2. Enable "Places API" and "Geocoding API" in your Google Cloud Console
 * 3. Set up API key restrictions (iOS bundle ID, Android package name)
 * 4. Add your API key to app.json under expo.ios.config.googleMapsApiKey
 *    and expo.android.config.googleMaps.apiKey
 */

import Constants from 'expo-constants';

// For Expo apps, store API key in app.json or eas.json
// Example in app.json:
// {
//   "expo": {
//     "extra": {
//       "googlePlacesApiKey": "YOUR_API_KEY_HERE"
//     }
//   }
// }

export const GOOGLE_PLACES_API_KEY = 
  Constants.expoConfig?.extra?.googlePlacesApiKey || 
  process.env.GOOGLE_PLACES_API_KEY || 
  '';

// API Endpoints
export const GOOGLE_PLACES_AUTOCOMPLETE_URL = 
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
export const GOOGLE_PLACE_DETAILS_URL = 
  'https://maps.googleapis.com/maps/api/place/details/json';

// Configuration for cost optimization
export const PLACES_CONFIG = {
  // Debounce delay in milliseconds
  DEBOUNCE_DELAY: 400,
  
  // Types of places to search (restricts to addresses only)
  TYPES: 'address',
  
  // Country restriction (US only for cost optimization)
  COUNTRY: 'us',
  
  // Minimum characters before triggering search
  MIN_SEARCH_LENGTH: 3,
  
  // Cache duration in milliseconds (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000,
  
  // Fields to request from Place Details API (minimal for cost optimization)
  PLACE_DETAILS_FIELDS: ['address_components', 'formatted_address'].join(','),
};

export const validateApiKey = (): boolean => {
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === '') {
    console.error('⚠️ Google Places API key is not configured!');
    console.error('Please add your API key to app.json under expo.extra.googlePlacesApiKey');
    return false;
  }
  return true;
};
