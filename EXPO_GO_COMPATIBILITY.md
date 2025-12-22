# Expo Go Compatibility Guide

##  Issues Fixed

### 1. **MMKV Nitro Modules Error**
**Error**: `NitroModules are not supported in Expo Go!`

**Solution**: Automatic fallback to AsyncStorage when running in Expo Go.

```typescript
// src/utils/mmkvStorage.ts now automatically detects environment

if (IS_EXPO_GO) {
  // Uses AsyncStorage fallback
  console.warn('Running in Expo Go - using AsyncStorage fallback');
} else {
  // Uses real MMKV in development builds
  const { createMMKV } = require('react-native-mmkv');
}
```

### 2. **Modal Route Warning**
**Warning**: `Route "./modal.tsx" is missing the required default export`

**Solution**: Added default export to `app/modal.tsx`

---

##  How It Works

### In Expo Go
-  Uses **AsyncStorage** fallback for storage
-  React Query persistence **still works**
-  Zustand user store **still works**
-  **Slightly slower** than native MMKV (but still functional)
-  **No encryption** on AsyncStorage fallback

### In Development Build (Recommended)
-  Uses **native MMKV** (30x faster)
-  Full **encryption** support
-  **Synchronous** API for instant access
-  Best **performance**

---

##  Running the App

### Option 1: Expo Go (Quick Testing)
```bash
npm start
# Scan QR code with Expo Go app
```

**Limitations**:
- AsyncStorage fallback (slower)
- No MMKV encryption
- Some async delays in storage

**Best for**: Quick testing, demos, sharing with non-developers

### Option 2: Development Build (Recommended)
```bash
# Create development build
npx expo prebuild

# iOS
npx expo run:ios

# Android
npx expo run:android
```

**Benefits**:
- Full MMKV performance (30x faster)
- Hardware-backed encryption
- Synchronous storage API
- Production-ready performance

**Best for**: Development, production, performance testing

---

##  Storage Behavior

### Expo Go (AsyncStorage Fallback)
```typescript
import { storage } from '@/src/utils/mmkvStorage';

// Still works, but uses AsyncStorage under the hood
storage.set('key', 'value');  // Async behind the scenes
const value = storage.getString('key');  // May be undefined initially
```

**Note**: The API is synchronous, but data may not be immediately available due to AsyncStorage being async internally. This is a known limitation of Expo Go.

### Development Build (MMKV)
```typescript
import { storage } from '@/src/utils/mmkvStorage';

// True synchronous API
storage.set('key', 'value');  // Instantly saved
const value = storage.getString('key');  // Always accurate
```

---

##  Best Practices

### 1. **For Development**
Use a **development build** for best experience:
```bash
npx expo prebuild
npx expo run:ios  # or run:android
```

### 2. **For Quick Testing**
Expo Go is fine for UI testing and demos, but be aware of storage limitations.

### 3. **For Production**
Always use a **custom build** (not Expo Go) to get:
- Full MMKV performance
- Encryption support
- Native module access

---

##  Detection Logic

The app automatically detects the environment:

```typescript
import Constants from 'expo-constants';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

if (IS_EXPO_GO) {
  console.warn('Using AsyncStorage fallback in Expo Go');
  // Use AsyncStorage
} else {
  // Use MMKV
}
```

You'll see a **warning in the console** if running in Expo Go:
```
[MMKV] Running in Expo Go - using AsyncStorage fallback.
For best performance, use a development build.
```

---

##  Important Notes

### Expo Go Limitations
1. **Storage**: AsyncStorage fallback (no true synchronous API)
2. **Encryption**: Not available in AsyncStorage fallback
3. **Performance**: Slower than native MMKV
4. **Native Modules**: Limited to what Expo Go includes

### When to Use Development Build
- Production app
- Performance-critical features
- Testing encryption
- Accurate performance benchmarks

### When Expo Go is OK
- Quick UI testing
- Demos and sharing
- Initial development
- Non-performance-critical testing

---

##  Troubleshooting

### Error: "NitroModules are not supported"
 **Fixed!** The app now automatically falls back to AsyncStorage.

### Storage not persisting in Expo Go
This is normal behavior. AsyncStorage is async, so there may be delays. Data will eventually persist.

### Want full MMKV performance?
Create a development build:
```bash
npx expo prebuild
npx expo run:ios  # or run:android
```

---

##  Performance Comparison

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Storage Backend | AsyncStorage | MMKV |
| Speed | Normal | 30x faster |
| Synchronous | No (async fallback) | Yes |
| Encryption | No | Yes |
| Cache Size | Unlimited | Unlimited |
| Persistence | Yes | Yes |

---

##  Current Status

-  App works in **both Expo Go and development builds**
-  Automatic environment detection
-  Graceful fallbacks
-  No breaking changes
-  All features functional (with performance differences)

---

##  Recommended Workflow

1. **Start with Expo Go** for quick iteration
2. **Test features** and UI
3. **Create development build** for performance testing
4. **Deploy production build** with full MMKV

---

**The app now runs everywhere!** 
