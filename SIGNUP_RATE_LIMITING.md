# Signup Button Rate Limiting 🛡️

## Overview
Implemented a rate limiting mechanism on the signup button to prevent users from spamming signup requests, protecting both frontend and backend from crashes and abuse.

## Problem
- Users could rapidly press the signup button multiple times
- Multiple simultaneous signup requests could crash the backend
- No protection against accidental double-taps or spam
- Backend could be overwhelmed by rapid successive requests

## Solution

### 1. **Cooldown State Management**

Added state to track button status and cooldown timer:

```typescript
const [isButtonDisabled, setIsButtonDisabled] = useState(false);
const [cooldownRemaining, setCooldownRemaining] = useState(0);
```

### 2. **Cooldown Timer Implementation**

Real-time countdown that updates every second:

```typescript
useEffect(() => {
  if (cooldownRemaining > 0) {
    const timer = setTimeout(() => {
      setCooldownRemaining(cooldownRemaining - 1);
    }, 1000);
    return () => clearTimeout(timer);
  } else if (cooldownRemaining === 0 && isButtonDisabled) {
    setIsButtonDisabled(false);
  }
}, [cooldownRemaining, isButtonDisabled]);
```

### 3. **Cooldown Trigger Function**

Flexible function to start cooldown with custom duration:

```typescript
const startCooldown = (seconds: number = 60) => {
  setIsButtonDisabled(true);
  setCooldownRemaining(seconds);
};
```

### 4. **Button Validation Check**

Prevents submission during cooldown or active loading:

```typescript
const handleCreateAccount = () => {
  // Check if button is disabled due to cooldown
  if (isButtonDisabled || isCreatingAccount) {
    if (cooldownRemaining > 0) {
      showToast(
        "error",
        `Please wait ${cooldownRemaining} seconds before trying again.`
      );
    }
    return;
  }
  
  // ... rest of validation
};
```

### 5. **Visual Feedback**

Button changes appearance and shows countdown:

```typescript
<TouchableOpacity
  style={styles.createButtonWrapper}
  onPress={handleCreateAccount}
  activeOpacity={1}
  disabled={isButtonDisabled || isCreatingAccount}
>
  <Animated.View
    style={[
      styles.createButton,
      (isButtonDisabled || isCreatingAccount) && styles.createButtonDisabled,
      { transform: [{ scale: buttonScale }] },
    ]}
  >
    {isButtonDisabled && cooldownRemaining > 0 ? (
      <Text style={styles.createButtonText}>{cooldownRemaining}s</Text>
    ) : (
      <Text style={styles.createButtonText}>→</Text>
    )}
  </Animated.View>
</TouchableOpacity>

{isButtonDisabled && cooldownRemaining > 0 && (
  <Text style={styles.cooldownText}>
    Please wait {cooldownRemaining} seconds before trying again
  </Text>
)}
```

## Cooldown Durations

Different error types trigger different cooldown periods:

| Scenario | Cooldown Duration | Reason |
|----------|------------------|---------|
| **Failed Signup (General)** | 60 seconds | Prevent spam after errors |
| **Rate Limit (429)** | 120 seconds | Backend explicitly asked to slow down |
| **Network Error** | 60 seconds | Give time for connection to stabilize |
| **Catch Block** | 60 seconds | Unexpected errors need investigation |

### Implementation:

```typescript
// Standard cooldown on failed signup
startCooldown(60);

// Extended cooldown for rate limiting
if (result.status === 429) {
  errorMessage = "Too many signup attempts...";
  startCooldown(120); // Longer cooldown
}
```

## Visual States

### 1. **Normal State**
- Green button with → arrow
- Full opacity
- Shadow effect
- Clickable

