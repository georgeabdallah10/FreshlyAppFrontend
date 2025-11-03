import * as SecureStore from "expo-secure-store";

export const Storage = {
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async getItem(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  },
  async deleteItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
};