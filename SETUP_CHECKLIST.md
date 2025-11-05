# ✅ Google Places Setup Checklist

Complete this checklist to get your Google Places autocomplete working!

---

## 📋 Pre-Setup (5 minutes)

- [ ] **Read**: `README_GOOGLE_PLACES.md` (overview)
- [ ] **Review**: `GOOGLE_PLACES_QUICK_REFERENCE.md` (usage examples)

---

## 🔑 Google Cloud Console Setup (10 minutes)

### 1. Create/Select Project
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project or select existing one
- [ ] Note project ID: _______________

### 2. Enable APIs
- [ ] Navigate to **APIs & Services** → **Library**
- [ ] Search and enable **Places API** ✅
- [ ] Search and enable **Geocoding API** ✅ (optional, for reverse geocoding)

### 3. Create API Key
- [ ] Go to **APIs & Services** → **Credentials**
- [ ] Click **Create Credentials** → **API Key**
- [ ] Copy your API key: `AIza...`
- [ ] Store it securely (you'll add it to app.json next)

### 4. Restrict API Key (IMPORTANT!)

#### Application Restrictions
- [ ] Click on your API key to edit
- [ ] Under **Application restrictions**, select:
  - **iOS apps**
    - [ ] Add bundle identifier: `com.george.MyApp`
  - **Android apps** 
    - [ ] Add package name: `com.george.myapp`
    - [ ] Add SHA-1 fingerprint (get with keytool command below)

```bash
# Get Android SHA-1 fingerprint (for debug keystore)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### API Restrictions
- [ ] Under **API restrictions**, select **Restrict key**
- [ ] Enable only:
  - [ ] ✅ Places API
  - [ ] ✅ Geocoding API (if you enabled it)
- [ ] Click **Save**

### 5. Enable Billing
- [ ] Go to **Billing** → **Account Management**
- [ ] Link a billing account (required for API usage)
- [ ] Google provides $200 free credit per month!

### 6. Set Usage Quotas
- [ ] Go to **APIs & Services** → **Quotas**
- [ ] Filter by: **Places API**
- [ ] Set daily limits:
  - [ ] Autocomplete: 1,000 requests/day (adjust as needed)
  - [ ] Place Details: 1,000 requests/day

### 7. Set Billing Alerts
- [ ] Go to **Billing** → **Budgets & alerts**
- [ ] Click **Create Budget**
- [ ] Set amount: $10/month (or as needed)
- [ ] Set alert thresholds:
  - [ ] 50% threshold
  - [ ] 80% threshold
  - [ ] 100% threshold
- [ ] Add your email for notifications

---

## 💻 App Configuration (5 minutes)

### 1. Add API Key to app.json
- [ ] Open `app.json`
- [ ] Add your API key under `expo.extra`:

```json
{
  "expo": {
    "name": "MyApp",
    "extra": {
      "googlePlacesApiKey": "YOUR_API_KEY_HERE"
    }
  }
}
```

- [ ] Replace `YOUR_API_KEY_HERE` with your actual key
- [ ] Save the file

### 2. Secure Your API Key
- [ ] **DO NOT** commit `app.json` with real API key to public repos
- [ ] Option A: Add `app.json` to `.gitignore`
- [ ] Option B: Use environment variables (see `GOOGLE_API_KEY_CONFIG.md`)
- [ ] Option C: Use EAS Secrets for production

Add to `.gitignore`:
```
# API keys
app.json
.env
.env.local
```

### 3. Create Backup Template
- [ ] Copy `app.json` to `app.json.template`
- [ ] Replace real key with `"YOUR_API_KEY_HERE"` in template
- [ ] Commit template to git (not the real app.json!)

---

## 🧪 Testing (5 minutes)

### 1. Restart Development Server
```bash
# Clear cache and restart
npx expo start --clear
```

- [ ] Server started successfully
- [ ] No errors in terminal

### 2. Run on Device/Simulator

**iOS:**
```bash
npx expo run:ios
```

**Android:**
```bash
npx expo run:android
```

Or press `i` (iOS) or `a` (Android) in the Expo terminal.

### 3. Test Autocomplete
- [ ] Navigate to location screen (`app/(user)/getLocation.tsx`)
- [ ] Click "Enter Location Manually"
- [ ] Type at least 3 characters (e.g., "123 Main")
- [ ] Wait 400ms
- [ ] Suggestions should appear! 🎉

### 4. Test Selection
- [ ] Click on a suggestion
- [ ] Address should be selected
- [ ] All fields should populate (street, city, state, zip)
- [ ] "Location was successfully set" alert appears
- [ ] Navigates to main screen

### 5. Test Error Handling
- [ ] Clear input and type less than 3 characters
- [ ] No suggestions should appear (by design)
- [ ] Type invalid text
- [ ] Should show "No addresses found"

---

## 🔍 Verification Checklist

### Console Checks
- [ ] No "API key not configured" errors
- [ ] No "REQUEST_DENIED" errors
- [ ] No billing errors
- [ ] See API responses in console (if you added logging)

### UI Checks
- [ ] Input field appears
- [ ] Can type freely
- [ ] Suggestions dropdown appears after 3+ chars
- [ ] Loading indicator shows briefly
- [ ] Can select a suggestion
- [ ] Selected address displays correctly
- [ ] Clear button works

### Performance Checks
- [ ] Debounce works (400ms delay before API call)
- [ ] Second search for same term is instant (cache hit)
- [ ] No lag or freezing

---

## 📊 Monitoring Setup (5 minutes)

### 1. Google Cloud Console Dashboard
- [ ] Go to **APIs & Services** → **Dashboard**
- [ ] Pin **Places API** to dashboard
- [ ] Check you can see:
  - [ ] Request count (should be low initially)
  - [ ] Error rate
  - [ ] Latency

### 2. Verify Optimizations are Working
After testing for a few minutes:

- [ ] Check request count in Google Cloud Console
- [ ] Should see ~1 request per address search (not per keystroke!)
- [ ] Duplicate searches should not create new requests (cached)

### 3. Cost Tracking
- [ ] Go to **Billing** → **Reports**
- [ ] Filter by **Places API**
- [ ] Verify cost per request is ~$0.017 (session pricing)
- [ ] Not $0.00283 (per-keystroke pricing) ✅

---

## 🐛 Troubleshooting

If something doesn't work, check:

### API Key Issues
- [ ] Key is correct in `app.json`
- [ ] Dev server was restarted after adding key
- [ ] Key has no extra spaces or quotes

### API Permission Issues
- [ ] Places API is enabled in Google Cloud Console
- [ ] Billing is enabled
- [ ] API restrictions match your bundle ID/package name

### App Issues
- [ ] No TypeScript errors in files
- [ ] No errors in terminal
- [ ] Expo dev server is running
- [ ] Device/simulator is connected

### Still Not Working?
- [ ] Check `GOOGLE_PLACES_SETUP.md` troubleshooting section
- [ ] Check browser console (if testing on web)
- [ ] Check device logs
- [ ] Verify internet connection

---

## 📚 Next Steps

Once everything works:

### Production Preparation
- [ ] Set up separate API keys for dev/staging/production
- [ ] Use EAS Secrets or environment variables
- [ ] Increase quotas if needed
- [ ] Document your setup process

### Customization
- [ ] Adjust debounce delay if needed (in `src/config/googlePlaces.ts`)
- [ ] Change country restrictions if needed
- [ ] Customize UI styling
- [ ] Add analytics tracking

### Monitoring
- [ ] Set up weekly cost review
- [ ] Monitor API usage trends
- [ ] Adjust quotas based on usage
- [ ] Review and optimize if costs are high

---

## ✅ Final Verification

Everything working? Check these final items:

- [ ] ✅ API key configured and secure
- [ ] ✅ Autocomplete working smoothly
- [ ] ✅ Address selection populates all fields
- [ ] ✅ No errors in console
- [ ] ✅ Billing alerts configured
- [ ] ✅ Usage quotas set
- [ ] ✅ API restrictions in place
- [ ] ✅ Documentation read and understood
- [ ] ✅ Team members informed of setup

---

## 🎉 Success!

If all boxes are checked, congratulations! You now have:

✅ **Production-ready address autocomplete**  
✅ **94% cost savings compared to naive implementation**  
✅ **Secure API key management**  
✅ **Proper monitoring and alerts**  
✅ **Great user experience**

---

## 📞 Need Help?

Resources:
- `GOOGLE_PLACES_SETUP.md` - Detailed setup guide
- `GOOGLE_PLACES_QUICK_REFERENCE.md` - API reference
- `GOOGLE_API_KEY_CONFIG.md` - Configuration options
- `README_GOOGLE_PLACES.md` - Overview and examples
- `components/AddressFormExample.tsx` - Working example code

External:
- [Google Places API Docs](https://developers.google.com/maps/documentation/places)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Expo Documentation](https://docs.expo.dev/)

---

## 📅 Recommended Review Schedule

- **Daily** (first week): Check for errors and user feedback
- **Weekly**: Review API usage and costs
- **Monthly**: Review optimizations and adjust if needed
- **Quarterly**: Review quotas and scaling needs

---

## 💡 Pro Tips

1. **Test with real addresses** in your target area
2. **Monitor costs closely** for the first month
3. **Gather user feedback** on autocomplete UX
4. **Keep documentation updated** if you make changes
5. **Use analytics** to track autocomplete usage patterns

---

**Setup Time**: ~25 minutes total  
**Worth It**: Absolutely! 🚀

Happy coding! 💻✨
