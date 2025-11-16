import { getCurrentUser, updateUserInfo as updateUserInfoApi } from "@/src/auth/auth";
import { listMyFamilies } from "@/src/user/family";
import { listMyPantryItems } from "@/src/user/pantry";
import { getMyprefrences } from "@/src/user/setPrefrences";
import { Storage } from "@/src/utils/storage";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

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
    patch: Partial<{
      name: string;
      email: string;
      phone_number: string;
      location: string;
      status: string;
      avatar_path: string;
      age: number | null;
      height: number | null;
      weight: number | null;
      gender: "male" | "female" | null;
    }>
  ) => Promise<User>;
  prefrences: string[];
  pantryItems:PantryItem[] ;
  loadPantryItems: () => Promise<void>;
  activeFamilyId: number | null;
  refreshFamilyMembership: () => Promise<number | null>;
  setActiveFamilyId: React.Dispatch<React.SetStateAction<number | null>>;
};


const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [prefrences, setPrefrences] = useState([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<number | null>(null);
  useEffect(() => {
    refreshUser();
  }, []);

  const updateUserInfo = async (
    patch: Partial<{
      name: string;
      email: string;
      phone_number: string;
      location: string;
      status: string;
      avatar_path: string;
      age: number | null;
      height: number | null;
      weight: number | null;
      gender: "male" | "female" | null;
    }>
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
  const normalizePantryResponse = (res: any): PantryItem[] => {
    if (Array.isArray(res)) return res as PantryItem[];
    if (Array.isArray(res?.data)) return res.data as PantryItem[];
    if (Array.isArray(res?.items)) return res.items as PantryItem[];
    return [];
  };

  const extractFamilyId = (entry: any): number | null => {
    const raw =
      entry?.id ??
      entry?.family_id ??
      entry?.familyId ??
      entry?.family?.id ??
      null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const refreshFamilyMembership = useCallback(async (): Promise<number | null> => {
    try {
      const families = await listMyFamilies();
      if (Array.isArray(families) && families.length > 0) {
        for (const entry of families) {
          const id = extractFamilyId(entry);
          if (id !== null) {
            setActiveFamilyId(id);
            return id;
          }
        }
      }
      setActiveFamilyId(null);
      return null;
    } catch (err) {
      console.log(err);
      setActiveFamilyId((prev) => prev ?? null);
      return activeFamilyId ?? null;
    }
  }, [activeFamilyId]);

  const loadPantryItems = useCallback(async () => {
    try {
      let familyId = activeFamilyId;
      if (familyId == null) {
        familyId = await refreshFamilyMembership();
      }
      const res = await listMyPantryItems(
        familyId ? { familyId } : undefined
      );
      setPantryItems(normalizePantryResponse(res));
    } catch (err) {
      console.log(err);
      setPantryItems([]);
    }
  }, [activeFamilyId, refreshFamilyMembership]);

  useEffect(() => {
    loadPantryItems();
  }, [loadPantryItems]);

  useEffect(() => {
    const userPrefrences = async () => {
      try {
        const res = await getMyprefrences();
        if (res?.ok) setPrefrences(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    userPrefrences();
  }, []);

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
      value={{
        user,
        setUser,
        logout,
        refreshUser,
        updateUserInfo,
        prefrences,
        pantryItems,
        loadPantryItems,
        activeFamilyId,
        refreshFamilyMembership,
        setActiveFamilyId,
      }}
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
