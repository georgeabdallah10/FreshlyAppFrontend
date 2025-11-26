import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listMyFamilies, type FamilyResponse } from "@/src/user/family";
import { useRouter } from "expo-router";
import { useUser } from "./usercontext";

export type FamilySummary = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
  raw: Record<string, any>;
};

type FamilyContextType = {
  families: FamilySummary[];
  loading: boolean;
  error: string | null;
  selectedFamily: FamilySummary | null;
  selectedFamilyId: string | null;
  setSelectedFamilyId: (id: string | null) => void;
  refreshFamilies: () => Promise<void>;
};

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

const normalizeFamily = (entry: FamilyResponse): FamilySummary => {
  return {
    id: String(entry.id),
    name: entry.display_name,
    inviteCode: entry.invite_code,
    memberCount: entry.count,
    createdAt: "",
    raw: entry,
  };
};

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const { logout } = useUser();
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [authRedirected, setAuthRedirected] = useState(false);

  const handleUnauthorized = useCallback(async (message?: string) => {
    if (authRedirected) return true;
    setAuthRedirected(true);
    await logout();
    router.replace("/(auth)/Login");
    setError(message ?? "Session expired. Please log in again.");
    return true;
  }, [authRedirected, logout, router]);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyFamilies();
      const normalized = Array.isArray(data)
        ? data.map(normalizeFamily).filter((family) => !!family.id)
        : [];
      setFamilies(normalized);
      if (
        normalized.length > 0 &&
        (!selectedFamilyId ||
          !normalized.some((family) => family.id === selectedFamilyId))
      ) {
        setSelectedFamilyId(normalized[0].id);
      }
      setError(null);
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        err?.status === 401 ||
        msg.toLowerCase().includes("session expired") ||
        msg.includes("401") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        await handleUnauthorized(msg);
        setLoading(false);
        return;
      }
      setError(err?.message || "Failed to load families");
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFamilyId, handleUnauthorized]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const selectedFamily = useMemo(() => {
    if (!selectedFamilyId) return families[0] ?? null;
    return families.find((family) => family.id === selectedFamilyId) ?? null;
  }, [families, selectedFamilyId]);

  return (
    <FamilyContext.Provider
      value={{
        families,
        loading,
        error,
        selectedFamily,
        selectedFamilyId,
        setSelectedFamilyId,
        refreshFamilies: fetchFamilies,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamilyContext = () => {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error("useFamilyContext must be used within a FamilyProvider");
  }
  return ctx;
};
