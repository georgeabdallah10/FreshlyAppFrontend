# Fix: "Untitled Meal" with No Ingredients

## Problem

After AI meal generation, meals would display as "Untitled Meal" with empty ingredients arrays, even though the AI was successfully returning data.

## Root Cause

There was a **mismatch between the AI prompt structure and the parsing logic**:

1. **System Prompt** asked for simple fields:
   ```
   name, icon, calories, prepTime, cookTime, totalTime, mealType, 
   cuisine, difficulty, servings, goalFit, ingredients, instructions, 
   cookingTools, notes
   ```

2. **JSON_DIRECTIVE** asked for a completely different `RecipeCard` structure:
   ```typescript
   type IngredientSection = { title: string; items: string[] };
   
   type RecipeCard = {
     headerSummary: string;
     ingredients: IngredientSection[];      // Array of sections!
     instructions: string[][];              // Nested arrays!
     optionalAdditions: string[];
     finalNote: string;
     pantryCheck: { usedFromPantry: string[] };
     shoppingListMinimal: string[];
   };
   ```

3. **Parsing Code** expected the simple format:
   - `parsed.name` (string)
   - `parsed.ingredients` (array of strings)
   - `parsed.instructions` (array of strings)

The AI was correctly responding with the `RecipeCard` format (as instructed by `JSON_DIRECTIVE`), but the parsing code couldn't extract the data because:
- `name` didn't exist (only `headerSummary`)
- `ingredients` was an array of `{title, items}` objects, not strings
- `instructions` was a nested array `string[][]`, not `string[]`

## Solution

Updated the parsing logic in `quickMeals.tsx` to handle **both formats**:

### 1. Extract Name
```typescript
// Extract from headerSummary if name doesn't exist
const name = String(parsed?.name || parsed?.headerSummary || 'Untitled Meal');
```

### 2. Parse Ingredients (handles all formats)
```typescript
let ingredients: string[] = [];
if (Array.isArray(parsed?.ingredients)) {
  ingredients = parsed.ingredients.flatMap((section: any) => {
    if (typeof section === 'object' && section !== null && Array.isArray(section.items)) {
      // RecipeCard format: { title: string, items: string[] }
      return section.items.map((item: any) => String(item).trim()).filter(Boolean);
    } else if (typeof section === 'object' && section !== null) {
      // Old format: { name: string }
      return String(section.name || section.ingredient || '').trim();
    } else {
      // Simple string format
      return String(section).trim();
    }
  }).filter(Boolean);
}
```

### 3. Parse Instructions (handles nested arrays)
```typescript
let instructions: string[] = [];
if (Array.isArray(parsed?.instructions)) {
  instructions = parsed.instructions.flatMap((step: any) => {
    if (Array.isArray(step)) {
      // RecipeCard format: each step is an array of sentences
      return step.map((s: any) => String(s).trim()).filter(Boolean).join(' ');
    }
    // Simple string format
    return String(step).trim();
  }).filter(Boolean);
}
```

### 4. Added Comprehensive Logging
```typescript
console.log('[QuickMeals] Full AI Response:', JSON.stringify(parsed, null, 2));
console.log('[QuickMeals] Processed name:', name);
console.log('[QuickMeals] Processed ingredients:', ingredients);
console.log('[QuickMeals] Processed instructions:', instructions);
```

### 5. Updated handleSaveMeal Call
```typescript
await handleSaveMeal({
  name,
  selectedEmoji: iconName,
  // ... other fields ...
  difficulty: parsed?.difficulty ?? form.difficulty ?? 'easy',
  servings: parsed?.servings ?? form.servings ?? 1,
  ingredients: ingredients,        // Processed array
  instructions: instructions,      // Processed array
  notes: parsed?.finalNote ?? parsed?.notes ?? '',
  carbs: parsed?.carbs ?? parsed?.macros?.carbs ?? 0,
});
```

## Files Modified

- `/app/(home)/quickMeals.tsx`:
  - Updated ingredient parsing logic (lines ~475-495)
  - Updated instruction parsing logic (lines ~497-507)
  - Updated name extraction (lines ~473)
  - Added detailed logging (lines ~470-510)
  - Updated handleSaveMeal call (lines ~520-532)

## Benefits

1. **Handles RecipeCard format**: Correctly extracts data from nested structure
2. **Backward compatible**: Still works if AI returns simple format
3. **Robust**: Handles objects, strings, and arrays at any level
4. **Debuggable**: Comprehensive logging shows exactly what AI returned
5. **Graceful**: Always provides fallback values

## Testing

To verify the fix:
1. Generate a quick meal through the app
2. Check console logs for:
   - `[QuickMeals] Full AI Response:` - Shows entire JSON
   - `[QuickMeals] Processed name:` - Should show real meal name
   - `[QuickMeals] Processed ingredients:` - Should show array of ingredients
3. Meal card should display actual name and ingredients (not "Untitled Meal")

## Related Issues Fixed

This fix also addresses:
- Empty ingredients arrays
- Missing instructions
- Incorrect servings/difficulty fallbacks
- Missing notes (now uses `finalNote` from RecipeCard)
- Missing carbs (now checks both `carbs` and `macros.carbs`)

## Future Improvements

Consider unifying the prompt structure:
- Either update system_prompt to ask for RecipeCard format explicitly
- Or update JSON_DIRECTIVE to match the simple field structure
- Current solution works but having consistent prompts would be cleaner
