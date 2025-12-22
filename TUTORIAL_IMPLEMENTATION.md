# Home Screen Tutorial - Implementation Guide

## Overview

The Home Screen Tutorial is a first-time onboarding experience that guides new users through the main features of the Freshly app. It uses a spotlight effect to highlight each feature with smooth animations.

## Files Created/Modified

### 1. **Created: `components/tutorial/HomeTutorial.tsx`**
This is the main tutorial component with all the logic and UI.

**Key Features:**
-  Spotlight overlay with smooth animations
-  Step-by-step walkthrough (5 steps total)
-  Progress indicators
-  "Skip Tutorial" button
-  Persistent storage using `Storage` utility
-  Responsive positioning (card appears above/below spotlight based on available space)
-  Clean separation of concerns

**Key Functions:**
- `checkTutorialCompleted()` - Checks if user has seen the tutorial
- `markTutorialCompleted()` - Marks tutorial as complete in storage
- `TUTORIAL_STEPS` - Array of all tutorial steps with titles and descriptions

### 2. **Modified: `app/(main)/(home)/main.tsx`**
Integrated the tutorial into the main home screen.

**Changes Made:**
- Added `HomeTutorial` component import
- Created refs for each feature box (pantry, mealPlans, grocery, quickMeals, allFeatures)
- Added `measureAllTargets()` function to capture element positions
- Tutorial automatically shows on first app launch
- Tutorial overlay is rendered at the bottom of the component tree

## How It Works

### Step Flow

1. **Pantry** - "This is where your pantry lives..."
2. **Meal Plans** - "Your saved meal plans live here..."
3. **Grocery** - "Upload or organize all your grocery items..."
4. **Quick Meals** - "Short on time? Tap here..."
5. **All Features** - "Tap here to explore every feature..."

### Technical Implementation

#### 1. **Position Measurement**
Each feature box has a ref attached:
```typescript
const pantryRef = useRef<View>(null);
// ... other refs

// Measure positions using measureInWindow
ref.current?.measureInWindow((x, y, width, height) => {
  setTargetMeasurements({ x, y, width, height });
});
```

#### 2. **Storage Integration**
Uses the existing `Storage` utility ([storage.ts](src/utils/storage.ts)) which writes to both:
- SecureStore (primary)
- AsyncStorage (fallback/mirror)

Storage key: `"tutorialCompleted"`

#### 3. **Animation System**
Four animated values control the experience:
- `overlayOpacity` - Dark background fade in/out
- `spotlightAnim` - Spotlight growth and positioning
- `cardSlideAnim` - Card slide up animation
- `cardFadeAnim` - Card fade in/out

All animations use React Native's `Animated` API with spring and timing functions.

#### 4. **Spotlight Positioning**
The spotlight automatically positions around the target element:
```typescript
const spotlightX = targetMeasurement.x;
const spotlightY = targetMeasurement.y;
const spotlightWidth = targetMeasurement.width;
const spotlightHeight = targetMeasurement.height;
```

#### 5. **Smart Card Positioning**
The description card appears below the spotlight by default, but automatically moves above if there's not enough space:
```typescript
const spaceBelow = SCREEN_HEIGHT - (spotlightY + spotlightHeight);
const cardTop = spaceBelow > 250
  ? spotlightY + spotlightHeight + 20  // Below
  : spotlightY - 220;                   // Above
```

## Usage

### Basic Usage
The tutorial automatically shows on first launch. No manual trigger needed.

### For Testing - Reset Tutorial
To test the tutorial again during development, you can manually clear the storage:

```typescript
import { Storage } from '@/utils/storage';

// Clear tutorial flag
await Storage.removeItem('tutorialCompleted');
```

Or add a debug button in your app:
```typescript
import { checkTutorialCompleted, markTutorialCompleted } from '@/components/tutorial/HomeTutorial';

// Check status
const hasCompleted = await checkTutorialCompleted();

// Reset for testing
await Storage.removeItem('tutorialCompleted');
```

### Modifying Tutorial Steps

Edit the `TUTORIAL_STEPS` array in `HomeTutorial.tsx`:

```typescript
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-1',
    title: 'Your Title',
    description: 'Your description text here.',
    targetKey: 'pantry',  // Must match a ref key in main.tsx
  },
  // ... more steps
];
```

