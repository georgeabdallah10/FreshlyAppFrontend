// ==================== screens/MyProfileScreen.tsx ====================
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import Icon from "./components/icon";
import PasswordModal from "./components/passwordModal";
import { useUser } from "@/context/usercontext";
import { useRouter } from "expo-router";

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
  const { user, refreshUser, logout, updateUserInfo } = useUser();
  const router = useRouter();

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
        Alert.alert("No changes", "There are no updates to save.");
        setIsEditing(false);
        return;
      }

      await updateUserInfo(payload);

      // Update local state optimistically and refresh from server
      setProfile({ ...editedProfile });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
      await refreshUser?.();
    } catch (err) {
      console.error("Error updating profile:", err);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setEditedProfile({ ...profile });
    setIsEditing(false);
  };

  const handleEditProfile = () => {
    console.log("handleEditProfile")
    router.push({
      pathname: "/(user)/setPfp",
      params: {
        fromProfile: "true",
      },
    });
  };

  return (
    <View style={styles.screenContainer}>
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
        <View style={styles.profileHeader}>
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
        </View>

        <View style={styles.section}>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update your prefrences</Text>

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={() =>
              router.push({
                pathname: "/(user)/prefrences",
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity
            style={styles.passwordButton}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.passwordLeft}>
              <Icon name="lock" size={20} color="#666" />
              <Text style={styles.passwordText}>Change Password</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <PasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop: 90,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 10,
    backgroundColor: "#F5F7FA",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
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
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
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
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  statusBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00A86B",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputDisabled: {
    backgroundColor: "#F9FAFB",
    color: "#999",
  },
  passwordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
  },
  passwordLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  passwordText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  chevron: {
    fontSize: 24,
    color: "#CCC",
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
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#00A86B",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  imgStyle: {
    width: 23,
    height: 23,
  },
});

export default MyProfileScreen;
