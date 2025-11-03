# Notification Dashboard Quick Reference

**Quick guide for the categorized notification system**

---

## What Changed?

### ✅ Added
- Category tabs in notifications screen
- 4 categories: All, Meal Requests, Updates, Messages
- Badge counts on each category
- Horizontal scrollable category bar

### ❌ Removed
- "Meal Requests" button from Family OwnerView
- "Meal Requests" button from Family MemberView
- Separate navigation path for meal requests

---

## User Flow

**Old Way:**
```
Family Screen → Meal Requests Button → Meal Requests Screen
```

**New Way:**
```
Notification Bell → Notifications → Meal Requests Tab
```

---

## Category Mapping

| Category | Notification Types | Icon |
|----------|-------------------|------|
| **All** | All notifications | 🏠 apps-outline |
| **Meal Requests** | meal_share_request<br>meal_share_accepted<br>meal_share_declined | 🍽️ restaurant-outline |
| **Updates** | system | 📢 megaphone-outline |
| **Messages** | family | 📧 mail-outline |

---

## Code Locations

### Main Implementation
- **File**: `app/(home)/notifications.tsx`
- **Key Additions**:
  - `CategoryFilter` type
  - `category` state
  - `getFilteredNotifications()` function
  - Category tab UI
  - Category styles

### Removed Buttons
- **OwnerView**: `components/familyMangment/OwnerView.tsx` (line ~320-340)
- **MemberView**: `components/familyMangment/MemberView.tsx` (line ~200-220)

---

## Key Functions

### Filter Logic
```typescript
const getFilteredNotifications = () => {
  switch (category) {
    case 'meal_requests':
      return baseNotifications.filter(n => 
        n.type === 'meal_share_request' || 
        n.type === 'meal_share_accepted' || 
        n.type === 'meal_share_declined'
      );
    case 'updates':
      return baseNotifications.filter(n => n.type === 'system');
    case 'messages':
      return baseNotifications.filter(n => n.type === 'family');
    case 'all':
    default:
      return baseNotifications;
  }
};
```

### Count Calculation
```typescript
const mealRequestsCount = allNotifications.filter(n => 
  n.type === 'meal_share_request' || 
  n.type === 'meal_share_accepted' || 
  n.type === 'meal_share_declined'
).length;
```

---

## Adding a New Category

1. **Update type**:
```typescript
type CategoryFilter = 'all' | 'meal_requests' | 'updates' | 'messages' | 'YOUR_NEW_CATEGORY';
```

2. **Add filter case**:
```typescript
case 'YOUR_NEW_CATEGORY':
  return baseNotifications.filter(n => n.type === 'your_notification_type');
```

3. **Add count**:
```typescript
const yourCount = allNotifications.filter(n => n.type === 'your_notification_type').length;
```

4. **Add tab UI**:
```tsx
<TouchableOpacity
  style={[styles.categoryTab, category === 'YOUR_NEW_CATEGORY' && styles.categoryTabActive]}
  onPress={() => setCategory('YOUR_NEW_CATEGORY')}
>
  <Ionicons name="your-icon" size={18} color={...} />
  <Text>Your Label</Text>
  {yourCount > 0 && <View style={styles.categoryBadge}>...</View>}
</TouchableOpacity>
```

---

## Styling Quick Ref

```typescript
// Inactive tab
categoryTab: {
  backgroundColor: '#F7F8FA',
  color: '#6B7280',
}

// Active tab
categoryTabActive: {
  backgroundColor: '#00A86B',
  color: '#FFFFFF',
}

// Badge on tab
categoryBadge: {
  backgroundColor: '#FFFFFF',
  color: '#00A86B',
}
```

---

## Testing

```bash
# Check for errors
npm run type-check

# Run the app
npm start
```

**Manual Tests:**
1. Open notifications screen
2. Tap each category tab
3. Verify filtering works
4. Check badge counts
5. Verify family screens don't have meal request buttons

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `app/(home)/notifications.tsx` | +100 lines (category system) |
| `components/familyMangment/OwnerView.tsx` | -15 lines (removed button) |
| `components/familyMangment/MemberView.tsx` | -15 lines (removed button) |

---

## Related Docs

- `NOTIFICATION_DASHBOARD_RESTRUCTURE.md` - Full documentation
- `NOTIFICATION_SYSTEM_GUIDE.md` - General notification guide
- `MEAL_SHARING_INTEGRATION.md` - Meal sharing features

---

**Status**: ✅ Complete | **Date**: November 3, 2025
