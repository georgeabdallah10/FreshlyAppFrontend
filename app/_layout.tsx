import { queryClient } from '@/src/config/queryClient';
import SplashScreen from "@/components/loadingpage";
import { UserProvider } from "@/context/usercontext";
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

if (showSplash) {
  return <SplashScreen />;
}
  return (
    <>
      <StatusBar hidden={true} />
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <Slot /> 
          </ThemeProvider>
        </UserProvider>
      </QueryClientProvider>
    </>
  );
}