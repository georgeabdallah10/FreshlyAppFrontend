# Rate Limiting Quick Reference Guide

## 🚀 Quick Implementation Guide

Need to add rate limiting to a new screen? Follow these 4 simple steps:

---

## Step 1: Add State Variables

```typescript
// Add these to your component
const [isSubmitting, setIsSubmitting] = useState(false);
const [isButtonDisabled, setIsButtonDisabled] = useState(false);
const [cooldownRemaining, setCooldownRemaining] = useState(0);
```

---

## Step 2: Add Cooldown Timer Effect

```typescript
// Add this useEffect hook
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

---

## Step 3: Add Cooldown Function

```typescript
// Add this helper function
const startCooldown = (seconds: number = 30) => {
  setIsButtonDisabled(true);
  setCooldownRemaining(seconds);
};
```

---

## Step 4: Wrap Your API Call

```typescript
const handleSubmit = async () => {
  // Guard clause
  if (isSubmitting || isButtonDisabled) return;

  setIsSubmitting(true);
  try {
    await yourApiCall();
    // Success handling
  } catch (error: any) {
    startCooldown(30); // Start 30-second cooldown
    
    // Enhanced error messages
    let errorMessage = "Unable to complete action. ";
    const errorStr = error.message?.toLowerCase() || "";
    
    if (errorStr.includes("network") || errorStr.includes("fetch")) {
      errorMessage = "No internet connection. Please check your network and try again.";
    } else if (errorStr.includes("timeout")) {
      errorMessage = "Request timed out. Please try again.";
    } else if (errorStr.includes("401")) {
      errorMessage = "Session expired. Please log in again.";
    } else if (errorStr.includes("404")) {
      errorMessage = "Item not found.";
    } else if (errorStr.includes("409")) {
      errorMessage = "Item already exists. Please use a different value.";
    } else if (errorStr.includes("422")) {
      errorMessage = "Invalid data. Please check all fields.";
    } else if (errorStr.includes("429")) {
      startCooldown(120); // 2 minutes for rate limit
      errorMessage = "Too many requests. Please wait before trying again.";
    } else if (errorStr.includes("500") || errorStr.includes("503")) {
      errorMessage = "Server error. Please try again later.";
    } else {
      errorMessage = "Operation failed. Please try again.";
    }
    
    showError(errorMessage); // Use your error display method
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Step 5 (Optional): Update Button UI

```tsx
<TouchableOpacity
  disabled={isButtonDisabled || isSubmitting}
  onPress={handleSubmit}
  style={[
    styles.button,
    (isButtonDisabled || isSubmitting) && styles.buttonDisabled
  ]}
>
  {isButtonDisabled && cooldownRemaining > 0 ? (
    <Text style={styles.buttonText}>{cooldownRemaining}s</Text>
  ) : isSubmitting ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.buttonText}>Submit</Text>
  )}
</TouchableOpacity>
```

---

## 📋 Recommended Cooldown Durations

| Operation Type | Standard Failure | Rate Limit (429) |
|---------------|------------------|------------------|
| Login | 30 seconds | 120 seconds |
| Signup | 60 seconds | 120 seconds |
| Create/Update | 30 seconds | 120 seconds |
| Delete | 30 seconds | 120 seconds |

---

## 🎯 Error Code Mapping

| Status Code | User-Friendly Message |
|-------------|----------------------|
| 400 | "Invalid request. Please check your input." |
| 401 | "Session expired. Please log in again." |
| 404 | "Item not found." |
| 409 | "Item already exists." |
| 422 | "Invalid data. Please check all fields." |
| 429 | "Too many requests. Please wait." |
| 500 | "Server error. Please try again later." |
| Network | "No internet connection." |
| Timeout | "Request timed out. Please try again." |

---

## ✅ Testing Checklist

When implementing rate limiting, test:

- [ ] Submit with valid data → succeeds
- [ ] Submit with invalid data → see validation error
- [ ] Submit while offline → see network error  
- [ ] Submit 3 times quickly → see cooldown timer
- [ ] Wait for cooldown → button re-enables
- [ ] Button shows countdown: "30s", "29s", "28s"
- [ ] Button is disabled and grayed during cooldown
- [ ] Each error code shows correct message

---

## 🔍 Complete Examples

See these files for reference implementations:

### Simple Example (Modal):
- `components/quickAddModal.tsx` - Simple modal with rate limiting

### Medium Complexity (Screen):
- `app/(auth)/Login.tsx` - Login screen with validation
- `app/(home)/pantry.tsx` - Pantry operations with rate limiting

### Complex Example (Multiple Operations):
- `app/(home)/chat.tsx` - Multiple operations (create, delete, rename)
- `app/(home)/allGrocery.tsx` - Batch operations with rate limiting

---

## 💡 Pro Tips

### 1. **Always Start Cooldown on Catch**
```typescript
catch (error) {
  startCooldown(30); // Always call this first
  // Then handle error message
}
```

### 2. **Use Longer Cooldowns for 429**
```typescript
if (errorStr.includes("429")) {
  startCooldown(120); // 2 minutes instead of 30 seconds
  errorMessage = "Too many requests...";
}
```

### 3. **Guard Against Multiple Submissions**
```typescript
if (isSubmitting || isButtonDisabled) return;
```

### 4. **Always Use Finally**
```typescript
finally {
  setIsSubmitting(false); // Always reset state
}
```

### 5. **Show Visual Feedback**
```tsx
{isButtonDisabled && cooldownRemaining > 0 ? (
  <Text>{cooldownRemaining}s</Text>
) : isSubmitting ? (
  <ActivityIndicator />
) : (
  <Text>Submit</Text>
)}
```

---

## 🚫 Common Mistakes to Avoid

### ❌ DON'T: Forget to reset isSubmitting
```typescript
try {
  await apiCall();
  // Missing: setIsSubmitting(false)
}
```

### ✅ DO: Use finally block
```typescript
try {
  await apiCall();
} finally {
  setIsSubmitting(false); // Always runs
}
```

---

### ❌ DON'T: Hard-code error messages
```typescript
catch (error) {
  alert("Failed"); // Too generic
}
```

### ✅ DO: Parse status codes
```typescript
catch (error: any) {
  const errorStr = error.message?.toLowerCase() || "";
  if (errorStr.includes("401")) {
    alert("Session expired. Please log in again.");
  }
}
```

---

### ❌ DON'T: Forget guard clause
```typescript
const handleSubmit = async () => {
  // Missing: guard clause
  setIsSubmitting(true);
  await apiCall();
}
```

### ✅ DO: Check state first
```typescript
const handleSubmit = async () => {
  if (isSubmitting || isButtonDisabled) return; // Guard
  setIsSubmitting(true);
  await apiCall();
}
```

---

## 📱 Platform Considerations

### Web
- Use `alert()` or toast notifications
- Consider browser prompt for inputs

### iOS/Android
- Use `Alert.alert()` from react-native
- iOS supports `Alert.prompt()`
- Android needs custom modal for text input

---

## 🎨 Styling Tips

### Disabled Button State
```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#00A86B',
    padding: 15,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB', // Gray
    opacity: 0.6,
  },
});
```

### Countdown Text
```typescript
const styles = StyleSheet.create({
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 🔗 Related Documentation

- **Full Implementation Guide**: `RATE_LIMITING_COMPLETE.md`
- **API Protection Summary**: `API_PROTECTION_SUMMARY.md`
- **Signup Rate Limiting**: `SIGNUP_RATE_LIMITING.md`
- **API Rate Limiting Guide**: `API_RATE_LIMITING_COMPLETE.md`

---

## 🆘 Need Help?

1. Check the reference implementations in completed screens
2. Review error handling patterns in existing files
3. Test thoroughly with the checklist above
4. Follow the consistent pattern across all screens

---

**Keep it simple, consistent, and user-friendly!** ✨
