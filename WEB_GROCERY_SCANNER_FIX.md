# Web Grocery Scanner Fix

## Issue
The grocery scanner was showing "load failed" error when tested on iOS Safari because the React Native `launchCameraAsync` API doesn't work on web browsers.

## Solution
Added platform-specific handling for web vs native:

### Changes Made

1. **Web Support**: On web platforms, use `launchImageLibraryAsync` instead of `launchCameraAsync`
   - This allows users to upload images from their device
   - On mobile browsers (iOS Safari), this will show options for camera or photo library
   
2. **Updated UI Text**: 
   - Web: "Upload a photo of your groceries..."
   - Native: "Take a photo of your groceries..."

3. **Hidden Barcode Scanner on Web**: 
   - Barcode scanning uses `CameraView` which doesn't work on web
   - Option is now hidden on web platforms

### How It Works Now

#### On Web (iOS Safari, Chrome, etc.):
- Clicking "Scan Groceries" opens file picker
- On mobile browsers, user can choose camera or photo library
- Image is uploaded and processed by AI

#### On Native App (iOS/Android):
- Clicking "Scan Groceries" opens device camera
- User takes photo directly
- Image is processed by AI
- Barcode scanner is also available

### Testing on iOS Safari

1. Open the app in iOS Safari
2. Navigate to grocery scanner
3. Click "Scan Groceries" or "Scan Receipt"
4. Choose an image from your photo library (or take a new photo if prompted)
5. The image will be processed by the AI API
6. Results will appear in the confirmation screen

### Console Logs

The following logs will help debug any issues:
```
[Grocery Scanner] Platform: web
[Grocery Scanner] Using web image picker...
[Grocery Scanner] Image picker result: { canceled: false, hasAssets: true }
[Grocery Scanner] Image selected: blob:http://...
[Grocery Scanner] Processing image: groceries
[imageUriToBase64] Fetching URI: blob:http://...
[imageUriToBase64] Converting to blob...
[AI API] Scanning grocery image...
```

### Known Limitations on Web

- Cannot use device camera directly (uses file picker instead)
- Barcode scanner not available
- May have CORS issues with certain image sources

### Next Steps

If you want full camera support on web:
1. Consider using a web-specific camera library like `react-webcam`
2. Or use the device's native camera app and upload the result
3. For production, the native mobile app will have full camera functionality
