import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
} from "@/src/auth/auth";

type Step = "email" | "code" | "newpwd";
const CODE_LENGTH = 6;

export default function ForgotPasswordScreen(): React.JSX.Element {
  const router = useRouter();

  // ----- shared animations -----
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

  // ----- flow state -----
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // ----- email step -----
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);

  // ----- code step -----
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const codeRefs = useRef<(TextInput | null)[]>([]);
  useEffect(() => {
    if (step === "code") codeRefs.current[0]?.focus();
  }, [step]);

  // ----- new password step -----
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);

  const pulseButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // -------------------- handlers --------------------
  const handleBack = () => {
    if (step === "email") return router.back();
    if (step === "code") return setStep("email");
    if (step === "newpwd") return setStep("code");
  };

  const handleSendCode = async () => {
    pulseButton();
    if (!email.trim()) {
      Alert.alert("Enter email", "Please enter your account email.");
      return;
    }
    setLoading(true);
    const res = await requestPasswordReset(email.trim());
    setLoading(false);
    if (!res.ok) {
      Alert.alert("Error", res.message || "Failed to send code.");
      return;
    }
    Alert.alert("Check your email", "We sent you a 6-digit code.");
    setStep("code");
  };

  const handleCodeChange = (text: string, index: number) => {
    if (text && !/^\d+$/.test(text)) return; // digits only
    const next = [...code];
    next[index] = text;
    setCode(next);
    if (text && index < CODE_LENGTH - 1) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKey = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    pulseButton();
    const joined = code.join("");
    if (joined.length !== CODE_LENGTH) {
      Alert.alert("Incomplete", `Enter the ${CODE_LENGTH}-digit code.`);
      return;
    }
    setLoading(true);
    const res = await verifyPasswordResetCode(email.trim(), joined);
    setLoading(false);
    if (!res.ok || !res.data?.reset_token) {
      Alert.alert("Invalid code, Please try again.");
      return;
    }
    setResetToken(res.data.reset_token);
    setStep("newpwd");
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    const res = await requestPasswordReset(email.trim());
    setResending(false);
    if (!res.ok) {
      Alert.alert("Resend failed", res.message || "Please try again.");
      return;
    }
    Alert.alert("Code resent", "Check your email again.");
    setCode(Array(CODE_LENGTH).fill(""));
    codeRefs.current[0]?.focus();
  };

  const handleResetPassword = async () => {
    pulseButton();
    if (!resetToken) {
      Alert.alert(
        "Error",
        "Missing reset token. Go back and verify the code again."
      );
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    setLoading(true);
    const res = await resetPassword(resetToken, password);
    setLoading(false);
    if (!res.ok) {
      Alert.alert("Error", res.message || "Could not reset password.");
      return;
    }
    Alert.alert("Success", "Your password has been reset.", [
      { text: "Go to Login", onPress: () => router.replace("/(auth)/Login") },
    ]);
  };

  // -------------------- UI --------------------
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
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.6}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {step === "email" && (
              <>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                  Enter your account email to receive a code.
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    emailFocused && styles.inputContainerFocused,
                  ]}
                >
                  <View style={styles.iconContainer}>
                    <Text style={styles.emailIcon}>✉</Text>
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
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSendCode}
                  activeOpacity={1}
                  disabled={loading}
                >
                  <Animated.View
                    style={[
                      styles.sendButton,
                      { transform: [{ scale: buttonScale }] },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.sendButtonText}>Send Code</Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </>
            )}

            {step === "code" && (
              <>
                <Text style={styles.title}>Enter Code</Text>
                <Text style={styles.subtitle}>
                  We sent a 6‑digit code to {email}.
                </Text>

                <View style={styles.codeContainer}>
                  {code.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(r: TextInput | null) => {
                        codeRefs.current[idx] = r;
                      }}
                      style={styles.codeInput}
                      value={digit}
                      onChangeText={(t) => handleCodeChange(t, idx)}
                      onKeyPress={(e) => handleCodeKey(e, idx)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleVerifyCode}
                  activeOpacity={1}
                  disabled={loading}
                >
                  <Animated.View
                    style={[
                      styles.sendButton,
                      { transform: [{ scale: buttonScale }] },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.sendButtonText}>Verify Code</Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>
                    Didn't receive the code?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending || loading}
                  >
                    {resending ? (
                      <ActivityIndicator />
                    ) : (
                      <Text style={styles.resendLink}>Resend</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === "newpwd" && (
              <>
                <Text style={styles.title}>Set New Password</Text>
                <Text style={styles.subtitle}>
                  Choose a strong password you’ll remember.
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor="#B0B0B0"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#B0B0B0"
                    secureTextEntry
                    value={confirm}
                    onChangeText={setConfirm}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  activeOpacity={1}
                  disabled={loading}
                >
                  <Animated.View
                    style={[
                      styles.sendButton,
                      { transform: [{ scale: buttonScale }] },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.sendButtonText}>Reset Password</Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backIcon: { fontSize: 24, color: "#111111" },
  content: { flex: 1, justifyContent: "center" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  inputContainerFocused: { borderColor: "#00C853", borderWidth: 1.5 },
  iconContainer: { marginRight: 12 },
  emailIcon: { fontSize: 22, color: "#00C853" },
  input: { flex: 1, fontSize: 16, color: "#111111" },
  sendButton: {
    backgroundColor: "#00C853",
    borderRadius: 16,
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00C853",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 8,
  },
  sendButtonText: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 24,
    paddingHorizontal: 8,
  },
  codeInput: {
    width: 54,
    height: 68,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    fontSize: 28,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  resendText: { fontSize: 15, color: "#999" },
  resendLink: { fontSize: 15, fontWeight: "600", color: "#00C853" },
});
