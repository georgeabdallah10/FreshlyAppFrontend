import { UserProvider } from "@/context/usercontext";
import { FamilyProvider } from "@/context/familycontext";
import { GroceryListProvider } from "@/context/groceryListContext";
import { ThemeProvider, useThemeContext } from "@/context/ThemeContext";
import QueryPersistProvider from "@/providers/QueryPersistProvider";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  return (
    <>
      <StatusBar hidden={true} />
      <ThemeProvider>
        <RootProviders />
      </ThemeProvider>
    </>
  );
}

const RootProviders = () => {
  const { theme } = useThemeContext();

  return (
    <QueryPersistProvider>
      <UserProvider>
        <FamilyProvider>
          <GroceryListProvider>
            <NavigationThemeProvider
              value={theme.mode === "dark" ? DarkTheme : DefaultTheme}
            >
              <Slot />
            </NavigationThemeProvider>
          </GroceryListProvider>
        </FamilyProvider>
      </UserProvider>
    </QueryPersistProvider>
  );
};
