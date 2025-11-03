# 🚀 API QUICK REFERENCE - Family Members Endpoint

## Endpoint Overview

```
GET /families/{family_id}/members
```

**Base URL:** `https://freshlybackend.duckdns.org`

---

## Making Requests

### Using cURL:
```bash
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  https://freshlybackend.duckdns.org/families/7/members
```

### Using JavaScript/TypeScript:
```typescript
const response = await fetch(
  `https://freshlybackend.duckdns.org/families/7/members`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  }
);

const members = await response.json();
```

### Using React/TypeScript (Freshly App):
```typescript
import { listFamilyMembers } from '@/src/user/family';

// In component:
const members = await listFamilyMembers(7);

// Access member data:
members.forEach(member => {
  console.log(member.user.name);           // "John Doe"
  console.log(member.user.email);          // "john@example.com"
  console.log(member.user.phone_number);   // "+1234567890"
  console.log(member.role);                // "owner" or "member"
});
```

---

## Response Format

### Sample Response:
```json
[
  {
    "id": 3,
    "family_id": 7,
    "user_id": 52,
    "role": "owner",
    "joined_at": "2024-11-03T10:30:00Z",
    "user": {
      "id": 52,
      "name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "avatar_path": "/avatars/john.jpg",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-11-03T09:00:00Z"
    }
  }
]
```

---

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique membership ID (membership record ID, not user ID) |
| `family_id` | number | Family ID this member belongs to |
| `user_id` | number | User ID (links to users table) |
| `role` | string | Role in family: `"owner"` or `"member"` |
| `joined_at` | ISO 8601 | When the user joined the family |
| `user.id` | number | User's unique identifier |
| `user.name` | string | User's full name |
| `user.email` | string | User's email address |
| `user.phone_number` | string | User's phone number |
| `user.avatar_path` | string/null | Path to user's avatar image |
| `user.created_at` | ISO 8601 | When the user account was created |
| `user.updated_at` | ISO 8601 | When the user account was last updated |

---

## Common Use Cases

### Get all family members:
```typescript
const members = await listFamilyMembers(familyId);
// Returns array of all members with complete user data
```

### Find family owner:
```typescript
const owner = members.find(m => m.role === "owner");
console.log(owner.user.name); // Owner's name
console.log(owner.user.email); // Owner's email
```

### Get member by name:
```typescript
const member = members.find(m => m.user.name === "John Doe");
if (member) {
  console.log(member.user.email); // john@example.com
  console.log(member.user.phone_number); // +1234567890
}
```

### Count members:
```typescript
const totalMembers = members.length;
const ownerCount = members.filter(m => m.role === "owner").length;
const memberCount = members.filter(m => m.role === "member").length;
```

### Check if user is owner:
```typescript
const isOwner = members.find(m => m.user_id === userId)?.role === "owner";
```

---

## Error Handling

### Not found (404):
```json
{
  "error": "Family not found"
}
```

### Unauthorized (401):
```json
{
  "error": "Unauthorized - invalid or missing token"
}
```

### Server error (500):
```json
{
  "error": "Internal server error"
}
```

### Handle errors in code:
```typescript
try {
  const members = await listFamilyMembers(familyId);
  // Use members...
} catch (error) {
  if (error.response?.status === 404) {
    console.error("Family not found");
  } else if (error.response?.status === 401) {
    console.error("Unauthorized - check auth token");
  } else {
    console.error("Failed to fetch members:", error);
  }
}
```

---

## Important Notes

✅ **Guaranteed to include nested user object** - No need to handle missing data
✅ **Consistent response structure** - Same format every request
✅ **Complete user data** - Name, email, phone all included
✅ **Owner data included** - No "Unknown Member" fallback needed
✅ **Production ready** - Fix deployed and tested

---

## Frontend Integration

### MemberView Component:
The component now uses simplified logic:

```typescript
const normalizeMembers = useCallback((raw: any[]): FamilyMember[] => {
  return (raw ?? []).map((m: any) => {
    const u = m.user ?? {}; // Backend guarantees this exists
    
    return {
      id: String(m.user_id || u.id || m.id || ""),
      name: u.name || u.full_name || u.display_name || "Unknown Member",
      email: u.email || "No email",
      phone: u.phone_number || u.phone || "No phone",
      role: m.role === "owner" ? "owner" : "member",
      // ... other fields
    };
  });
}, [user]);
```

---

## Testing

### Test in browser console:
```javascript
// Import the function
import { listFamilyMembers } from '@/src/user/family';

// Fetch members
const members = await listFamilyMembers(7);

// Verify data
console.log("Total members:", members.length);
console.log("Owner:", members.find(m => m.role === "owner")?.user.name);
console.log("All members:", members.map(m => m.user.name));
```

### Verify response has nested user:
```javascript
members.forEach(member => {
  if (!member.user || !member.user.name) {
    console.error("❌ Missing user data for member:", member.id);
  } else {
    console.log("✅ Member data complete:", member.user.name);
  }
});
```

---

## Related Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/families` | GET | List user's families |
| `/families/{id}` | GET | Get family details |
| `/families/{id}/members` | GET | Get family members ← **YOU ARE HERE** |
| `/families/{id}/members/{memberId}` | DELETE | Remove member from family |
| `/families/{id}/invite` | POST | Generate invite code |

---

## Support

If you encounter issues with this endpoint:

1. Check authentication token is valid
2. Verify family ID exists
3. Ensure user has access to family
4. Check response includes nested `user` object
5. Review error response for specific issue

For questions, refer to `BACKEND_FIX_COMPLETE_NOV_3_2025.md`
