# 🍽️ Meal Sharing System - Quick Start Guide

## 🚀 For Users

### How to Share a Meal:
1. Open any meal detail screen
2. Click the green **"Share"** button in the header
3. Select a family member from the list
4. (Optional) Add a personal message
5. Click **"Send Request"**
6. Done! They'll receive your request

### How to Accept a Shared Meal:
1. See the red badge on your **Family** tab
2. Go to Family → Click **"Meal Requests"**
3. View the **"Received"** tab
4. Click **"Accept"** on any meal you want
5. The meal is now in your collection!

### How to Manage Your Requests:
1. Go to Family → **"Meal Requests"**
2. Switch to **"Sent"** tab
3. See all your sent requests and their statuses
4. Cancel any pending requests if needed

---

## 👨‍💻 For Developers

### Key Files:
```
src/services/mealShare.service.ts      # API service layer
hooks/useMealShare.ts                   # React Query hooks
components/meal/SendShareRequestModal.tsx    # Share modal UI
app/(home)/mealShareRequests.tsx       # Inbox screen
```

### Quick Integration Example:

#### 1. Send a Share Request:
```typescript
import { useSendShareRequest } from '@/hooks/useMealShare';

const MyComponent = () => {
  const sendRequest = useSendShareRequest();
  
  const handleShare = async () => {
    try {
      await sendRequest.mutateAsync({
        meal_id: 123,
        receiver_id: 456,
        message: "You'll love this!"
      });
      Alert.alert("Success", "Request sent!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };
  
  return <Button onPress={handleShare} title="Share" />;
};
```

#### 2. Show Pending Count Badge:
```typescript
import { usePendingRequestCount } from '@/hooks/useMealShare';

const MyComponent = () => {
  const { data: count = 0 } = usePendingRequestCount();
  
  return (
    <View>
      <Text>Requests</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text>{count}</Text>
        </View>
      )}
    </View>
  );
};
```

#### 3. List Received Requests:
```typescript
import { useReceivedShareRequests, useAcceptShareRequest } from '@/hooks/useMealShare';

const MyComponent = () => {
  const { data: requests, isLoading } = useReceivedShareRequests();
  const acceptRequest = useAcceptShareRequest();
  
  const handleAccept = async (id: number) => {
    try {
      await acceptRequest.mutateAsync(id);
      Alert.alert("Success", "Meal added!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };
  
  if (isLoading) return <ActivityIndicator />;
  
  return (
    <FlatList
      data={requests}
      renderItem={({ item }) => (
        <View>
          <Text>{item.meal?.name}</Text>
          <Text>From: {item.sender?.name}</Text>
          <Button onPress={() => handleAccept(item.id)} title="Accept" />
        </View>
      )}
    />
  );
};
```

### Available Hooks:

#### Queries:
- `useReceivedShareRequests()` - Auto-updating list of received requests
- `useSentShareRequests()` - Auto-updating list of sent requests  
- `usePendingRequestCount()` - Count for badge
- `useShareRequest(id)` - Single request details

#### Mutations:
- `useSendShareRequest()` - Send a new request
- `useAcceptShareRequest()` - Accept a request
- `useDeclineShareRequest()` - Decline a request
- `useCancelShareRequest()` - Cancel a pending request

### API Endpoints:

```
POST   /meal-share-requests              # Send request
GET    /meal-share-requests/received     # Get received
GET    /meal-share-requests/sent         # Get sent
GET    /meal-share-requests/:id          # Get one
POST   /meal-share-requests/:id/accept   # Accept
POST   /meal-share-requests/:id/decline  # Decline
DELETE /meal-share-requests/:id          # Cancel
```

### Error Handling:

All hooks return standardized errors:
- `400` - Bad request (validation error)
- `401` - Session expired
- `403` - Permission denied
- `404` - Not found
- `409` - Duplicate request
- `429` - Rate limited
- `500+` - Server error

---

## 🎯 Navigation Routes

### Access Meal Share Requests Screen:
```typescript
router.push("/(home)/mealShareRequests");
```

### Deep Link (if needed):
```
freshly://home/mealShareRequests
```

---

## 🔧 Troubleshooting

### Badge Not Showing?
```typescript
// Ensure usePendingRequestCount is called in component
const { data: count = 0 } = usePendingRequestCount();
console.log('Pending count:', count); // Debug
```

### Requests Not Loading?
```typescript
// Check if React Query is set up correctly
import { queryClient } from '@/src/config/queryClient';

// Manually refetch
queryClient.invalidateQueries({ queryKey: ['receivedShareRequests'] });
```

### Modal Not Opening?
```typescript
// Check family ID exists
const [familyId, setFamilyId] = useState<number | null>(null);

useEffect(() => {
  const loadFamily = async () => {
    const families = await listMyFamilies();
    if (families?.length > 0) {
      setFamilyId(families[0].id);
    }
  };
  loadFamily();
}, []);
```

---

## 📊 Component Props

### SendShareRequestModal:
```typescript
interface Props {
  visible: boolean;           // Show/hide modal
  mealId: number;             // Meal to share
  mealName: string;           // Meal name for display
  familyId: number;           // User's family ID
  onClose: () => void;        // Close callback
  onSuccess?: () => void;     // Success callback
}
```

---

## ✅ Testing Checklist

- [ ] Share button shows on meal detail
- [ ] Modal opens with family members
- [ ] Request sends successfully
- [ ] Badge appears on Family tab
- [ ] Requests appear in inbox
- [ ] Accept works correctly
- [ ] Decline works correctly
- [ ] Cancel works for sent requests
- [ ] Pull-to-refresh works
- [ ] Empty states show correctly

---

## 🎨 Customization

### Change Badge Color:
```typescript
// In styles
badge: {
  backgroundColor: "#FF3B30",  // Change this
  // ... rest of styles
}
```

### Change Request Colors:
```typescript
// In mealShareRequests.tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#F59E0B';   // Orange
    case 'accepted': return '#10B981';  // Green
    case 'declined': return '#EF4444';  // Red
  }
};
```

---

## 📞 Need Help?

Check the full documentation: `MEAL_SHARING_INTEGRATION.md`

**Happy Sharing! 🎉**