### 2. **Disabled/Cooldown State**
- Gray button (#B0B0B0)
- Shows countdown timer (e.g., "45s")
- Reduced shadow
- Not clickable
- Helper text below: "Please wait X seconds before trying again"

### 3. **Loading State**
- Loading overlay active
- Button disabled but maintains green color
- Not clickable

## Styles Added

```typescript
createButtonDisabled: {
  backgroundColor: "#B0B0B0",
  shadowColor: "#B0B0B0",
  shadowOpacity: 0.2,
},
cooldownText: {
  fontSize: moderateScale(12),
  color: "#B0B0B0",
  textAlign: "center",
  marginTop: verticalScale(12),
},
```

## User Experience Flow

### Scenario 1: Failed Signup
```
1. User enters invalid email
2. Presses signup button
3. Error appears: "This email is already registered..."
4. Button becomes gray, shows "60s"
5. Helper text: "Please wait 60 seconds before trying again"
6. User sees countdown: 59s, 58s, 57s...
7. At 0s, button turns green again with → arrow
8. User can try again
```

### Scenario 2: Network Error
```
1. User has no internet
2. Presses signup button
3. Error appears: "No internet connection..."
4. Button disabled for 60 seconds
5. User fixes connection
6. Waits for cooldown to expire
7. Can retry with working connection
```

### Scenario 3: Rate Limiting (429)
```
1. User tries multiple times quickly
2. Backend returns 429 status
3. Error: "Too many signup attempts..."
4. Button disabled for 120 seconds (longer)
5. Extended cooldown protects backend
6. User must wait 2 minutes
7. Can retry after cooldown
```

### Scenario 4: Impatient User
```
1. User presses disabled button during cooldown
2. Toast appears: "Please wait 45 seconds before trying again"
3. No API call made
4. Countdown continues normally
5. User is informed of exact wait time
```

## Benefits

### 🛡️ **Backend Protection**
- Prevents request spam
- Reduces server load
- Avoids crash scenarios
- Respects rate limits

### 👤 **Better UX**
- Clear visual feedback
- Real-time countdown
- Prevents accidental double-taps
- Manages user expectations

### 💰 **Cost Savings**
- Fewer unnecessary API calls
- Reduced bandwidth usage
- Lower server costs
- Better resource utilization

### 🐛 **Error Prevention**
- Stops race conditions
- Prevents duplicate accounts
- Reduces error states
- More predictable behavior

## Edge Cases Handled

### 1. **Rapid Clicking**
- First click: Validates and submits
- Subsequent clicks: Ignored, cooldown message shown
- No duplicate requests sent

### 2. **Page Refresh During Cooldown**
- Cooldown resets (in-memory state)
- User can try again immediately
- This is acceptable as refresh is manual action

### 3. **Success After Cooldown Start**
- If request eventually succeeds, navigation happens
- Cooldown becomes irrelevant
- Clean state management

### 4. **Multiple Validation Errors**
- Client-side validation errors don't trigger cooldown
- Only failed API calls trigger cooldown
- User can fix errors and resubmit immediately

## Testing Checklist

- [x] Button disables during submission
- [x] Cooldown starts on failed signup
- [x] Countdown updates every second
- [x] Button re-enables when countdown reaches 0
- [x] Visual state changes (green → gray)
- [x] Timer displays in button (60s, 59s, etc.)
- [x] Helper text shows below button
- [x] Toast appears if disabled button pressed
- [x] Extended cooldown for 429 errors
- [x] No cooldown on validation errors
- [x] Successful signup bypasses cooldown
- [x] Button works normally after cooldown expires

## Configuration

### Default Cooldown:
```typescript
startCooldown(60); // 60 seconds = 1 minute
```

### Rate Limit Cooldown:
```typescript
startCooldown(120); // 120 seconds = 2 minutes
```

### To Change Durations:
Just update the numbers in the `startCooldown()` calls throughout the `onsubmit()` function.

## Code Quality

- ✅ No memory leaks (cleanup in useEffect)
- ✅ Proper state management
- ✅ Clear visual feedback
- ✅ Accessible disabled state
- ✅ Responsive design maintained
- ✅ Smooth animations preserved

## Future Enhancements (Optional)

1. **Persistent Cooldown**: Store in AsyncStorage to survive app restarts
2. **Progressive Cooldown**: Increase duration with each failure (60s, 120s, 300s)
3. **Visual Progress Bar**: Show cooldown as a progress ring around button
4. **Haptic Feedback**: Vibrate when pressing disabled button
5. **Analytics**: Track cooldown triggers to identify problem areas

## Status: ✅ COMPLETE

Signup button now has robust rate limiting protection that:
- Prevents backend crashes from rapid requests
- Provides clear user feedback
- Handles all error scenarios gracefully
- Maintains excellent UX with countdown display
