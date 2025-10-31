# 📋 Migration Checklist - Freshly App API Refactoring

## ✅ Completed

### Infrastructure
- [x] Installed `@tanstack/react-query` and `axios`
- [x] Created centralized API client (`api/client/apiClient.ts`)
- [x] Created React Query configuration (`api/config/queryClient.ts`)
- [x] Added QueryClientProvider to app layout
- [x] Created query key factory for consistency

### Services Created
- [x] Meals service (`api/services/meals.service.ts`)
- [x] Pantry service (`api/services/pantry.service.ts`)
- [x] Chat service (`api/services/chat.service.ts`)
- [x] User service (`api/services/user.service.ts`)

### Hooks Created
- [x] `hooks/useMeals.ts` - All meal operations
- [x] `hooks/usePantry.ts` - All pantry operations
- [x] `hooks/useChat.ts` - All chat operations
- [x] `hooks/useUser.ts` - All user operations

### Documentation
- [x] Created comprehensive API refactoring guide
- [x] Created migration checklist
- [x] Added code examples for common patterns

---

## 🔄 Screens to Migrate

### Priority 1: Core Features (High Impact)

#### 1. Meals Screen (`app/(home)/meals.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 30 minutes
**Changes Needed**:
- [ ] Replace `getAllmealsforSignelUser()` with `useMeals()`
- [ ] Replace `createMealForSignleUser()` with `useCreateMeal()`
- [ ] Remove manual state management
- [ ] Remove manual refetching logic
- [ ] Add optimistic updates
- [ ] Add prefetching on meal card hover

**Before**:
```typescript
const [meals, setMeals] = useState([]);
useEffect(() => {
  const fetchMeals = async () => {
    const res = await getAllmealsforSignelUser();
    const data = await res.json();
    setMeals(data);
  };
  fetchMeals();
}, []);
```

**After**:
```typescript
const { data: meals = [], isLoading, error } = useMeals();
```

---

#### 2. Pantry Screen (`app/(home)/pantry.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 25 minutes
**Changes Needed**:
- [ ] Replace `listMyPantryItems()` with `usePantryItems()`
- [ ] Replace create/update/delete with mutations
- [ ] Add optimistic updates
- [ ] Add pull-to-refresh
- [ ] Add category filtering
- [ ] Add expiring soon section

---

#### 3. Chat Screen (`app/(home)/chat.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 35 minutes
**Changes Needed**:
- [ ] Replace `sendMessage()` with `useSendMessage()`
- [ ] Replace `getConversations()` with `useConversations()`
- [ ] Add optimistic message display
- [ ] Add real-time message updates
- [ ] Add conversation list caching

---

#### 4. Profile Screen (`app/(home)/profile.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 20 minutes
**Changes Needed**:
- [ ] Replace `getCurrentUser()` with `useUser()`
- [ ] Replace `updateUserInfo()` with `useUpdateUser()`
- [ ] Add optimistic profile updates
- [ ] Cache user preferences

---

### Priority 2: Secondary Features

#### 5. Quick Meals Screen (`app/(home)/quickMeals.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 30 minutes
**Changes Needed**:
- [ ] Use `useGenerateMealSuggestions()` for AI suggestions
- [ ] Cache preferences locally
- [ ] Add loading skeletons
- [ ] Prefetch meal details

---

#### 6. Meal Detail Component (`components/meal/mealDetailScreen.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 25 minutes
**Changes Needed**:
- [ ] Use `useMeal(id)` to fetch single meal
- [ ] Use `useToggleMealFavorite()` for favorites
- [ ] Use `useUpdateMeal()` for editing
- [ ] Use `useDeleteMeal()` for deletion
- [ ] Add optimistic favorite toggle

---

#### 7. Meal List Component (`components/meal/mealListScreen.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 20 minutes
**Changes Needed**:
- [ ] Accept pre-fetched meals as prop
- [ ] Add pull-to-refresh support
- [ ] Add prefetch on card press/hover
- [ ] Add loading skeletons

---

#### 8. Grocery List Screen (`app/(home)/allGrocery.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 25 minutes
**Changes Needed**:
- [ ] Create grocery service and hooks (if not exists)
- [ ] Replace direct API calls with hooks
- [ ] Add optimistic add/remove
- [ ] Cache grocery lists

---

#### 9. Family Screen (`app/(home)/MyFamily.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 30 minutes
**Changes Needed**:
- [ ] Create family service and hooks (if not exists)
- [ ] Replace family API calls with hooks
- [ ] Add optimistic member add/remove
- [ ] Cache family data

---

### Priority 3: Authentication & Onboarding

#### 10. Login Screen (`app/(auth)/Login.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 15 minutes
**Changes Needed**:
- [ ] Use mutation for login
- [ ] Store token properly
- [ ] Prefetch user data on successful login
- [ ] Handle token refresh

---

#### 11. Signup Screen (`app/(auth)/signup.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 15 minutes
**Changes Needed**:
- [ ] Use mutation for signup
- [ ] Store token properly
- [ ] Navigate to onboarding

