import { UserProvider } from "@/context/usercontext";
import { FamilyProvider } from "@/context/familycontext";
import { GroceryListProvider } from "@/context/groceryListContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import QueryPersistProvider from "@/providers/QueryPersistProvider";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
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
      <QueryPersistProvider>
        <UserProvider>
          <FamilyProvider>
            <GroceryListProvider>
              <ThemeProvider
                value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
              >
                <Slot />
              </ThemeProvider>
            </GroceryListProvider>
          </FamilyProvider>
        </UserProvider>
      </QueryPersistProvider>
    </>
  );
}