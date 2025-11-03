# Meal Preview Persistence Bug Fix

## Issue

When users navigated backwards through the Quick Meals wizard using the back button (either in the header or footer), the generated meal preview component would persist and remain visible on previous phases where it shouldn't appear.

## Root Cause

The `showMealComponent` state was only being set to `false` when:
1. Starting a new generation (`finish()` function)
2. Generation errors occurred

It was **not** being reset when the user navigated backwards or forwards through the wizard phases.

## Solution

Updated the navigation functions to hide the meal component when moving between phases:

### Changes Made

#### 1. Updated `back()` function
```typescript
const back = useCallback(() => {
  Haptics.selectionAsync();
  if (phase === 0) {
    router.back();
  } else {
    setPhase((p) => Math.max(p - 1, 0));
    // Hide meal component when navigating back through phases
    if (showMealComponent) {
      setshowMealComponent(false);
    }
  }
}, [phase, router, showMealComponent]);
```

#### 2. Updated `next()` function
```typescript
const next = useCallback(() => {
  Haptics.selectionAsync();
  setPhase((p) => Math.min(p + 1, TOTAL_PHASES - 1));
  // Hide meal component when navigating forward (in case user is going through phases again)
  if (showMealComponent) {
    setshowMealComponent(false);
  }
}, [showMealComponent]);
```

## Behavior After Fix

### Scenario 1: User Goes Back
```
1. User generates meal on Phase 5 → Meal card appears
2. User taps "Back" button → Phase 4, meal card disappears ✅
3. User taps "Back" again → Phase 3, meal card still hidden ✅
4. User navigates forward → Meal card stays hidden ✅
5. User generates new meal → New meal card appears ✅
```

### Scenario 2: User Regenerates
```
1. User generates meal on Phase 5 → Meal card A appears
2. User taps "Generate Meal" again → Meal card A disappears during generation
3. New meal generated → Meal card B appears ✅
```

### Scenario 3: User Navigates Forward After Going Back
```
1. User generates meal on Phase 5 → Meal card appears
2. User goes back to Phase 3 → Meal card disappears ✅
3. User goes forward to Phase 4 → Meal card stays hidden ✅
4. User returns to Phase 5 → Meal card still hidden ✅
5. User clicks "Generate Meal" → New meal card appears ✅
```

## Files Modified

- **`app/(home)/quickMeals.tsx`**:
  - Updated `back()` callback to hide meal component
  - Updated `next()` callback to hide meal component
  - Added `showMealComponent` to dependency arrays

## Testing Checklist

### ✅ Back Button (Footer)
- [x] Meal disappears when going back from Phase 5 to Phase 4
- [x] Meal stays hidden when continuing to go back
- [x] Meal stays hidden when going forward again

### ✅ Back Button (Header)
- [x] Same behavior as footer back button
- [x] Properly exits to previous screen from Phase 0

### ✅ Next Button
- [x] Meal disappears if user goes forward after generating
- [x] Prevents old meal from appearing on new phases

### ✅ Generate Button
- [x] Old meal disappears during generation
- [x] New meal appears after generation completes

### ✅ Multiple Generations
- [x] Can generate multiple meals
- [x] Each generation properly replaces previous meal
- [x] Navigation between phases works correctly

## Edge Cases Handled

1. **Rapid Back/Forward Navigation**: Meal stays hidden appropriately
2. **Multiple Generations**: Each generation resets the component properly
3. **Error During Generation**: Component hidden, stays hidden on navigation
4. **Navigation During Generation**: Component hidden, navigation blocked by disabled buttons

## Benefits

- ✅ Clean user experience with no ghost meal cards
- ✅ Predictable behavior when navigating
- ✅ No confusion about which meal is current
- ✅ Proper state management across wizard phases

## Related Issues

This fix complements:
- Save Meal Animation (SAVE_MEAL_ANIMATION.md)
- Quick Meals Generation (QUICK_MEALS_FINAL_STATUS.md)
- Untitled Meal Fix (UNTITLED_MEAL_FIX.md)

## Status

✅ **FIXED** - Meal preview component now properly hides when navigating backwards or forwards through wizard phases.

---

**Fixed**: November 3, 2025  
**File**: `app/(home)/quickMeals.tsx`  
**Lines Modified**: 387-404 (navigation callbacks)
