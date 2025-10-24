import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import "react-native-reanimated";
import { Stack } from "expo-router";
import SplashScreen from "@/components/loadingpage";
import * as Splash from "expo-splash-screen";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { UserProvider } from "@/context/usercontext";

export const unstable_settings = {
  initialRouteName: "index",
};

// Hide the native (app.json) splash immediately once JS loads
Splash.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    Splash.hideAsync();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000); // show your custom splash for 2s
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />; // your custom splash component
  }

  return (
    <>
    <StatusBar hidden={true}/>
    <UserProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        {/* expo-router supplies the NavigationContainer; do not nest another */}
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </ThemeProvider>
    </UserProvider>
    </>
  );
}
