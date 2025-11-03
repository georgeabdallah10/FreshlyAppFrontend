# 🧪 Notification System Testing Guide

## Quick Start Testing

### 1. Start the App
```bash
npm start
# or
expo start
```

### 2. Test Checklist

#### ✅ Visual Tests (5 min)
- [ ] Bell icon appears in header
- [ ] Badge shows unread count
- [ ] Clicking bell opens notifications screen
- [ ] Notifications screen shows filters (All/Unread)

#### ✅ Functional Tests (10 min)
- [ ] Click notification → marks as read automatically
- [ ] Click notification → navigates to meal requests
- [ ] "Mark all as read" button works
- [ ] "Clear read" button shows confirmation
- [ ] Pull to refresh works
- [ ] Delete individual notification works

#### ✅ Real-Time Tests (5 min)
- [ ] Badge updates every 60 seconds
- [ ] Switching apps and returning refreshes data
- [ ] Background polling continues

#### ✅ Integration Test (15 min)
**End-to-End Meal Sharing Flow:**

1. **User A (Sender):**
   - Navigate to a meal detail
   - Click "Share Meal" button
   - Select User B from family members
   - Send request
   - Wait for notification about response

2. **User B (Receiver):**
   - See badge increment (wait up to 60s)
   - Click bell icon
   - See "meal_share_request" notification
   - Click notification → goes to requests screen
   - Accept or decline request

3. **User A (Sender again):**
   - See badge increment
   - Click bell
   - See "meal_share_accepted" or "meal_share_declined"
   - Notification shows correct icon and message

## Expected Behavior

### Notification Types & Icons
| Type | Icon | Color | Trigger |
|------|------|-------|---------|
| `meal_share_request` | 🍽️ Restaurant | Green | Someone sends you request |
| `meal_share_accepted` | ✅ Checkmark | Green | Someone accepts your request |
| `meal_share_declined` | ❌ Close | Red | Someone declines your request |
| `family` | 👥 People | Gray | Family events |
| `system` | ℹ️ Info | Blue | System messages |

### Badge Behavior
- Shows count of unread notifications
- Updates every 60 seconds automatically
- Shows "99+" for counts over 99
- Hides when count is 0

### Time Display
- **< 1 min:** "Just now"
- **< 1 hour:** "5m ago"
- **< 24 hours:** "2h ago"
- **Yesterday:** "Yesterday"
- **> 1 day:** "3d ago"

### Visual States
**Unread:**
- Green background (#F0FDF4)
- Blue dot indicator
- Bold title

**Read:**
- White background
- No dot
- Normal title weight

## Common Issues & Solutions

### Badge not updating
- **Wait 60 seconds** (auto-polling interval)
- Pull to refresh on notifications screen
- Switch apps and return to trigger refetch

### Notification not appearing
- Check backend logs for notification creation
- Verify user is logged in
- Check network connectivity
- Verify API endpoint is correct

### Navigation not working
- Ensure meal share requests screen is accessible
- Check router configuration
- Verify notification `related_id` is valid

### Count mismatch
- Pull to refresh
- Check filter selection (All vs Unread)
- Verify deleted notifications are excluded

## Testing with Multiple Users

### Setup
1. Create/login User A on device/emulator 1
2. Create/login User B on device/emulator 2
3. Ensure both users are in same family

### Test Flow
1. User A creates a meal
2. User A shares meal with User B
3. **Check:** User B gets notification within 60s
4. User B opens notification
5. User B accepts/declines
6. **Check:** User A gets response notification within 60s

## Performance Checks

### Expected Performance
- [ ] Badge loads in < 500ms
- [ ] Notifications list loads in < 1s
- [ ] Mark as read updates instantly (optimistic UI)
- [ ] Delete updates instantly (optimistic UI)
- [ ] Pull to refresh completes in < 2s

### Memory Usage
- Auto-polling should not cause memory leaks
- React Query cache invalidation working properly
- No duplicate API calls

## API Endpoints Reference

All endpoints automatically authenticated via stored token:

```
GET    /api/notifications              - Get all notifications
GET    /api/notifications/unread/count - Get unread count
GET    /api/notifications/stats        - Get statistics
GET    /api/notifications/{id}         - Get single notification
PUT    /api/notifications/{id}/read    - Mark as read
PUT    /api/notifications/{id}/unread  - Mark as unread
PUT    /api/notifications/read-all     - Mark all as read
DELETE /api/notifications/{id}         - Delete one
DELETE /api/notifications/read         - Delete all read
DELETE /api/notifications/all          - Delete all
```

## Debugging Tips

### Check Notification Creation
```typescript
// In meal share flow, backend should create notification
// No manual creation needed in frontend
```

### Check React Query Cache
```typescript
// In notifications screen, add:
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
console.log('Cache:', queryClient.getQueryData(['notifications', 'unreadCount']));
```

### Check API Calls
```typescript
// Enable debug logging in notification.service.ts
console.log('Fetching notifications:', query);
console.log('Response:', response);
```

## Sign-Off Criteria

✅ All visual elements render correctly
✅ All interactions work smoothly
✅ End-to-end meal sharing creates notifications
✅ Badge updates automatically
✅ No console errors or warnings
✅ Performance is acceptable
✅ Works on both iOS and Android (if applicable)

---

## Next Steps After Testing

Once testing is complete:
1. ✅ Mark all test checklist items
2. 📝 Document any bugs found
3. 🐛 Fix critical issues
4. 🚀 Deploy to production
5. 📊 Monitor notification metrics

## Future Enhancements (Optional)

- [ ] Push notifications (native mobile)
- [ ] Sound/vibration on new notification
- [ ] Notification categories/grouping
- [ ] Mark as read on swipe gesture
- [ ] Batch delete with checkboxes
- [ ] Notification preferences/settings
- [ ] Email notifications
- [ ] Notification history archive

---

**Ready to test!** Follow this guide and check off items as you complete them.
