# Caching & Data Fetching Architecture

## Overview

This app uses a comprehensive caching architecture with:
- **React Query (TanStack Query)** for server state management
- **MMKV** for fast, encrypted persistent storage
- **Zustand** for global client state
- **SecureStore** for auth tokens
- **AsyncStorage** for UI flags

---

##  Architecture Components

### 1. React Query with MMKV Persistence

**Location**: `src/config/queryClient.ts`, `providers/QueryPersistProvider.tsx`

**Configuration**:
```typescript
{
  staleTime: 5 minutes,
  gcTime: 30 minutes,
  retry: 2,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true
}
```

**Persisted Queries**:
-  Pantry items
-  Meals
-  Meal plans
-  Notifications
-  Family data
-  Grocery lists

---

### 2. MMKV Storage

**Location**: `src/utils/mmkvStorage.ts`

**Instances**:
- `storage` - General app data
- `cacheStorage` - React Query cache
- `userStorage` - User profile (Zustand)

**Benefits**:
- 30x faster than AsyncStorage
- Synchronous API
- Encrypted storage
- ~5KB overhead

---

### 3. Zustand User Store

**Location**: `store/userStore.ts`

**State**:
```typescript
{
  profile: {
    age, weight, height, gender,
    dailyCalories, activityLevel,
    dietaryPreferences, allergies,
    fitnessGoal, targetWeight
  },
  macroGoals: { protein, fats, carbs }
}
```

**Usage**:
```typescript
import { useUserStore } from '@/store/userStore';

const Component = () => {
  const age = useUserStore(state => state.profile.age);
  const updateAge = useUserStore(state => state.updateAge);

  return <Text>Age: {age}</Text>;
};
```

---

### 4. Secure Token Storage

**Location**: `src/utils/secureTokenStore.ts`

**Functions**:
```typescript
saveAccessToken(token: string)
getAccessToken(): Promise<string | null>
deleteAccessToken()
saveTokens(accessToken, refreshToken?)
getTokens()
deleteAllTokens() // For logout
isAuthenticated(): Promise<boolean>
```

---

### 5. UI Flags Storage

**Location**: `src/utils/uiFlags.ts`

**Available Flags**:
- `hasSeenTutorial`
- `hasCompletedOnboarding`
- `hasSeenPantryGuide`
- `hasSeenMealPlanGuide`
- `hasSeenNotificationPrompt`
- `hasEnabledPushNotifications`
- `preferredTheme` (light/dark/system)
- `lastAppVersion`

**Usage**:
```typescript
import { getHasSeenTutorial, setHasSeenTutorial } from '@/src/utils/uiFlags';

// Check if tutorial was seen
const seen = await getHasSeenTutorial();

// Mark tutorial as seen
await setHasSeenTutorial(true);
```

---

##  Using React Query Hooks

### Example: Pantry Items

```typescript
import { usePantryItems } from '@/hooks/usePantry';

function PantryScreen() {
  const { data, isLoading, isFetching, error, refetch } = usePantryItems();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <View>
      {/* Shows cached data immediately, refetches in background */}
      {data?.map(item => <PantryItem key={item.id} item={item} />)}

      {/* isFetching shows when background refetch is happening */}
      {isFetching && <RefreshIndicator />}
    </View>
  );
}
```

### Example: Notifications with Auto-Refetch

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationsScreen() {
  const { data, isFetching } = useNotifications({
    // Auto-refetches every 60 seconds
  });

  return <NotificationList notifications={data} />;
}
```

### Example: Meal Plans

```typescript
import { useMealPlans, useCreateMealPlan } from '@/hooks/api/useMealPlans';

