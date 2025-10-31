import { Platform } from 'react-native';

// Determine the base URL based on the platform and environment
export const BASE_URL = (() => {
  // For web builds, check if we're on a deployed site
  if (Platform.OS === 'web') {
    // If on production (Vercel), use the backend directly
    // Make sure your backend has CORS configured to allow your Vercel domain
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://freshlybackend.duckdns.org';
    }
    // For local web development
    return 'http://127.0.0.1:8000';
  }
  
  // For iOS/Android (React Native)
  return 'https://freshlybackend.duckdns.org';
})();

//For iphone dev: http://172.20.10.2:8000 
// Run backend on uvicorn main:app --host 0.0.0.0 --port 8000 --reload

//For Mac sim: http://127.0.0.1:8000 , Run backend normally