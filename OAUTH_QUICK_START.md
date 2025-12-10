# 🚀 OAuth Quick Start & Testing Guide

## ⚡ IMMEDIATE ACTION REQUIRED

### 1. Configure Supabase Dashboard (5 minutes)

**URL**: https://supabase.com/dashboard/project/pvpshqpyetlizobsgbtd

#### Add Redirect URLs:
Authentication → URL Configuration → Redirect URLs

```
SAVR://
exp://127.0.0.1:8081
```

#### Enable Google Provider:
Authentication → Providers → Google
- Enable toggle
- Add Client ID
- Add Client Secret

---

## 🧪 Quick Test Commands

### Test Deep Link (iOS)
```bash
xcrun simctl openurl booted "SAVR://"
```

### Test Deep Link (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "SAVR://"
```

### Start Dev Server
```bash
npx expo start --clear
```

---

## ✅ Testing Checklist

### Login Flow
```
1. Open app
2. Tap "Sign in with Google"
3. Authenticate in browser
4. Should redirect back to app
5. Should land on home screen
6. Check console for "[Login] Backend authentication successful"
```

### Signup Flow
```
1. Open app
2. Navigate to Signup
3. Tap "Continue with Google"
4. Authenticate in browser
5. Should redirect back to app
6. Should land on setPfp screen
7. Check console for "[Signup] User authenticated successfully"
```

---

## 🔍 What to Look For in Console

### ✅ SUCCESS:
```
[Login] google login started
[Login] OAuth browser session completed
[Login] Setting Supabase session from redirect tokens...
[OAuth] Login successful
[UserContext] Auth state changed: SIGNED_IN
```

### ❌ ERRORS:
```
"Unable to open provider login page" → Enable Google in Supabase
"Authentication failed" → Check redirect URLs
"Missing authentication token" → Check session setup
```

---

## 🎯 Files Modified

1. ✅ `/app/(auth)/Login.tsx` - Fixed scheme
2. ✅ `/app/(auth)/signup.tsx` - Fixed scheme
3. ✅ `/app/(auth)/callback.tsx` - NEW FILE
4. ✅ `/context/usercontext.tsx` - Added auth listener
5. ✅ `/src/supabase/client.ts` - Improved config

---

## 🆘 Quick Fixes

### OAuth Not Opening Browser?
```typescript
// Check: app.json has "scheme": "SAVR"
// Check: Supabase Dashboard has redirect URL added
```

### Deep Link Not Working?
```bash
# Rebuild app
npx expo prebuild --clean
npx expo run:ios
```

### Session Not Persisting?
```typescript
// Check: UserContext has onAuthStateChange listener (DONE ✅)
// Check: Supabase client has persistSession: true (DONE ✅)
```

---

## 📊 Expected Results

### First Time User (Signup)
```
1. Browser opens → Google login
2. Redirect to app
3. Backend creates user (status 201)
4. Navigate to setPfp screen
```

### Existing User (Login)
```
1. Browser opens → Google login
2. Redirect to app
3. Backend returns existing user (status 200)
4. Navigate to home screen
```

### Already Has Account with Email/Password
```
1. Browser opens → Google login
2. Redirect to app
3. Backend returns 409 (user exists)
4. Auto-attempts login
5. Navigate to home screen
```

---

## 🎨 User Experience Flow

```
┌─────────────────┐
│  Tap "Sign in"  │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Browser │ ← Google Auth Page
    └────┬────┘
         │
    ┌────▼────┐
    │  SAVR:// │ ← Deep Link Back
    └────┬────┘
         │
    ┌────▼────┐
    │   App   │ ← User Authenticated
    └─────────┘
```

---

## 📱 Platform Notes

### iOS
- Works in simulator
- Works on device
- Apple Sign In also available

### Android
- Works in emulator
- Works on device
- May need USB debugging enabled

### Expo Go
- Use `exp://` URLs
- Limited OAuth support
- Use development build instead

---

## 🔐 Security Checklist

- ✅ Tokens stored in SecureStore
- ✅ skipBrowserRedirect: true
- ✅ Backend validates Supabase tokens
- ✅ User-friendly error messages
- ✅ No credentials in logs

---

## 📞 Still Not Working?

1. **Clear app data**
   ```bash
   # iOS
   xcrun simctl uninstall booted com.george.MyApp
   
   # Android
   adb uninstall com.george.MyApp
   ```

2. **Rebuild completely**
   ```bash
   rm -rf node_modules ios android
   npm install
   npx expo prebuild --clean
   ```

3. **Check Supabase Dashboard Logs**
   - Go to Logs section
   - Filter by Auth
   - Look for errors

---

**🎉 Once OAuth works, you're done!**

All fixes have been applied. Just need to configure Supabase Dashboard and test.
