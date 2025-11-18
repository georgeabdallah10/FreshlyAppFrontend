import { queryClient } from '@/src/config/queryClient';
import SplashScreen from "@/components/loadingpage";
import { UserProvider } from "@/context/usercontext";
import { FamilyProvider } from "@/context/familycontext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import "../global.css";
import { setupNotificationHandler, setupNotificationCategories } from "@/src/notifications/registerForPush";
import { setupNotificationResponseListener, setupNotificationReceivedListener, handlePendingNotification } from "@/src/notifications/handleIncomingNotifications";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

useEffect(() => {
  console.log("TRY TRY TRY")
  const timer = setTimeout(() => {
    setShowSplash(false);
  }, 2000);

  return () => clearTimeout(timer);
}, []);

// Initialize notification system
useEffect(() => {
  let responseListener: (() => void) | undefined;
  let receivedListener: (() => void) | undefined;

  async function initializeNotifications() {
    try {
      console.log('[App] Initializing notification system...');

      // Setup notification handler for foreground behavior
      setupNotificationHandler();

      // Setup notification categories (iOS action buttons)
      await setupNotificationCategories();

      // Setup listeners for notification events
      responseListener = setupNotificationResponseListener();
      receivedListener = setupNotificationReceivedListener();

      // Handle any pending notification that opened the app
      await handlePendingNotification();

      console.log('[App] Notification system initialized successfully');
    } catch (error) {
      console.error('[App] Error initializing notifications:', error);
    }
  }

  initializeNotifications();

  // Cleanup listeners on unmount
  return () => {
    responseListener?.();
    receivedListener?.();
  };
}, []);

if (showSplash) {
  return <SplashScreen />;
}
  return (
    <>
      <StatusBar hidden={true} />
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <FamilyProvider>
            <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
              <Slot /> 
            </ThemeProvider>
          </FamilyProvider>
        </UserProvider>
      </QueryClientProvider>
    </>
  );
}
