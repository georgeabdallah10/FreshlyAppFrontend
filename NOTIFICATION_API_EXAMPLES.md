# Notification System - API Examples

Complete examples for interacting with the notification system.

---

## Table of Contents

1. [Supabase API Calls](#supabase-api-calls)
2. [Backend API Calls](#backend-api-calls)
3. [Expo Push Notifications](#expo-push-notifications)
4. [Local Notification Examples](#local-notification-examples)

---

## Supabase API Calls

### 1. Store Push Token

```typescript
import { savePushToken } from '@/src/notifications/supabaseHelpers';
import { Storage } from '@/src/utils/storage';
import { Platform } from 'react-native';

async function storePushToken(expoPushToken: string) {
  const userId = await Storage.getItem('user_id');

  await savePushToken(
    parseInt(userId),
    expoPushToken,
    Platform.OS as 'ios' | 'android',
    'iPhone 14 Pro' // Optional device name
  );
}
```

### 2. Fetch User Notifications

```typescript
import { fetchNotifications } from '@/src/notifications/supabaseHelpers';
import { Storage } from '@/src/utils/storage';

async function getMyNotifications() {
  const userId = await Storage.getItem('user_id');

  // Get 50 most recent notifications
  const notifications = await fetchNotifications(parseInt(userId), 50, 0);

  console.log('Notifications:', notifications);
  return notifications;
}
```

### 3. Mark Notification as Read

```typescript
import { markNotificationRead } from '@/src/notifications/supabaseHelpers';

async function markAsRead(notificationId: number) {
  await markNotificationRead(notificationId);
  console.log('Marked as read');
}
```

### 4. Get/Update User Preferences

```typescript
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/src/notifications/supabaseHelpers';
import { Storage } from '@/src/utils/storage';

async function updatePreferences() {
  const userId = await Storage.getItem('user_id');

  // Get current preferences
  const prefs = await getNotificationPreferences(parseInt(userId));
  console.log('Current preferences:', prefs);

  // Update preferences
  await updateNotificationPreferences(parseInt(userId), {
    enablePush: true,
    enablePantryAlerts: true,
    pantryAlertDays: 5, // Alert 5 days before expiration
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  console.log('Preferences updated');
}
```

### 5. Subscribe to Realtime Updates

```typescript
import { subscribeToNotifications } from '@/src/notifications/supabaseHelpers';
import { Storage } from '@/src/utils/storage';

function setupRealtimeNotifications() {
  const userId = await Storage.getItem('user_id');

  // Subscribe to new notifications
  const unsubscribe = subscribeToNotifications(
    parseInt(userId),
    (notification) => {
      console.log('New notification received:', notification);

      // Show in-app alert or update UI
      Alert.alert(
        notification.title,
        notification.message
      );

      // Refresh notification list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  );

  // Call unsubscribe when component unmounts
  return unsubscribe;
}

// In React component
useEffect(() => {
  const unsubscribe = setupRealtimeNotifications();
  return unsubscribe;
}, []);
```

---

## Backend API Calls

### 1. Fetch Notifications

```typescript
import { getNotifications } from '@/src/services/notification.service';

async function loadNotifications() {
  try {
    // Get all notifications
    const all = await getNotifications();

    // Get unread only
    const unread = await getNotifications({ is_read: false });

    // Get specific type
    const mealRequests = await getNotifications({ type: 'meal_share_request' });

    // Paginated
    const page1 = await getNotifications({ skip: 0, limit: 20 });
    const page2 = await getNotifications({ skip: 20, limit: 20 });

    return all;
  } catch (error) {
    console.log('Error fetching notifications:', error);
    throw error;
  }
}
```

### 2. Get Unread Count

```typescript
import { getUnreadCount } from '@/src/services/notification.service';

async function updateBadge() {
  const { count } = await getUnreadCount();
  console.log('Unread notifications:', count);

  // Update badge
  await Notifications.setBadgeCountAsync(count);
}
```

### 3. Mark Notification as Read

```typescript
import { markNotificationAsRead } from '@/src/services/notification.service';

async function readNotification(notificationId: number) {
  const updatedNotif = await markNotificationAsRead(notificationId);
  console.log('Updated:', updatedNotif);

  // Refresh count
  await updateBadge();
}
```

### 4. Mark All as Read

```typescript
import { markAllNotificationsAsRead } from '@/src/services/notification.service';

async function clearAllUnread() {
  const { count } = await markAllNotificationsAsRead();
  console.log(`Marked ${count} notifications as read`);

  // Clear badge
  await Notifications.setBadgeCountAsync(0);
}
```

### 5. Delete Notification

```typescript
import { deleteNotification } from '@/src/services/notification.service';

async function removeNotification(notificationId: number) {
  await deleteNotification(notificationId);
  console.log('Notification deleted');
}
```

---

## Expo Push Notifications

### 1. Send Push from Backend (Python)

```python
import requests
import json

def send_expo_push(
    expo_token: str,
    title: str,
    body: str,
    data: dict = None,
    category: str = None
):
    """Send push notification via Expo Push API"""

    url = 'https://exp.host/--/api/v2/push/send'

    payload = {
        'to': expo_token,
        'title': title,
        'body': body,
        'data': data or {},
        'sound': 'default',
        'priority': 'high',
        'channelId': category or 'default',
    }

    if category:
        payload['categoryId'] = category

    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }

    response = requests.post(url, json=payload, headers=headers)
    result = response.json()

    if result.get('data', {}).get('status') == 'error':
        raise Exception(f"Push failed: {result['data']['message']}")

    return result

# Example: Meal Request Notification
send_expo_push(
    expo_token='ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    title='New Meal Request',
    body='Sarah requested spaghetti for dinner',
    data={
        'category': 'meal_request',
        'mealId': 123,
        'requesterId': 456,
        'requesterName': 'Sarah',
    },
    category='meal_request'
)

# Example: Freshly Update
send_expo_push(
    expo_token='ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    title='New Feature: Recipe Collections',
    body='Organize your favorite recipes into collections!',
    data={
        'category': 'freshly_update',
        'updateType': 'feature_update',
        'actionUrl': 'freshly://recipes/collections',
    },
    category='freshly_update'
)

# Example: User Message
send_expo_push(
    expo_token='ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    title='Message from Mom',
    body='Can you pick up milk on your way home?',
    data={
        'category': 'user_message',
        'senderId': 789,
        'senderName': 'Mom',
        'messagePreview': 'Can you pick up milk...',
        'conversationId': 101,
    },
    category='user_message'
)
```

### 2. Send Push from Backend (Node.js)

```javascript
const axios = require('axios');

async function sendExpoPush(expoToken, title, body, data = {}, category = null) {
  const url = 'https://exp.host/--/api/v2/push/send';

  const payload = {
    to: expoToken,
    title,
    body,
    data,
    sound: 'default',
    priority: 'high',
    channelId: category || 'default',
  };

  if (category) {
    payload.categoryId = category;
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const result = response.data;

    if (result.data?.status === 'error') {
      console.log(`Push failed: ${result.data.message}`);
    }

    return result;
  } catch (error) {
    console.log('Error sending push notification:', error);
    throw error;
  }
}

// Example usage
await sendExpoPush(
  'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  'Pantry Alert',
  'Your milk expires in 2 days',
  {
    category: 'pantry_expiration',
    itemId: 456,
    itemName: 'Milk',
    daysUntilExpiration: 2,
  },
  'pantry_expiration'
);
```

### 3. Batch Send (Multiple Recipients)

```python
def send_batch_push(notifications: list):
    """Send push to multiple users at once"""

    url = 'https://exp.host/--/api/v2/push/send'

    # Format: list of notification objects
    payload = [
        {
            'to': notif['token'],
            'title': notif['title'],
            'body': notif['body'],
            'data': notif.get('data', {}),
            'sound': 'default',
            'priority': 'high',
        }
        for notif in notifications
    ]

    response = requests.post(
        url,
        json=payload,
        headers={'Content-Type': 'application/json'}
    )

    return response.json()

# Send to entire family
family_notifications = [
    {
        'token': 'ExponentPushToken[user1_token]',
        'title': 'Family Dinner',
        'body': 'Dinner is ready!',
        'data': {'category': 'family'},
    },
    {
        'token': 'ExponentPushToken[user2_token]',
        'title': 'Family Dinner',
        'body': 'Dinner is ready!',
        'data': {'category': 'family'},
    },
]

send_batch_push(family_notifications)
```

---

## Local Notification Examples

### 1. Schedule Pantry Expiration Notification

```typescript
import { schedulePantryExpirationNotifications } from '@/src/notifications/schedulePantryNotifications';

// Called automatically on app start and when pantry items change
async function checkPantryExpirations() {
  await schedulePantryExpirationNotifications();
  console.log('Pantry notifications scheduled');
}
```

### 2. Schedule Custom Local Notification

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function scheduleReminder() {
  // Schedule for specific date/time
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meal Prep Reminder',
      body: 'Time to prepare dinner!',
      data: { type: 'meal_prep' },
      sound: true,
      ...(Platform.OS === 'android' && {
        channelId: 'freshly-default',
      }),
    },
    trigger: {
      date: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
  });

  // Schedule daily at specific time
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Pantry Check',
      body: 'Check your pantry for expiring items',
      data: { type: 'daily_check' },
      sound: false,
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });

  // Schedule weekly
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly Grocery Planning',
      body: 'Plan your grocery list for the week',
      data: { type: 'weekly_planning' },
      sound: true,
    },
    trigger: {
      weekday: 1, // Monday
      hour: 10,
      minute: 0,
      repeats: true,
    },
  });
}
```

### 3. Send Immediate Local Notification

```typescript
import * as Notifications from 'expo-notifications';

