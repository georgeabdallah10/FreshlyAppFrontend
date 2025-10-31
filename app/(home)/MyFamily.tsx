// ==================== FamilyManagementScreen.tsx ====================
import React, { useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/context/usercontext";
import OwnerView from "@/components/familyMangment/OwnerView";
import MemberView from "@/components/familyMangment/MemberView";
import {
  listMyFamilies,
  listFamilyMembers,
  leaveFamily,
  removeFamilyMember,
  regenerateInviteCode,
} from "@/src/user/family";
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
      const normalizedFamily: FamilyData = {
        id: String(fam.id),
        name: fam.display_name ?? fam.name ?? "My Family",
        inviteCode: fam.invite_code ?? fam.inviteCode ?? "",
        createdAt: fam.created_at ?? fam.createdAt ?? "",
        memberCount: fam.member_count ?? fam.memberCount ?? 0,
      };
      setFamilyData(normalizedFamily);
      const rawMembers = await listFamilyMembers(Number(fam.id));
      const normalizedMembers: FamilyMember[] = (rawMembers ?? []).map((m: any) => {
        const u = m.user ?? {};
        return {
          id: String(u.id ?? m.user_id ?? m.id ?? ""),
          name: u.display_name ?? u.full_name ?? u.name ?? "Unknown",
          email: u.email ?? "",
          phone: u.phone ?? "",
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
        return {
          id: String(u.id ?? m.user_id ?? m.id ?? ""),
          name: u.display_name ?? u.full_name ?? u.name ?? "Unknown",
          email: u.email ?? "",
          phone: u.phone ?? "",
          status: (m.status ?? "active") as MemberStatus,
          role: (m.role ?? (m.is_owner ? "owner" : m.is_owner ?"member" : "user")) as UserRole,
          joinedAt: m.created_at ?? m.joined_at ?? "",
        };
      });
      setMembers(normalizedMembers);
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
        <FamilyMemberFlow/>
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