// ==================== FamilyManagementScreen.tsx ====================
import MemberView from "@/components/familyMangment/MemberView";
import OwnerView from "@/components/familyMangment/OwnerView";
import { useUser } from "@/context/usercontext";
import {
  leaveFamily,
  listFamilyMembers,
  listMyFamilies,
  regenerateInviteCode,
  removeFamilyMember,
} from "@/src/user/family";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import FamilyMemberFlow from "../(auth)/familyAuth";

type UserRole = "owner" | "member" | "user";
type MemberStatus = "active" | "pending" | "inactive";

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
  role: UserRole;
  joinedAt: string;
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
  const {user} = useUser();
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(user?.status);
  const [currentUserId, setCurrentUserId] = useState<string>(user?.id ? String(user.id) : "");
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    fetchUserRoleAndFamily();
  }, []);

  const fetchUserRoleAndFamily = async () => {
    try {
      setIsLoading(true);
      const families = await listMyFamilies();
      if (!families || families.length === 0) {
        setCurrentUserRole("user");
        setFamilyData(null);
        setMembers([]);
        return;
      }
      const fam = families[0];
      const rawMembers = await listFamilyMembers(Number(fam.id));
      const membersList = rawMembers ?? [];
      
      const normalizedFamily: FamilyData = {
        id: String(fam.id),
        name: fam.display_name ?? fam.name ?? "My Family",
        inviteCode: fam.invite_code ?? fam.inviteCode ?? "",
        createdAt: fam.created_at ?? fam.createdAt ?? "",
        memberCount: membersList.length, // Use actual members count instead of API field
      };
      setFamilyData(normalizedFamily);
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
        };
      });
      setMembers(normalizedMembers);
      const meRow = normalizedMembers.find((m) => m.id === String(user?.id));
      setCurrentUserRole(meRow?.role === "owner" ? "owner" : "member");
    } catch (error) {
      console.error("Error fetching family data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!familyData) return;
    try {
      const updated = await regenerateInviteCode(Number(familyData.id));
      const newCode = updated?.invite_code ?? updated?.inviteCode ?? "";
      setFamilyData((prev) => (prev ? { ...prev, inviteCode: newCode } : prev));
      return newCode;
    } catch (error) {
      console.error("Error regenerating code:", error);
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
      // Update family data with new member count
      setFamilyData((prev) => 
        prev ? { ...prev, memberCount: normalizedMembers.length } : prev
      );
    } catch (error) {
      console.error("Error kicking member:", error);
      throw error;
    }
  };

  const handleLeaveFamily = async () => {
    if (!familyData) return;
    try {
      await leaveFamily(Number(familyData.id), Number(user?.id));
      setFamilyData(null);
      setMembers([]);
      setCurrentUserRole("user");
      router.replace("/(auth)/familyAuth");
    } catch (error) {
      console.error("Error leaving family:", error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentUserRole === "owner" ? (
        <OwnerView
          familyData={familyData!}
          members={members}
          currentUserId={currentUserId}
          onBack={() => router.back()}
          onRegenerateCode={handleRegenerateCode}
          onKickMember={handleKickMember}
        />
      ) : currentUserRole === "member" ?  (
        <MemberView
          familyData={familyData!}
          members={members}
          currentUserId={currentUserId}
          onBack={() => router.back()}
          onLeaveFamily={handleLeaveFamily}
        />
      ) : (
        <FamilyMemberFlow
          showBackButton={true}
          onBack={() => router.back()}
          onComplete={async () => {
            // Refresh family data after creating/joining
            await fetchUserRoleAndFamily();
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
    paddingTop: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default FamilyManagementScreen;