// app/(tabs)/index.tsx
import { useEffect, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { getCurrentUser } from "@/api/Auth/auth";

export default function IndexPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkLogged = async () => {
      try {
        const res = await getCurrentUser();
        setLoggedIn(res.ok);
      } catch (err) {
        setLoggedIn(false);
      }
    };

    checkLogged();
  }, []);

  if (loggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <Redirect href={loggedIn ? "/(home)/main" : "/(auth)/Login"} />;
}