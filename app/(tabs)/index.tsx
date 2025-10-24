// app/(tabs)/index.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import HomeDashboard from "../(home)/main";
import LoginScreen from "../(auth)/Login";
import CreateAccountScreen from "../(auth)/signup";
import PantryDashboard from "../(home)/pantry";
import { getCurrentUser } from "@/api/Auth/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// ...

export default function App(): React.JSX.Element {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null = still loading

  useEffect(() => {
    const checkLogged = async () => {
      try {
        console.log("TRY TRY TRY TRY RTY TRY RTYT RYRT YTR Y")
        //const token = await SecureStore.getItemAsync("access_token");
        const test = await getCurrentUser();
        if (test.ok) {
          setLoggedIn(true);
        } else {
          setLoggedIn(false);
        }
      } catch (err) {
        console.error("Login check failed:", err);
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

  return loggedIn ? <HomeDashboard /> : <LoginScreen />;
}
