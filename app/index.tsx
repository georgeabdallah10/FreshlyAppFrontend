// app/index.tsx
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const [navigated, setNavigated] = useState(false);

  // On native (iOS/Android), use imperative replace for reliability on simulators
  useEffect(() => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      // Defer to next tick to ensure router is mounted
      const t = setTimeout(() => {
        if (!navigated) {
          router.replace("/(main)/(tabs)");
          setNavigated(true);
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, [router, navigated]);

  // Minimal native loader while we replace
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}