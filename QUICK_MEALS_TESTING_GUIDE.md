# Quick Meals Testing Guide

## Testing the "Untitled Meal" Fix

### What Was Fixed
- **Issue**: Meals displayed as "Untitled Meal" with no ingredients
- **Root Cause**: AI returns `RecipeCard` format but parser expected simple format
- **Solution**: Parser now handles both `RecipeCard` and simple formats

---

## Pre-Test Checklist

✅ Expo server is running (port 8081)  
✅ Code changes applied to `app/(home)/quickMeals.tsx`  
✅ No TypeScript errors  
✅ Documentation created  

---

## Test Cases

### Test 1: Normal Meal Generation ⭐ PRIMARY TEST

**Steps**:
1. Open the Freshly app
2. Navigate to Quick Meals (from home screen or menu)
3. Go through the wizard:
   - Phase 0: Select ingredient source (Pantry/Shopping)
   - Phase 1: Select meal type (Breakfast/Lunch/Dinner)
   - Phase 2: Select difficulty (Easy/Medium/Hard)
   - Phase 3: Select cooking methods (Stovetop/Oven/etc)
   - Phase 4: Add any include/avoid ingredients (optional)
   - Phase 5: Set servings
4. Tap "Generate Meal"

**Expected Results**:
- ✅ Loading overlay appears with animated spinner
- ✅ Progress bar animates smoothly
- ✅ Console shows: `[QuickMeals] Full AI Response: {...}`
- ✅ Console shows: `[QuickMeals] Processed name: <Real Meal Name>`
- ✅ Console shows: `[QuickMeals] Processed ingredients: [...]` (with actual items)
- ✅ Meal card displays with **real meal name** (not "Untitled Meal")
- ✅ Meal card shows **actual ingredients** (not empty)
- ✅ UI returns to normal after generation completes

**Failure Indicators**:
- ❌ Meal shows "Untitled Meal"
- ❌ Ingredients array is empty `[]`
- ❌ Console shows `undefined` or `null` for name/ingredients

---

### Test 2: RecipeCard Format Response

**Purpose**: Verify parser handles the nested RecipeCard structure

**Look for in console**:
```json
{
  "headerSummary": "Delicious Meal Name for 2 servings",
  "ingredients": [
    {
      "title": "Main Ingredients",
      "items": ["2 cups rice", "1 lb chicken", "1 onion"]
    },
    {
      "title": "Seasonings",
      "items": ["1 tsp salt", "1/2 tsp pepper"]
    }
  ],
  "instructions": [
    ["Step 1 sentence 1.", "Step 1 sentence 2."],
    ["Step 2 sentence 1."]
  ],
  "finalNote": "Enjoy your meal!"
}
```

**Expected**:
- ✅ Name extracted from `headerSummary`
- ✅ Ingredients flattened from all sections
- ✅ Instructions joined into single strings per step

---

### Test 3: Simple Format Response (Backward Compatibility)

**Purpose**: Verify parser still handles old simple format

**Look for in console**:
```json
{
  "name": "Simple Meal",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"]
}
```

**Expected**:
- ✅ Name extracted directly
- ✅ Ingredients used as-is
- ✅ Instructions used as-is

---

### Test 4: Mixed/Object Format Response

**Purpose**: Verify parser handles ingredients as objects

**Look for in console**:
```json
{
  "name": "Meal Name",
  "ingredients": [
    {"name": "2 cups rice"},
    {"ingredient": "1 lb chicken"}
  ]
}
```

**Expected**:
- ✅ Extracts `name` or `ingredient` property
- ✅ Falls back to empty string for invalid objects
- ✅ No crashes

---

### Test 5: Timeout Handling (If Generation Takes >45s)

**Steps**:
1. Generate meal with very complex preferences
2. If it takes longer than 45 seconds

**Expected**:
- ✅ Timeout error message appears
- ✅ "Request timed out. The AI is taking too long..." message
- ✅ 60-second cooldown starts
- ✅ Button disabled for 60s
- ✅ App doesn't crash
- ✅ UI remains responsive

---

### Test 6: Multiple Generations

**Steps**:
1. Generate a meal successfully
2. Go back to Quick Meals
3. Generate another meal with different preferences
4. Repeat 3-5 times

