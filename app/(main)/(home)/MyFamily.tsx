// ==================== FamilyManagementScreen.tsx ====================
import MemberView from "@/components/familyMangment/MemberView";
import OwnerView from "@/components/familyMangment/OwnerView";
import { useFamilyContext } from "@/context/familycontext";
import { useUser } from "@/context/usercontext";
import {
  deleteFamily,
  leaveFamily,
  listFamilyMembers,
  regenerateInviteCode,
  removeFamilyMember,
} from "@/src/user/family";
import { useRouter } from "expo-router";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";
import FamilyMemberFlow from "../../(auth)/familyAuth";

type UserRole = "owner" | "admin" | "member" | "user";
type MemberStatus = "active" | "pending" | "inactive";

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  role: UserRole;
  joinedAt: string;
  avatar_path?: string | null;
}

export interface FamilyData {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  memberCount: number;
}

const FamilyManagementScreen = () => {
  const router = useRouter();
  const userContext = useUser();
  const familyContext = useFamilyContext();
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  
  const user = userContext?.user;
  const families = familyContext?.families ?? [];
  const familiesLoading = familyContext?.loading ?? false;
  const selectedFamily = familyContext?.selectedFamily;
  const setSelectedFamilyId = familyContext?.setSelectedFamilyId;
  const refreshFamilies = familyContext?.refreshFamilies;
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("user");
  const [currentUserId, setCurrentUserId] = useState<string>(user?.id ? String(user.id) : "");
  const [members, setMembers] = useState<FamilyMember[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const familyData: FamilyData | null = selectedFamily
    ? {
        id: selectedFamily.id,
        name: selectedFamily.name,
        inviteCode: selectedFamily.inviteCode,
        createdAt: selectedFamily.createdAt,
        memberCount: members.length || selectedFamily.memberCount,
      }
    : null;

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedFamily?.id) {
        setCurrentUserRole(families.length ? "member" : "user");
        setMembers([]);
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const rawMembers = await listFamilyMembers(Number(selectedFamily.id));
        const membersList = rawMembers ?? [];

        const normalizedMembers: FamilyMember[] = membersList.map((m: any) => {
        // Try multiple paths for user data (nested object or flat structure)
        const u = m.user ?? {};
        
        // Check if this is the owner
        const isOwner = m.is_owner || m.role === "owner";
        const userId = u.id ?? m.user_id ?? m.id ?? "";
        
        // Try nested user object first, then fall back to top-level fields
        let name = u.display_name ?? u.full_name ?? u.name ?? m.display_name ?? m.full_name ?? m.name ?? "";
        let email = u.email ?? m.email ?? "";
        let phone = (u.phone ?? u.phone_number ?? m.phone ?? m.phone_number) ?? "";
        
        // If data is missing and this is the current user, use context
        if (String(userId) === String(user?.id)) {
          name = name || user?.name || "Owner";
          email = email || user?.email || "";
          phone = phone || (user as any)?.phone_number || (user as any)?.phone || "";
        }
        
        // Final fallback - use email or "Unknown Member"
        if (!name || name.trim() === "") name = email || "Unknown Member";
        
        return {
          id: String(userId),
          name,
          email,
          phone,
          status: (m.status ?? "active") as MemberStatus,
          role: (m.role ?? (m.is_owner ? "owner" : "member")) as UserRole,
          joinedAt: m.created_at ?? m.joined_at ?? "",
          avatar_path: u.avatar_path ?? m.avatar_path ?? null,
        };
      });
        setMembers(normalizedMembers);
        const meRow = normalizedMembers.find((m) => m.id === String(user?.id));
        if (
          meRow?.role === "owner" ||
          meRow?.role === "admin" ||
          meRow?.role === "member"
        ) {
          setCurrentUserRole(meRow.role);
        } else {
          setCurrentUserRole("member");
        }
      } catch (error) {
        console.log("Error fetching family data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [families.length, selectedFamily, user?.email, user?.id, user?.name]);

  // Entrance animations - super fast and snappy
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRegenerateCode = async () => {
    if (!familyData) return;
    try {
      const updated = await regenerateInviteCode(Number(familyData.id));
      const newCode = updated?.invite_code ?? updated?.inviteCode ?? "";
      if (refreshFamilies) {
        await refreshFamilies();
      }
      return newCode;
    } catch (error) {
      console.log("Error regenerating code:", error);
      throw error;
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!familyData) return;
    try {
      await removeFamilyMember(Number(familyData.id), Number(memberId));
      const rawMembers = await listFamilyMembers(Number(familyData.id));
      const normalizedMembers: FamilyMember[] = (rawMembers ?? []).map((m: any) => {
        const u = m.user ?? {};
        const isOwner = m.is_owner || m.role === "owner";
        const userId = u.id ?? m.user_id ?? m.id ?? "";
        
        let name = u.display_name ?? u.full_name ?? u.name ?? m.display_name ?? m.full_name ?? m.name ?? "";
        let email = u.email ?? m.email ?? "";
        let phone = (u.phone ?? u.phone_number ?? m.phone ?? m.phone_number) ?? "";
        
        // If this is the current user, use context data
        if (String(userId) === String(user?.id)) {
          name = name || user?.name || "Owner";
          email = email || user?.email || "";
          phone = phone || (user as any)?.phone_number || (user as any)?.phone || "";
        }
        
        if (!name || name.trim() === "") name = email || "Unknown Member";
        
        return {
          id: String(userId),
          name,
          email,
          phone,
          status: (m.status ?? "active") as MemberStatus,
          role: (m.role ?? (m.is_owner ? "owner" : "member")) as UserRole,
          joinedAt: m.created_at ?? m.joined_at ?? "",
        };
      });
      setMembers(normalizedMembers);
      if (refreshFamilies) {
        await refreshFamilies();
      }
    } catch (error) {
      console.log("Error kicking member:", error);
      throw error;
    }
  };

  const handleLeaveFamily = async () => {
    if (!familyData) return;
    try {
      await leaveFamily(Number(familyData.id), Number(user?.id));
      setMembers([]);
      setCurrentUserRole("user");
      if (setSelectedFamilyId) {
        setSelectedFamilyId(null);
      }
      if (refreshFamilies) {
        await refreshFamilies();
      }
    } catch (error) {
      console.log("Error leaving family:", error);
      throw error;
    }
  };

  const handleDeleteFamily = async () => {
    if (!familyData) return;
    try {
      await deleteFamily(Number(familyData.id));
      setMembers([]);
      setCurrentUserRole("user");
      if (setSelectedFamilyId) {
        setSelectedFamilyId(null);
      }
      if (refreshFamilies) {
        await refreshFamilies();
      }
      router.replace("/(auth)/familyAuth");
    } catch (error) {
      console.log("Error deleting family:", error);
      throw error;
    }
  };

  if (isLoading || familiesLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {currentUserRole === "owner" ? (
        <OwnerView
          familyData={familyData ?? undefined}
          members={members}
          currentUserId={currentUserId}
          onBack={() => router.back()}
          onRegenerateCode={handleRegenerateCode}
          onKickMember={handleKickMember}
          onDeleteFamily={handleDeleteFamily}
        />
      ) : currentUserRole === "member" || currentUserRole === "admin" ?  (
        <MemberView
          familyData={familyData ?? undefined}
          members={members}
          currentUserId={currentUserId}
          viewerRole={currentUserRole === "admin" ? "admin" : "member"}
          onBack={() => router.back()}
          onLeaveFamily={handleLeaveFamily}
        />
      ) : (
        <FamilyMemberFlow
          showBackButton={true}
          onBack={() => router.back()}
          onComplete={async () => {
            // Refresh family data after creating/joining
            if (refreshFamilies) {
              await refreshFamilies();
            }
          }}
        />
      )}
    </Animated.View>
  );
};

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  primary: colors.primary,
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      paddingTop: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default FamilyManagementScreen;
