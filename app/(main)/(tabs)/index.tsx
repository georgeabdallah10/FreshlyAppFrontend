// app/(tabs)/index.tsx
import { getCurrentUser } from "@/src/auth/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function IndexPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  

  useEffect(() => {
    const checkLogged = async () => {
      try {
        // Check if access_token exists in AsyncStorage first (faster, reduces API calls)
        const token = await AsyncStorage.getItem("access_token");
        
        if (token) {
          // Token exists, user is logged in
          console.log("TOKEN DID WORk")
          console.log(token)
          setLoggedIn(true);
        } else {
          // No token, verify with API
          const res = await getCurrentUser();
          setLoggedIn(res.ok);
        }
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

  return <Redirect href={loggedIn ? "/(home)/main" as any : "/(auth)/Login" as any} />;
}