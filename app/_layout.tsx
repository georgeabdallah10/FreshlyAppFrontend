import { queryClient } from "@/src/config/queryClient";
import { UserProvider } from "@/context/usercontext";
import { FamilyProvider } from "@/context/familycontext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <StatusBar hidden={true} />
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <FamilyProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Slot />
            </ThemeProvider>
          </FamilyProvider>
        </UserProvider>
      </QueryClientProvider>
    </>
  );
}