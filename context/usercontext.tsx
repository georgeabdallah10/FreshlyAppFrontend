import { getCurrentUser, updateUserInfo as updateUserInfoApi } from "@/src/auth/auth";
import { supabase } from "@/src/supabase/client";
import { listMyFamilies, type FamilyResponse } from "@/src/user/family";
import { listMyPantryItems } from "@/src/user/pantry";
import { getMyprefrences, type UserPreferenceOut } from "@/src/user/setPrefrences";
import { Storage } from "@/src/utils/storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  gender?: "male" | "female" | null;
  calories?: number | null;
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
      calories: number | null;
    }>
  ) => Promise<User>;
  prefrences: UserPreferenceOut | null;
  pantryItems:PantryItem[] ;
  loadPantryItems: (force?: boolean) => Promise<void>;
  activeFamilyId: number | null;
  refreshFamilyMembership: () => Promise<number | null>;
  setActiveFamilyId: React.Dispatch<React.SetStateAction<number | null>>;
  isInFamily: boolean;
  families: FamilyResponse[];
};


const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [prefrences, setPrefrences] = useState<UserPreferenceOut | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<number | null>(null);
  const [families, setFamilies] = useState<FamilyResponse[]>([]);
  const [isInFamily, setIsInFamily] = useState<boolean>(false);
  const [pantryLoaded, setPantryLoaded] = useState(false);

  useEffect(() => {
    refreshUser();

    // Set up Supabase auth state listener
    console.log("[UserContext] Setting up auth state listener");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[UserContext] Auth state changed: ${event}`);
      
      if (event === 'SIGNED_IN' && session) {
        console.log("[UserContext] User signed in via OAuth, refreshing user data");
        // Refresh user data when signed in via OAuth
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        console.log("[UserContext] User signed out, clearing session");
        // Clear local state on sign out
        setUser(null);
        setPrefrences(null);
        setPantryItems([]);
        setActiveFamilyId(null);
        setFamilies([]);
        setIsInFamily(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("[UserContext] Token refreshed successfully");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("[UserContext] Cleaning up auth state listener");
      subscription.unsubscribe();
    };
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
      calories: number | null;
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

  const extractFamilyId = (entry: FamilyResponse): number | null => {
    const parsed = Number(entry?.id);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const refreshFamilyMembership = useCallback(async (): Promise<number | null> => {
    try {
      const familiesData = await listMyFamilies();
      setFamilies(familiesData || []);

      if (Array.isArray(familiesData) && familiesData.length > 0) {
        setIsInFamily(true);
        for (const entry of familiesData) {
          const id = extractFamilyId(entry);
          if (id !== null) {
            setActiveFamilyId(id);
            // Load family pantry items after setting family ID
            return id;
          }
        }
      }
      setIsInFamily(false);
      setActiveFamilyId(null);
      // Load personal pantry items when not in family
      return null;
    } catch (err) {
      console.log('[UserContext] refreshFamilyMembership error:', err);
      setIsInFamily(false);
      setFamilies([]);
      setActiveFamilyId((prev) => prev ?? null);
      return activeFamilyId ?? null;
    }
  }, [activeFamilyId]);

  const loadPantryItems = useCallback(async (force: boolean = false) => {
    // If already loaded and not forcing reload, skip
    if (pantryLoaded && !force) {
      return;
    }

    try {
      // If user is in a family, fetch family pantry items
      // Otherwise, fetch personal pantry items
      const shouldFetchFamily = isInFamily && activeFamilyId;

      const res = await listMyPantryItems(
        shouldFetchFamily ? { familyId: activeFamilyId } : undefined
      );
      setPantryItems(normalizePantryResponse(res));
      setPantryLoaded(true);
    } catch (err) {
      console.log('[UserContext] loadPantryItems error:', err);
      setPantryItems([]);
    }
  }, [isInFamily, activeFamilyId, pantryLoaded]);

  // Don't auto-load pantry items on mount - let the component request them when ready

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

  // Load family membership on mount - only run once
  useEffect(() => {
    refreshFamilyMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      const accessToken = await Storage.getItem("access_token");

      // Call backend to revoke tokens
      if (accessToken) {
        const { BASE_URL } = require("@/src/env/baseUrl");
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {
          // Continue with local cleanup even if API fails
        });
      }
    } catch (error) {
      console.log('[UserContext] Logout API call failed:', error);
      // Continue with local cleanup even if API fails
    } finally {
      // Clear stored tokens
      await Storage.deleteItem("access_token");
      await Storage.deleteItem("refresh_token");
      await Storage.deleteItem("tutorialCompleted"); // Reset tutorial on logout
      setUser(null);
      setActiveFamilyId(null);
      setIsInFamily(false);
      setFamilies([]);
      setPantryItems([]);
      setPantryLoaded(false);
    }
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
        isInFamily,
        families,
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
