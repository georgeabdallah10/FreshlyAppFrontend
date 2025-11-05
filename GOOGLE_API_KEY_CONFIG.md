# Google Places API Configuration Template

## Add to your app.json

Add this to your `app.json` file under the `expo` section:

```json
{
  "expo": {
    "name": "MyApp",
    "slug": "MyApp",
    "version": "1.0.0",
    
    "extra": {
      "googlePlacesApiKey": "YOUR_GOOGLE_PLACES_API_KEY_HERE"
    },
    
    "ios": {
      "bundleIdentifier": "com.george.MyApp",
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_PLACES_API_KEY_HERE"
      }
    },
    
    "android": {
      "package": "com.george.myapp",
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_PLACES_API_KEY_HERE"
        }
      }
    }
  }
}
```

## Using Environment Variables (Recommended for Production)

### Option 1: EAS Secrets (Best for production)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Set secret:
```bash
eas secret:create --scope project --name GOOGLE_PLACES_API_KEY --value your_api_key_here
```

4. In app.json:
```json
{
  "expo": {
    "extra": {
      "googlePlacesApiKey": "${GOOGLE_PLACES_API_KEY}"
    }
  }
}
```

### Option 2: .env file (For local development)

1. Install dotenv:
```bash
npm install react-native-dotenv
```

2. Create `.env` file:
```bash
GOOGLE_PLACES_API_KEY=your_api_key_here
```

3. Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

4. Configure babel.config.js:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
        },
      ],
    ],
  };
};
```

5. Create env.d.ts:
```typescript
declare module '@env' {
  export const GOOGLE_PLACES_API_KEY: string;
}
```

6. Use in code:
```typescript
import { GOOGLE_PLACES_API_KEY } from '@env';
```

## Security Best Practices

### 1. Never commit API keys
Add to `.gitignore`:
```
app.json
.env
.env.local
.env.*.local
google-services.json
GoogleService-Info.plist
```

### 2. Use different keys for dev/prod
```json
{
  "expo": {
    "extra": {
      "googlePlacesApiKey": "${EXPO_PUBLIC_ENV === 'production' ? process.env.PROD_GOOGLE_KEY : process.env.DEV_GOOGLE_KEY}"
    }
  }
}
```

### 3. Set API Restrictions in Google Cloud Console

#### For iOS:
- Go to Google Cloud Console → Credentials → Your API Key
- Under "Application restrictions", select "iOS apps"
- Add your bundle identifier: `com.george.MyApp`

#### For Android:
- Select "Android apps"
- Add your package name: `com.george.myapp`
- Add your SHA-1 fingerprint (get with: `keytool -list -v -keystore ~/.android/debug.keystore`)

#### API Restrictions:
- Select "Restrict key"
- Enable only:
  - ✅ Places API
  - ✅ Geocoding API (if using reverse geocoding)

### 4. Set Usage Quotas
- Go to Google Cloud Console → APIs & Services → Quotas
- Set daily limits:
  - Autocomplete: 1,000 requests/day (adjust as needed)
  - Place Details: 1,000 requests/day
  - Set alerts at 80% and 100%

### 5. Enable Billing Alerts
- Go to Google Cloud Console → Billing → Budgets & alerts
- Create budget: e.g., $10/month
- Set alerts at 50%, 80%, 90%, 100%

## Verify Configuration

Run this command to check if your API key is loaded:

```bash
npx expo start
```

Then in your app, check the console logs. You should see:
- ✅ "Google Places API key configured"

If you see:
- ⚠️ "Google Places API key is not configured!"
- Then check your app.json and restart the dev server

## Troubleshooting

### API Key Not Found
```
Error: GOOGLE_PLACES_API_KEY is not configured
```

**Solution:**
1. Check app.json has the key under `expo.extra.googlePlacesApiKey`
2. Restart Expo dev server: `npx expo start --clear`
3. Rebuild the app if using development build

### REQUEST_DENIED Error
```
Error: This API project is not authorized to use this API
```

**Solution:**
1. Enable Places API in Google Cloud Console
2. Check API key restrictions match your bundle ID
3. Verify billing is enabled

### OVER_QUERY_LIMIT Error
```
Error: You have exceeded your daily request quota
```

**Solution:**
1. Check usage in Google Cloud Console
2. Increase quotas if needed
3. Verify optimizations are working (debounce, caching)

## Example Configurations

### Development (app.json)
```json
{
  "expo": {
    "extra": {
      "googlePlacesApiKey": "AIzaSyDevelopmentKey123",
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### Production (eas.json)
```json
{
  "build": {
    "production": {
      "env": {
        "GOOGLE_PLACES_API_KEY": "@production-google-places-key"
      }
    },
    "development": {
      "env": {
        "GOOGLE_PLACES_API_KEY": "@development-google-places-key"
      }
    }
  }
}
```

## Testing Your Setup

1. Run the app:
```bash
npm start
```

2. Navigate to the location screen

3. Type in the address field (at least 3 characters)

4. You should see suggestions after 400ms

5. Check console for any errors

## Need Help?

- [Google Places API Setup Guide](https://developers.google.com/maps/documentation/places/web-service/get-api-key)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS Secrets](https://docs.expo.dev/build-reference/variables/)
