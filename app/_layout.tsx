import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import "react-native-reanimated";
import { Slot } from "expo-router";
import SplashScreen from "@/components/loadingpage";
import * as Splash from "expo-splash-screen";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { UserProvider } from "@/context/usercontext";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

Splash.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    setShowSplash(false);
  }, 2000);

  return () => clearTimeout(timer);
}, []);

if (showSplash) {
  return <SplashScreen />;
}
  return (
    <>
      <StatusBar hidden={true} />
      <UserProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Slot /> {/* This renders the active route */}
        </ThemeProvider>
      </UserProvider>
    </>
  );
}