**Expected**:
- ✅ Each meal displays correctly
- ✅ No memory leaks
- ✅ No UI glitches
- ✅ Console logs show different AI responses
- ✅ Each meal saved to backend successfully

---

## Console Log Checklist

When testing, you should see these logs in order:

```
1. [QuickMeals] Full AI Response: { ... full JSON ... }
2. [QuickMeals] AI Response name: <value or undefined>
3. [QuickMeals] AI Response ingredients: <array or undefined>
4. [QuickMeals] Processed name: <extracted name>
5. [QuickMeals] Processed ingredients: ["item1", "item2", ...]
6. [QuickMeals] Processed instructions: ["step1", "step2", ...]
7. Meal saved successfully: <response>
```

---

## How to Debug Issues

### If meal shows "Untitled Meal":
1. Check console log #4: `[QuickMeals] Processed name:`
2. Check console log #1: Does AI response have `name` or `headerSummary`?
3. If neither exists, AI returned unexpected format

### If ingredients are empty:
1. Check console log #5: `[QuickMeals] Processed ingredients:`
2. Check console log #3: What structure is `ingredients`?
3. Check console log #1: Is it an array? Objects? Nested?

### If app crashes:
1. Check for JavaScript errors in console
2. Look for `TypeError` or `undefined` errors
3. Check if AI returned completely invalid JSON

---

## Success Criteria

✅ **All must pass**:
- [ ] Meal displays with real name (not "Untitled Meal")
- [ ] Ingredients array contains actual food items
- [ ] Instructions are properly formatted
- [ ] Console logs show complete AI response
- [ ] No crashes or errors
- [ ] Meal saves to backend successfully
- [ ] UI returns to normal state after generation

---

## Device/Platform Testing

Test on multiple platforms:
- [ ] iOS Simulator
- [ ] Android Simulator  
- [ ] iOS Physical Device
- [ ] Android Physical Device
- [ ] Web Browser (if applicable)

---

## Performance Metrics

Measure and document:
- **Generation Time**: How long until meal appears
- **API Response Time**: Time for AI to respond
- **Parse Time**: Time to extract fields
- **Save Time**: Time to save to backend
- **Total Time**: End-to-end user experience

**Target**: < 30 seconds total time under normal conditions

---

## Known Limitations

1. **AI Variability**: AI might return slightly different formats each time
   - Parser handles this with `.flatMap()` and type checks
   
2. **Timeout Edge Cases**: If AI takes 44.5s, might timeout right as response arrives
   - User can retry, cooldown is only 30s for timeouts
   
3. **Malformed JSON**: If AI returns invalid JSON, error message shown
   - User can retry, cooldown is 30s

---

## Regression Testing

Verify previous fixes still work:
- [ ] **Issue #4**: No more undefined `mealType` errors
- [ ] **Issue #5**: Timeout protection works
- [ ] **Issue #6**: This fix - name and ingredients display

---

## Quick Test Commands

Open Metro Bundler logs:
```bash
cd /Users/georgeabdallah/Documents/GitHub/FreshlyAppFrontend
npx expo start
# Then press 'i' for iOS or 'a' for Android
```

View real-time logs:
```bash
# iOS
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "Expo"' --level=debug

# Android
adb logcat *:S ReactNative:V ReactNativeJS:V
```

---

## Test Report Template

Copy and fill out after testing:

```
## Quick Meals Test Report

**Date**: 
**Tester**: 
**Platform**: iOS/Android/Web
**Device**: 

### Test Results

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| Normal Generation | ⬜ | |
| RecipeCard Format | ⬜ | |
| Simple Format | ⬜ | |
| Mixed Format | ⬜ | |
| Timeout Handling | ⬜ | |
| Multiple Generations | ⬜ | |

### Console Logs
<paste relevant console output>

### Screenshots
<attach screenshots of meal cards>

### Issues Found
<list any bugs or unexpected behavior>

### Recommendations
<any suggestions for improvement>
```

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark Issue #6 as **RESOLVED**
2. ✅ Update `QUICK_MEALS_SUMMARY.md` with test results
3. ✅ Commit changes with descriptive message
4. ✅ Deploy to production

If any tests fail:
1. ❌ Document specific failure in console logs
2. ❌ Identify which format AI returned
3. ❌ Update parser logic to handle that case
4. ❌ Re-test

---

**Ready to test!** 🧪

Start with **Test 1: Normal Meal Generation** - this is the most important test case.
