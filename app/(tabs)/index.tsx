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


export default function App(): React.JSX.Element {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogged = async () => {
      const token = await SecureStore.getItemAsync("access_token");
      console.log("Hello")
      const test = await getCurrentUser()
      if (test.ok){
        setLoggedIn(true)
      }
    };
    checkLogged();
  });
  return loggedIn ? <HomeDashboard /> : <LoginScreen />;
}
