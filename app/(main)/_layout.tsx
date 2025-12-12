import { useUser } from "@/context/usercontext";
import {
    handlePendingNotification,
    setupNotificationCategories,
    setupNotificationReceivedListener,
    setupNotificationResponseListener
} from "@/src/notifications/handleIncomingNotifications";
import { registerForPushNotifications } from "@/src/notifications/registerForPush";
import { Slot } from "expo-router";
import { useEffect } from "react";

export default function MainLayout() {
  const userContext = useUser();
  const user = userContext?.user;

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
