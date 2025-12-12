// ==================== screens/MyProfileScreen.tsx ====================
import ToastBanner from "@/components/generalMessage";
import { useUser } from "@/context/usercontext";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DeleteAccountModal from "./components/deleteAccountModal";
import Icon from "./components/icon";
import PasswordModal from "./components/passwordModal";

const COLORS = {
  primary: "#00A86B",
  primaryLight: "#E8F8F1",
  accent: "#FD8100",
  accentLight: "#FFF3E6",
  charcoal: "#4C4D59",
  charcoalLight: "#F0F0F2",
  white: "#FFFFFF",
  background: "#F7F8FB",
  text: "#0A0A0A",
  textMuted: "#6B7280",
  border: "#E9ECF2",
};

type Props = {
  onBack: () => void;
};

type Profile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar_path?: string; // emoji
  status?: string;
};

const MyProfileScreen: React.FC<Props> = ({ onBack }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const userContext = useUser();
  const user = userContext?.user;
  const refreshUser = userContext?.refreshUser;
  const logout = userContext?.logout;
  const updateUserInfo = userContext?.updateUserInfo;
  const router = useRouter();

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    type: "success" | "error" | "info";
    message: string;
    title?: string;
  }>({ visible: false, type: "info", message: "" });

  const showToast = (type: "success" | "error" | "info", message: string, title?: string) => {
    setToast({ visible: true, type, message, title });
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    phone: "",
    location: "",
    avatar_path: "",
  });

  const [editedProfile, setEditedProfile] = useState<Profile>({ ...profile });

  // Hydrate profile from global user context
  useEffect(() => {
    if (!user) return;
    const hydrated = {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: String((user as any)?.phone ?? (user as any)?.phone_number ?? ""),
      location: (user as any)?.location ?? "",
      avatar_path: (user as any)?.avatar_path,
      status: (user as any)?.status,
    } as Profile;

    setProfile(hydrated);
    setEditedProfile(hydrated);
  }, [user]);

  useEffect(() => {
    refreshUser?.();
    
    // Entrance animation - super fast and snappy
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
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

  const handleSave = async () => {
    try {
      // Build diff-only payload. Map `phone` -> `phone_number` for backend.
      const payload: Record<string, any> = {};

      if (editedProfile.name !== profile.name)
        payload.name = editedProfile.name;
      if (editedProfile.email !== profile.email)
        payload.email = editedProfile.email;
      if (editedProfile.location !== profile.location)
        payload.location = editedProfile.location;
      if (editedProfile.phone !== profile.phone)
        payload.phone_number = editedProfile.phone;
      if (editedProfile.avatar_path !== profile.avatar_path) {
        console.log("Camera pressed");
        payload.avatar = editedProfile.avatar_path;
      } // if backend ignores, it's fine

      if (Object.keys(payload).length === 0) {
        showToast("info", "There are no updates to save.", "No changes");
        setIsEditing(false);
        return;
      }

      if (updateUserInfo) {
        await updateUserInfo(payload);
      }

      // Update local state optimistically and refresh from server
      setProfile({ ...editedProfile });
      setIsEditing(false);
      showToast("success", "Profile updated successfully!");
      await refreshUser?.();
    } catch (err) {
      console.log("Error updating profile:", err);
      showToast("error", "Failed to update profile. Please try again.", "Error");
    }
  };

  const handleCancel = () => {
    setEditedProfile({ ...profile });
    setIsEditing(false);
  };

  const handleEditProfile = () => {
    console.log("handleEditProfile")
    router.push({
      pathname: "/(main)/(user)/setPfp",
      params: {
        fromProfile: "true",
      },
    });
  };

  return (
    <View style={styles.screenContainer}>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        title={toast.title}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
          style={styles.editButton}
        >
          {isEditing ? (
            <Image
              source={require("../../assets/icons/save.png")}
              style={{
                width: 30,
                height: 30,
              }}
            />
          ) : (
            <Image
              source={require("../../assets/icons/edit.png")}
              style={{
                width: 30,
                height: 30,
              }}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.avatarLarge}>
            {editedProfile.avatar_path ? (
              <Image
                source={{ uri: editedProfile.avatar_path }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <Image
                source={require("../../assets/icons/profile.png")}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            )}
            {isEditing && (
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => handleEditProfile()}
              >
                <Icon name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.statusBadgeLarge}>
            <Text style={styles.statusTextLarge}>
              {editedProfile.status ?? ""}
            </Text>
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={editedProfile.name}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, name: text })
              }
              editable={isEditing}
              placeholder="Enter your name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={editedProfile.email}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, email: text })
              }
              editable={isEditing}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={editedProfile.phone}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, phone: text })
              }
              editable={isEditing}
              placeholder="Enter your phone"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={editedProfile.location}
              onChangeText={(text) =>
                setEditedProfile({ ...editedProfile, location: text })
              }
              editable={isEditing}
              placeholder="Enter your location"
            />
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Update your prefrences</Text>

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={() =>
              router.push({
                pathname:"/(main)/(user)/prefrences",
                params: { fromProfile: "true" },
              })
            }
          >
            <View style={styles.passwordLeft}>
              <Text style={styles.passwordText}>
                Update your prefrences here
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.passwordLeft}>
              <Icon name="lock" size={20} color={COLORS.primary} />
              <Text style={styles.passwordText}>Change Password</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              try {
                if (logout) {
                  await logout();
                }
                router.replace("/(auth)/Login");
              } catch (e) {
                console.warn("Logout failed", e);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.passwordLeft}>
              <Icon name="log-out" size={20} color="#FF6B35" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </View>
            <Text style={styles.logoutChevron}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          style={[
            styles.dangerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
          <Text style={styles.dangerSectionSubtitle}>
            This action cannot be undone
          </Text>
          
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setShowDeleteModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.deleteButtonContent}>
              <View style={styles.deleteIconContainer}>
                <Icon name="trash" size={18} color="#FF3B30" />
              </View>
              <View style={styles.deleteTextContainer}>
                <Text style={styles.deleteAccountText}>Delete Account</Text>
                <Text style={styles.deleteAccountSubtext}>
                  Permanently remove your account and data
                </Text>
              </View>
            </View>
            <Text style={styles.deleteChevron}>›</Text>
          </TouchableOpacity>
        </Animated.View>
        

        {isEditing && (
          <Animated.View 
            style={[
              styles.actionButtons,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      <PasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop: 90,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.charcoalLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
    borderWidth: 4,
    borderColor: COLORS.primaryLight,
  },
  avatarLargeEmoji: {
    fontSize: 50,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    backgroundColor: COLORS.charcoalLight,
    color: COLORS.textMuted,
  },
  passwordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    marginBottom: 15,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE5DD",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FF6B35",
  },
  logoutChevron: {
    fontSize: 24,
    color: "#FF6B35",
    fontWeight: "300",
  },
  deleteAccoutnButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    marginBottom: 15,
  },
  dangerSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: "#FF3B30",
  },
  dangerSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3B30",
    marginBottom: 4,
  },
  dangerSectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  deleteButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  deleteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  deleteTextContainer: {
    flex: 1,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 2,
  },
  deleteAccountSubtext: {
    fontSize: 12,
    color: "#FF8A80",
    fontWeight: "500",
  },
  deleteChevron: {
    fontSize: 24,
    color: "#FF8A80",
    fontWeight: "300",
  },
  passwordLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  passwordText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted,
    fontWeight: "300",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.charcoalLight,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  imgStyle: {
    width: 23,
    height: 23,
  },
});

export default MyProfileScreen;
