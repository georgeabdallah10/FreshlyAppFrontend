import ToastBanner from "@/components/generalMessage";
import {
  loginUser,
  registerUser,
  sendVerificationCode,
  authenticateWithOAuth,
  type OAuthProvider,
} from "../../src/auth/auth";
import { supabase } from "@/src/supabase/client";
import { Storage } from "@/src/utils/storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

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
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
    duration: 3500,
    topOffset: 50,
  });
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const isAppleAvailable = Platform.OS === "ios";
  const isOAuthBusy = Boolean(oauthLoading);

  const showToast = (
    type: ToastType,
    message: unknown,
    duration: number = 3500,
    topOffset: number = 50
  ) => {
    const text = toErrorText(message);
    setToast({ visible: true, type, message: text, duration, topOffset });
  };
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.8)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

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

  // Loading overlay animation
  useEffect(() => {
    if (isCreatingAccount) {
      // Show overlay with fade in
      Animated.parallel([
        Animated.timing(loadingOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(loadingScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Start spinning animation
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Hide overlay
      Animated.parallel([
        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(loadingScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      spinValue.setValue(0);
    }
  }, [isCreatingAccount]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1);
      }, 400);
      return () => clearTimeout(timer);
    } else if (cooldownRemaining === 0 && isButtonDisabled) {
      setIsButtonDisabled(false);
    }
  }, [cooldownRemaining, isButtonDisabled]);

  const startCooldown = (seconds: number = 60) => {
    setIsButtonDisabled(true);
    setCooldownRemaining(seconds);
  };

  async function onsubmit() {
    setIsCreatingAccount(true);

    try {
      console.log("Starting account registration...");

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

      console.log("Registration result:", result);

      if (result.ok) {
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setMobile("");
        console.log("Registration successful, attempting auto-login...");

        const login = await loginUser({ email, password });
        if (!login.ok) {
          setIsCreatingAccount(false);

          // Provide specific error messages based on status code
          let errorMessage = "Unable to sign you in automatically. ";
          if (login.status === 401) {
            errorMessage +=
              "Invalid credentials. Please try signing in manually.";
          } else if (login.status === 429) {
            errorMessage +=
              "Too many login attempts. Please wait a moment and try again.";
          } else if (login.status === 500) {
            errorMessage += "Server error. Please try signing in manually.";
          } else if (login.status === -1) {
            errorMessage +=
              "Network connection issue. Please check your internet and try again.";
          } else {
            errorMessage += login.message || "Please try signing in manually.";
          }

          showToast("error", errorMessage);
          return;
        }

        await Storage.setItem("access_token", login.data.access_token);
        showToast(
          "success",
          "Account created successfully! Welcome to SAVR!"
        );

        // Send verification code (non-blocking)
        sendVerificationCode(email).catch((e) => {
          console.warn("Error sending verification code:", e);
        });

        // Small delay to show success state, then navigate
        setTimeout(() => {
          setIsCreatingAccount(false);
          console.log("Navigating to setPfp screen...");
          router.replace("/(main)/(user)/setPfp");
        }, 800);

        return;
      } else {
        setIsCreatingAccount(false);

        // Start cooldown on failed signup to prevent spam
        startCooldown(60);

        // Provide specific error messages based on status code and response
        let errorMessage = "";

        if (result.status === 400) {
          // Bad request - likely validation error
          if (result.message.toLowerCase().includes("email")) {
            errorMessage =
              "This email is already registered. Please use a different email or sign in.";
          } else if (result.message.toLowerCase().includes("password")) {
            errorMessage =
              "Password must be at least 8 characters long and contain letters and numbers.";
          } else if (result.message.toLowerCase().includes("phone")) {
            errorMessage = "Please enter a valid phone number.";
          } else {
            errorMessage =
              result.message || "Please check your information and try again.";
          }
        } else if (result.status === 409) {
          // Conflict - user already exists
          errorMessage =
            "An account with this email already exists. Please sign in instead.";
        } else if (result.status === 422) {
          // Validation error
          errorMessage =
            result.message ||
            "Please check that all fields are filled in correctly.";
        } else if (result.status === 429) {
          // Too many requests
          errorMessage =
            "Too many signup attempts. Please wait a few minutes and try again.";
          startCooldown(120); // Longer cooldown for rate limiting
        } else if (result.status === 500) {
          // Server error
          errorMessage =
            "Our servers are experiencing issues. Please try again in a few moments.";
        } else if (result.status === -1) {
          // Network error
          errorMessage =
            "Unable to connect to the server. Please check your internet connection and try again.";
        } else {
          errorMessage =
            result.message ||
            "Unable to create your account. Please try again.";
        }

        showToast("error", errorMessage);
      }
    } catch (error: any) {
      setIsCreatingAccount(false);
      startCooldown(60);

      // Handle different types of errors
      let errorMessage = "";
      if (error.name === "TypeError" && error.message.includes("Network")) {
        errorMessage =
          "No internet connection. Please check your network and try again.";
      } else if (error.name === "AbortError") {
        errorMessage =
          "Request timed out. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = "An unexpected error occurred. Please try again.";
      }

      showToast("error", errorMessage);
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
    // Check if button is disabled due to cooldown
    if (isButtonDisabled || isCreatingAccount) {
      if (cooldownRemaining > 0) {
        showToast(
          "error",
          `Please wait ${cooldownRemaining} seconds before trying again.`
        );
      }
      return;
    }

    // 1) Validate required fields first
    const missing = getMissingFields();
    if (missing.length > 0) {
      if (missing.length === 1) {
        showToast("error", `Please enter your ${missing[0].toLowerCase()}.`);
      } else {
        showToast(
          "error",
          `Please complete these fields: ${missing.join(", ")}.`
        );
      }
      return;
    }

    // 2) Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast("error", "Please enter a valid email address.");
      return;
    }

    // 3) Validate phone number format
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(mobile.trim())) {
      showToast(
        "error",
        "Please enter a valid phone number (at least 10 digits)."
      );
      return;
    }

    // 4) Validate password strength
    if (password.length < 8) {
      showToast("error", "Password must be at least 8 characters long.");
      return;
    }

    if (!/[a-zA-Z]/.test(password)) {
      showToast("error", "Password must contain at least one letter.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      showToast("error", "Password must contain at least one number.");
      return;
    }

    // 5) Validate password match
    if (password !== confirmPassword) {
      showToast(
        "error",
        "Passwords don't match. Please enter the same password in both fields."
      );
      return;
    }

    // 6) Play tap animation then submit
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

  const handleOAuthSignup = async (provider: OAuthProvider) => {
    if (oauthLoading) {
      return;
    }

    if (Platform.OS === "web") {
      showToast("error", "OAuth signup is currently unavailable on web.");
      return;
    }

    try {
      console.log(`[Signup] ${provider} signup started`);
      setOauthLoading(provider);

      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "myapp",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("[Signup] Supabase OAuth error:", error);
        throw new Error(error.message || "Unable to start authentication.");
      }

      if (!data?.url) {
        throw new Error("Unable to open provider login page.");
      }

      console.log("[Signup] Opening OAuth URL in browser...");
      const authResult = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (authResult.type !== "success") {
        throw new Error(
          authResult.type === "cancel"
            ? "Authentication cancelled."
            : "Authentication failed. Please try again."
        );
      }

      console.log("[Signup] OAuth browser session completed");

      // Extract and process the redirect URL to establish Supabase session
      if (authResult.url) {
        console.log("[Signup] Processing redirect URL...");
        const url = new URL(authResult.url);
        const params = url.searchParams;

        // Check if we have the necessary tokens in the URL
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log("[Signup] Setting Supabase session from redirect tokens...");
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error("[Signup] Error setting session:", setSessionError);
            throw new Error("Failed to establish session. Please try again.");
          }
        }
      }

      // Give Supabase a moment to fully establish the session
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "[Signup] Failed to fetch Supabase session:",
          sessionError
        );
        throw new Error("Authentication failed. Please try again.");
      }

      const supabaseToken = sessionData.session?.access_token;

      if (!supabaseToken) {
        console.error("[Signup] No access token in session:", sessionData);
        throw new Error("Missing authentication token. Please try again.");
      }

      console.log(
        "[Signup] Supabase OAuth successful, authenticating with backend..."
      );

      // Use unified OAuth flow (tries signup first, then login on 409)
      const backend = await authenticateWithOAuth(supabaseToken, provider);

      if (!backend.ok) {
        if (backend.status === 400) {
          showToast(
            "error",
            "Provider mismatch. Please use the same method you used previously."
          );
        } else if (backend.status === 401) {
          showToast("error", "Authentication failed. Please try again.");
        } else {
          showToast(
            "error",
            backend.message || "Unable to complete signup. Please try again."
          );
        }
        return;
      }

      await Storage.setItem("access_token", backend.data.access_token);
      console.log("[Signup] User authenticated successfully in backend");
      showToast("success", "Welcome to SAVR!");
      router.replace("/(main)/(user)/setPfp");
    } catch (error: any) {
      console.error("[Signup] OAuth signup error:", error);
      showToast(
        "error",
        error?.message || "Unable to complete signup. Please try again."
      );
    } finally {
      setOauthLoading(null);
    }
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
              <Text style={styles.brandName}>SAVR</Text>
              <Text style={{ color: "#00A86B", fontSize: 20 }}>
                Smarter Shopping.
              </Text>
              <Text style={{ color: "#FD8100", fontSize: 20 }}>
                Healthier Living.
              </Text>
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

            <View style={styles.oauthSection}>
              <TouchableOpacity
                style={[
                  styles.oauthButton,
                  oauthLoading === "google" && styles.oauthButtonActive,
                ]}
                onPress={() => handleOAuthSignup("google")}
                activeOpacity={0.8}
                disabled={isOAuthBusy}
              >
                <View style={styles.oauthButtonContent}>
                  {oauthLoading === "google" ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.oauthButtonText}>
                    Continue with Google
                  </Text>
                </View>
              </TouchableOpacity>

              {isAppleAvailable && (
                <TouchableOpacity
                  style={[
                    styles.oauthButton,
                    styles.oauthButtonApple,
                    oauthLoading === "apple" && styles.oauthButtonAppleActive,
                  ]}
                  onPress={() => handleOAuthSignup("apple")}
                  activeOpacity={0.8}
                  disabled={isOAuthBusy}
                >
                  <View style={styles.oauthButtonContent}>
                    {oauthLoading === "apple" ? (
                      <ActivityIndicator color="#111111" size="small" />
                    ) : (
                      <Ionicons name="logo-apple" size={18} color="#111111" />
                    )}
                    <Text
                      style={[
                        styles.oauthButtonText,
                        styles.oauthButtonAppleText,
                      ]}
                    >
                      Continue with Apple
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.oauthDividerRow}>
              <View style={styles.oauthDivider} />
              <Text style={styles.oauthDividerText}>or</Text>
              <View style={styles.oauthDivider} />
            </View>

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
                style={styles.input}
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
                placeholder="confirm password"
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
              disabled={isButtonDisabled || isCreatingAccount}
            >
              <Animated.View
                style={[
                  styles.createButton,
                  (isButtonDisabled || isCreatingAccount) &&
                    styles.createButtonDisabled,
                  {
                    transform: [{ scale: buttonScale }],
                  },
                ]}
              >
                {isButtonDisabled && cooldownRemaining > 0 ? (
                  <Text style={styles.createButtonText}>
                    {cooldownRemaining}s
                  </Text>
                ) : (
                  <Text style={styles.createButtonText}>→</Text>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* Cooldown message */}
            {isButtonDisabled && cooldownRemaining > 0 && (
              <Text style={styles.cooldownText}>
                Please wait {cooldownRemaining} seconds before trying again
              </Text>
            )}
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

      {/* Loading Overlay */}
      {isCreatingAccount && (
        <Animated.View
          style={[
            styles.loadingOverlay,
            {
              opacity: loadingOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.loadingCard,
              {
                transform: [{ scale: loadingScale }],
              },
            ]}
          >
            {/* Spinning loader */}
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.spinner}>
                <View style={styles.spinnerInner} />
              </View>
            </Animated.View>

            {/* Text */}
            <Text style={styles.loadingTitle}>Creating Your Account</Text>
            <Text style={styles.loadingSubtitle}>
              Just a moment while we set everything up for you...
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration ?? 3500}
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
    paddingTop: 55,
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
    marginBottom: verticalScale(5),
    marginTop: -40,
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
  oauthSection: {
    marginBottom: verticalScale(14),
  },
  oauthButton: {
    backgroundColor: "#4985F8",
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    justifyContent: "center",
    marginBottom: verticalScale(10),
  },
  oauthButtonActive: {
    opacity: 0.8,
  },
  oauthButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  oauthButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  oauthButtonApple: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  oauthButtonAppleActive: {
    opacity: 0.8,
  },
  oauthButtonAppleText: {
    color: "#111111",
  },
  oauthDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(18),
    justifyContent: "center",
  },
  oauthDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
  },
  oauthDividerText: {
    fontSize: moderateScale(13),
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginHorizontal: 10,
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
  createButtonDisabled: {
    backgroundColor: "#B0B0B0",
    shadowColor: "#B0B0B0",
    shadowOpacity: 0.2,
  },
  createButtonText: {
    fontSize: moderateScale(24),
    color: "#FFFFFF",
    fontWeight: "300",
  },
  cooldownText: {
    fontSize: moderateScale(12),
    color: "#B0B0B0",
    textAlign: "center",
    marginTop: verticalScale(12),
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
  brandName: {
    fontSize: 56,
    fontWeight: "700",
    color: "#00A86B",
    fontFamily: "System",
    letterSpacing: -1,
    marginTop: -30,
  },
  // Loading Overlay Styles
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(24),
    padding: moderateScale(32),
    alignItems: "center",
    minWidth: SCREEN_WIDTH * 0.75,
    maxWidth: SCREEN_WIDTH * 0.85,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  spinner: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    borderWidth: 4,
    borderColor: "#E8F5E9",
    borderTopColor: "#00C853",
    marginBottom: verticalScale(20),
  },
  spinnerInner: {
    width: "100%",
    height: "100%",
    borderRadius: moderateScale(28),
  },
  loadingTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  loadingSubtitle: {
    fontSize: moderateScale(14),
    color: "#757575",
    textAlign: "center",
    lineHeight: moderateScale(20),
    paddingHorizontal: scale(8),
  },
});
