import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { loginUser } from "@/api/Auth/auth";
import { useRouter } from "expo-router";
import ToastBanner from "@/components/generalMessage";
import { Storage } from "@/api/utils/storage";

type ToastType = "success" | "error";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  topOffset?: number;
}

const toErrorText = (err: any): string => {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  if (Array.isArray(err)) {
    // Likely FastAPI/Pydantic errors array
    return err.map((e) => e?.msg ?? e?.message ?? String(e)).join("\n");
  }
  if (typeof err === "object") {
    if (err.msg) return String(err.msg);
    if (err.message) return String(err.message);
    try {
      return JSON.stringify(err);
    } catch {
      return "An unexpected error occurred.";
    }
  }
  return String(err);
};

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
    duration: 5000,
    topOffset: 50,
  });

  const showToast = (
    type: ToastType,
    message: unknown,
    duration: number = 5000,
    topOffset: number = 50
  ) => {
    const text = toErrorText(message);
    setToast({ visible: true, type, message: text, duration, topOffset });
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  async function onSubmit() {
    const result = await loginUser({
      email: email,
      password: password,
    });
    if (result.ok) {
      await Storage.setItem("access_token", result.data.access_token);
      showToast("success", "Login successful! Redirecting...");
      router.replace("/(home)/main");
    } else {
      showToast("error", result.message ?? "Login failed. Please try again.");
    }
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log("Login with:", { email, password });
    });
    onSubmit();
  };

  const handleForgotPassword = () => {
    console.log("Forgot password clicked");
    router.push("/(auth)/forgot-password");
  };

  const handleSignUp = () => {
    console.log("Sign up clicked");
    router.replace("/(auth)/signup");
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")} // Update with your image path
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>Freshly</Text>
            </View>
          </Animated.View>

          {/* Card Container */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <Text style={styles.title}>Getting Started</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your{"\n"}exploration.
            </Text>
            {/* Email Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={require("../../assets/icons/email.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                placeholderTextColor="#B0B0B0"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.iconContainer}>xf
                <Image
                  source={require("../../assets/icons/lock.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#B0B0B0"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.6}
              >
                <Image
                  source={
                    showPassword
                      ? require(`../../assets/icons/hidepass.png`)
                      : require(`../../assets/icons/showpass.png`)
                  }
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              activeOpacity={0.6}
            >
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButtonWrapper}
              onPress={handleLogin}
              activeOpacity={1}
            >
              <Animated.View
                style={[
                  styles.loginButton,
                  {
                    transform: [{ scale: buttonScale }],
                  },
                ]}
              >
                <Text style={styles.loginButtonText}>→</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View
            style={[
              styles.signUpContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp} activeOpacity={0.6}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.welcomeText}>
            <Text style={{ color: "#00A86B" }}>Smarter shopping.</Text> {"\n"}
            <Text style={{ color: "#FD8100" }}>Healthier Living.</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration ?? 5000}
        topOffset={toast.topOffset ?? 50}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop:50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    marginTop: -20,
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  card: {
    backgroundColor: "#F7F8FA",
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    marginTop: -30,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEEFF3",
    transitionDelay: "0.2s",
    transitionProperty: "ease",
  },
  inputContainerFocused: {
    borderColor: "#00C853",
    borderWidth: 1.5,
  },
  iconContainer: {
    marginRight: 12,
  },
  emailIcon: {
    fontSize: 20,
    color: "#00C853",
  },
  lockIcon: {
    fontSize: 20,
    color: "#00C853",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111111",
    fontFamily: "System",
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
    color: "#B0B0B0",
  },
  forgotPassword: {
    fontSize: 15,
    color: "#111111",
    textAlign: "right",
    marginTop: 6,
    marginBottom: 24,
    fontWeight: "500",
  },
  loginButtonWrapper: {
    alignItems: "center",
  },
  loginButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00C853",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "300",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
  signUpText: {
    fontSize: 15,
    color: "#B0B0B0",
  },
  signUpLink: {
    fontSize: 15,
    color: "#00C853",
    fontWeight: "600",
  },
  menuCardIcon: {
    width: 26,
    height: 26,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 32,
    marginTop: 30,
  },
  topHeader: {
    width: "auto",
    height: "auto",
    borderWidth: 2,
  },
  topHeaderTtile: {
    color: "",
  },
  brandName: {
    fontSize: 56,
    fontWeight: "700",
    color: "#00C853",
    fontFamily: "System",
    letterSpacing: -1,
    marginTop: -30,
  },
});
