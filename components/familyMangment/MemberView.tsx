// ==================== MemberView.tsx ====================
import ToastBanner from "@/components/generalMessage";
import { useUser } from "@/context/usercontext";
import {
    leaveFamily,
    listFamilyMembers,
    listMyFamilies,
} from "@/src/user/family";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { FamilyData, FamilyMember } from "../../app/(home)/MyFamily";

interface MemberViewProps {
  familyData: FamilyData;
  members?: FamilyMember[];
  currentUserId: string;
  onBack: () => void;
  onLeaveFamily?: () => Promise<void>;
}

const MemberView: React.FC<MemberViewProps> = ({
  familyData,
  members,
  currentUserId,
  onBack,
  onLeaveFamily,
}) => {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [localMembers, setLocalMembers] = useState<FamilyMember[]>(members ?? []);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(familyData?.inviteCode ?? (familyData as any)?.invite_code ?? null);
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

  const leaveSlideAnim = useRef(new Animated.Value(0)).current;
  const leaveFadeAnim = useRef(new Animated.Value(0)).current;

  const fetchMembers = async () => {
    if (!familyData?.id) return;
    try {
      setLoading(true);
      const data = await listFamilyMembers(Number(familyData.id));
      setLocalMembers(data || []);
    } catch (e) {
      console.warn("Failed to load members:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchInviteCode = async () => {
    try {
      const families = await listMyFamilies();
      const current = families?.find((f: any) => f.id === familyData.id);
      if (current) {
        setInviteCode(current.inviteCode ?? current.invite_code ?? null);
      }
    } catch (e) {
      console.warn("Failed to load invite code:", e);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchInviteCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyData?.id]);

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
        await leaveFamily(Number(familyData.id), Number(user?.id));
      }
      showToast("success", "You have successfully left the family");
      setShowLeaveModal(false);
      onBack();
    } catch (error) {
      showToast("error", "Failed to leave family. Please try again.");
    }
  };

  const getStatusColor = (status: FamilyMember["status"]) => {
    switch (status) {
      case "active": return "#10B981";
      case "pending": return "#F59E0B";
      case "inactive": return "#EF4444";
    }
  };

  const getStatusText = (status: FamilyMember["status"]) => {
    switch (status) {
      case "active": return "Active";
      case "pending": return "Pending";
      case "inactive": return "Inactive";
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
        </View>

        {inviteCode ? (
          <View style={styles.codeContainer}>
            <Text style={styles.sectionTitle}>Invite Code</Text>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(inviteCode);
                  showToast("success", "Invite code copied to clipboard");
                } catch {
                  showToast("success", "Invite code copied");
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="copy" size={16} color="#10B981" />
              <Text style={styles.modalButtonSecondaryText}>Copy Code</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          
          {loading ? (
            <Text style={{ color: "#6B7280", marginBottom: 8 }}>Loading members...</Text>
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
            </View>
          ))}
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
                Are you sure you want to leave {familyData.name}? You'll need a new invite code to rejoin.
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
});

export default MemberView;