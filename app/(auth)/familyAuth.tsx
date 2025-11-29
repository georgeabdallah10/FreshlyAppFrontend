// ==================== FamilyMemberFlow.tsx ====================
import { useUser } from "@/context/usercontext";
import { useFamilyContext } from "@/context/familycontext";
import {
  createFamily,
  joinFamilyByCode,
  listFamilyMembers,
  regenerateInviteCode
} from "@/src/user/family";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";


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
  const {user, updateUserInfo} = useUser();
  const { refreshFamilies, setSelectedFamilyId } = useFamilyContext();
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
      Alert.alert("Error", e.message || "Failed to load members");
    }
  };

  const handleCreateFamily = () => {
    setShowCreateModal(true);
  };


  const handleCreateSubmit = async () => {
    if (!familyName.trim()) {
      Alert.alert("Missing Information", "Please enter a name for your family.");
      return;
    }

    if (familyName.trim().length < 2) {
      Alert.alert("Invalid Name", "Family name must be at least 2 characters long.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await createFamily(familyName.trim()); // { id, display_name, invite_code }
      const invite = res.invite_code || res.inviteCode || "";
      const fid = res.id as number;
      updateUserInfo({
        status:"owner"
      })

      await refreshFamilies();
      setSelectedFamilyId(fid ? String(fid) : null);

      setGeneratedInviteCode(invite);
      setCurrentFamilyId(fid);
      setFamilyName("");
      setShowCreateModal(false);
      setCurrentScreen("memberList");
      if (fid) await refreshMembers(fid);

      Alert.alert(
        "Family Created!",
        `Your family "${
          res.display_name ?? familyName
        }" has been created.\n\nInvite Code: ${invite}\n\nShare this code with family members to join.`,
        [
          {
            text: "Copy Code",
            onPress: () => invite && Clipboard.setStringAsync(invite),
          },
          { 
            text: "OK", 
            onPress: () => {
              if (onComplete) {
                onComplete();
              } else {
                router.replace('/(main)/(user)/prefrences');
              }
            }
          },
        ]
      );
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
      
      Alert.alert("Unable to Create Family", errorMessage);
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
      Alert.alert("Missing Code", "Please enter a family invite code.");
      return;
    }

    if (joinCode.trim().length < 6) {
      Alert.alert("Invalid Code", "The invite code appears to be too short. Please check and try again.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await joinFamilyByCode(joinCode.trim());
      const fid = res.family_id ?? res.familyId ?? res.family?.id ?? res.id;

      if (!fid)
        throw new Error(
          "Successfully joined, but could not load family details. Please refresh the app."
        );

      setCurrentFamilyId(fid);
      setShowJoinModal(false);
      setJoinCode("");
      setCurrentScreen("memberList");
      updateUserInfo({
        status: "member"
      })

      await refreshMembers(fid);

      Alert.alert(
        "Welcome to the Family!", 
        "You have successfully joined the family.",
        [
          { 
            text: "OK", 
            onPress: () => {
             if (onComplete) {
               onComplete();
             }
              refreshFamilies();
              setSelectedFamilyId(fid ? String(fid) : null);
            }
          }
        ]
      );
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
      
      Alert.alert("Unable to Join Family", errorMessage);
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
      Alert.alert("Success", "Member added successfully!");
    } else {
      Alert.alert("Error", "Please fill in all fields");
    }
  };

  const handleDeleteMember = (id: string) => {
    Alert.alert(
      "Delete Member",
      "Are you sure you want to remove this member?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setMembers(members.filter((m) => m.id !== id));
          },
        },
      ]
    );
  };

  const renderInitialScreen = () => (
    <View style={styles.content}>
      {showBackButton && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>Add a Family Member</Text>
      <Text style={styles.subtitle}>
        Share access and stay connected with your loved ones
      </Text>

      <View style={styles.illustrationContainer}>
        <View style={styles.illustration}>
          <Ionicons name="people-outline" size={80} color="#B0B0B0" />
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
              <Ionicons name="create" size={24} color="#10B981" />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.createButtonText}>Create Family</Text>
              <Text style={styles.createButtonSubtext}>Be the owner</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#10B981" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoinFamily}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={[styles.iconCircle, styles.iconCircleSecondary]}>
              <Ionicons name="link" size={24} color="#6B7280" />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.joinButtonText}>Join Family</Text>
              <Text style={styles.joinButtonSubtext}>Enter family code</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.skipButton}
        activeOpacity={0.7}
        onPress={() => router.replace('/(main)/(user)/prefrences')}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMemberListScreen = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Family Members</Text>
      <Text style={styles.subtitle}>
        {members.length} {members.length === 1 ? "member" : "members"} added
      </Text>
      {currentFamilyId ? (
  <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 }}>
    <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>Invite Code</Text>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
        {generatedInviteCode || "—"}
      </Text>
      <View style={{ flexDirection: "row" }}>
        <TouchableOpacity
          onPress={() => {
            if (generatedInviteCode) {
              Clipboard.setStringAsync(generatedInviteCode);
              Alert.alert("Copied", "Invite code copied to clipboard");
            } else {
              Alert.alert("No code", "Generate a code to share with members.");
            }
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: "#10B981", fontWeight: "600" }}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            try {
              setIsLoading(true);
              const updated = await regenerateInviteCode(currentFamilyId);
              const newCode = updated.invite_code || updated.inviteCode || "";
              setGeneratedInviteCode(newCode);
              Alert.alert("New Code", "A new invite code has been generated.");
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to regenerate invite code");
            } finally {
              setIsLoading(false);
            }
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: "#111827", fontWeight: "600" }}>Regenerate</Text>
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
                <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
                <Text style={styles.detailText}>{member.email}</Text>
              </View>
              <View style={styles.memberDetail}>
                <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                <Text style={styles.detailText}>{member.phone}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteMember(member.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.addMemberButton}
