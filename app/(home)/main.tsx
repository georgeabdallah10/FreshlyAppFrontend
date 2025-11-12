import NotificationBell from "@/components/NotificationBell";
import { AddProductModal } from "@/components/quickAddModal";
import { usePendingRequestCount } from "@/hooks/useMealShare";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import IconButton from "@/components/iconComponent";
import Icon from "@/components/profileSection/components/icon";


type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  iconSource: ImageSourcePropType;
  bgColor: string;
  onPress: () => void;
};

// Bottom Navigation Component
const BottomNavigation = ({
  activeTab,
  onTabPress,
  safeBottom,
}: {
  activeTab: string;
  onTabPress: (tab: string) => void;
  safeBottom?: number;
}) => {
  const inset = Math.max(0, safeBottom || 0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const tabs = ["+", "chat", "family", "profile"];
  const tabWidth = 48;
  const spacing = 24; // Approximate spacing between tabs
  const router = useRouter();
  const segmants = useSegments() as string[];
  const [quickAddModal, setQuickAddModal] = useState(false);

  useEffect(() => {
    const activeIndex = tabs.indexOf(activeTab);
    const targetPosition = activeIndex * (tabWidth + spacing);

    Animated.spring(slideAnim, {
      toValue: targetPosition,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [activeTab]);

  const handleNavOnPress = (button: string) => {
    onTabPress(button);
    if (button == "main") {
      if (segmants.includes("home")) {
        console.log("You are currently at home");
      } else {
        router.replace("/(home)/main");
      }
    } else if (button == "+") {
      console.log("Quick add product");
      setQuickAddModal(true);
    } else if (button == "chat") {
      console.log("Go to chat");
      router.push("/(home)/chat");
    } else if ((button = "family")) {
      router.push("/(home)/MyFamily");
    } else if ((button = "profile")) {
      router.push("/(home)/profile");
    }
  };

  return (
    <View style={[styles.bottomNavWrapper, { bottom: inset }]}>
      <View style={[styles.bottomDock, { paddingBottom: 3 }]}>
        <View style={styles.bottomNav}>
          <AddProductModal
            visible={quickAddModal}
            onClose={() => setQuickAddModal(false)}
          />
          {/* Sliding Background Indicator */}
          {/* 
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          />
          */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavOnPress("+")}
            activeOpacity={0.8}
          >
            <View style={styles.navIconContainer}>
              <Text
                style={
                  activeTab === "explore"
                    ? styles.navIcon
                    : styles.navIconInactive
                }
              >
                <IconButton iconName="add" iconSize={35} iconColor="black" />
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavOnPress("chat")}
            activeOpacity={0.8}
          >
            <View style={styles.navIconContainer}>
              <Text
                style={
                  activeTab === "favorites"
                    ? styles.navIcon
                    : styles.navIconInactive
                }
              >
                <IconButton iconName="chatbox-ellipses-outline"  iconSize={35} />
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleNavOnPress("family")}
            activeOpacity={0.8}
          >
            <View style={styles.navIconContainer}>
              <Text
                style={
                  activeTab === "orders"
                    ? styles.navIcon
                    : styles.navIconInactive
                }
              >
              <IconButton iconName='people-circle-outline' iconColor="#000000" iconSize={40} />
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/(home)/profile")}
            activeOpacity={0.8}
          >
            <View style={styles.navIconContainer}>
              <IconButton  iconName="settings-outline" iconSize={35} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const HomeDashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: pendingShareCount = 0 } = usePendingRequestCount();

  const menuItems: MenuItem[] = [
    {
      id: "grocery",
      title: "Pantry",
      subtitle: "Track what you have",
      iconSource: require("../../assets/icons/groceryIcon.png"),
      bgColor: "#D6F0FF",
      onPress: () => router.push("/(home)/pantry"),
    },
    {
      id: "mealPlans",
      title: "Meal Plans",
      subtitle: "Your favorite meals",
      iconSource: require("../../assets/icons/mealPlans.png"),
      bgColor: "#F5E6FF",
      onPress: () => router.push("/(home)/meals"),
    },
    {
      id: "newchat",
      title: "Grocery",
      subtitle: "Upload All Grocery",
      iconSource: require("../../assets/icons/grocery.png"),
      bgColor: "#F0F0F0",
      onPress: () => router.push("/(home)/allGrocery"),
    },
    {
      id: "Mealplanner",
      title: "Quick Meals",
      subtitle: "Whip it up!",
      iconSource: require("../../assets/icons/qm2.png"),
      bgColor: "#D3F0E3",
      onPress: () => router.push("/(home)/quickMeals"),
    },
  ];

  const chatIconSource = require("../../assets/icons/element.png");

  const handleMenuPress = (item: MenuItem) => {
    item.onPress();
  };

  const handleStartChat = () => {
    console.log("Start new chat");
    router.push("/(home)/allFeatures");
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    console.log("Navigate to:", tab);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
            <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.6}
          onPress={() => router.push("/(home)/faq")}
        >
          <View style={styles.menuIcon}>
            <Image
              source={require("../../assets/icons/q&a.png")}
              style={styles.menuCardIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")} // Update with your image path
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <NotificationBell
          iconSize={24}
          iconColor="#1F2937"
          badgeColor="#FF3B30"
          onPress={() => router.push("/(home)/notifications")}
          extraCount={pendingShareCount}
          containerStyle={styles.notificationButton}
        />
      </View>

        {/* Welcome Text */}
        <View>
          <Text style={styles.welcomeText}>
            <Text style={{ color: "#00A86B" }}> Smarter Shopping.</Text> {"\n"}
            <Text style={{ color: "#FD8100" }}>Healthier Living.</Text>
          </Text>
        </View>
        {/* Menu Grid */}
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuCard, { backgroundColor: item.bgColor }]}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.menuCardHeader}>
                <View style={styles.menuIconContainer}>
                  <Image
                    source={item.iconSource}
                    style={styles.menuCardIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.menuCardTitle}>{item.title}</Text>
              </View>
              <View style={styles.menuCardFooter}>
                <Text style={styles.menuCardSubtitle}>{item.subtitle}</Text>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Start New Chat Section */}
        <View style={styles.chatSection}>
          <View style={styles.chatIconContainer}>
            <Image
              source={chatIconSource}
              style={styles.chatSectionIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.chatSectionTitle}>All features</Text>

          <TouchableOpacity
            style={styles.startChatButton}
            onPress={handleStartChat}
            activeOpacity={0.9}
          >
            <Text style={styles.startChatButtonText}>Explore more</Text>
            <Text style={styles.startChatArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation Component */}
      <BottomNavigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
        safeBottom={insets.bottom}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: -30,
    marginBottom: -25,
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: {
    width: 24,
    height: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  menuDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#111111",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationIcon: {
    fontSize: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#4C4D59",
    textAlign: "center",
    lineHeight: 32,
    marginTop: 10,
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  menuCard: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    minHeight: 130,
    justifyContent: "space-between",
  },
  menuCardHeader: {
    gap: 10,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuCardIcon: {
    width: 26,
    height: 26,
  },
  menuCardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111111",
  },
  menuCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  menuCardSubtitle: {
    fontSize: 13,
    color: "#111111",
    flex: 1,
    lineHeight: 17,
  },
  arrowIcon: {
    fontSize: 22,
    color: "#111111",
  },
  chatSection: {
    backgroundColor: "#E8F8F2",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
  },
  chatIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  chatSectionIcon: {
    width: 26,
    height: 26,
  },
  chatSectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
  },
  startChatButton: {
    width: "100%",
    backgroundColor: "#00C853",
    borderRadius: 50,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  startChatButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  startChatArrow: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  bottomNavWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    width: "90%",
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 2,
  },
  bottomDock: {
    width: "100%",
    backgroundColor: "#F7F8FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    alignItems: "center",
  },
  slidingIndicator: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00C853",
    left: 20,
  },
  navItem: {
    alignItems: "center",
    zIndex: 2,
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  navIcon: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  navIconInactive: {
    fontSize: 22,
    color: "#9AA0A6",
    opacity: 0.6,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  logoImageInactive: {
    opacity: 0.6,
  },
});

export default HomeDashboard;