async function showInstantNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Item Added to Pantry',
      body: 'Milk has been added to your pantry',
      data: { itemId: 123 },
      sound: true,
    },
    trigger: null, // Show immediately
  });
}
```

### 4. Get All Scheduled Notifications

```typescript
import * as Notifications from 'expo-notifications';

async function listScheduledNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  console.log(`Total scheduled: ${scheduled.length}`);

  scheduled.forEach((notif) => {
    console.log('Notification:', {
      id: notif.identifier,
      title: notif.content.title,
      trigger: notif.trigger,
    });
  });

  return scheduled;
}
```

### 5. Cancel Specific Notification

```typescript
import * as Notifications from 'expo-notifications';

async function cancelNotification(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
  console.log('Notification cancelled');
}

// Cancel all notifications
async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All notifications cancelled');
}
```

---

## Complete Usage Flow

### Full Implementation Example

```typescript
import React, { useEffect } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import { useNotificationSystem } from '@/hooks/useNotifications';
import { schedulePantryExpirationNotifications } from '@/src/notifications/schedulePantryNotifications';
import NotificationCard from '@/components/NotificationCard';

export default function NotificationExampleScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    permissionsGranted,
    expoPushToken,
    registerForPush,
    refresh,
  } = useNotificationSystem();

  useEffect(() => {
    // Auto-register for push on mount
    if (!permissionsGranted && !expoPushToken) {
      registerForPush();
    }
  }, []);

  const handleSchedulePantryCheck = async () => {
    try {
      await schedulePantryExpirationNotifications();
      Alert.alert('Success', 'Pantry notifications scheduled');
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule notifications');
    }
  };

  const handleRefresh = async () => {
    await refresh();
    Alert.alert('Success', 'Notifications refreshed');
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
        Notification System Demo
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Text>Permissions: {permissionsGranted ? ' Granted' : ' Denied'}</Text>
        <Text>Push Token: {expoPushToken ? ' Registered' : ' Not registered'}</Text>
        <Text>Unread Count: {unreadCount}</Text>
      </View>

      <View style={{ gap: 8, marginBottom: 16 }}>
        <Button title="Register for Push" onPress={registerForPush} />
        <Button title="Schedule Pantry Check" onPress={handleSchedulePantryCheck} />
        <Button title="Refresh Notifications" onPress={handleRefresh} />
      </View>

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
        Notifications ({notifications.length})
      </Text>

      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onPress={(notif) => {
            console.log('Tapped notification:', notif.id);
          }}
        />
      ))}
    </View>
  );
}
```

---

## Testing Push Notifications

### Method 1: Expo Push Notification Tool

1. Get your Expo push token from the app
2. Visit https://expo.dev/notifications
3. Paste your token
4. Enter title, message, and data
5. Click "Send Notification"

### Method 2: Using cURL

```bash
curl -H "Content-Type: application/json" \
     -X POST https://exp.host/--/api/v2/push/send \
     -d '{
  "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
  "title": "Test Notification",
  "body": "This is a test from cURL",
  "data": {
    "category": "meal_request",
    "mealId": 123
  }
}'
```

### Method 3: Using Postman

```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json

