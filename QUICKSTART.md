# ⚡ Quick Start Guide - Caching Architecture

## 🎯 TL;DR

Your app now has **production-grade caching** with:
- MMKV (30x faster storage)
- React Query persistence (offline support)
- Zustand global state
- Secure token storage
- UI flags for onboarding

---

## 🚀 Immediate Usage

### 1. User Profile (Zustand Store)

```typescript
import { useUserStore } from '@/store/userStore';

// In any component
const ProfileComponent = () => {
  const age = useUserStore(state => state.profile.age);
  const updateAge = useUserStore(state => state.updateAge);
  const dailyCalories = useUserStore(state => state.profile.dailyCalories);

  return (
    <View>
      <Text>Age: {age}</Text>
      <Text>Daily Calories: {dailyCalories}</Text>
      <Button onPress={() => updateAge(25)} title="Set Age 25" />
    </View>
  );
};
```

**Available User Data**:
- `age`, `weight`, `height`, `gender`
- `dailyCalories`, `activityLevel`
- `dietaryPreferences`, `allergies`
- `fitnessGoal`, `targetWeight`
- `macroGoals` (protein, fats, carbs)

### 2. Tutorial/Onboarding Flags

```typescript
import { getHasSeenTutorial, setHasSeenTutorial } from '@/src/utils/uiFlags';

// Check if user has seen tutorial
const OnboardingCheck = async () => {
  const seen = await getHasSeenTutorial();

  if (!seen) {
    // Navigate to tutorial
    router.push('/tutorial');
    // Mark as seen after completion
    await setHasSeenTutorial(true);
  }
};
```

**Available Flags**:
- `hasSeenTutorial`
- `hasCompletedOnboarding`
- `hasSeenPantryGuide`
- `hasSeenMealPlanGuide`
- `hasSeenNotificationPrompt`
- `preferredTheme` (light/dark/system)

### 3. Secure Auth Tokens

```typescript
import { saveTokens, getAccessToken, deleteAllTokens } from '@/src/utils/secureTokenStore';

// On Login
const handleLogin = async (accessToken: string, refreshToken: string) => {
  await saveTokens(accessToken, refreshToken);
};

// Get Token for API Calls
const makeAuthenticatedRequest = async () => {
  const token = await getAccessToken();
  // Use token in Authorization header
};

// On Logout
const handleLogout = async () => {
  await deleteAllTokens();
  useUserStore.getState().resetProfile();
};
```

### 4. Cached Data with React Query

**Already Works** - No changes needed! Your existing hooks automatically get:
- ✅ MMKV persistence (survives app restart)
- ✅ Offline support (shows cached data)
- ✅ Auto-refresh on app foreground
- ✅ Background refetching

```typescript
// Example: usePantryItems() - Already works with persistence!
import { usePantryItems } from '@/hooks/usePantry';

function PantryScreen() {
  const { data, isLoading, isFetching } = usePantryItems();

  // data = cached data shown immediately
  // isFetching = true when background refetch happens

  return (
    <View>
      {isFetching && <ActivityIndicator />}
      {data?.map(item => <PantryItem key={item.id} item={item} />)}
    </View>
  );
}
```

---

## 📋 Common Patterns

### Pattern 1: User Onboarding Flow

```typescript
// In your splash/loading screen
import { getHasCompletedOnboarding } from '@/src/utils/uiFlags';
import { useRouter } from 'expo-router';

const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const completed = await getHasCompletedOnboarding();

    if (completed) {
      router.replace('/(home)/main');
    } else {
      router.replace('/onboarding');
    }
  };

  return <LoadingSpinner />;
};
```

### Pattern 2: User Profile Setup

```typescript
// In settings or profile screen
import { useUserStore } from '@/store/userStore';

const SettingsScreen = () => {
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);

  const handleSave = () => {
    updateProfile({
      age: 25,
      weight: 70,
      height: 175,
      gender: 'male',
      dailyCalories: 2000,
    });
    // Automatically saved to MMKV!
  };

  return (
    <View>
      <TextInput
        placeholder="Age"
        value={String(profile.age || '')}
        onChangeText={(text) => updateProfile({ age: Number(text) })}
      />
      {/* More fields... */}
      <Button onPress={handleSave} title="Save" />
    </View>
  );
};
```

### Pattern 3: Protected API Calls

```typescript
// Update your API client
import { getAccessToken } from '@/src/utils/secureTokenStore';

const apiClient = {
  async get(url: string) {
    const token = await getAccessToken();

    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  },
};
```

### Pattern 4: Calculate User Macros

```typescript
import { useUserStore, calculateBMR, calculateTDEE, getRecommendedMacros } from '@/store/userStore';

const MacroCalculator = () => {
  const profile = useUserStore(state => state.profile);
  const setMacroGoals = useUserStore(state => state.setMacroGoals);

  const calculateMacros = () => {
    const bmr = calculateBMR(
      profile.weight,
      profile.height,
      profile.age,
      profile.gender
    );

    if (bmr) {
      const tdee = calculateTDEE(bmr, profile.activityLevel);

      if (tdee) {
        const macros = getRecommendedMacros(tdee, profile.fitnessGoal);
        setMacroGoals(macros!);
      }
    }
  };

  return <Button onPress={calculateMacros} title="Calculate Macros" />;
};
```

