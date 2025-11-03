import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export const Storage = {
  async setItem(key: string, value: string) {
    // Write to SecureStore (primary)
    await SecureStore.setItemAsync(key, value);
    // Mirror to AsyncStorage for modules that read from it (e.g., apiClient)
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Non-fatal: keep going if AsyncStorage is unavailable
    }
  },
  async getItem(key: string): Promise<string | null> {
    // Prefer SecureStore
    const secureVal = await SecureStore.getItemAsync(key);
    if (secureVal != null) return secureVal;
    // Fallback to AsyncStorage (for pre-existing writes)
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async deleteItem(key: string) {
    await SecureStore.deleteItemAsync(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },
};