Body:
{
  "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
  "title": "Test from Postman",
  "body": "Testing push notifications",
  "data": {
    "category": "system"
  },
  "sound": "default",
  "priority": "high"
}
```

---

## Common Patterns

### Pattern 1: Show notification after API success

```typescript
import { createPantryItem } from '@/src/services/pantry.service';
import { schedulePantryExpirationNotifications } from '@/src/notifications/schedulePantryNotifications';

async function addItem(item) {
  // Add to pantry
  const newItem = await createPantryItem(item);

  // Schedule notifications
  await schedulePantryExpirationNotifications();

  // Show success notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Item Added',
      body: `${item.name} has been added to your pantry`,
    },
    trigger: null,
  });

  return newItem;
}
```

### Pattern 2: Notification with action buttons (iOS)

```typescript
// Setup in app initialization
await Notifications.setNotificationCategoryAsync('meal_request', [
  {
    identifier: 'accept',
    buttonTitle: 'Accept',
    options: { opensAppToForeground: true },
  },
  {
    identifier: 'decline',
    buttonTitle: 'Decline',
    options: { opensAppToForeground: false },
  },
]);

// Send notification with category
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Meal Request',
    body: 'Sarah wants pasta for dinner',
    categoryIdentifier: 'meal_request',
  },
  trigger: null,
});
```

### Pattern 3: Badge management

```typescript
import { setBadgeCount, clearBadgeCount } from '@/src/notifications/registerForPush';

// Update badge when unread count changes
useEffect(() => {
  setBadgeCount(unreadCount);
}, [unreadCount]);

// Clear badge when user opens app
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      clearBadgeCount();
    }
  });

  return () => subscription.remove();
}, []);
```

---

**API Examples Version:** 1.0.0
**Last Updated:** 2025-01-17
