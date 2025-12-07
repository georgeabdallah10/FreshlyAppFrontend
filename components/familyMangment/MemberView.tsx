// ==================== MemberView.tsx ====================
import MemberActionModal from "@/components/familyMangment/MemberActionModal";
import ToastBanner from "@/components/generalMessage";
import IconButton from "@/components/iconComponent";
import { useFamilyContext } from "@/context/familycontext";
import { useUser } from "@/context/usercontext";
import { usePendingRequestCount } from "@/hooks/useMealShare";
import {
  leaveFamily,
  listFamilyMembers,
  removeFamilyMember,
  updateFamilyMemberRole,
} from "@/src/user/family";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { FamilyData, FamilyMember } from "../../app/(main)/(home)/MyFamily";

interface MemberViewProps {
  familyData?: FamilyData;
  members?: FamilyMember[];
  currentUserId: string;
  viewerRole: "admin" | "member";
  onBack: () => void;
  onLeaveFamily?: () => Promise<void>;
}

const MemberView: React.FC<MemberViewProps> = ({
  familyData,
  members,
  currentUserId,
  viewerRole,
  onBack,
  onLeaveFamily,
}) => {
  const router = useRouter();
  const {user} = useUser(); // Get user context first
  const { selectedFamily } = useFamilyContext();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const resolvedFamilyData = useMemo(() => {
    if (familyData) return familyData;
    if (selectedFamily) {
      return {
        id: selectedFamily.id,
        name: selectedFamily.name,
        inviteCode: selectedFamily.inviteCode,
        createdAt: selectedFamily.createdAt,
        memberCount: selectedFamily.memberCount,
      } as FamilyData;
    }
    return null;
  }, [familyData, selectedFamily]);
  
  // Normalize members - Backend now returns consistent nested user structure
  const normalizeMembers = useCallback((raw: any[]): FamilyMember[] => {
    return (raw ?? []).map((m: any) => {
      const u = m.user ?? {};
      const userId = String(m.user_id || u.id || m.id || "");
      const isOwner = m.role === "owner" || m.is_owner === true;
      const isAdmin = m.role === "admin";
      
      // Get user details from nested user object (backend now guarantees this)
      const name = u.name || u.full_name || u.display_name || "Unknown Member";
      const email = u.email || "";
      const phone = u.phone_number || u.phone || "";
      
      // Determine role: owner > admin > member
      let role: "owner" | "admin" | "member" = "member";
      if (isOwner) role = "owner";
      else if (isAdmin) role = "admin";
      
      return {
        id: userId,
        name,
        email: email || "No email",
        phone: phone || "No phone",
        status: (m.status ?? "active") as FamilyMember["status"],
        role,
        joinedAt: m.joined_at ?? m.created_at ?? "",
        avatar_path: u.avatar_path ?? m.avatar_path ?? null,
      } as FamilyMember;
    });
  }, [user]);
  
  const sortMembers = useCallback((list: FamilyMember[], userId?: string) => {
    return [...list].sort((a, b) => {
      const priority = (member: FamilyMember) => {
        if (member.role === "owner") return 0;
        if (member.role === "admin") return 1;
        // Current user comes after owners and admins
        if (userId && String(member.id) === String(userId)) return 2;
        return 3;
      };
      const diff = priority(a) - priority(b);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const [localMembers, setLocalMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(
    resolvedFamilyData?.inviteCode ?? null
  );
  const [roleActionMemberId, setRoleActionMemberId] = useState<string | null>(null);
  const [removeActionMemberId, setRemoveActionMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  useEffect(() => {
    if (resolvedFamilyData?.inviteCode) {
      setInviteCode(resolvedFamilyData.inviteCode);
    }
  }, [resolvedFamilyData?.inviteCode]);
  
  // Get pending meal share request count
  const { data: pendingCount = 0 } = usePendingRequestCount();

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "confirm" | "info";
    message: string;
    title?: string;
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "destructive" | "cancel";
    }>;
  }>({
    visible: false,
    type: "info",
    message: "",
  });

  const isAdminViewer = viewerRole === "admin";

  const canManageMember = useCallback(
    (member: FamilyMember) =>
      isAdminViewer && String(member.id) !== String(currentUserId),
    [isAdminViewer, currentUserId]
  );

  const openActionModal = useCallback(
    (member: FamilyMember) => {
      if (!canManageMember(member)) return;
      setSelectedMember(member);
      setActionModalVisible(true);
    },
    [canManageMember]
  );

  const closeActionModal = useCallback(() => {
    setActionModalVisible(false);
    setSelectedMember(null);
  }, []);

  const showToast = (
    type: "success" | "error" | "confirm" | "info",
    message: string,
    title?: string,
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "destructive" | "cancel";
    }>
  ) => {
    setToast({ visible: true, type, message, title, buttons });
  };

  const leaveSlideAnim = useRef(new Animated.Value(0)).current;
  const leaveFadeAnim = useRef(new Animated.Value(0)).current;

  const fetchMembers = async () => {
    if (!resolvedFamilyData?.id) return;
    try {
      setLoading(true);
      const data = await listFamilyMembers(Number(resolvedFamilyData.id));
      console.log(data)
      const normalized = normalizeMembers(data || []);
      setLocalMembers(sortMembers(normalized, currentUserId));
    } catch (e) {
      console.warn("Failed to load members:", e);
    } finally {
      setLoading(false);
    }
  };

  const mapMembership = useCallback(
    (entry: any) => normalizeMembers(entry ? [entry] : [])[0],
    [normalizeMembers]
  );

  const handleRoleChange = useCallback(
    async (member: FamilyMember, nextRole: FamilyMember["role"]) => {
      if (!isAdminViewer || member.role === nextRole) return;
      try {
        setRoleActionMemberId(member.id);
        const updated = await updateFamilyMemberRole(
          Number(resolvedFamilyData?.id),
          Number(member.id),
          nextRole as "owner" | "admin" | "member"
        );
        const normalized = mapMembership(updated);
        if (normalized) {
          setLocalMembers((prev) =>
            sortMembers(prev.map((m) => (m.id === member.id ? normalized : m)), currentUserId)
          );
          showToast("success", `${member.name} is now ${nextRole}.`);
        }
      } catch (error: any) {
        showToast("error", error?.message || "Failed to update role.");
      } finally {
        setRoleActionMemberId(null);
      }
    },
    [
      resolvedFamilyData?.id,
      isAdminViewer,
      mapMembership,
      showToast,
    ]
  );

  const canRemoveMember = useCallback(
    (member: FamilyMember) =>
      isAdminViewer &&
      member.role !== "owner" &&
      String(member.id) !== String(currentUserId),
    [isAdminViewer, currentUserId]
  );

  const handleRemoveMember = useCallback(
    async (member: FamilyMember) => {
      if (!canRemoveMember(member)) return;
      try {
        setRemoveActionMemberId(member.id);
        await removeFamilyMember(Number(resolvedFamilyData?.id), Number(member.id));
        setLocalMembers((prev) => prev.filter((m) => m.id !== member.id));
        showToast("success", `${member.name} has been removed.`);
      } catch (error: any) {
        showToast("error", error?.message || "Failed to remove member.");
      } finally {
        setRemoveActionMemberId(null);
      }
    },
    [canRemoveMember, resolvedFamilyData?.id, showToast]
  );

  const handlePromoteSelected = useCallback(async () => {
    if (!selectedMember) return;
    await handleRoleChange(selectedMember, "admin");
    closeActionModal();
  }, [closeActionModal, handleRoleChange, selectedMember]);

  const handleDemoteSelected = useCallback(async () => {
    if (!selectedMember) return;
    await handleRoleChange(selectedMember, "member");
    closeActionModal();
  }, [closeActionModal, handleRoleChange, selectedMember]);

  const handleRemoveSelected = useCallback(async () => {
    if (!selectedMember) return;
    await handleRemoveMember(selectedMember);
    closeActionModal();
  }, [closeActionModal, handleRemoveMember, selectedMember]);

  // Initialize members from props on mount
  useEffect(() => {
    if (members && members.length > 0) {
      setLocalMembers(sortMembers(normalizeMembers(members), currentUserId));
    }
  }, [members, normalizeMembers, sortMembers, currentUserId]);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedFamilyData?.id]);

  useEffect(() => {
    if (showLeaveModal) {
      Animated.parallel([
        Animated.timing(leaveFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(leaveSlideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(leaveFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(leaveSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showLeaveModal]);

  const confirmLeaveFamily = async () => {
    try {
      if (onLeaveFamily) {
        await onLeaveFamily();
      } else {
        await leaveFamily(Number(resolvedFamilyData?.id), Number(user?.id));
      }
      showToast("success", "You have successfully left the family");
      setShowLeaveModal(false);
      onBack();
    } catch (error) {
      showToast("error", "Failed to leave family. Please try again.");
    }
  };

  if (!resolvedFamilyData) {
    return null;
  }

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.familyCard}>
          <View style={styles.familyIconContainer}>
            <Ionicons name="home" size={32} color="#10B981" />
          </View>
          <Text style={styles.familyName}>{resolvedFamilyData.name}</Text>
          <Text style={styles.familyMemberCount}>
            {resolvedFamilyData.memberCount} Members
          </Text>
          
          {inviteCode ? (
            <View style={styles.inviteCodeContainer}>
              <View style={styles.inviteCodeRow}>
                <Ionicons name="key-outline" size={14} color="#10B981" />
                <Text style={styles.inviteCodeLabel}>Invite Code</Text>
              </View>
              <View style={styles.inviteCodeValueRow}>
                <Text style={styles.inviteCodeValue}>{inviteCode}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(inviteCode);
                      showToast("success", "Invite code copied to clipboard");
                    } catch {
                      showToast("success", "Invite code copied");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={18} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          
          {loading ? (
            <Text style={{ color: "#6B7280", marginBottom: 8 }}>Loading members...</Text>
          ) : null}
          {localMembers.map((member) => {
            const isCurrentUser = String(member.id) === String(currentUserId);
            const isOwner = member.role === "owner";
            const isAdmin = member.role === "admin";
            return (
              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  // Role-based styling takes priority over current user styling
                  isOwner && styles.ownerCardHighlight,
                  isAdmin && styles.adminCardHighlight,
                  // Current user styling only if not owner or admin
                  isCurrentUser && !isOwner && !isAdmin && styles.currentUserCard,
                ]}
              >
                <View style={styles.memberLeft}>
                  <View style={styles.memberAvatar}>
                    {member.avatar_path ? (
                      <Image
                        source={{ uri: member.avatar_path }}
                        style={styles.memberImage}
                      />
                    ) : (
                      <Text style={styles.memberInitial}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {member.role === "owner" && (
                        <View style={styles.ownerBadge}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.ownerBadgeText}>Owner</Text>
                        </View>
                      )}
                      {member.role === "admin" && (
                        <View style={styles.adminBadge}>
                          <Ionicons name="shield-checkmark" size={12} color="#2563EB" />
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.memberDetail}>
                      <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
                      <Text style={styles.detailText}>{member.email || "No email"}</Text>
                    </View>
                    <View style={styles.memberDetail}>
                      <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                      <Text style={styles.detailText}>{member.phone}</Text>
                    </View>
                  </View>
                </View>

                {/* Show action button for admins to manage other members */}
                
                {canManageMember(member) && (
                  <IconButton
                    iconName="settings-outline"
                    iconColor="#6B7280"
                    iconSize={20}
                    containerSize={36}
                    backgroundColor="#F3F4F6"
                    borderRadius={18}
                    onPress={() => openActionModal(member)}
                    style={styles.actionTrigger}
                  />
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => setShowLeaveModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="exit-outline" size={20} color="#EF4444" />
          <Text style={styles.leaveButtonText}>Leave Family</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Leave Family Confirmation Modal */}
      <Modal
        visible={showLeaveModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLeaveModal(false)}
        >
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: leaveFadeAnim },
            ]}
          />
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    {
                      translateY: leaveSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [400, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalIconContainer}>
                <View style={[styles.modalIcon, styles.modalIconDanger]}>
                  <Ionicons name="warning" size={32} color="#EF4444" />
                </View>
              </View>

              <Text style={styles.modalTitle}>Leave Family?</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to leave {resolvedFamilyData.name}? You'll need a new invite code to rejoin.
              </Text>

              <View style={styles.modalButtonsColumn}>
                <TouchableOpacity
                  style={styles.modalButtonDanger}
                  onPress={confirmLeaveFamily}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonDangerText}>Leave Family</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setShowLeaveModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <MemberActionModal
        visible={actionModalVisible && !!selectedMember}
        memberName={selectedMember?.name ?? ""}
        memberRole={(selectedMember?.role ?? "member") as "owner" | "admin" | "member"}
        onClose={closeActionModal}
        canPromote={
          !!selectedMember &&
          canManageMember(selectedMember) &&
          selectedMember.role === "member"
        }
        canDemote={
          !!selectedMember &&
          canManageMember(selectedMember) &&
          selectedMember.role === "admin"
        }
        canRemove={
          !!selectedMember &&
          canManageMember(selectedMember) &&
          canRemoveMember(selectedMember)
        }
        onPromote={handlePromoteSelected}
        onDemote={handleDemoteSelected}
        onRemove={handleRemoveSelected}
        isPromoting={
          !!selectedMember &&
          roleActionMemberId === selectedMember.id &&
          selectedMember.role === "member"
        }
        isDemoting={
          !!selectedMember &&
          roleActionMemberId === selectedMember.id &&
          selectedMember.role === "admin"
        }
        isRemoving={
          !!selectedMember && removeActionMemberId === selectedMember.id
        }
      />

      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast({ ...toast, visible: false })}
        topOffset={60}
      />
    </>
  );
};

// ==================== SHARED STYLES ====================
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  familyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  familyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  familyName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  familyMemberCount: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  inviteCodeContainer: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  inviteCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  inviteCodeLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#059669",
  },
  inviteCodeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inviteCodeValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  actionTrigger: {
    padding: 8,
    marginLeft: 8,
  },
  currentUserCard: {
    borderColor: "#FD8100",
    shadowColor: "#FD8100",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  memberImage: {
    width: "100%",
    height: "100%",
  },
  memberInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F59E0B",
  },
  memberDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: "#6B7280",
  },
  ownerCardHighlight: {
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  adminCardHighlight: {
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  kickButton: {
    padding: 8,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  leaveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  modalIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconDanger: {
    backgroundColor: "#FEE2E2",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  codeContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  codeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10B981",
    textAlign: "center",
    letterSpacing: 2,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  modalButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  modalButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#10B981",
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  modalButtonsColumn: {
    gap: 12,
  },
  modalButtonDanger: {
    paddingVertical: 14,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonDangerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalButtonCancel: {
    paddingVertical: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  requestsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginTop: 16,
    position: "relative",
  },
  requestsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});

export default MemberView;
