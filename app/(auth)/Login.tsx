import ToastBanner from "@/components/generalMessage";
import { supabase } from "@/src/supabase/client";
import { Storage } from "@/src/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import {
  authenticateWithOAuth,
  loginUser,
  type OAuthProvider,
} from "../../src/auth/auth";
import { useUser } from "@/context/usercontext";
import { useFamilyContext } from "@/context/familycontext";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";

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
  if (typeof err === "string") {
    // Filter out technical error messages and return user-friendly ones
    const lowerErr = err.toLowerCase();
    if (lowerErr.includes("request failed with status")) {
      return "Something went wrong. Please try again.";
    }
    if (
      lowerErr.includes("network error") ||
      lowerErr.includes("failed to fetch")
    ) {
      return "Unable to connect. Please check your internet connection.";
    }
    return err;
  }
  if (Array.isArray(err)) {
    // Likely FastAPI/Pydantic errors array - extract meaningful messages
    const messages = err
      .map((e) => {
        const msg = e?.msg ?? e?.message ?? "";
        // Make Pydantic validation errors more readable
        if (typeof msg === "string") {
          return msg
            .replace(/^value is not a valid/, "Please enter a valid")
            .replace(/^field required$/, "This field is required")
            .replace(/^string does not match regex/, "Invalid format");
        }
        return String(msg);
      })
      .filter(Boolean);
    return messages.length > 0
      ? messages.join(". ")
      : "Please check your information and try again.";
  }
  if (typeof err === "object") {
    // Handle detail field from FastAPI
    if (err.detail) {
      if (typeof err.detail === "string") {
        return toErrorText(err.detail);
      }
      if (Array.isArray(err.detail)) {
        return toErrorText(err.detail);
      }
    }
    if (err.msg) return toErrorText(err.msg);
    if (err.message) return toErrorText(err.message);
    return "An unexpected error occurred. Please try again.";
  }
  return String(err);
};

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const userContext = useUser();
  const familyContext = useFamilyContext();
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const isAppleAvailable = Platform.OS === "ios";
  const isOAuthBusy = Boolean(oauthLoading);

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
    duration: 3500,
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

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (cooldownRemaining === 0 && isButtonDisabled) {
      setIsButtonDisabled(false);
    }
  }, [cooldownRemaining, isButtonDisabled]);

  const startCooldown = (seconds: number = 60) => {
    setIsButtonDisabled(true);
    setCooldownRemaining(seconds);
  };

  const hydrateSessionData = async () => {
    try {
      if (userContext?.refreshUser) {
        await userContext.refreshUser();
      }
      if (userContext?.refreshFamilyMembership) {
        await userContext.refreshFamilyMembership();
      }
      if (familyContext?.refreshFamilies) {
        await familyContext.refreshFamilies();
      }
    } catch (err) {
      console.log("[Login] Failed to hydrate session data:", err);
    }
  };

  async function onSubmit() {
    setIsLoggingIn(true);
    try {
      const result = await loginUser({
        email: email,
        password: password,
      });

      if (result.ok) {
        // Reset failed attempts on successful login
        setFailedAttempts(0);
        await Storage.setItem("access_token", result.data.access_token);
        await Storage.setItem("refresh_token", result.data.refresh_token);
        await hydrateSessionData();
        showToast("success", "Login successful! Redirecting...");
        setTimeout(() => {
          setIsLoggingIn(false);
          router.replace("/(main)/(home)/main");
        }, 500);
      } else {
        setIsLoggingIn(false);

        // Track failed attempts and start cooldown after 3 failures
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        if (newFailedAttempts >= 3) {
          startCooldown(30);
          setFailedAttempts(0); // Reset counter after cooldown starts
        }

        // Provide specific error messages based on status code
        let errorMessage = "";

        if (result.status === 401) {
          errorMessage =
            "Incorrect email or password. Please check your credentials and try again.";
        } else if (result.status === 404) {
          errorMessage =
            "Account not found. Please check your email or sign up for a new account.";
        } else if (result.status === 429) {
          errorMessage =
            "Too many login attempts. Please wait a moment and try again.";
          startCooldown(120); // Extended cooldown for rate limiting
        } else if (result.status === 500) {
          errorMessage =
            "Our servers are experiencing issues. Please try again in a few moments.";
        } else if (result.status === -1) {
          errorMessage =
            "Unable to connect to the server. Please check your internet connection and try again.";
        } else {
          // Parse the message to provide better context
          const lowerMessage = (result.message || "").toLowerCase();
          if (
            lowerMessage.includes("email") &&
            lowerMessage.includes("password")
          ) {
            errorMessage = "Incorrect email or password. Please try again.";
          } else if (lowerMessage.includes("email")) {
            errorMessage =
              "There's an issue with your email. Please check and try again.";
          } else if (lowerMessage.includes("password")) {
            errorMessage =
              "There's an issue with your password. Please try again.";
          } else if (
            lowerMessage.includes("invalid") ||
            lowerMessage.includes("incorrect")
          ) {
            errorMessage =
              "Invalid login credentials. Please check your email and password.";
          } else if (lowerMessage.includes("request failed with status")) {
            errorMessage =
              "Login failed. Please check your credentials and try again.";
          } else {
            errorMessage =
              "Login failed. Please check your credentials and try again.";
          }
        }

        showToast("error", errorMessage);
      }
    } catch (error: any) {
      setIsLoggingIn(false);

      // Track failed attempts and start cooldown after 3 failures
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      if (newFailedAttempts >= 3) {
        startCooldown(30);
        setFailedAttempts(0); // Reset counter after cooldown starts
      }

      // Handle different types of errors
      let errorMessage = "";
      if (error.name === "TypeError" && error.message.includes("Network")) {
        errorMessage =
          "No internet connection. Please check your network and try again.";
      } else if (error.name === "AbortError") {
        errorMessage =
          "Request timed out. Please check your connection and try again.";
      } else {
        // Don't expose raw error messages to users
        errorMessage = "An unexpected error occurred. Please try again.";
      }

      showToast("error", errorMessage);
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
    // Check if button is disabled due to cooldown
    if (isButtonDisabled || isLoggingIn) {
      if (cooldownRemaining > 0) {
        showToast(
          "error",
          `Please wait ${cooldownRemaining} seconds before trying again.`
        );
      }
      return;
    }

    // Validate fields
    if (!email?.trim()) {
      showToast("error", "Please enter your email address.");
      return;
    }

    if (!password?.trim()) {
      showToast("error", "Please enter your password.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast("error", "Please enter a valid email address.");
      return;
    }

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
      onSubmit();
    });
  };

  const handleForgotPassword = () => {
    console.log("Forgot password clicked");
    router.push("/(auth)/forgot-password");
  };

  const handleSignUp = () => {
    console.log("Sign up clicked");
    router.replace("/(auth)/signup");
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    if (oauthLoading) {
      return;
    }

    if (Platform.OS === "web") {
      showToast("error", "OAuth login is not available on web.");
      return;
    }

    try {
      console.log(`[Login] ${provider} login started`);
      setOauthLoading(provider);

      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "SAVR",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.log("[Login] Supabase OAuth error:", error);
        console.log(error.message || "Unable to start authentication.");
      }

      if (!data?.url) {
        console.log("Unable to open provider login page.");
      }

      console.log("[Login] Opening OAuth URL in browser...");
      if (!data.url) return;
      const authResult = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (authResult.type !== "success") {
        console.log(
          authResult.type === "cancel"
            ? "Authentication cancelled."
            : "Authentication failed. Please try again."
        );
        return;
      }

      if (!authResult.url) {
        console.log("[Login] No redirect URL returned after OAuth.");
        return;
      }

      console.log("[Login] OAuth browser session completed");

      // Extract and process the redirect URL to establish Supabase session

      console.log("[Login] Processing redirect URL...");
      const url = new URL(authResult.url);
      const params = url.searchParams;

      // Check if we have the necessary tokens in the URL
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        console.log("[Login] Setting Supabase session from redirect tokens...");
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (setSessionError) {
          console.log("[Login] Error setting session:", setSessionError);
          console.log("Failed to establish session. Please try again.");
        }
      }

      // Give Supabase a moment to fully establish the session
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.log("[Login] Failed to fetch Supabase session:", sessionError);
        console.log("Login failed. Please try again.");
      }

      const supabaseToken = sessionData.session?.access_token;

      if (!supabaseToken) {
        console.log("[Login] No access token in session:", sessionData);
        console.log("Missing authentication token. Please try again.");
      }

      console.log(
        "[Login] Supabase token received, authenticating with backend..."
      );

      // DFUse unified OAuth flow (tries signup
      //first, then login on 409)
      if (!supabaseToken) return;
      const backend = await authenticateWithOAuth(supabaseToken, provider);

      if (!backend.ok) {
        if (backend.status === 400) {
          showToast(
            "error",
            "Provider mismatch. Please use the same sign-in method you used before."
          );
        } else if (backend.status === 401) {
          showToast("error", "Authentication failed. Please try again.");
        } else if (backend.status === 404) {
          showToast("error", "No account found. Please sign up first.");
        } else if (backend.status === 429) {
          showToast(
            "error",
            "Too many attempts. Please wait a moment and try again."
          );
        } else if (backend.status === -1) {
          showToast(
            "error",
            "Connection issue. Please check your internet and try again."
          );
        } else {
          showToast("error", "Unable to sign you in. Please try again.");
        }
        return;
      }

      await Storage.setItem("access_token", backend.data.access_token);
      await Storage.setItem("refresh_token", backend.data.refresh_token);
      await hydrateSessionData();
      console.log(
        "[Login] Backend authentication successful, user session stored"
      );
      showToast("success", "Login successful! Redirecting...");
      router.replace("/(main)/(home)/main");
    } catch (error: any) {
      console.log("[Login] OAuth login error:", error);
      // Provide user-friendly messages for common OAuth errors
      let errorMessage = "Unable to complete login. Please try again.";
      if (error?.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes("cancel")) {
          errorMessage = "Sign in was cancelled.";
        } else if (msg.includes("network") || msg.includes("connection")) {
          errorMessage =
            "Connection issue. Please check your internet and try again.";
        } else if (msg.includes("session") || msg.includes("token")) {
          errorMessage = "Authentication session expired. Please try again.";
        }
      }
      showToast("error", errorMessage);
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
              <Text style={styles.welcomeText}>
                <Text style={styles.welcomeAccentPrimary}>Smarter Shopping.</Text>
                {"\n"}
                <Text style={styles.welcomeAccentSecondary}>Healthier Living.</Text>
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Login to plan smarter, shop better, {"\n"} and eat healthier.
            </Text>
            {/*} 
            <View style={styles.oauthSection}>
              <TouchableOpacity
                style={[
                  styles.oauthButton,
                  oauthLoading === "google" && styles.oauthButtonActive,
                ]}
                onPress={() => handleOAuthLogin("google")}
                activeOpacity={0.8}
                disabled={isOAuthBusy}
              >
                <View style={styles.oauthButtonContent}>
                  {oauthLoading === "google" ? (
                    <ActivityIndicator color={palette.card} size="small" />
                  ) : (
                    <Ionicons name="logo-google" size={18} color={palette.card} />
                  )}
                  <Text style={styles.oauthButtonText}>
                    Sign in with Google
                  </Text>
                </View>
              </TouchableOpacity>
              {/*
              {isAppleAvailable && (
                <TouchableOpacity
                  style={[
                    styles.oauthButton,
                    styles.oauthButtonApple,
                    oauthLoading === "apple" && styles.oauthButtonAppleActive,
                  ]}
                  onPress={() => handleOAuthLogin("apple")}
                  activeOpacity={0.8}
                  disabled={isOAuthBusy}
                >
                  <View style={styles.oauthButtonContent}>
                    {oauthLoading === "apple" ? (
                      <ActivityIndicator color={palette.text} size="small" />
                    ) : (
                      <Ionicons name="logo-apple" size={18} color={palette.text} />
                    )}
                    <Text
                      style={[
                        styles.oauthButtonText,
                        styles.oauthButtonAppleText,
                      ]}
                    >
                      Sign in with Apple
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>*/}
            {/* 

            <View style={styles.oauthDividerRow}>
              <View style={styles.oauthDivider} />
              <Text style={styles.oauthDividerText}>or sign in with email</Text>
              <View style={styles.oauthDivider} />
            </View>
            */}

            {/* Email Input */}
            <Animated.View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={24} color={palette.success} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                placeholderTextColor={palette.textMuted}
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
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed-outline" size={24} color={palette.success} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={palette.textMuted}
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
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={palette.textMuted}
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
              disabled={isButtonDisabled || isLoggingIn}
            >
              <Animated.View
                style={[
                  styles.loginButton,
                  (isButtonDisabled || isLoggingIn) &&
                    styles.loginButtonDisabled,
                  {
                    transform: [{ scale: buttonScale }],
                  },
                ]}
              >
                {isButtonDisabled && cooldownRemaining > 0 ? (
                  <Text style={styles.loginButtonText}>
                    {cooldownRemaining}s
                  </Text>
                ) : (
                  <Text style={styles.loginButtonText}>→</Text>
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

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createPalette = (colors: ColorTokens) => ({
  background: colors.background,
  card: colors.card,
  cardAlt: withAlpha(colors.textSecondary, 0.06),
  border: colors.border,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  primary: colors.primary,
  success: colors.success,
  accent: colors.warning,
  error: colors.error,
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      paddingTop: 50,
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
      marginTop: 0,
      alignItems: "center",
      marginBottom: 20,
    },
    logoImage: {
      width: 150,
      height: 150,
    },
    card: {
      backgroundColor: palette.cardAlt,
      borderRadius: 24,
      padding: 28,
      marginBottom: 20,
      marginTop: -30,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: palette.text,
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: palette.textMuted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 28,
    },
    oauthSection: {
      marginBottom: 20,
    },
    oauthButton: {
      backgroundColor: palette.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      justifyContent: "center",
      marginBottom: 12,
    },
    oauthButtonApple: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    oauthButtonActive: {
      opacity: 0.8,
    },
    oauthButtonAppleActive: {
      opacity: 0.8,
    },
    oauthButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    oauthButtonText: {
      color: palette.card,
      fontSize: 15,
      fontWeight: "600",
      marginLeft: 8,
    },
    oauthButtonAppleText: {
      color: palette.text,
    },
    oauthDividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    oauthDivider: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
    },
    oauthDividerText: {
      fontSize: 12,
      color: palette.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginHorizontal: 10,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: palette.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: palette.border,
      transitionDelay: "0.2s",
      transitionProperty: "ease",
    },
    inputContainerFocused: {
      borderColor: palette.success,
      borderWidth: 1.5,
    },
    iconContainer: {
      marginRight: 12,
    },
    emailIcon: {
      fontSize: 20,
      color: palette.success,
    },
    lockIcon: {
      fontSize: 20,
      color: palette.success,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: palette.text,
      fontFamily: "System",
    },
    eyeButton: {
      padding: 4,
    },
    eyeIcon: {
      fontSize: 20,
      color: palette.textMuted,
    },
    forgotPassword: {
      fontSize: 15,
      color: palette.text,
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
      backgroundColor: palette.success,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: palette.success,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    loginButtonDisabled: {
      backgroundColor: palette.textMuted,
      shadowColor: palette.textMuted,
      shadowOpacity: 0.2,
    },
    loginButtonText: {
      fontSize: 28,
      color: palette.card,
      fontWeight: "300",
    },
    cooldownText: {
      fontSize: 12,
      color: palette.textMuted,
      textAlign: "center",
      marginTop: 12,
    },
    signUpContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 0,
    },
    signUpText: {
      fontSize: 15,
      color: palette.textMuted,
    },
    signUpLink: {
      fontSize: 15,
      color: palette.success,
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
      marginTop: 5,
      color: palette.text,
    },
    welcomeAccentPrimary: {
      color: palette.primary,
    },
    welcomeAccentSecondary: {
      color: palette.accent,
    },
    brandName: {
      fontSize: 56,
      fontWeight: "700",
      color: palette.primary,
      fontFamily: "System",
      letterSpacing: -1,
      marginTop: -30,
    },
  });
