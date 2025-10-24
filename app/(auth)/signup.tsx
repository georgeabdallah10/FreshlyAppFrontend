import React, { useState, useRef, useEffect } from "react";
import { Storage } from "@/api/utils/storage";

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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { registerUser, loginUser, sendVerificationCode } from "@/api/Auth/auth";
import ToastBanner from "@/components/generalMessage";

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
    // Likely FastAPI/Pydantic error list
    return err.map((e) => e?.msg ?? e?.message ?? String(e)).join("\n");
  }
  if (typeof err === "object") {
    if ((err as any).msg) return String((err as any).msg);
    if ((err as any).message) return String((err as any).message);
    try {
      return JSON.stringify(err);
    } catch {
      return "An unexpected error occurred.";
    }
  }
  return String(err);
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive scaling functions
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export default function CreateAccountScreen(): React.JSX.Element {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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

  async function onsubmit() {
    console.log("Something happened");
    const result = await registerUser({
      email: email,
      password: password,
      name: username,
      phone_number: mobile,
      preference: {
        diet_codes: [],
        allergen_ingredient_ids: [],
        disliked_ingredient_ids: [],
        goal: "balanced",
        calorie_target: 0,
      },
    });
    if (result.ok) {
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setMobile("");
      console.log(result);
      const login = await loginUser({ email, password });
      if (!login.ok) {
        showToast(
          "error",
          login.message ?? "Auto-login failed. Please try again."
        );
        return;
      }
      await Storage.setItem("access_token", login.data.access_token);
      showToast("success", "Account createed successfully");
      // Send verification code before navigating
      try {
        const sent = await sendVerificationCode(email);
        if (!sent.ok) {
          console.warn("Failed to send verification code:", sent.message);
        }
      } catch (e) {
        console.warn("Error sending verification code:", e);
      }

      // Navigate to the verification screen
      router.replace({
        pathname: "/(auth)/emailVerficationCode",
        params: { fromSignUp: "true", email },
      });
      return;
    } else {
      showToast("error", result.message || "Sign up failed. Please try again.");
    }
  }
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!username?.trim()) missing.push("Username");
    if (!email?.trim()) missing.push("Email");
    if (!mobile?.trim()) missing.push("Mobile");
    if (!password?.trim()) missing.push("Password");
    if (!confirmPassword?.trim()) missing.push("Confirm Password");
    if (!agreedToTerms) missing.push("Terms & Conditions");
    return missing;
  };

  const handleCreateAccount = () => {
    // 1) Validate required fields first
    const missing = getMissingFields();
    if (missing.length > 0) {
      showToast("error", `Please fill: ${missing.join(", ")}`);
      return;
    }

    // 2) Validate password match
    if (password !== confirmPassword) {
      showToast("error", "Passwords must match.");
      return;
    }

    // 3) Play tap animation then submit
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
      onsubmit();
    });
  };

  const handleSignIn = () => {
    console.log("Navigate to sign in");
    router.replace("/(auth)/Login");
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
            <View style={styles.logoPlaceholder}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
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
            <Text style={styles.title}>Create New Account</Text>
            <Text style={styles.subtitle}>
              Please enter your details below.
            </Text>

            {/* Username Input */}
            <View
              style={[
                styles.inputContainer,
                focusedField === "username" && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={require("../../assets/icons/profile.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor="#B0B0B0"
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
              />
            </View>
            {/* Email Input */}
            <View
              style={[
                styles.inputContainer,
                focusedField === "email" && styles.inputContainerFocused,
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
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Mobile Input */}
            <View
              style={[
                styles.inputContainer,
                focusedField === "mobile" && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={require("../../assets/icons/call.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                placeholderTextColor="#B0B0B0"
                value={mobile}
                onChangeText={setMobile}
                onFocus={() => setFocusedField("mobile")}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
              />
            </View>

            {/* Password Input */}
            <View
              style={[
                styles.inputContainer,
                focusedField === "password" && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={require("../../assets/icons/lock.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </View>
              <TextInput

placeholder="Enter password"
                placeholderTextColor="#B0B0B0"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
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
                      ? require("../../assets/icons/hidepass.png")
                      : require("../../assets/icons/showpass.png")
                  }
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View
              style={[
                styles.inputContainer,
                focusedField === "confirmPassword" &&
                  styles.inputContainerFocused,
              ]}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={require("../../assets/icons/lock.png")}
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter confirm password"
                placeholderTextColor="#B0B0B0"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.6}
              >
                <Image
                  source={
                    showConfirmPassword
                      ? require("../../assets/icons/hidepass.png")
                      : require("../../assets/icons/showpass.png")
                  }
                  style={styles.menuCardIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Terms & Conditions Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.6}
            >
              <View style={styles.checkbox}>
                {agreedToTerms && (
                  <View style={styles.checkboxInner}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the
                <Text style={styles.termsLink}>Privacy Policy</Text> and
                <Text style={styles.termsLink}>Terms & Conditions</Text>.
              </Text>
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
              style={styles.createButtonWrapper}
              onPress={handleCreateAccount}
              activeOpacity={1}
            >
              <Animated.View
                style={[
                  styles.createButton,
                  {
                    transform: [{ scale: buttonScale }],
                  },
                ]}
              >
                <Text style={styles.createButtonText}>→</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Sign In Link */}
          <Animated.View
            style={[
              styles.signInContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignIn} activeOpacity={0.6}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
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
    paddingTop: 90,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(20),
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  logoPlaceholder: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: moderateScale(150),
    height: moderateScale(150),
  },
  card: {
    backgroundColor: "#F7F8FA",
    borderRadius: moderateScale(20),
    padding: moderateScale(20),
    marginBottom: verticalScale(12),
  },
  title: {
    fontSize: moderateScale(22),
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: verticalScale(6),
  },
  subtitle: {
    fontSize: moderateScale(13),
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(18),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: "#EEEFF3",
  },
  inputContainerFocused: {
    borderColor: "#00C853",
    borderWidth: 1.5,
  },
  iconContainer: {
    marginRight: scale(8),
  },
  icon: {
    fontSize: moderateScale(16),
    color: "#00C853",
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#111111",
    fontFamily: "System",
    borderWidth: 0,
  },
  eyeButton: {
    padding: scale(4),
  },
  eyeIcon: {
    fontSize: moderateScale(16),
    color: "#B0B0B0",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(6),
    marginBottom: verticalScale(16),
  },
  checkbox: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(4),
    borderWidth: 2,
    borderColor: "#00C853",
    marginRight: scale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(3),
    backgroundColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: moderateScale(10),
    fontWeight: "700",
  },
  termsText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: "#B0B0B0",
    lineHeight: moderateScale(16),
  },
  termsLink: {
    color: "#00C853",
    fontWeight: "600",
  },
  createButtonWrapper: {
    alignItems: "center",
  },
  createButton: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
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
  createButtonText: {
    fontSize: moderateScale(24),
    color: "#FFFFFF",
    fontWeight: "300",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(10),
  },
  signInText: {
    fontSize: moderateScale(13),
    color: "#B0B0B0",
  },
  signInLink: {
    fontSize: moderateScale(13),
    color: "#00C853",
    fontWeight: "600",
  },
  menuCardIcon: {
    width: 23,
    height: 23,
  },
});
