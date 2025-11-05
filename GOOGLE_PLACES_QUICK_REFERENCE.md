# Google Places Autocomplete - Quick Reference

## 🚀 Quick Start

### 1. Basic Usage

```tsx
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import type { ParsedAddress } from '@/hooks/useGooglePlaces';

const MyComponent = () => {
  const handleAddressSelect = (address: ParsedAddress) => {
    console.log('Selected address:', address);
    // Use address.formattedAddress, address.city, address.state, etc.
  };

  return (
    <GooglePlacesAutocomplete
      onSelectAddress={handleAddressSelect}
      placeholder="Enter your address"
    />
  );
};
```

### 2. Advanced Usage with useGooglePlaces Hook

```tsx
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

const MyComponent = () => {
  const {
    predictions,
    isLoading,
    error,
    searchPlaces,
    getPlaceDetails,
    clearPredictions,
    resetSession,
  } = useGooglePlaces();

  const handleSearch = (text: string) => {
    searchPlaces(text); // Automatically debounced
  };

  const handleSelect = async (placeId: string) => {
    const details = await getPlaceDetails(placeId);
    console.log(details);
  };

  // ... your UI
};
```

## 📦 Types

### ParsedAddress

```typescript
interface ParsedAddress {
  streetNumber: string;    // "123"
  street: string;          // "Main St"
  city: string;            // "San Francisco"
  state: string;           // "CA"
  zipCode: string;         // "94102"
  country: string;         // "United States"
  formattedAddress: string; // "123 Main St, San Francisco, CA 94102, USA"
}
```

### PlacePrediction

```typescript
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;      // "123 Main St"
    secondary_text: string; // "San Francisco, CA, USA"
  };
}
```

## ⚙️ Configuration

Edit `src/config/googlePlaces.ts`:

```typescript
export const PLACES_CONFIG = {
  DEBOUNCE_DELAY: 400,        // Wait time before API call (ms)
  TYPES: 'address',           // Type of results
  COUNTRY: 'us',              // Country restriction
  MIN_SEARCH_LENGTH: 3,       // Min chars to trigger search
  CACHE_DURATION: 300000,     // Cache duration (5 min)
  PLACE_DETAILS_FIELDS: [...] // Fields to request
};
```

## 🎨 Component Props

### GooglePlacesAutocomplete

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSelectAddress` | `(address: ParsedAddress) => void` | **required** | Called when user selects address |
| `placeholder` | `string` | `"Enter your address"` | Input placeholder text |
| `containerStyle` | `ViewStyle` | `undefined` | Custom container style |
| `inputStyle` | `TextStyle` | `undefined` | Custom input style |
| `autoFocus` | `boolean` | `false` | Auto-focus input on mount |
| `initialValue` | `string` | `""` | Initial input value |

## 🔧 Hook Methods

### useGooglePlaces()

Returns:

```typescript
{
  predictions: PlacePrediction[];  // Current suggestions
  isLoading: boolean;              // Loading state
  error: string | null;            // Error message
  searchPlaces: (input: string) => void;           // Search function
  getPlaceDetails: (placeId: string) => Promise<ParsedAddress | null>;
  clearPredictions: () => void;    // Clear suggestions
  resetSession: () => void;        // Reset session token
}
```

## 💡 Common Patterns

### 1. Update User Location

```tsx
const { updateUserInfo } = useUser();

const handleAddressSelect = async (address: ParsedAddress) => {
  await updateUserInfo({
    location: address.formattedAddress,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
  });
};
```

### 2. Form Integration

```tsx
const [formData, setFormData] = useState({
  street: '',
  city: '',
  state: '',
  zipCode: '',
});

const handleAddressSelect = (address: ParsedAddress) => {
  setFormData({
    street: `${address.streetNumber} ${address.street}`,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
  });
};
```

### 3. Validation

```tsx
const handleAddressSelect = (address: ParsedAddress) => {
  if (!address.zipCode) {
    Alert.alert('Invalid Address', 'Please select an address with a ZIP code');
    return;
  }
  
  if (address.state !== 'CA') {
    Alert.alert('Sorry', 'We only serve California addresses');
    return;
  }
  
  // Proceed with valid address
};
```

### 4. Custom Styling

```tsx
<GooglePlacesAutocomplete
  onSelectAddress={handleAddressSelect}
  containerStyle={{
    paddingHorizontal: 16,
  }}
  inputStyle={{
    fontSize: 18,
    fontWeight: '600',
  }}
/>
```

## 🐛 Error Handling

```tsx
const { error, predictions, isLoading } = useGooglePlaces();

useEffect(() => {
  if (error) {
    if (error.includes('API key')) {
      // API key not configured
      Alert.alert('Setup Required', 'Please configure Google Places API key');
    } else if (error.includes('REQUEST_DENIED')) {
      // API restrictions issue
      Alert.alert('Error', 'API key restrictions prevent this request');
    } else {
      // Other errors
      Alert.alert('Error', error);
    }
  }
}, [error]);
```

## 📊 Performance Tips

### 1. Memoize Callbacks

```tsx
const handleAddressSelect = useCallback((address: ParsedAddress) => {
  // Your logic
}, []);
```

### 2. Conditional Rendering

```tsx
{showAutocomplete && (
  <GooglePlacesAutocomplete
    onSelectAddress={handleAddressSelect}
  />
)}
```

### 3. Lazy Loading

```tsx
const GooglePlaces = lazy(() => 
  import('@/components/GooglePlacesAutocomplete').then(m => ({
    default: m.GooglePlacesAutocomplete
  }))
);
```

## 🔐 Security Checklist

- [ ] API key added to `app.json` under `expo.extra.googlePlacesApiKey`
- [ ] API key not committed to version control
- [ ] API restrictions enabled (bundle ID/package name)
- [ ] Billing enabled in Google Cloud Console
- [ ] Usage quotas configured
- [ ] Billing alerts set up

## 📈 Cost Monitoring

Track your API usage in [Google Cloud Console](https://console.cloud.google.com/):

1. Go to **APIs & Services** → **Dashboard**
2. Select **Places API**
3. View **Metrics** tab
4. Set up **Budget alerts**

Expected costs with optimizations:
- **~$0.03 per address** (vs $0.50 without optimization)
- **~94% cost reduction**

## 🧪 Testing Checklist

- [ ] API key configured correctly
- [ ] Suggestions appear after 3+ characters
- [ ] Debounce works (400ms delay)
- [ ] Selection populates all fields
- [ ] Cache works (duplicate searches don't call API)
- [ ] Error states display correctly
- [ ] Loading states show properly
- [ ] Clear button works
- [ ] Works on both iOS and Android

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `src/config/googlePlaces.ts` | Configuration & constants |
| `hooks/useGooglePlaces.ts` | Core hook with API logic |
| `components/GooglePlacesAutocomplete.tsx` | UI component |
| `components/AddressFormExample.tsx` | Usage example |
| `app/(user)/getLocation.tsx` | Real-world implementation |
| `GOOGLE_PLACES_SETUP.md` | Setup instructions |

## 🆘 Support

- [Setup Guide](./GOOGLE_PLACES_SETUP.md)
- [Example Component](../components/AddressFormExample.tsx)
- [Google Places API Docs](https://developers.google.com/maps/documentation/places)