---

## 🎨 UI Integration Examples

### Show Cached Data Indicator

```typescript
function PantryScreen() {
  const { data, isFetching, dataUpdatedAt } = usePantryItems();

  return (
    <View>
      <View style={styles.header}>
        <Text>Pantry</Text>
        {isFetching && <ActivityIndicator />}
      </View>

      {/* Show when data was last updated */}
      <Text style={styles.lastUpdate}>
        Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
      </Text>

      {data?.map(item => <PantryItem key={item.id} item={item} />)}
    </View>
  );
}
```

### Pull to Refresh

```typescript
import { RefreshControl } from 'react-native';

function PantryScreen() {
  const { data, refetch, isFetching } = usePantryItems();

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => refetch()}
        />
      }
    >
      {data?.map(item => <PantryItem key={item.id} item={item} />)}
    </ScrollView>
  );
}
```

### Offline Indicator

```typescript
import NetInfo from '@react-native-community/netinfo';

function Header() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  return (
    <View>
      {!isOnline && (
        <Banner>
          📴 Offline - Showing cached data
        </Banner>
      )}
    </View>
  );
}
```

---

## 🔧 Utility Functions

### Clear All Cache (For Testing)

```typescript
import { cacheStorage, userStorage, storage } from '@/src/utils/mmkvStorage';
import { resetAllUIFlags } from '@/src/utils/uiFlags';
import { deleteAllTokens } from '@/src/utils/secureTokenStore';
import { useUserStore } from '@/store/userStore';
import { queryClient } from '@/src/config/queryClient';

const clearAllData = async () => {
  // Clear MMKV
  cacheStorage.clearAll();
  userStorage.clearAll();
  storage.clearAll();

  // Clear UI flags
  await resetAllUIFlags();

  // Clear tokens
  await deleteAllTokens();

  // Reset user store
  useUserStore.getState().resetProfile();

  // Clear React Query cache
  queryClient.clear();

  console.log('✅ All data cleared!');
};
```

### Check Storage Size

```typescript
import { cacheStorage, userStorage, storage } from '@/src/utils/mmkvStorage';

const checkStorageSize = () => {
  console.log('Cache size:', (cacheStorage.getSize() / 1024).toFixed(2), 'KB');
  console.log('User size:', (userStorage.getSize() / 1024).toFixed(2), 'KB');
  console.log('App size:', (storage.getSize() / 1024).toFixed(2), 'KB');
};
```

---

## 🐛 Debugging

### View User Store State

```typescript
import { useUserStore } from '@/store/userStore';

const DebugPanel = () => {
  const store = useUserStore();

  return (
    <ScrollView>
      <Text>{JSON.stringify(store, null, 2)}</Text>
    </ScrollView>
  );
};
```

### View React Query Cache

```typescript
import { queryClient } from '@/src/config/queryClient';

const viewCache = () => {
  const cache = queryClient.getQueryCache().getAll();
  console.log('Cached queries:', cache.length);
  cache.forEach(query => {
    console.log(query.queryKey, query.state);
  });
};
```

---

## 📚 Full Documentation

For complete documentation, see:
- **`CACHING_ARCHITECTURE.md`** - Full architecture guide
- **`INTEGRATION_SUMMARY.md`** - Integration details

---

## ⚡ Performance Tips

1. **Use Selectors**: Only subscribe to data you need
   ```typescript
   // ❌ Bad - Rerenders on any store change
   const store = useUserStore();

   // ✅ Good - Only rerenders when age changes
   const age = useUserStore(state => state.profile.age);
   ```

2. **Prefetch Data**: Load data before user navigates
   ```typescript
   import { prefetchQueries } from '@/src/config/queryClient';

   await prefetchQueries.pantry(() => fetchPantryItems());
   ```

3. **Optimize React Query**: Set appropriate stale times
   ```typescript
   useQuery({
     queryKey: ['frequent'],
     queryFn: fetchData,
     staleTime: 1000 * 60 * 1, // 1 min for frequently changing data
   });

   useQuery({
     queryKey: ['static'],
     queryFn: fetchData,
     staleTime: 1000 * 60 * 60, // 1 hour for static data
   });
   ```

---

## ✅ Checklist for New Features

When adding new features:

- [ ] Add query keys to `src/config/queryClient.ts`
- [ ] Create hooks in `hooks/api/`
- [ ] Use MMKV for non-sensitive cached data
- [ ] Use SecureStore for tokens/sensitive data
- [ ] Use AsyncStorage for simple UI flags
- [ ] Add invalidation helpers if needed
- [ ] Document new patterns

---

**You're all set! Start building with confidence.** 🎉
