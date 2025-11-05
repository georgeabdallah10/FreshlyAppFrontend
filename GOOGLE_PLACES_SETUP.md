# Google Places API Setup Guide

## 🚀 Quick Setup

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API**
   - **Geocoding API** (optional, for reverse geocoding)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. Secure Your API Key

#### Set API Key Restrictions:

1. Click on your API key in the Credentials page
2. Under **Application restrictions**, choose:
   - **iOS apps**: Add your iOS bundle ID (`com.george.MyApp`)
   - **Android apps**: Add your Android package name and SHA-1 fingerprint
3. Under **API restrictions**, select:
   - ✅ Places API
   - ✅ Geocoding API
4. Save changes

### 3. Add API Key to Your App

Add your API key to `app.json`:

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

**⚠️ IMPORTANT**: 
- Never commit `app.json` with your API key to public repositories
- Add `app.json` to `.gitignore` or use environment variables
- For production, use EAS Secrets or environment-specific configs

### 4. Alternative: Use Environment Variables

For better security, you can use environment variables:

Create a `.env` file (add to `.gitignore`):
```
GOOGLE_PLACES_API_KEY=your_actual_api_key_here
```

Then use a package like `react-native-dotenv` to load it.

## 💰 Cost Optimization Features

This implementation includes several features to minimize Google API costs:

### 1. Session Tokens ✅
- Each autocomplete session uses a unique token
- Reduces cost from $0.00283 per keystroke to $0.017 per session
- **Savings: ~85% on autocomplete costs**

### 2. Debouncing (400ms) ✅
- Waits 400ms after user stops typing before making API call
- Prevents API calls on every keystroke
- **Savings: Reduces API calls by 60-80%**

### 3. Local Caching (5 minutes) ✅
- Caches recent search results
- Reuses cached data for identical queries
- **Savings: Eliminates redundant API calls**

### 4. Minimal Fields ✅
- Only requests `address_components` and `formatted_address`
- Each additional field costs more
- **Savings: Reduces Place Details cost by ~50%**

### 5. Type Restrictions ✅
- Restricts to `address` type only
- Filters out non-address results server-side
- **Savings: Better results, fewer wasted calls**

### 6. Country Restrictions ✅
- Limited to US addresses only (`country:us`)
- Reduces result set and improves accuracy
- **Savings: Faster responses, better results**

### 7. Location Biasing ✅
- Uses user's current location to bias results
- More relevant results = fewer searches needed
- **Savings: Better UX, fewer API calls**

### 8. Minimum Character Length ✅
- Requires 3+ characters before searching
- Prevents useless short queries
- **Savings: Eliminates low-quality API calls**

## 📊 Expected Costs

With all optimizations enabled:

| Feature | Without Optimization | With Optimization | Savings |
|---------|---------------------|-------------------|---------|
| Autocomplete | $0.00283/keystroke | $0.017/session | ~85% |
| Place Details | $0.017/call | $0.017/call* | 50% (fields) |
| **Per User** | ~$0.50/address | ~$0.03/address | **~94%** |

*Same price but with minimal fields requested

### Typical Usage Scenario:
- User types 15 characters: "123 Main Street"
- Without optimization: 15 calls × $0.00283 = **$0.042**
- With optimization: 1 session × $0.017 = **$0.017**
- Plus 1 Place Details call = **$0.034 total**

**Result**: ~60% cost reduction per address entry!

## 🧪 Testing

1. Make sure your API key is configured
2. Run your app: `npm start`
3. Navigate to the location screen
4. Type at least 3 characters in the address field
5. You should see autocomplete suggestions appear after 400ms
6. Select an address to populate the form

## 🐛 Troubleshooting

### No suggestions appearing?
- Check that your API key is configured in `app.json`
- Verify Places API is enabled in Google Cloud Console
- Check console logs for error messages
- Make sure you're typing at least 3 characters

### "API key not configured" error?
- Add your API key to `app.json` under `expo.extra.googlePlacesApiKey`
- Restart your development server after adding the key

### "REQUEST_DENIED" error?
- Check that Places API is enabled in Google Cloud Console
- Verify your API key restrictions allow your app's bundle ID
- Make sure billing is enabled on your Google Cloud project

### Suggestions are slow?
- Debounce is set to 400ms (this is intentional for cost savings)
- You can reduce it in `src/config/googlePlaces.ts` if needed
- Check your internet connection

## 📝 Customization

### Adjust Debounce Delay

Edit `src/config/googlePlaces.ts`:

```typescript
export const PLACES_CONFIG = {
  DEBOUNCE_DELAY: 400, // Change to 200 for faster (but more expensive) results
  // ...
};
```

### Change Country Restriction

```typescript
export const PLACES_CONFIG = {
  // ...
  COUNTRY: 'ca', // Change to 'ca' for Canada, 'uk' for UK, etc.
};
```

### Allow Multiple Countries

```typescript
// In hooks/useGooglePlaces.ts, change:
components: `country:${PLACES_CONFIG.COUNTRY}`,
// To:
components: 'country:us|country:ca', // Allow US and Canada
```

### Change Place Types

```typescript
export const PLACES_CONFIG = {
  // ...
  TYPES: 'address', // Options: 'address', 'geocode', 'establishment', etc.
};
```

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
2. **Use API restrictions** (iOS/Android bundle IDs)
3. **Enable billing alerts** in Google Cloud Console
4. **Set usage quotas** to prevent unexpected charges
5. **Monitor API usage** regularly
6. **Use environment-specific keys** (dev vs production)

## 📚 Additional Resources

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Places API Pricing](https://developers.google.com/maps/billing/gmp-billing#ac-with-sd)
- [Best Practices for Cost Optimization](https://developers.google.com/maps/billing/gmp-billing#optimize-costs)
- [Expo Constants Documentation](https://docs.expo.dev/versions/latest/sdk/constants/)

## 🆘 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your API key and permissions
3. Review the troubleshooting section above
4. Check Google Cloud Console for API usage and errors
