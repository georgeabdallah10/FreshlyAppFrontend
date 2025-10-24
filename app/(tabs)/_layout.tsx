import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,        // hide the top header inside the Tabs
        tabBarShowLabel: false,    // hide labels by default
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          // keep the header hidden and hide the bottom tab bar on this screen
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}