function MealPlanScreen() {
  const { data: mealPlans } = useMealPlans({ isActive: true });
  const createMealPlan = useCreateMealPlan();

  const handleCreate = async () => {
    await createMealPlan.mutateAsync({
      name: 'My Plan',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    // Cache automatically invalidated and refetched
  };

  return <MealPlanList plans={mealPlans} onCreate={handleCreate} />;
}
```

---

##  Creating New API Hooks

### Template

```typescript
// hooks/api/useMyFeature.ts
import { ApiError } from '@/src/client/apiClient';
import { queryKeys, invalidateQueries } from '@/src/config/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';

// 1. Define types
export interface MyData {
  id: number;
  name: string;
}

// 2. Define API functions
async function fetchMyData(): Promise<MyData[]> {
  // Replace with actual API call
  const response = await apiClient.get<MyData[]>('/my-data');
  return response;
}

// 3. Create query hook
export function useMyData() {
  return useQuery<MyData[], ApiError>({
    queryKey: ['myFeature', 'list'],
    queryFn: fetchMyData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// 4. Create mutation hook
export function useCreateMyData() {
  return useMutation({
    mutationFn: (input: Partial<MyData>) => apiClient.post('/my-data', input),
    onSuccess: () => {
      invalidateQueries.myFeature(); // Invalidate and refetch
    },
  });
}
```

---

##  Query Keys Convention

All query keys are centralized in `src/config/queryClient.ts`:

```typescript
export const queryKeys = {
  myFeature: {
    all: ['myFeature'],
    lists: () => [...queryKeys.myFeature.all, 'list'],
    list: (filters) => [...queryKeys.myFeature.lists(), { filters }],
    detail: (id) => [...queryKeys.myFeature.all, 'detail', id],
  },
};
```

**Benefits**:
- Type-safe query keys
- Consistent naming
- Easy invalidation
- Auto-completion

---

##  Cache Invalidation

### Invalidate All Queries of a Type

```typescript
import { invalidateQueries } from '@/src/config/queryClient';

invalidateQueries.pantry();
invalidateQueries.meals();
invalidateQueries.notifications();
invalidateQueries.mealPlans();
```

### Invalidate Specific Item

```typescript
invalidateQueries.mealDetail(123);
invalidateQueries.mealPlanDetail(456);
```

### Manual Invalidation

```typescript
import { queryClient } from '@/src/config/queryClient';

queryClient.invalidateQueries({ queryKey: ['custom', 'key'] });
```

---

##  Persistence Behavior

### What Gets Persisted?

 **Persisted to MMKV**:
- All successful queries
- User profile (Zustand)
- Query cache (up to 7 days old)

 **Not Persisted**:
- Loading states
- Error states
- Failed queries

### Cache Lifetime

- **Stale Time**: 5 minutes (data considered fresh)
- **GC Time**: 30 minutes (cache kept in memory)
- **Persist Max Age**: 7 days (MMKV storage)

---

##  Performance Optimizations

### 1. Optimistic Updates

```typescript
const createItem = useMutation({
  mutationFn: createPantryItem,
  onMutate: async (newItem) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['pantry'] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['pantry']);

    // Optimistically update
    queryClient.setQueryData(['pantry'], (old) => [...old, newItem]);

    return { previous };
  },
  onError: (err, newItem, context) => {
    // Rollback on error
    queryClient.setQueryData(['pantry'], context.previous);
  },
});
```

### 2. Prefetching

```typescript
import { prefetchQueries } from '@/src/config/queryClient';

// Prefetch pantry data before navigating
await prefetchQueries.pantry(() => fetchPantryItems());

// Prefetch meal details when hovering
await prefetchQueries.mealDetail(mealId, () => fetchMealById(mealId));
```

### 3. Selective Re-renders

```typescript
//  Bad - Rerenders on any store change
const store = useUserStore();

//  Good - Only rerenders when age changes
const age = useUserStore(state => state.profile.age);
```

---

##  Security Best Practices

### Auth Tokens
-  Stored in **SecureStore** (Keychain/KeyStore)
-  Hardware-backed encryption
-  Never logged or exposed

### Sensitive Data
-  MMKV encryption enabled
-  Separate storage instances
-  Custom encryption keys

### Token Management

```typescript
import { secureTokenStore } from '@/src/utils/secureTokenStore';

// On login
await secureTokenStore.saveTokens(accessToken, refreshToken);

// On logout
await secureTokenStore.deleteAllTokens();
await resetAllUIFlags();
useUserStore.getState().resetProfile();
```

---

##  Offline Support

### How It Works

1. **App starts** → Loads cached data from MMKV instantly
2. **Network available** → Refetches in background
3. **Network unavailable** → Shows cached data
4. **Network returns** → Auto-refetches stale queries

### Manual Refetch

```typescript
const { refetch } = usePantryItems();

// Pull to refresh
const onRefresh = async () => {
  await refetch();
};
```

---

##  Debugging

### React Query DevTools

Add to your app:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In development only
{__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
```

### MMKV Storage Inspector

```typescript
import { storage } from '@/src/utils/mmkvStorage';

// View all keys
console.log(storage.getAllKeys());

// View storage size
console.log(storage.getSize());

// Clear cache
storage.clearAll();
```

---

##  Migration Guide

### From Direct API Calls to React Query

**Before**:
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/meals')
    .then(res => res.json())
    .then(setData)
    .finally(() => setLoading(false));
}, []);
```

**After**:
```typescript
const { data, isLoading } = useMeals();
```

---

##  Additional Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [MMKV Docs](https://github.com/mrousavy/react-native-mmkv)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

---

##  Contributing

When adding new features:

1. Add query keys to `src/config/queryClient.ts`
2. Create hooks in `hooks/api/`
3. Use existing patterns (see examples above)
4. Add invalidation helpers
5. Document in this file
