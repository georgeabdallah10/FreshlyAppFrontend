// ==================== OwnerView.tsx ====================
import ToastBanner from "@/components/generalMessage";
import { useUser } from "@/context/usercontext";
import {
    listFamilyMembers,
    regenerateInviteCode,
    removeFamilyMember
} from "@/src/user/family";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Clipboard,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { FamilyData, FamilyMember } from "../../app/(home)/MyFamily";


interface OwnerViewProps {
  familyData: FamilyData;
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localInviteCode, setLocalInviteCode] = useState(familyData.inviteCode);

  const [localMembers, setLocalMembers] = useState<FamilyMember[]>(
    members ?? []
  );
  const [loadingMembers, setLoadingMembers] = useState(false);
  const {user} = useUser();

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
    try {
      setLoadingMembers(true);
      const fetched = await listFamilyMembers(Number(familyData.id));
      setLocalMembers(fetched);
    } catch (e) {
      console.error("Failed to load members:", e);
      showToast("error", "Couldn't load members");
    } finally {
      setLoadingMembers(false);
    }
  }, [familyData.id]);

  useEffect(() => {
    // Load on mount and when family changes
    loadMembers();
  }, [loadMembers]);

  const apiRegenerateCode = useCallback(async (): Promise<string> => {
    // Backend returns FamilyOut; use snake or camel defensively
    const fam = await regenerateInviteCode(Number(familyData.id));
    const next = (fam as any).inviteCode ?? (fam as any).invite_code ?? "";
    return String(next);
  }, [familyData.id]);

  const apiKickMember = useCallback(
    async (memberId: string) => {
      await removeFamilyMember(Number(familyData.id), Number(memberId));
    },
    [familyData.id]
  );

  const runRegenerateCode = onRegenerateCode ?? apiRegenerateCode;
  const runKickMember = onKickMember ?? apiKickMember;

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
        message: `Join our family on Freshly!\n\nFamily: ${familyData.name}\nInvite Code: ${localInviteCode}\n\nDownload the app and enter this code to join.`,
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

  const handleKickMember = (member: FamilyMember) => {
    showToast(
      "confirm",
      `Are you sure you want to remove ${member.name} from the family?`,
      "Remove Member",
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => setToast({ ...toast, visible: false })
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setToast({ ...toast, visible: false });
            try {
              await runKickMember(member.id);
              // Optimistically remove from UI, then refresh in background
              setLocalMembers((prev) => prev.filter((m) => m.id !== member.id));
              loadMembers();
              showToast(
                "success",
                `${member.name} has been removed from the family`
              );
            } catch (error) {
              console.error("Kick member error:", error);
              showToast(
                "error",
                "Failed to remove member. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: FamilyMember["status"]) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "inactive":
        return "#EF4444";
    }
  };

  const getStatusText = (status: FamilyMember["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending":
        return "Pending";
      case "inactive":
        return "Inactive";
    }
  };

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
          <Text style={styles.familyName}>{familyData.name}</Text>
          <Text style={styles.familyMemberCount}>
            {familyData.memberCount} Members
          </Text>

          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color="#10B981" />
            <Text style={styles.inviteButtonText}>Share Invite Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {loadingMembers ? (
            <Text style={{ color: "#9CA3AF", marginBottom: 8 }}>Loading…</Text>
          ) : null}
          {localMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberLeft}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {member.name}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {member.role === "owner" && (
                      <View style={styles.ownerBadge}>
                        <Ionicons name="create" size={12} color="#F59E0B" />
                        <Text style={styles.ownerBadgeText}>Owner</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.memberDetail}>
                    <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.detailText}>{member.email}</Text>
                  </View>
                  <View style={styles.memberDetail}>
                    <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.detailText}>{member.phone}</Text>
                  </View>
                  <View style={styles.memberDetail}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(member.status) },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {getStatusText(member.status)}
                    </Text>
                  </View>
                </View>
              </View>

              {member.role !== "owner" && (
                <TouchableOpacity
                  style={styles.kickButton}
                  onPress={() => handleKickMember(member)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  kickButton: {
    padding: 8,
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
});

export default OwnerView;
