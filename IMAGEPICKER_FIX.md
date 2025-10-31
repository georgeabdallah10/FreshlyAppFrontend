# ImagePicker MediaType Fix

## Issue
TypeScript errors: `Property 'MediaType' does not exist on type ImagePicker`

**Error occurred in:**
- `app/(user)/setPfp.tsx` (2 occurrences)
- `app/(home)/chat.tsx` (2 occurrences)
- `app/(home)/allGrocery.tsx` (1 occurrence)
- `src/user/uploadPfp.ts` (1 occurrence)
- `components/quickAddModal.tsx` (1 occurrence)

## Root Cause
The code was using the **deprecated** `MediaTypeOptions` enum with incorrect syntax:
```typescript
mediaTypes: [ImagePicker.MediaType.Images]  // ❌ WRONG
```

`expo-image-picker` version 17.0.8 deprecated `MediaTypeOptions` and introduced a new `MediaType` type that uses **string literals**.

## Solution
According to the type definitions in `node_modules/expo-image-picker/build/ImagePicker.types.d.ts`:

```typescript
/**
 * @deprecated To set media types available in the image picker use an array of [`MediaType`](#mediatype) instead.
 */
export declare enum MediaTypeOptions { ... }

/**
 * Media types that can be picked by the image picker.
 * - `'images'` - for images.
 * - `'videos'` - for videos.
 * - `'livePhotos'` - for live photos (iOS only).
 */
export type MediaType = 'images' | 'videos' | 'livePhotos';
```

The correct syntax is to use **string literals**:
```typescript
mediaTypes: ['images']  // ✅ CORRECT
```

## Changes Made

### 1. `app/(user)/setPfp.tsx` (2 fixes)
```typescript
// BEFORE:
mediaTypes: [ImagePicker.MediaType.Images]

// AFTER:
mediaTypes: ['images']
```

### 2. `app/(home)/chat.tsx` (2 fixes)
```typescript
// BEFORE:
mediaTypes: [ImagePicker.MediaType.Images]

// AFTER:
mediaTypes: ['images']
```

### 3. `app/(home)/allGrocery.tsx` (1 fix)
```typescript
// BEFORE:
mediaTypes: [ImagePicker.MediaType.Images]

// AFTER:
mediaTypes: ['images']
```

### 4. `src/user/uploadPfp.ts` (1 fix)
```typescript
// BEFORE:
mediaTypes: [ImagePicker.MediaType.Images]

// AFTER:
mediaTypes: ['images']
```

### 5. `components/quickAddModal.tsx` (1 fix)
```typescript
// BEFORE:
mediaTypes: [ImagePicker.MediaType.Images]

// AFTER:
mediaTypes: ['images']
```

## Verification
✅ TypeScript check passes: `npx tsc --noEmit` (no errors)
✅ Build succeeds: `npm run vercel-build` (exported successfully)
✅ All 49 static routes generated

## Available Media Types
- `'images'` - Only images
- `'videos'` - Only videos  
- `'livePhotos'` - Live photos (iOS only)

**Example for multiple types:**
```typescript
mediaTypes: ['images', 'videos']  // Allow both images and videos
```

## References
- expo-image-picker documentation: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- Migration guide: The `MediaTypeOptions` enum is deprecated, use string literal arrays instead
