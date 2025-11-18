# Freshly App - Notification System Setup Guide

Complete production-ready notification system for React Native + Expo

---

## Table of Contents

1. [Installation](#installation)
2. [Expo Configuration](#expo-configuration)
3. [Supabase Setup](#supabase-setup)
4. [Testing](#testing)
5. [Usage Examples](#usage-examples)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Installation

### 1. Install Required Packages

```bash
npx expo install expo-notifications expo-device
```

These packages provide:
- `expo-notifications` - Push notifications and local scheduling
- `expo-device` - Device information for token registration

### 2. Verify Existing Dependencies

The following should already be installed:
- ✅ `moti` - Animations
- ✅ `@tanstack/react-query` - State management
- ✅ `@supabase/supabase-js` - Database
- ✅ `expo-router` - Navigation

---

## Expo Configuration

### 1. Update `app.json`

Add notification configuration and get your Expo project ID:

```json
{
  "expo": {
    "name": "Freshly",
    "slug": "freshly-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.freshly",
      "infoPlist": {
        "UIBackgroundModes": [
          "remote-notification"
        ]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.freshly",
      "permissions": [
        "android.permission.POST_NOTIFICATIONS"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FD8100",
          "sounds": [
            "./assets/notification.wav"
          ]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EXPO_PROJECT_ID_HERE"
      }
    }
  }
}
```

### 2. Get Your Expo Project ID

```bash
# Login to Expo
npx expo login

# Get or create project ID
npx expo whoami
eas project:info
```

Copy the project ID and paste it in `app.json` under `extra.eas.projectId`.

### 3. Update registerForPush.ts

Open `/src/notifications/registerForPush.ts` and update line 73:

```typescript
// Replace this line:
projectId: 'your-expo-project-id',

// With your actual project ID:
projectId: 'abc123-your-actual-project-id',
```

---

## Supabase Setup

### 1. Create Required Tables

Run this SQL in your Supabase SQL editor:

```sql
-- User Push Tokens Table
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enable_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_meal_requests BOOLEAN NOT NULL DEFAULT TRUE,
  enable_freshly_updates BOOLEAN NOT NULL DEFAULT TRUE,
  enable_user_messages BOOLEAN NOT NULL DEFAULT TRUE,
  enable_pantry_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  pantry_alert_days INTEGER NOT NULL DEFAULT 3,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own push tokens"
  ON user_push_tokens FOR ALL
  USING (auth.uid()::integer = user_id);

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid()::integer = user_id);
```

### 2. Verify Notifications Table Exists

If your backend hasn't created the `notifications` table yet, run:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::integer = user_id);
```

---

## Testing

### 1. Test on Physical Device

**Push notifications only work on physical devices, not simulators!**

```bash
# iOS
npx expo run:ios --device

# Android
npx expo run:android --device
```

### 2. Test Push Notification Registration

```typescript
import { useNotificationSystem } from '@/hooks/useNotifications';

function TestScreen() {
  const { registerForPush, expoPushToken, permissionsGranted } = useNotificationSystem();

  return (
    <View>
      <Text>Token: {expoPushToken || 'Not registered'}</Text>
      <Text>Permissions: {permissionsGranted ? 'Granted' : 'Denied'}</Text>
      <Button title="Register" onPress={registerForPush} />
    </View>
  );
}
```

### 3. Test Pantry Expiration Notifications

```typescript
import { schedulePantryExpirationNotifications } from '@/src/notifications/schedulePantryNotifications';

// Trigger pantry check manually
await schedulePantryExpirationNotifications();

// View scheduled notifications
import * as Notifications from 'expo-notifications';
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log('Scheduled notifications:', scheduled);
```

### 4. Send Test Push Notification

Use Expo's push notification tool:

```bash
# Get your Expo push token from the app
# Then visit: https://expo.dev/notifications

# Or use curl:
curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{
  "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
  "title": "Test Notification",
  "body": "This is a test!",
  "data": {
    "category": "system"
  }
}'
```

---

## Usage Examples

### 1. Using Notifications in a Screen

```typescript
import { useNotifications, useUnreadCount } from '@/hooks/useNotifications';

function HomeScreen() {
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  return (
    <View>
      <Text>You have {unreadCount} unread notifications</Text>
      {notifications.map((notif) => (
        <NotificationCard key={notif.id} notification={notif} />
      ))}
    </View>
  );
}
```

### 2. Initialize Notification System

```typescript
import { useNotificationSystem } from '@/hooks/useNotifications';

function App() {
  const {
    notifications,
    unreadCount,
    isLoading,
    permissionsGranted,
    registerForPush,
  } = useNotificationSystem();

  useEffect(() => {
    if (!permissionsGranted) {
      // Prompt user to enable notifications
      registerForPush();
    }
  }, []);

  return (
    // Your app UI
  );
}
```

### 3. Schedule Pantry Notifications After Adding Items

```typescript
import { schedulePantryExpirationNotifications } from '@/src/notifications/schedulePantryNotifications';
import { createPantryItem } from '@/src/services/pantry.service';

async function addPantryItem(item) {
  // Add item to pantry
  await createPantryItem(item);

  // Reschedule notifications
  await schedulePantryExpirationNotifications();
}
```

### 4. Mark Notification as Read

```typescript
import { useMarkAsRead } from '@/hooks/useNotifications';

function NotificationItem({ notification }) {
  const markAsRead = useMarkAsRead();

  const handlePress = async () => {
    await markAsRead.mutateAsync(notification.id);
    // Navigate to relevant screen
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      {/* Notification UI */}
    </TouchableOpacity>
  );
}
```

---

## API Reference

### Hooks

#### `useNotificationSystem()`
Complete notification system with push, pantry alerts, and state management.

**Returns:**
```typescript
{
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  expoPushToken: string | null;
  permissionsGranted: boolean;
  registerForPush: () => void;
  refresh: () => Promise<void>;
}
```

#### `useNotifications(query?: NotificationsQuery)`
Fetch notifications with optional filters.

#### `useUnreadCount()`
Get unread notification count for badge.

#### `useMarkAsRead()`
Mutation hook to mark notification as read.

#### `useMarkAllAsRead()`
Mutation hook to mark all notifications as read.

### Functions

#### `registerForPushNotifications()`
Register device for push notifications.

**Returns:** `Promise<string | null>` - Expo push token

#### `schedulePantryExpirationNotifications()`
Check pantry and schedule expiration alerts.

**Returns:** `Promise<void>`

#### `setupNotificationHandler()`
Configure foreground notification behavior.

#### `setupNotificationResponseListener()`
Listen for notification taps.

**Returns:** `() => void` - Cleanup function

---

## Troubleshooting

### Issue: "Push notifications require a physical device"

**Solution:** You must test on a real iOS or Android device. Simulators don't support push notifications.

```bash
# iOS - Connect device via USB
npx expo run:ios --device

# Android - Connect device or use wireless debugging
npx expo run:android --device
```

---

### Issue: "No Expo project ID found"

**Solution:** Add project ID to `app.json`:

1. Run `eas project:info` to get your project ID
2. Add to `app.json`:
```json
{
  "extra": {
    "eas": {
      "projectId": "YOUR_PROJECT_ID"
    }
  }
}
```
3. Update `/src/notifications/registerForPush.ts` line 73

---

### Issue: "Notifications not appearing"

**Checklist:**
- ✅ Running on physical device?
- ✅ Permissions granted?
- ✅ Notification handler configured?
- ✅ Expo project ID set correctly?

**Debug:**
```typescript
import * as Notifications from 'expo-notifications';

// Check permission status
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status);

// Check scheduled notifications
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log('Scheduled:', scheduled.length);
```

---

### Issue: "Pantry notifications not scheduling"

**Solution:**

1. Check pantry items have expiration dates:
```typescript
import { getAllPantryItems } from '@/src/services/pantry.service';

const items = await getAllPantryItems();
const withDates = items.filter(item => item.expirationDate);
console.log('Items with expiration dates:', withDates.length);
```

2. Manually trigger scheduling:
```typescript
import { schedulePantryExpirationNotifications } from '@/src/notifications/schedulePantryNotifications';

await schedulePantryExpirationNotifications();
```

3. Check scheduled notifications:
```typescript
import { getScheduledPantryNotifications } from '@/src/notifications/schedulePantryNotifications';

const scheduled = await getScheduledPantryNotifications();
console.log('Pantry notifications scheduled:', scheduled);
```

---

### Issue: "Notification routing not working"

**Solution:** Check notification data includes category:

```typescript
// When creating notifications, include category in data
{
  title: "Test",
  body: "Test message",
  data: {
    category: "meal_request", // Important!
    mealId: 123
  }
}
```

---

## Production Checklist

Before deploying to production:

- [ ] Expo project ID configured
- [ ] Supabase tables created with RLS policies
- [ ] Push notification icon added (`assets/notification-icon.png`)
- [ ] Tested on physical iOS device
- [ ] Tested on physical Android device
- [ ] Backend configured to send push notifications via Expo Push API
- [ ] Notification permissions requested at appropriate time
- [ ] Badge count updates working
- [ ] Pantry expiration alerts working
- [ ] Deep linking from notifications working
- [ ] Error tracking configured (Sentry, etc.)

---

## Backend Integration

Your backend should send push notifications using the Expo Push API:

```python
# Python example
import requests

def send_push_notification(expo_token, title, message, data=None):
    url = 'https://exp.host/--/api/v2/push/send'
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
    payload = {
        'to': expo_token,
        'title': title,
        'body': message,
        'data': data or {},
        'sound': 'default',
        'priority': 'high',
    }
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# Example: Send meal request notification
send_push_notification(
    expo_token='ExponentPushToken[xxxxx]',
    title='New Meal Request',
    message='John requested pasta for dinner',
    data={
        'category': 'meal_request',
        'mealId': 123,
        'requesterId': 456,
        'requesterName': 'John'
    }
)
```

---

## File Structure Reference

```
/src
  /notifications
    types.ts                          # Type definitions
    registerForPush.ts                # Push token registration
    schedulePantryNotifications.ts    # Pantry expiration alerts
    handleIncomingNotifications.ts    # Notification routing
    supabaseHelpers.ts               # Database operations

/hooks
  useNotifications.ts                 # React hooks

/components
  NotificationCard.tsx                # Notification card component

/app/(tabs)/notifications
  index.tsx                           # Notifications screen
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Expo notifications docs: https://docs.expo.dev/versions/latest/sdk/notifications/
3. Check app logs for error messages
4. Verify Supabase tables and RLS policies

---

**Notification System Version:** 1.0.0
**Last Updated:** 2025-01-17
**Status:** Production Ready ✅
