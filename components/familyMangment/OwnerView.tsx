// ==================== OwnerView.tsx ====================
import MemberActionModal from "@/components/familyMangment/MemberActionModal";
import ToastBanner from "@/components/generalMessage";
import IconButton from "@/components/iconComponent";
import { useFamilyContext } from "@/context/familycontext";
import { useUser } from "@/context/usercontext";
import { usePendingRequestCount } from "@/hooks/useMealShare";
import {
    listFamilyMembers,
    regenerateInviteCode,
    removeFamilyMember,
    updateFamilyMemberRole,
} from "@/src/user/family";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Animated,
    Clipboard,
    Image,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { FamilyData, FamilyMember } from "../../app/(main)/(home)/MyFamily";


interface OwnerViewProps {
  familyData?: FamilyData;
  members?: FamilyMember[];
  currentUserId: string;
  onBack: () => void;
  onRegenerateCode?: () => Promise<string>;
  onKickMember?: (memberId: string) => Promise<void>;
}

const OwnerView: React.FC<OwnerViewProps> = ({
  familyData,
  members,
  currentUserId,
  onBack,
  onRegenerateCode,
  onKickMember,
}) => {
  const router = useRouter();
  const {user} = useUser(); // Get user context first
  const { selectedFamily } = useFamilyContext();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  const [localInviteCode, setLocalInviteCode] = useState(
    resolvedFamilyData?.inviteCode ?? ""
  );
  useEffect(() => {
    if (resolvedFamilyData?.inviteCode) {
      setLocalInviteCode(resolvedFamilyData.inviteCode);
    }
  }, [resolvedFamilyData?.inviteCode]);

  // Normalize raw API members to the UI shape expected here
  const normalizeMembers = useCallback((raw: any[]): FamilyMember[] => {
    return (raw ?? []).map((m: any) => {
      // Try multiple paths for user data (nested object or flat structure)
      const u = m.user ?? {};
      
      // If the user is the owner, they might be in the current user context
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
        status: (m.status ?? "active") as FamilyMember["status"],
        role: (m.role ?? (m.is_owner ? "owner" : "member")) as FamilyMember["role"],
        joinedAt: m.created_at ?? m.joined_at ?? "",
        avatar_path: u.avatar_path ?? m.avatar_path ?? null,
      } as FamilyMember;
    });
  }, [user]);

  const sortMembers = useCallback((list: FamilyMember[]) => {
    return [...list].sort((a, b) => {
      const priority = (role: FamilyMember["role"]) => {
        if (role === "owner") return 0;
        if (role === "admin") return 1;
        return 2;
      };
      const diff = priority(a.role) - priority(b.role);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const [localMembers, setLocalMembers] = useState<FamilyMember[]>(() =>
    members ? sortMembers(members) : []
  );
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [roleActionMemberId, setRoleActionMemberId] = useState<string | null>(null);
  const [removeActionMemberId, setRemoveActionMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  
  // Keep local list in sync when parent provides normalized members
  useEffect(() => {
    if (members && members.length) {
      setLocalMembers(sortMembers(members));
    }
  }, [members, sortMembers]);

  const ownerCount = useMemo(
    () => localMembers.filter((member) => member.role === "owner").length,
    [localMembers]
  );

  const canManageMember = useCallback(
    (member: FamilyMember) => String(member.id) !== String(currentUserId),
    [currentUserId]
  );
  
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

  const loadMembers = useCallback(async () => {
    if (!resolvedFamilyData?.id) return;
    try {
      setLoadingMembers(true);
      const fetched = await listFamilyMembers(Number(resolvedFamilyData.id));
      // Normalize backend shape -> UI shape
      setLocalMembers(sortMembers(normalizeMembers(fetched)));
    } catch (e) {
      console.error("Failed to load members:", e);
      showToast("error", "Couldn't load members");
    } finally {
      setLoadingMembers(false);
    }
  }, [normalizeMembers, resolvedFamilyData?.id, sortMembers]);

  useEffect(() => {
    // Load on mount and when family changes
    loadMembers();
  }, [loadMembers]);

  const apiRegenerateCode = useCallback(async (): Promise<string> => {
    if (!resolvedFamilyData?.id) return "";
    // Backend returns FamilyOut; use snake or camel defensively
    const fam = await regenerateInviteCode(Number(resolvedFamilyData.id));
    const next = (fam as any).inviteCode ?? (fam as any).invite_code ?? "";
    return String(next);
  }, [resolvedFamilyData?.id]);

  const apiKickMember = useCallback(
    async (memberId: string) => {
      if (!resolvedFamilyData?.id) return;
      await removeFamilyMember(Number(resolvedFamilyData.id), Number(memberId));
    },
    [resolvedFamilyData?.id]
  );

  const runRegenerateCode = onRegenerateCode ?? apiRegenerateCode;
  const runKickMember = onKickMember ?? apiKickMember;
  const mapMembership = useCallback(
    (entry: any) => normalizeMembers(entry ? [entry] : [])[0],
    [normalizeMembers]
  );

  const ensureOwnerCount = useCallback(
    (member: FamilyMember, nextRole: FamilyMember["role"]) => {
      if (!canManageMember(member)) {
        showToast("error", "You cannot change your own role.");
        return false;
      }
      if (
        member.role === "owner" &&
        nextRole !== "owner" &&
        ownerCount <= 1
      ) {
        showToast(
          "error",
          "At least one owner is required. Promote another member before demoting."
        );
        return false;
      }
      return true;
    },
    [ownerCount, showToast]
  );

  const handleRoleChange = useCallback(
    async (member: FamilyMember, nextRole: FamilyMember["role"]) => {
      if (!resolvedFamilyData?.id || member.role === nextRole) return;
      if (!ensureOwnerCount(member, nextRole)) return;

      try {
        setRoleActionMemberId(member.id);
        const updated = await updateFamilyMemberRole(
          Number(resolvedFamilyData.id),
          Number(member.id),
          nextRole as "owner" | "admin" | "member"
        );
        const normalized = mapMembership(updated);
        if (normalized) {
          setLocalMembers((prev) =>
            sortMembers(prev.map((m) => (m.id === member.id ? normalized : m)))
          );
          const roleLabel =
            nextRole === "owner"
              ? "Owner"
              : nextRole === "admin"
              ? "Admin"
              : "Member";
          showToast(
            "success",
            `${member.name || "Member"} is now ${roleLabel}.`
          );
        } else {
          loadMembers();
        }
      } catch (error: any) {
        showToast("error", error?.message || "Failed to update role");
      } finally {
        setRoleActionMemberId(null);
      }
    },
    [
      resolvedFamilyData?.id,
      ensureOwnerCount,
      mapMembership,
      loadMembers,
      showToast,
      sortMembers,
    ]
  );

  const canRemoveMember = useCallback(
    (member: FamilyMember) => {
      if (!canManageMember(member)) return false;
      if (member.role === "owner" && ownerCount <= 1) return false;
      return true;
    },
    [canManageMember, ownerCount]
  );

  const handleRemoveMember = useCallback(
    async (member: FamilyMember) => {
      if (!resolvedFamilyData?.id) return;
      if (!canRemoveMember(member)) {
        showToast(
          "error",
          "You must keep at least one owner in the family."
        );
        return;
      }

      try {
        setRemoveActionMemberId(member.id);
        await runKickMember(member.id);
        setLocalMembers((prev) => prev.filter((m) => m.id !== member.id));
        showToast("success", `${member.name} has been removed from the family`);
      } catch (error: any) {
        showToast("error", error?.message || "Failed to remove member");
      } finally {
        setRemoveActionMemberId(null);
      }
    },
    [resolvedFamilyData?.id, canRemoveMember, runKickMember, showToast]
  );

  const handleKickMember = useCallback(
    (member: FamilyMember) => {
      showToast(
        "confirm",
        `Are you sure you want to remove ${member.name} from the family?`,
        "Remove Member",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setToast({ ...toast, visible: false }),
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              setToast({ ...toast, visible: false });
              await handleRemoveMember(member);
            },
          },
        ]
      );
    },
    [handleRemoveMember, showToast, toast]
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
    setSelectedMember(null);
    setActionModalVisible(false);
  }, []);

  const handlePromoteSelected = useCallback(async () => {
    if (!selectedMember || selectedMember.role !== "member") return;
    await handleRoleChange(selectedMember, "admin");
    closeActionModal();
  }, [closeActionModal, handleRoleChange, selectedMember]);

  const handleDemoteSelected = useCallback(async () => {
    if (!selectedMember || selectedMember.role === "member") return;
    await handleRoleChange(selectedMember, "member");
    closeActionModal();
  }, [closeActionModal, handleRoleChange, selectedMember]);

  const handleRemoveSelected = useCallback(async () => {
    if (!selectedMember) return;
    closeActionModal();
    handleKickMember(selectedMember);
  }, [closeActionModal, handleKickMember, selectedMember]);

  const inviteSlideAnim = useRef(new Animated.Value(0)).current;
  const inviteFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showInviteModal) {
      Animated.parallel([
        Animated.timing(inviteFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(inviteSlideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(inviteFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(inviteSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showInviteModal]);

  const handleRegenerateCode = async () => {
    try {
      setIsRegenerating(true);
      const newCode = await runRegenerateCode();
      setLocalInviteCode(newCode);
      showToast("success", "New invite code generated successfully!");
    } catch (error) {
      console.error("Regenerate code error:", error);
      showToast("error", "Failed to regenerate code. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join our family on Savr!\n\nFamily: ${resolvedFamilyData?.name ?? "My Family"}\nInvite Code: ${localInviteCode}\n\nDownload the app and enter this code to join.`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCopyCode = () => {
    try {
      if (Clipboard && typeof Clipboard.setString === "function") {
        Clipboard.setString(localInviteCode);
      }
      showToast("success", "Invite code copied to clipboard");
    } catch {
      showToast("success", "Invite code copied");
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
          <Text style={styles.familyName}>{resolvedFamilyData?.name ?? "My Family"}</Text>
          <Text style={styles.familyMemberCount}>
            {resolvedFamilyData?.memberCount ?? localMembers.length} Members
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => setShowInviteModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={20} color="#10B981" />
              <Text style={styles.inviteButtonText}>Share Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {loadingMembers ? (
            <Text style={{ color: "#9CA3AF", marginBottom: 8 }}>Loading…</Text>
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
                  isCurrentUser && styles.currentUserCard,
                  !isCurrentUser && isOwner && styles.ownerCardHighlight,
                  !isCurrentUser && isAdmin && styles.adminCardHighlight,
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
                        {(member.name?.trim?.()?.[0] ?? "?").toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>
                        {member.name || "Unknown"}
                      </Text>
                      {member.role === "owner" && (
                        <View style={styles.ownerBadge}>
                          <Ionicons name="create" size={12} color="#F59E0B" />
                          <Text style={styles.ownerBadgeText}>Owner</Text>
                        </View>
                      )}
                      {member.role === "admin" && (
                        <View style={styles.adminBadge}>
                          <Ionicons
                            name="shield-checkmark"
                            size={12}
                            color="#2563EB"
                          />
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.memberDetail}>
                      <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
                      <Text style={styles.detailText}>
                        {member.email || "—"}
                      </Text>
                    </View>
                    <View style={styles.memberDetail}>
                      <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                      <Text style={styles.detailText}>
                        {member.phone || "—"}
                      </Text>
                    </View>
                  </View>
                </View>

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
      </ScrollView>

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
          (selectedMember.role === "admin" || selectedMember.role === "owner")
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
          selectedMember.role !== "member"
        }
        isRemoving={
          !!selectedMember && removeActionMemberId === selectedMember.id
        }
      />

      {/* Invite Code Modal */}
      <Modal
        visible={showInviteModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        >
          <Animated.View
            style={[styles.backdrop, { opacity: inviteFadeAnim }]}
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
                      translateY: inviteSlideAnim.interpolate({
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
                <View style={styles.modalIcon}>
                  <Ionicons name="key" size={32} color="#10B981" />
                </View>
              </View>

              <Text style={styles.modalTitle}>Family Invite Code</Text>
              <Text style={styles.modalSubtitle}>
                Share this code with family members
              </Text>

              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{localInviteCode}</Text>
              </View>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={20} color="#10B981" />
                  <Text style={styles.modalButtonSecondaryText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={handleShareCode}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.modalButtonPrimaryText}>Share</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={handleRegenerateCode}
                disabled={isRegenerating}
                activeOpacity={0.8}
              >
                {isRegenerating ? (
                  <Text style={styles.regenerateButtonText}>Generating...</Text>
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color="#6B7280" />
                    <Text style={styles.regenerateButtonText}>
                      Generate New Code
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    marginBottom: 20,
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
  roleActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
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
  memberDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: "#6B7280",
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  requestsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
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

export default OwnerView;
