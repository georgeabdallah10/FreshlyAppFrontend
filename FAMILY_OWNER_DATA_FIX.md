# Family Owner Data Visibility Fix

## Issue

When a user was the owner of a family, they couldn't see their own data (name, email, phone) in the family members list. The owner's card would show "Unknown" with blank email and phone fields.

## Root Cause

The backend API returns different data structures for family members:
- **Regular members**: Have nested `user` object with full user data
- **Family owner**: May have missing or differently structured user data in the API response

The normalization code was only checking the `m.user` nested object and didn't fall back to the current user's context data when the owner's information was missing.

### Data Structure Example

**Regular Member Response:**
```json
{
  "user": {
    "id": 123,
    "display_name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  },
  "role": "member",
  "status": "active"
}
```

**Owner Response (problematic):**
```json
{
  "user_id": 456,
  "is_owner": true,
  "role": "owner",
  "status": "active"
  // Missing nested user object!
}
```

## Solution

Updated the member normalization logic in both `MyFamily.tsx` and `OwnerView.tsx` to:

1. **Check multiple data paths**: Look for user data in `m.user`, `m.user_id`, and other possible locations
2. **Identify the owner**: Check if the member is the owner (`m.is_owner` or `m.role === "owner"`)
3. **Fallback to context**: If the member is the current user (owner) and data is missing, use the data from `useUser()` context
4. **Handle field name variations**: Account for both `phone` and `phone_number` field names

### Code Changes

#### Before (Broken):
```typescript
const normalizeMembers = (raw: any[]): FamilyMember[] => {
  return (raw ?? []).map((m: any) => {
    const u = m.user ?? {};
    return {
      id: String(u.id ?? m.user_id ?? m.id ?? ""),
      name: u.display_name ?? u.full_name ?? u.name ?? "Unknown",
      email: u.email ?? "",
      phone: u.phone ?? "",
      // ... other fields
    };
  });
};
```

#### After (Fixed):
```typescript
const normalizeMembers = useCallback((raw: any[]): FamilyMember[] => {
  return (raw ?? []).map((m: any) => {
    // Try multiple paths for user data
    const u = m.user ?? {};
    
    // Check if this is the owner
    const isOwner = m.is_owner || m.role === "owner";
    const userId = u.id ?? m.user_id ?? m.id ?? "";
    
    // For the owner, fallback to current user data if available
    let name = u.display_name ?? u.full_name ?? u.name ?? "";
    let email = u.email ?? "";
    let phone = u.phone ?? u.phone_number ?? "";
    
    // If data is missing and this is the current user (owner), use context
    if (isOwner && String(userId) === String(user?.id)) {
      name = name || user?.name || "Owner";
      email = email || user?.email || "";
      phone = phone || user?.phone_number || "";
    }
    
    // Final fallback
    if (!name) name = "Unknown";
    
    return {
      id: String(userId),
      name,
      email,
      phone,
      status: (m.status ?? "active") as MemberStatus,
      role: (m.role ?? (m.is_owner ? "owner" : "member")) as UserRole,
      joinedAt: m.created_at ?? m.joined_at ?? "",
    };
  });
}, [user]);
```

## Files Modified

### 1. **`app/(home)/MyFamily.tsx`**

**Changes in `fetchUserRoleAndFamily()`:**
- Updated member normalization to check for owner and use context data
- Added fallback to `user?.name`, `user?.email`, `user?.phone_number`
- Fixed field name variations (`phone` vs `phone_number`)

**Changes in `handleKickMember()`:**
- Applied same normalization logic after removing a member
- Ensures owner data stays visible after list refresh

### 2. **`components/familyMangment/OwnerView.tsx`**

**Changes:**
- Moved `useUser()` hook before `normalizeMembers` callback
- Updated `normalizeMembers` to use current user context for owner
- Added `user` to dependency array of `useCallback`
- Removed duplicate `useUser()` call
- Fixed field name references to match User type

## User Type Reference

The `User` type from context has these properties:
```typescript
type User = {
  id?: number;
  name?: string;           // Note: NOT display_name or full_name
  email?: string;
  phone_number?: string;   // Note: NOT phone
  avatar_path?: string;
  status?: string;
};
```

## Behavior After Fix

### Before (Broken):
```
Family Members:
┌─────────────────────┐
│ 👤 Unknown          │  ← Owner (no data!)
│ 📧 —                │
│ 📞 —                │
│ 🟢 Active           │
│ 👑 Owner            │
└─────────────────────┘

┌─────────────────────┐
│ 👤 John Doe         │  ← Regular member (works fine)
│ 📧 john@example.com │
│ 📞 555-1234         │
│ 🟢 Active           │
└─────────────────────┘
```

### After (Fixed):
```
Family Members:
┌─────────────────────┐
│ 👤 George Abdallah  │  ← Owner (now shows data!)
│ 📧 george@email.com │
│ 📞 555-0000         │
│ 🟢 Active           │
│ 👑 Owner            │
└─────────────────────┘

┌─────────────────────┐
│ 👤 John Doe         │  ← Regular member (still works)
│ 📧 john@example.com │
│ 📞 555-1234         │
│ 🟢 Active           │
└─────────────────────┘
```

## Testing

### Test Case 1: Owner Views Family
1. Log in as family owner
2. Navigate to Family Management
3. ✅ Owner's card should show correct name, email, phone
4. ✅ Owner badge should be visible
5. ✅ No "Remove" button on owner's card

### Test Case 2: After Kicking Member
1. Owner kicks a member
2. Member list refreshes
3. ✅ Owner's data should still be visible
4. ✅ Kicked member should be removed from list

### Test Case 3: Multiple Data Sources
1. Backend returns partial owner data
2. Context has full user data
3. ✅ Should merge data from both sources
4. ✅ Context data should fill in missing fields

### Test Case 4: New Family Creation
1. User creates new family (becomes owner)
2. Views family page
3. ✅ Owner's data should display immediately
4. ✅ No "Unknown" or blank fields

## Edge Cases Handled

1. **Missing nested user object**: Falls back to top-level fields and context
2. **Partial user data**: Merges API data with context data
3. **Field name variations**: Handles both `phone` and `phone_number`
4. **Multiple name formats**: Checks `display_name`, `full_name`, and `name`
5. **No user context**: Still shows "Unknown" as final fallback
6. **Non-owner members**: Still works with existing logic

## Benefits

- ✅ Owner can see their own information
- ✅ No more "Unknown" cards for owners
- ✅ Consistent data display across all members
- ✅ Robust handling of API response variations
- ✅ Uses available context data efficiently
- ✅ Maintains backward compatibility

## Related Issues

This fix addresses the data display issue in:
- Family Management screen (owner view)
- Member list rendering
- Post-action refresh (after kicking members)

## Future Improvements

1. **Backend Consistency**: Update backend to always include full user object for all members, including owner
2. **Type Safety**: Add TypeScript interfaces for API responses
3. **Caching**: Cache normalized member data to reduce re-normalization
4. **Real-time Updates**: Implement WebSocket updates when family data changes

## Status

✅ **FIXED** - Family owners can now see their own data correctly in the members list.

---

**Fixed**: November 3, 2025  
**Files Modified**: 
- `app/(home)/MyFamily.tsx`
- `components/familyMangment/OwnerView.tsx`

**Lines Changed**: ~60 lines across 2 files
