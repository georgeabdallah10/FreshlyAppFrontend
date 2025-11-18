import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listMyFamilies } from "@/src/user/family";

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

const normalizeFamily = (entry: any): FamilySummary => {
  const id = entry?.id ?? entry?.family_id ?? entry?.familyId;
  return {
    id: id ? String(id) : "",
    name: entry?.display_name ?? entry?.name ?? "My Family",
    inviteCode: entry?.invite_code ?? entry?.inviteCode ?? "",
    memberCount:
      entry?.member_count ??
      entry?.memberCount ??
      (Array.isArray(entry?.members) ? entry.members.length : 0),
    createdAt: entry?.created_at ?? entry?.createdAt ?? "",
    raw: entry,
  };
};

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

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
      setError(err?.message || "Failed to load families");
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFamilyId]);

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
