import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";
import { supabase } from "../supabase/client";

export async function registerForPushNotifications(userId: number) {
  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Notifications Disabled", "Please enable notifications.");
    return null;
  }

  // Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "YOUR_EXPO_PROJECT_ID",
  });

  const expoPushToken = tokenData.data;

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // Store token in Supabase
  await supabase.from("user_push_tokens").upsert({
    user_id: userId,
    expo_push_token: expoPushToken,
    platform: Platform.OS,
  });

  return expoPushToken;
}

export async function isPushNotificationEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}
