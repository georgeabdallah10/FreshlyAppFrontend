// ==================== screens/MainMenuScreen.tsx ====================
import { useUser } from "@/context/usercontext";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

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
  const { user } = useUser();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Entrance animation - super fast and snappy
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  return (
    <View style={styles.screen}>
      {/* Sticky Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.replace("/(main)/(home)/main")}
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
        <Animated.View 
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
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

          {/*<View style={styles.statusBadge}>
            <Text style={styles.statusText}>{(user as any)?.status}</Text>
          </View>*/}
        </Animated.View>

        <Animated.View 
          style={[
            styles.menuList,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === 0 && styles.menuItemFirst
              ]}
              onPress={() => onNavigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: index === 0 ? COLORS.primaryLight : COLORS.accentLight }
                ]}>
                  <Image
                    source={item.icon}
                    style={[
                      styles.menuCardIcon,
                      { tintColor: index === 0 ? COLORS.primary : COLORS.accent }
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: COLORS.background,
    paddingTop: 50,
  },
  mainMenu: {
    backgroundColor: "transparent",
  },
  headerBar: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
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
    color: COLORS.text,
    textAlign: "center",
  },
  profileCard: {
    backgroundColor: COLORS.white,
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
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.charcoalLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  menuList: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemFirst: {
    borderTopWidth: 0,
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
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted,
    fontWeight: "300",
  },
  headerIcon: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: "600",
  },
  menuCardIcon: {
    width: 26,
    height: 26,
  },
});

export default MainMenuScreen;