---

#### 12. Preferences Screen (`app/(user)/prefrences.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 25 minutes
**Changes Needed**:
- [ ] Use `useUserPreferences()` to fetch
- [ ] Use `useUpdateUserPreferences()` to save
- [ ] Add optimistic updates
- [ ] Cache preferences

---

### Priority 4: Context Refactoring

#### 13. User Context (`context/usercontext.tsx`)
**Status**: 🔴 Not Started
**Estimated Time**: 40 minutes
**Changes Needed**:
- [ ] Remove redundant user state (use React Query cache instead)
- [ ] Keep only auth state in context
- [ ] Remove manual API calls
- [ ] Use hooks from `useUser.ts`
- [ ] Keep pantry items in React Query cache

**Important**: User context should be minimal now that React Query handles data:
```typescript
// Context should only handle:
// 1. Auth state (logged in/out)
// 2. Session management
// NOT data fetching - that's React Query's job
```

---

## 🆕 New Services Needed

### 1. Grocery Service
**Status**: 🔴 Not Created
**Files to Create**:
- [ ] `api/services/grocery.service.ts`
- [ ] `hooks/useGrocery.ts`

**Endpoints**:
- GET `/grocery/lists` - Get all grocery lists
- POST `/grocery/lists` - Create grocery list
- GET `/grocery/lists/:id` - Get specific list
- PUT `/grocery/lists/:id` - Update list
- DELETE `/grocery/lists/:id` - Delete list
- POST `/grocery/lists/:id/items` - Add items

---

### 2. Family Service
**Status**: 🔴 Not Created
**Files to Create**:
- [ ] `api/services/family.service.ts`
- [ ] `hooks/useFamily.ts`

**Endpoints**:
- GET `/family/current` - Get current family
- POST `/family` - Create family
- GET `/family/members` - Get family members
- POST `/family/invite` - Invite member
- DELETE `/family/members/:id` - Remove member

---

### 3. Barcode Scanner Service
**Status**: 🔴 Not Created
**Files to Create**:
- [ ] `api/services/barcode.service.ts`
- [ ] `hooks/useBarcode.ts`

**Endpoints**:
- GET `/barcode/:code` - Get product info by barcode
- POST `/pantry/scan` - Add scanned item to pantry

---

## 📈 Performance Improvements to Add

### Infinite Scroll
- [ ] Add `useInfiniteQuery` for meal lists
- [ ] Add pagination support
- [ ] Implement virtual scrolling for long lists

### Offline Support
- [ ] Add React Query persistence
- [ ] Use AsyncStorage for offline cache
- [ ] Queue mutations for offline mode

### Request Cancellation
- [ ] Add abort controllers for searches
- [ ] Cancel queries on unmount
- [ ] Debounce search inputs

### Prefetching Strategy
- [ ] Prefetch meal details on list scroll
- [ ] Prefetch next page of results
- [ ] Prefetch user's likely next action

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Test API client interceptors
- [ ] Test service functions
- [ ] Test hooks with mock data

### Integration Tests
- [ ] Test query invalidation flow
- [ ] Test optimistic updates + rollback
- [ ] Test token refresh logic

### Performance Tests
- [ ] Test with 1000+ meals
- [ ] Test concurrent requests
- [ ] Test cache memory usage

---

## 📊 Success Metrics

### Before Refactoring
- Manual state management in every component
- Redundant API calls on navigation
- No caching
- No optimistic updates
- Average load time: ~2-3 seconds

### After Refactoring (Goals)
- [ ] 90% reduction in manual state management code
- [ ] 70% reduction in API calls (via caching)
- [ ] Instant UI feedback (optimistic updates)
- [ ] Average load time: <500ms (cached)
- [ ] Support 5000+ concurrent users

---

## 🚀 Next Steps

### Week 1
1. Migrate core screens (meals, pantry, chat)
2. Test on production backend
3. Monitor performance improvements

### Week 2
1. Migrate secondary screens
2. Refactor user context
3. Add infinite scroll

### Week 3
1. Create missing services (grocery, family)
2. Add offline support
3. Performance optimization

### Week 4
1. Testing and bug fixes
2. Documentation updates
3. Production deployment

---

## 📝 Notes

### Common Pitfalls to Avoid
1. ❌ Don't mix old and new patterns (complete migration per screen)
2. ❌ Don't forget to invalidate related queries after mutations
3. ❌ Don't use `useEffect` for data fetching anymore
4. ❌ Don't store server state in `useState`
5. ❌ Don't forget error boundaries for query errors

### Pro Tips
1. ✅ Use query keys consistently via `queryKeys` factory
2. ✅ Set appropriate `staleTime` based on data volatility
3. ✅ Use optimistic updates for better UX
4. ✅ Prefetch for likely user actions
5. ✅ Keep contexts minimal (auth only, not data)

---

**Last Updated**: ${new Date().toISOString()}
**Estimated Total Time**: 8-10 hours
**Expected Performance Gain**: 300-500% improvement in perceived speed
