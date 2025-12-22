# Tutorial Bug Fix - December 11, 2025

## Problem
The tutorial was stopping/breaking after the second step and not progressing beyond that point.

## Root Cause
The issue was in `/app/(main)/(home)/main.tsx` where refs were being assigned to menu items based on their titles:

```tsx
// OLD CODE (BROKEN)
let itemRef;
if (item.title === 'Pantry') itemRef = pantryRef;
else if (item.title === 'Meal Plans') itemRef = mealPlansRef;
else if (item.title === 'Grocery') itemRef = groceryRef;  //  WRONG!
else if (item.title === 'Quick Meals') itemRef = quickMealsRef;
```

The problem: The menu item was actually titled **"Grocery Lists"**, not "Grocery", so the `groceryRef` was never assigned to any element!

### Tutorial Flow
1. Step 1 (Pantry)  - Works
2. Step 2 (Meal Plans)  - Works  
3. **Step 3 (Grocery)  - BREAKS HERE** - No target measurement available
4. Steps 4-10 - Never reached

When the tutorial tried to advance to step 3, it looked for the `grocery` target measurement, but since the ref was never assigned, the measurement was `undefined`. The `HomeTutorial` component then returned `null` (lines 304-306), causing the tutorial to disappear completely.

## Solution

### 1. Fixed Ref Assignment
Changed the condition to match the actual menu item title:

```tsx
// NEW CODE (FIXED)
let itemRef;
if (item.title === 'Pantry') itemRef = pantryRef;
else if (item.title === 'Meal Plans') itemRef = mealPlansRef;
else if (item.title === 'Grocery Lists') itemRef = groceryRef;  //  CORRECT!
else if (item.title === 'Quick Meals') itemRef = quickMealsRef;
```

### 2. Added Debug Logging
Added console warnings to help catch similar issues in the future:

**In HomeTutorial.tsx:**
```tsx
if (!isCongratulationsStep && !targetMeasurement) {
  console.warn(`[HomeTutorial] Missing target measurement for step ${currentStepIndex + 1}: ${currentStep.targetKey}`);
  console.warn('[HomeTutorial] Available measurements:', Object.keys(targetMeasurements));
  return null;
}
```

**In main.tsx (measureAllTargets function):**
```tsx
const measureElement = (ref: React.RefObject<View | null>, key: string) => {
  if (ref.current) {
    ref.current.measureInWindow((x, y, width, height) => {
      console.log(`[Tutorial] Measured ${key}:`, { x, y, width, height });
      setTargetMeasurements(prev => ({ ...prev, [key]: { x, y, width, height } }));
    });
  } else {
    console.warn(`[Tutorial] Failed to measure ${key}: ref.current is null`);
  }
};
```

## Files Modified
1. `/app/(main)/(home)/main.tsx` - Fixed ref assignment and added measurement logging
2. `/components/tutorial/HomeTutorial.tsx` - Added warning logs for missing measurements

## Testing
To verify the fix:
1. Clear tutorial completion status: Delete the `tutorialCompleted` key from storage
2. Log in or sign up
3. Tutorial should now progress through all 10 steps without breaking
4. Check console logs to verify all targets are being measured

## Prevention
The debug logs will now alert developers if:
- A ref fails to attach (ref.current is null)
- A tutorial step tries to target an unmeasured element
- Shows which measurements are available vs. which are missing

This will make it much easier to catch and fix similar issues in the future.
