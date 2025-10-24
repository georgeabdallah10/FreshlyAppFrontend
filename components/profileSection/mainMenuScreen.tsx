// ==================== screens/MainMenuScreen.tsx ====================
import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import Icon from "./components/icon";
import { useRouter } from "expo-router";
import { useUser } from "@/context/usercontext";

type Props = {
  onNavigate: (
    screen: "myProfile" | "settings" | "notifications" | "aboutApp" | "main"
  ) => void;
};

type MenuItem = {
  id: "myProfile" | "settings" | "notifications" | "aboutApp";
  icon: any;
  label: string;
  screen: "myProfile" | "settings" | "notifications" | "aboutApp";
};

const MainMenuScreen: React.FC<Props> = ({ onNavigate }) => {
  const router = useRouter();
  const { user, logout} = useUser();

  // Accept whichever key your backend/context uses for the avatar URL
  useEffect(() => {
    console.log(user)
  })
  const avatarUrl = useMemo(
    () =>
      user?.avatar_path ||
      user?.avatar_path,
    [user]
  );

  // Nice fallback initials if no avatar yet
  const initials = useMemo(() => {
    const name = (user?.name || "").trim();
    if (name) {
      const parts = name.split(/\s+/);
      return (
        (parts[0]?.[0] || "").toUpperCase() +
        (parts[1]?.[0] || "").toUpperCase()
      );
    }
    const email = user?.email || "";
    return email ? email[0].toUpperCase() : "?";
  }, [user?.name, user?.email]);

  const menuItems: MenuItem[] = [
    {
      id: "myProfile",
      icon: require("../../assets/icons/profile.png"),
      label: "My Profile",
      screen: "myProfile",
    },
    {
      id: "settings",
      icon: require("../../assets/icons/setting.png"),
      label: "Settings",
      screen: "settings",
    },
    //{ id: "notifications", icon: require("../../assets/icons/noti.png"), label: "Notifications", screen: "notifications" },
    //{ id: "aboutApp", icon: "info", label: "About App", screen: "aboutApp" },
  ];

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      router.replace("/(auth)/Login");
      console.log("Logged out");
    } catch (e) {
      console.warn("Logout failed", e);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: () => {
          handleLogoutConfirm();
        },
        style: "destructive",
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Sticky Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {/* spacer to keep title centered */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.mainMenu}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{(user as any)?.status}</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => onNavigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconContainer}>
                  <Image
                    source={item.icon}
                    style={styles.menuCardIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Image
            source={require("../../assets/icons/logout.png")}
            style={styles.menuCardIcon}
            resizeMode="contain"
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    paddingTop: 50,
  },
  mainMenu: {
    backgroundColor: "transparent",
  },
  headerBar: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomColor: "#EAEAEA",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  scrollContent: {
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 11,
    right: 11,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00A86B",
  },
  menuList: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingTop: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  chevron: {
    fontSize: 24,
    color: "#CCC",
    fontWeight: "300",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
  },
  headerIcon: {
    fontSize: 20,
    color: "#1A1A1A",
  },
  menuCardIcon: {
    width: 26,
    height: 26,
  },
});

export default MainMenuScreen;
