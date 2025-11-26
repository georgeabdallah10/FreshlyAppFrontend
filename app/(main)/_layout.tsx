import { Slot } from "expo-router";
import { useEffect } from "react";
import { useUser } from "@/context/usercontext";
import {
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
  handlePendingNotification
} from "@/src/notifications/handleIncomingNotifications";
import { registerForPushNotifications } from "@/src/notifications/registerForPush";
import { setupNotificationCategories } from "@/src/notifications/handleIncomingNotifications";

export default function MainLayout() {
  const { user } = useUser();

  useEffect(() => {
    let responseListener: (() => void) | undefined;
    let receivedListener: (() => void) | undefined;

    async function init() {
      // 1. iOS notification categories (actions)
      await setupNotificationCategories();

      // 2. Listeners
      responseListener = setupNotificationResponseListener();
      receivedListener = setupNotificationReceivedListener();

      // 3. Notification that opened the app
      await handlePendingNotification();

      // 4. Register Expo push token once user is available
      if (user?.id) {
        await registerForPushNotifications(user.id);
      }
    }

    init();

    return () => {
      responseListener?.();
      receivedListener?.();
    };
  }, [user?.id]);

  return <Slot />;
}
