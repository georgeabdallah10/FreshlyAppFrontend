// ==================== App.tsx ====================
import React, { JSX, useState, useEffect} from "react";
import { StatusBar, Animated, StyleSheet } from "react-native";

import MainMenuScreen from "@/components/profileSection/mainMenuScreen";
import MyProfileScreen from "@/components/profileSection/myProfilescreen";
import SettingsScreen from "@/components/profileSection/settingScreen";
import NotificationsScreen from "@/components/profileSection/notificationsScreen";
import AboutAppScreen from "@/components/profileSection/aboutAppScreen";


type Screen = "main" | "myProfile" | "settings" | "notifications" | "aboutApp";

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("main");
  const fadeAnim = useState(new Animated.Value(1))[0];

  const navigateTo = (screen: Screen) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen(screen);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };
  const renderScreen = (): JSX.Element => {
    switch (currentScreen) {
      case "myProfile":
        return <MyProfileScreen onBack={() => navigateTo("main")} />;
      case "settings":
        return <SettingsScreen onBack={() => navigateTo("main")} />;
      case "notifications":
        return <NotificationsScreen onBack={() => navigateTo("main")} />;
      case "aboutApp":
        return <AboutAppScreen onBack={() => navigateTo("main")} />;
      default:
        return <MainMenuScreen onNavigate={navigateTo} />;
    }
  };


  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
        {renderScreen()}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  screenContainer: {
    flex: 1,
  },
});

export default App;