onPress={() => {
  if (!currentFamilyId) {
    Alert.alert("Create or Join a Family", "Create or join a family first to invite members.");
    return;
  }
  if (generatedInviteCode) {
    Clipboard.setStringAsync(generatedInviteCode);
    Alert.alert("Invite", "Invite code copied. Share it with your family.");
  } else {
    Alert.alert("Invite", "No invite code yet. Tap Regenerate to create one.");
  }
}}        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#10B981" />
        <Text style={styles.addMemberButtonText}>Add Member</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => {
          Alert.alert("Success", "Family setup complete!");
          router.replace('/(main)/(home)/main');
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
          style={{ flex: 1 }}
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
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor="#9CA3AF"
                    value={newMember.name}
                    onChangeText={(text) =>
                      setNewMember({ ...newMember, name: text })
                    }
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newMember.email}
                    onChangeText={(text) =>
                      setNewMember({ ...newMember, email: text })
                    }
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor="#9CA3AF"
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
          style={{ flex: 1 }}
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
                  <Ionicons name="key-outline" size={32} color="#10B981" />
                </View>
              </View>

              <Text style={styles.modalTitle}>Join Family</Text>
              <Text style={styles.joinModalSubtitle}>
                Enter the family code to join an existing family
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="keypad-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter family code"
                    placeholderTextColor="#9CA3AF"
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
          style={{ flex: 1 }}
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
                  <Ionicons name="home-outline" size={32} color="#10B981" />
                </View>
              </View>

              <Text style={styles.modalTitle}>Create Family</Text>
              <Text style={styles.joinModalSubtitle}>
                Choose a name for your family group
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="people-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter family name"
                    placeholderTextColor="#9CA3AF"
                    value={familyName}
                    onChangeText={setFamilyName}
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#6B7280"
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
    <View style={styles.container}>
      {currentScreen === "initial" && renderInitialScreen()}
      {currentScreen === "memberList" && renderMemberListScreen()}
      {renderAddMemberModal()}
      {renderJoinFamilyModal()}
      {renderCreateFamilyModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
    paddingTop: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 48,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 17,
    color: "#1F2937",
    fontWeight: "500",
    marginLeft: 4,
  },
  illustrationContainer: {
    alignItems: "center",
    marginBottom: 56,
  },
  illustration: {
    width: 160,
    height: 160,
    backgroundColor: "#F3F4F6",
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  noMemberText: {
    fontSize: 14,
    color: "#D1D5DB",
    fontWeight: "500",
  },
  initialButtonsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  createButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  joinButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
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
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconCircleSecondary: {
    backgroundColor: "#F3F4F6",
  },
  buttonTextContainer: {
    flex: 1,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  createButtonSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  joinButtonSubtext: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 15,
    color: "#9CA3AF",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
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
  deleteButton: {
    padding: 8,
  },
  addMemberButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#10B981",
  },
  addMemberButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  nextButton: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
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
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
  },
  modalAddButton: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  joinModalIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  joinModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  joinModalSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
  },
});

export default FamilyMemberFlow;
