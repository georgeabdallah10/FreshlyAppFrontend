import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export const Storage = {
  async setItem(key: string, value: string) {
    if (isWeb) {
      sessionStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return sessionStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  async deleteItem(key: string) {
    if (isWeb) {
      sessionStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};