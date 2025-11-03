import { getCurrentUser, updateUserInfo as updateUserInfoApi } from "@/src/auth/auth";
import { listMyPantryItems } from "@/src/user/pantry";
import { getMyprefrences } from "@/src/user/setPrefrences";
import { Storage } from "@/src/utils/storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type PantryItem = {
  id: number;
  name: string;
  quantity: number;
  category: string;
};

type User = {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_path?: string;
  status?: string;
};

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserInfo: (
    patch: Partial<{ name: string; email: string; phone_number: string; location: string; status: string; avatar_path: string;}>
  ) => Promise<User>;
  prefrences: string[];
  pantryItems:PantryItem[] ;
  loadPantryItems: () => Promise<void>;
};


const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [prefrences, setPrefrences] = useState([]);
const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  useEffect(() => {
    refreshUser();
  }, []);

  const updateUserInfo = async (
    patch: Partial<{ name: string; email: string; phone_number: string ; location: string; status: string; avatar_path: string;}>
  ) => {
    try {
      const updated = await updateUserInfoApi(patch);
      // if your API wrapper returns `{ ok, data }` instead of direct user, normalize here:
      // const updatedUser = (updated as any)?.data ?? updated;
      const updatedUser: User = (updated as any)?.data ?? updated;
      setUser((prev) => ({ ...(prev ?? {}), ...updatedUser }));
      return updatedUser;
    } catch (err: any) {
      // Silently handle update errors - they will be caught by the caller
      throw err;
    }
  };
useEffect(() => {
  const userPrefrences = async () => {
    try {
      const res = await getMyprefrences();
      if (res?.ok) setPrefrences(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const loadPantryItems = async () => {
    try {
      const res = await listMyPantryItems();
      // If your API returns { ok, data }, use data:
      if ((res as any)?.ok) {
        setPantryItems((res as any).data as PantryItem[]);
      } else {
        // If it returns a plain array, this also works:
        setPantryItems(res as PantryItem[]);
      }
    } catch (err) {
      console.log(err);
    }
  };

  loadPantryItems();
  userPrefrences();
}, []);
  const loadPantryItems = async () => {
    try {
      const res = await listMyPantryItems();
      // If your API returns { ok, data }, use data:
      if ((res as any)?.ok) {
        setPantryItems((res as any).data as PantryItem[]);
      } else {
        // If it returns a plain array, this also works:
        setPantryItems(res as PantryItem[]);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await getCurrentUser();
      if (res.ok && res.data) {
        setUser(res.data as User);
      } else {
        // User not authenticated - clear user state
        setUser(null);
      }
    } catch (err) {
      // Silent failure - user will be redirected to login
      setUser(null);
    }
  };

  const logout = async () => {
    await Storage.deleteItem("access_token");
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{ user, setUser, logout, refreshUser, updateUserInfo, prefrences, pantryItems, loadPantryItems}}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
};
