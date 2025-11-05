# 🔍 Meal Family ID Debugging

## Current Issue
Backend error: **"Meal must belong to a family to be shared"**

This means the `family_id` is NOT being saved with the meal when it's created in Quick Meals.

## Debug Logs Added

### 1. Quick Meals - Family Loading
```typescript
// app/(home)/quickMeals.tsx - Line ~433
console.log('[QuickMeals] Raw family data from API:', data);
console.log('[QuickMeals] Families loaded:', familyList);
```

**What to check:**
- Does the API return family data with an `id` field?
- Is the `id` a valid number?

### 2. Quick Meals - Auto-Attach Logic
```typescript
// app/(home)/quickMeals.tsx - Line ~726
console.log('[QuickMeals] Families available:', families);
console.log('[QuickMeals] ✅ Auto-attaching meal to family ID:', familyId);
```

**What to check:**
- Is `families` array empty when creating a meal?
- Is `familyId` actually being set to a number?

### 3. Meals API - Input
```typescript
// src/user/meals.ts - Line ~91
console.log('[meals.ts] toApiMeal input family_id:', meal.family_id);
```

**What to check:**
- Does the meal object have a `family_id` property?
- Is it `undefined` or a valid number?

### 4. Meals API - Output
```typescript
// src/user/meals.ts - Line ~126
console.log('[meals.ts] toApiMeal output family_id:', apiMeal.family_id);
```

**What to check:**
- Is `family_id` included in the final API payload?
- If not, the spread operator `...(meal.family_id && { family_id: meal.family_id })` is filtering it out

## Expected Console Output

When creating a meal in Quick Meals, you should see:

```
[QuickMeals] Raw family data from API: [{ id: 7, display_name: "My Family", ... }]
[QuickMeals] Families loaded: [{ id: 7, name: "My Family" }]
[QuickMeals] Families available: [{ id: 7, name: "My Family" }]
[QuickMeals] ✅ Auto-attaching meal to family ID: 7
[meals.ts] toApiMeal input family_id: 7
[meals.ts] toApiMeal output family_id: 7
[QuickMeals] Meal saved successfully: { ... }
```

## Potential Issues

### Issue 1: Families Not Loading
**Symptom:**
```
[QuickMeals] Families loaded: []
[QuickMeals] ⚠️ User has no families - meal will be personal
```

**Solution:** User needs to create or join a family first.

### Issue 2: Family ID is Undefined
**Symptom:**
```
[QuickMeals] Families available: []
[QuickMeals] Families available: undefined
```

**Solution:** The `families` state is not being set properly. Check the useEffect dependency array.

### Issue 3: Family ID Not Passed to API
**Symptom:**
```
[meals.ts] toApiMeal input family_id: 7
[meals.ts] toApiMeal output family_id: undefined
```

**Solution:** The spread operator is filtering it out. Change line 113 in meals.ts from:
```typescript
...(meal.family_id && { family_id: meal.family_id }),
```
to:
```typescript
...(meal.family_id !== undefined && { family_id: meal.family_id }),
```

### Issue 4: Timing Issue
**Symptom:**
```
[QuickMeals] Families loaded: [{ id: 7, name: "My Family" }]  // AFTER meal is saved
[QuickMeals] Families available: []  // BEFORE families load
```

**Solution:** Families are loading after the meal is created. This could happen if the useEffect runs after the component renders but before the user saves a meal. Consider showing a loading state or waiting for families to load.

## Testing Steps

1. **Open Quick Meals screen** → Check console for family loading logs
2. **Generate a meal** → Check console for family availability
3. **Save the meal** → Check console for family_id in API payload
4. **Try to share the meal** → Should work if family_id is set correctly

## Next Steps

1. ✅ Check console logs when app loads Quick Meals
2. ✅ Check console logs when saving a meal
3. ⚠️ If family_id is not being set, investigate why
4. ⚠️ If family_id is being set but still fails, the backend may have additional validation

## Status
🔍 **DEBUG MODE ACTIVE** - Console logs added, waiting for test results