### Adding New Target Elements

1. Create a ref in `main.tsx`:
```typescript
const myNewFeatureRef = useRef<View>(null);
```

2. Add to measurement function:
```typescript
measureElement(myNewFeatureRef, 'myNewFeature');
```

3. Attach ref to your component:
```typescript
<View ref={myNewFeatureRef}>
  {/* Your feature */}
</View>
```

4. Add step to `TUTORIAL_STEPS` with matching `targetKey`:
```typescript
{
  id: 'step-6',
  title: 'New Feature',
  description: 'Description here.',
  targetKey: 'myNewFeature',  // Matches the key from measureElement
}
```

## Design & Styling

### Colors
- Overlay: `rgba(0, 0, 0, 0.85)` - Dark semi-transparent
- Spotlight border: `#00C853` - Freshly green
- Active progress dot: `#00C853` - Freshly green
- Button: `#00C853` - Freshly green

### Responsive Design
- Card width: Auto (20px margins on each side)
- Card position: Dynamic (above/below spotlight)
- Works on all iPhone sizes including iPhone 12 mini
- Safe area insets handled by parent component

### Animations
- Overlay fade: 400ms
- Spotlight growth: 500ms spring animation
- Card slide: Spring with friction 8, tension 40
- Card fade: 300ms
- Step transitions: 200ms out, spring in

## Component Architecture

```
HomeDashboard (main.tsx)
├── ScrollView
│   ├── Header
│   ├── Welcome Text
│   ├── Menu Grid
│   │   ├── Pantry (ref: pantryRef)
│   │   ├── Meal Plans (ref: mealPlansRef)
│   │   ├── Grocery (ref: groceryRef)
│   │   └── Quick Meals (ref: quickMealsRef)
│   └── All Features Section (ref: allFeaturesRef)
├── BottomNavigation
└── HomeTutorial (overlay)
    ├── Dark Overlay
    ├── Spotlight Highlight
    ├── Step Card
    │   ├── Progress Indicators
    │   ├── Title & Description
    │   └── Next Button
    └── Skip Button
```

## Performance Considerations

- Tutorial only loads when needed (first-time users)
- Measurements happen once on mount with 500ms delay for layout settling
- Animations use `useNativeDriver: true` for optimal performance
- No unnecessary re-renders (state is minimal)

## Accessibility

- High contrast spotlight (green on dark background)
- Large touch targets (buttons 44pt+)
- Clear, readable text (16px+ font sizes)
- Simple, linear flow

## Future Enhancements

Potential improvements:
- [ ] Add haptic feedback on step changes
- [ ] Add sound effects (optional)
- [ ] Support for landscape orientation
- [ ] Swipe gestures to navigate steps
- [ ] Animated confetti on completion
- [ ] Tutorial progress analytics

## Troubleshooting

### Tutorial not showing
1. Check if tutorial has already been completed:
   ```typescript
   const completed = await checkTutorialCompleted();
   console.log('Tutorial completed:', completed);
   ```
2. Clear storage and restart app
3. Check that refs are properly attached to elements

### Spotlight positioning wrong
1. Ensure refs are attached to the correct elements
2. Check that `measureAllTargets()` is called after layout
3. Increase the delay in `setTimeout` if layout is slow

### Animations not smooth
1. Ensure all animations use `useNativeDriver: true`
2. Check for unnecessary re-renders
3. Reduce animation complexity if needed

## Testing Checklist

- [ ] Tutorial shows on first launch
- [ ] All 5 steps display correctly
- [ ] Spotlight positions correctly on each element
- [ ] Card appears in the right position (above/below)
- [ ] Progress indicators update correctly
- [ ] "Skip Tutorial" button works
- [ ] "Next" button advances through steps
- [ ] Final step shows "Got it!" button
- [ ] Tutorial completes and doesn't show again
- [ ] Works on iPhone 12 mini
- [ ] Works on larger iPhones
- [ ] Animations are smooth
- [ ] No TypeScript errors

---

**Implementation Date:** 2025-11-27
**Framework:** React Native + Expo
**Storage:** expo-secure-store + AsyncStorage
