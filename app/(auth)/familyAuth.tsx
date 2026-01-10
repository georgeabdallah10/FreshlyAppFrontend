// ==================== FamilyMemberFlow.tsx ====================
import ToastBanner from "@/components/generalMessage";
import { useFamilyContext } from "@/context/familycontext";
import { useUser } from "@/context/usercontext";
import {
  createFamily,
  joinFamilyByCode,
  listFamilyMembers,
  regenerateInviteCode
} from "@/src/user/family";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AppTextInput from "@/components/ui/AppTextInput";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";


type Screen = "initial" | "addMember" | "memberList";
type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

interface FamilyMemberFlowProps {
  onBack?: () => void;
  onComplete?: () => void;
  showBackButton?: boolean;
}

const FamilyMemberFlow = ({ onBack, onComplete, showBackButton = false }: FamilyMemberFlowProps = {}) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromOnboarding?: string }>();
  const isFromOnboarding = params.fromOnboarding === "true";
  const userContext = useUser();
  const familyContext = useFamilyContext();
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);

  const user = userContext?.user;
  const updateUserInfo = userContext?.updateUserInfo;
  const refreshFamilies = familyContext?.refreshFamilies;
  const setSelectedFamilyId = familyContext?.setSelectedFamilyId;
  const [currentScreen, setCurrentScreen] = useState<Screen>("initial");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [joinCode, setJoinCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [generatedInviteCode, setGeneratedInviteCode] = useState("");
  const [currentFamilyId, setCurrentFamilyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "info" | "confirm";
    message: string;
    title?: string;
    buttons?: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "destructive" | "cancel";
    }>;
  }>({ visible: false, type: "info", message: "" });

  const showToast = (
    type: "success" | "error" | "info",
    message: string,
    title?: string
  ) => {
    setToast({ visible: true, type, message, title });
  };

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const joinSlideAnim = useRef(new Animated.Value(0)).current;
  const joinFadeAnim = useRef(new Animated.Value(0)).current;
  const createSlideAnim = useRef(new Animated.Value(0)).current;
  const createFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showAddModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAddModal]);

  useEffect(() => {
    if (showJoinModal) {
      Animated.parallel([
        Animated.timing(joinFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(joinSlideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(joinFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(joinSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showJoinModal]);

  useEffect(() => {
    if (showCreateModal) {
      Animated.parallel([
        Animated.timing(createFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(createSlideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(createFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(createSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCreateModal]);

  const refreshMembers = async (familyId: number) => {
    try {
      const data = await listFamilyMembers(familyId);
      const mapped = (Array.isArray(data) ? data : []).map((m: any) => ({
        id: String(m.user_id ?? m.id ?? Math.random()),
        name: m.user?.display_name ?? m.display_name ?? m.name ?? "Member",
        email: m.user?.email ?? m.email ?? "",
        phone: m.user?.phone_number ?? m.phone ?? "",
      }));
      setMembers(mapped);
    } catch (e: any) {
      showToast("error", e.message || "Failed to load members", "Error");
    }
  };

  const handleCreateFamily = () => {
    setShowCreateModal(true);
  };


  const handleCreateSubmit = async () => {
    if (!familyName.trim()) {
      showToast("error", "Please enter a name for your family.", "Missing Information");
      return;
    }

    if (familyName.trim().length < 2) {
      showToast("error", "Family name must be at least 2 characters long.", "Invalid Name");
      return;
    }

    try {
      setIsLoading(true);
      const res = await createFamily(familyName.trim()); // { id, display_name, invite_code }
      const invite = res.invite_code || res.inviteCode || "";
      const fid = res.id as number;
      
      if (updateUserInfo) {
        updateUserInfo({
          status:"owner"
        });
      }

      if (refreshFamilies) {
        await refreshFamilies();
      }
      
      if (setSelectedFamilyId) {
        setSelectedFamilyId(fid ? String(fid) : null);
      }

      setGeneratedInviteCode(invite);
      setCurrentFamilyId(fid);
      setFamilyName("");
      setShowCreateModal(false);

      if (onComplete) {
        onComplete();
        return;
      }

      setToast({
        visible: true,
        type: "success",
        title: "Success",
        message: "Family created successfully.",
      });
      setTimeout(() => {
        router.replace("/(main)/(user)/prefrences");
      }, 300);
    } catch (e: any) {
      let errorMessage = "Unable to create your family. ";

      if (e.message?.toLowerCase().includes("network")) {
        errorMessage = "No internet connection. Please check your network and try again.";
      } else if (e.message?.toLowerCase().includes("timeout")) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (e.message?.toLowerCase().includes("already exists")) {
        errorMessage = "A family with this name already exists. Please choose a different name.";
      } else if (e.message?.toLowerCase().includes("limit")) {
        errorMessage = "You've reached the maximum number of families. Please contact support.";
      } else if (e.message) {
        errorMessage = e.message;
      } else {
        errorMessage += "Please try again.";
      }

      showToast("error", errorMessage, "Unable to Create Family");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
  if (currentFamilyId) refreshMembers(currentFamilyId);
}, [currentFamilyId]);

  const handleJoinFamily = () => {
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async () => {
    if (!joinCode.trim()) {
      showToast("error", "Please enter a family invite code.", "Missing Code");
      return;
    }

    if (joinCode.trim().length < 6) {
      showToast("error", "The invite code appears to be too short. Please check and try again.", "Invalid Code");
      return;
    }

    try {
      setIsLoading(true);
      const res = await joinFamilyByCode(joinCode.trim());
      const fid = res.family_id ?? res.familyId ?? res.family?.id ?? res.id;
      const joinedFamilyName = res.family?.display_name ?? res.display_name ?? res.family_name ?? "the family";

      if (!fid)
        console.log(
          "Successfully joined, but could not load family details. Please refresh the app."
        );

      setShowJoinModal(false);
      setJoinCode("");

      if (updateUserInfo) {
        updateUserInfo({
          status: "member"
        });
      }

      if (refreshFamilies) {
        await refreshFamilies();
      }

      if (setSelectedFamilyId && fid) {
        setSelectedFamilyId(String(fid));
      }

      showToast("success", `You joined ${joinedFamilyName} successfully!`, "Welcome!");

      if (onComplete) {
        onComplete();
      }
    } catch (e: any) {
      let errorMessage = "Unable to join the family. ";

      if (e.message?.toLowerCase().includes("network")) {
        errorMessage = "No internet connection. Please check your network and try again.";
      } else if (e.message?.toLowerCase().includes("timeout")) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (e.message?.toLowerCase().includes("not found") || e.message?.toLowerCase().includes("invalid")) {
        errorMessage = "This invite code is not valid. Please check the code and try again.";
      } else if (e.message?.toLowerCase().includes("expired")) {
        errorMessage = "This invite code has expired. Please request a new code from the family owner.";
      } else if (e.message?.toLowerCase().includes("already a member")) {
        errorMessage = "You are already a member of this family.";
      } else if (e.message?.toLowerCase().includes("limit")) {
        errorMessage = "This family has reached its maximum number of members.";
      } else if (e.message) {
        errorMessage = e.message;
      } else {
        errorMessage += "Please check the invite code and try again.";
      }

      showToast("error", errorMessage, "Unable to Join Family");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = () => {
    if (newMember.name && newMember.email && newMember.phone) {
      const member: Member = {
        id: Date.now().toString(),
        ...newMember,
      };
      setMembers([...members, member]);
      setNewMember({ name: "", email: "", phone: "" });
      setShowAddModal(false);
      showToast("success", "Member added successfully!");
    } else {
      showToast("error", "Please fill in all fields");
    }
  };

  const handleDeleteMember = (id: string) => {
    setToast({
      visible: true,
      type: "confirm",
      title: "Delete Member",
      message: "Are you sure you want to remove this member?",
      buttons: [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setMembers(members.filter((m) => m.id !== id));
          },
        },
      ],
    });
  };

  const renderInitialScreen = () => (
    <View style={styles.content}>
      {showBackButton && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.8}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>Add a Family Member</Text>
      <Text style={styles.subtitle}>
        Share access and stay connected with your loved ones
      </Text>

      <View style={styles.illustrationContainer}>
        <View style={styles.illustration}>
          <Ionicons name="people-outline" size={80} color={palette.textMuted} />
        </View>
        <Text style={styles.noMemberText}>No members yet</Text>
      </View>

      <View style={styles.initialButtonsContainer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateFamily}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="create" size={24} color={palette.success} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.createButtonText}>Create Family</Text>
              <Text style={styles.createButtonSubtext}>Be the owner</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.success} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoinFamily}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={[styles.iconCircle, styles.iconCircleSecondary]}>
              <Ionicons name="link" size={24} color={palette.textMuted} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.joinButtonText}>Join Family</Text>
              <Text style={styles.joinButtonSubtext}>Enter family code</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {isFromOnboarding && (
        <TouchableOpacity
          style={styles.skipButton}
          activeOpacity={0.7}
          onPress={() => router.replace('/(main)/(user)/prefrences')}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMemberListScreen = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Family Members</Text>
      <Text style={styles.subtitle}>
        {members.length} {members.length === 1 ? "member" : "members"} added
      </Text>
      {currentFamilyId ? (
  <View style={styles.inviteBox}>
    <Text style={styles.inviteLabel}>Invite Code</Text>
    <View style={styles.inviteCodeRow}>
      <Text style={styles.inviteCodeText}>
        {generatedInviteCode || "—"}
      </Text>
      <View style={styles.inviteActions}>
        <TouchableOpacity
          onPress={() => {
            if (generatedInviteCode) {
              Clipboard.setStringAsync(generatedInviteCode);
              showToast("success", "Invite code copied to clipboard", "Copied");
            } else {
              showToast("info", "Generate a code to share with members.", "No code");
            }
          }}
          style={styles.inviteActionButton}
        >
          <Text style={styles.inviteActionText}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            try {
              setIsLoading(true);
              const updated = await regenerateInviteCode(currentFamilyId);
              const newCode = updated.invite_code || updated.inviteCode || "";
              setGeneratedInviteCode(newCode);
              showToast("success", "A new invite code has been generated.", "New Code");
            } catch (e: any) {
              showToast("error", e.message || "Failed to regenerate invite code", "Error");
            } finally {
              setIsLoading(false);
            }
          }}
          style={styles.inviteActionButton}
        >
          <Text style={styles.inviteRegenerateText}>Regenerate</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
) : null}

      <ScrollView
        style={styles.membersList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.membersListContent}
      >
        {members.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberInitial}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <View style={styles.memberDetail}>
                <Ionicons name="mail-outline" size={14} color={palette.textMuted} />
                <Text style={styles.detailText}>{member.email}</Text>
              </View>
              <View style={styles.memberDetail}>
                <Ionicons name="call-outline" size={14} color={palette.textMuted} />
                <Text style={styles.detailText}>{member.phone}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteMember(member.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color={palette.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.addMemberButton}
        onPress={() => {
          if (!currentFamilyId) {
            showToast("info", "Create or join a family first to invite members.", "Create or Join a Family");
            return;
          }
          if (generatedInviteCode) {
            Clipboard.setStringAsync(generatedInviteCode);
            showToast("success", "Invite code copied. Share it with your family.", "Invite");
          } else {
            showToast("info", "No invite code yet. Tap Regenerate to create one.", "Invite");
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={palette.success} />
        <Text style={styles.addMemberButtonText}>Add Member</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => {
          showToast("success", "Family setup complete!");
        }}
        activeOpacity={0.8}
      >
<Text style={styles.nextButtonText}>{isLoading ? "Please wait..." : "Continue"}</Text>      </TouchableOpacity>
    </View>
  );

  const renderAddMemberModal = () => (
    <Modal
      visible={showAddModal}
      animationType="none"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAddModal(false)}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          style={styles.avoidingView}
        >
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
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [400, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>Add Member</Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={palette.textMuted} />
                  <AppTextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={palette.textMuted}
                    value={newMember.name}
                    onChangeText={(text) =>
                      setNewMember({ ...newMember, name: text })
                    }
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={palette.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newMember.email}
                    onChangeText={(text) =>
                      setNewMember({ ...newMember, email: text })
                    }
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color={palette.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="phone-pad"
                    value={newMember.phone}
                    onChangeText={(text) =>
                      setNewMember({ ...newMember, phone: text })
                    }
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddMember}
                activeOpacity={0.8}
              >
                <Text style={styles.modalAddButtonText}>Add Member</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );

  const renderJoinFamilyModal = () => (
    <Modal
      visible={showJoinModal}
      animationType="none"
      transparent={true}
      onRequestClose={() => setShowJoinModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowJoinModal(false)}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: joinFadeAnim,
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          style={styles.avoidingView}
        >
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
                      translateY: joinSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [400, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />

              <View style={styles.joinModalIconContainer}>
                <View style={styles.joinModalIcon}>
                  <Ionicons name="key-outline" size={32} color={palette.success} />
                </View>
              </View>

              <Text style={styles.modalTitle}>Join Family</Text>
              <Text style={styles.joinModalSubtitle}>
                Enter the family code to join an existing family
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="keypad-outline" size={20} color={palette.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter family code"
                    placeholderTextColor={palette.textMuted}
                    value={joinCode}
                    onChangeText={setJoinCode}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleJoinSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.modalAddButtonText}>Join Family</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );

  const renderCreateFamilyModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="none"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCreateModal(false)}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: createFadeAnim,
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          style={styles.avoidingView}
        >
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
                      translateY: createSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [400, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />

              <View style={styles.joinModalIconContainer}>
                <View style={styles.joinModalIcon}>
                  <Ionicons name="home-outline" size={32} color={palette.success} />
                </View>
              </View>

              <Text style={styles.modalTitle}>Create Family</Text>
              <Text style={styles.joinModalSubtitle}>
                Choose a name for your family group
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="people-outline" size={20} color={palette.textMuted} />
                  <AppTextInput
                    style={styles.input}
                    placeholder="Enter family name"
                    placeholderTextColor={palette.textMuted}
                    value={familyName}
                    onChangeText={setFamilyName}
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={palette.textMuted}
                />
                <Text style={styles.infoText}>
                  An invite code will be generated for you to share with family
                  members
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleCreateSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.modalAddButtonText}>Create Family</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        buttons={toast.buttons}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
      {currentScreen === "initial" && renderInitialScreen()}
      {currentScreen === "memberList" && renderMemberListScreen()}
      {renderAddMemberModal()}
      {renderJoinFamilyModal()}
      {renderCreateFamilyModal()}
    </SafeAreaView>
  );
};

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  card: colors.card,
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  primary: colors.primary,
  primaryLight: withAlpha(colors.primary, 0.12),
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: palette.textMuted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 48,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    backIcon: {
      fontSize: 22,
      color: palette.primary,
      fontWeight: "600",
    },
    illustrationContainer: {
      alignItems: "center",
      marginBottom: 40,
    },
    illustration: {
      width: 160,
      height: 160,
      backgroundColor: withAlpha(palette.textMuted, 0.12),
      borderRadius: 80,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    noMemberText: {
      fontSize: 14,
      color: withAlpha(palette.textMuted, 0.6),
      fontWeight: "500",
    },
    initialButtonsContainer: {
      gap: 12,
      marginBottom: 32,
    },
    createButton: {
      width: "100%",
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    joinButton: {
      width: "100%",
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    buttonContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: withAlpha(palette.success, 0.12),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    iconCircleSecondary: {
      backgroundColor: withAlpha(palette.textMuted, 0.12),
    },
    buttonTextContainer: {
      flex: 1,
    },
    createButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 2,
    },
    createButtonSubtext: {
      fontSize: 13,
      color: palette.textMuted,
    },
    joinButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 2,
    },
    joinButtonSubtext: {
      fontSize: 13,
      color: palette.textMuted,
    },
    skipButton: {
      alignSelf: "center",
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipButtonText: {
      fontSize: 15,
      color: palette.textMuted,
      fontWeight: "500",
    },
    membersList: {
      flex: 1,
    },
    membersListContent: {
      paddingBottom: 20,
    },
    memberCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    memberAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: palette.success,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    memberInitial: {
      fontSize: 20,
      fontWeight: "700",
      color: palette.card,
    },
    memberInfo: {
      flex: 1,
      gap: 6,
    },
    memberName: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 2,
    },
    memberDetail: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    detailText: {
      fontSize: 13,
      color: palette.textMuted,
    },
    deleteButton: {
      padding: 8,
    },
    addMemberButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: palette.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: palette.success,
    },
    addMemberButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.success,
    },
    nextButton: {
      width: "100%",
      height: 52,
      borderRadius: 12,
      backgroundColor: palette.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      shadowColor: palette.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    nextButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.card,
    },
    inviteBox: {
      backgroundColor: palette.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 12,
    },
    inviteLabel: {
      fontSize: 13,
      color: palette.textMuted,
      marginBottom: 6,
    },
    inviteCodeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    inviteCodeText: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
    inviteActions: {
      flexDirection: "row",
    },
    inviteActionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    inviteActionText: {
      color: palette.success,
      fontWeight: "600",
    },
    inviteRegenerateText: {
      color: palette.text,
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    avoidingView: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha(palette.text, 0.5),
    },
    modalContent: {
      backgroundColor: palette.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: palette.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      marginBottom: 28,
    },
    inputContainer: {
      gap: 12,
      marginBottom: 24,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
      gap: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: palette.text,
    },
    modalAddButton: {
      width: "100%",
      height: 52,
      borderRadius: 12,
      backgroundColor: palette.success,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: palette.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    modalAddButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.card,
    },
    joinModalIconContainer: {
      alignItems: "center",
      marginBottom: 16,
    },
    joinModalIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: withAlpha(palette.success, 0.12),
      alignItems: "center",
      justifyContent: "center",
    },
    joinModalSubtitle: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: withAlpha(palette.textMuted, 0.08),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      marginTop: 8,
      marginBottom: 16,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: palette.textMuted,
    },
  });

export default FamilyMemberFlow;
