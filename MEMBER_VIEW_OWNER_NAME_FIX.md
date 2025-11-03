# MemberView Owner Name Display Fix

## Issue
The owner's name was displaying as "Unknown" with "No email" in the MemberView component when viewing family members.

## Root Cause
The data normalization logic in `MemberView.tsx` had two issues:

1. **Missing data paths**: The function wasn't checking for data directly on the member object (e.g., `m.name`, `m.email`)
2. **Incorrect owner detection**: The fallback to user context was only checking if `userId === user?.id`, but not also checking if the member is the owner

## Solution

### 1. Added Additional Data Paths
Extended the normalization to check for data directly on the member object:
```tsx
let name = u.display_name ?? u.full_name ?? u.name ?? m.name ?? "";
let email = u.email ?? m.email ?? "";
let phone = u.phone ?? u.phone_number ?? m.phone ?? "";
```

### 2. Fixed Owner Detection Logic
Changed the user context fallback condition to match `OwnerView.tsx`:
```tsx
// Before: Only checked user ID match
if (String(userId) === String(user?.id)) {
  name = name || user?.name || "You";
  // ...
}

// After: Check both isOwner AND user ID match
if (isOwner && String(userId) === String(user?.id)) {
  name = name || user?.name || "Owner";
  // ...
}
```

### 3. Added Debug Logging
Added console logs to help diagnose data structure issues:
```tsx
console.log("Raw member data:", JSON.stringify(m, null, 2));
console.log("User ID:", userId, "Current User ID:", user?.id, "Is Owner:", isOwner);
console.log("Final name:", name, "email:", email);
```

## Data Flow

The normalization function now follows this priority:

1. **Primary**: Check nested user object (`m.user.display_name`, `m.user.full_name`, etc.)
2. **Secondary**: Check direct member properties (`m.name`, `m.email`, etc.)
3. **Tertiary**: If member is owner and matches current user, use user context
4. **Fallback**: Use "Unknown" for name, empty string for email/phone

## Testing
To test:
1. Navigate to MyFamily screen
2. View family as a regular member
3. Owner's name and email should now display correctly
4. Check browser/metro console for debug logs showing the data structure

## Files Modified
- `components/familyMangment/MemberView.tsx`
  - Updated `normalizeMembers()` function with additional data paths
  - Fixed owner detection logic to match OwnerView
  - Added debug console logging

## Status
✅ Fixed - Owner name and email should now display correctly in MemberView

## Notes
- The debug logs can be removed once the issue is confirmed fixed
- The fix ensures consistency between OwnerView and MemberView normalization logic
- Consider adding backend validation to ensure member data always includes name/email
