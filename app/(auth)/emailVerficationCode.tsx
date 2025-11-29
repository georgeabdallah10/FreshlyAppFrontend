// ==================== app/(auth)/emailVerficationCode.tsx ====================
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// Adjust this path if your context lives elsewhere
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useUser } from "@/context/usercontext";
import {
    getCurrentUser,
    resendCode,
    sendVerificationCode,
    verifyCode,
} from "../../src/auth/auth";

const CODE_LENGTH = 6;

const VerificationScreen = () => {
  const router = useRouter();
  const { fromSignUp } = useLocalSearchParams();

  const { user, refreshUser } = useUser?.() ?? {
    user: null,
    refreshUser: async () => {},
  };
  const [email, setEmail] = useState("")
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const test = async () => {
      const res = await getCurrentUser();
      console.log(res)
      if (!res.data) return;
      setEmail(res.data.email)
      console.log("something")
    }
    test();
  }, [])

  // Automatically send (or re-send) a code when this screen opens
  useEffect(() => {
    console.log(`${email}, ${code}`)
    let mounted = true;
    (async () => {
      if (!email) return;
      const result = await sendVerificationCode(email);
      if (!mounted) return;
      if (!result.ok) {
        Alert.alert(
          "Send Code Error",
          result.message || "Failed to send verification code."
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, [email]);

  const handleCodeChange = (text: string, index: number) => {
    if (text && !/^\d+$/.test(text)) return; // only digits

    const next = [...code];
    next[index] = text;
    setCode(next);

    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onVerify = async () => {
    const joined = code.join("");
    if (joined.length !== CODE_LENGTH) {
      Alert.alert("Incomplete", `Please enter the ${CODE_LENGTH}-digit code.`);
      return;
    }
    if (!email) {
      Alert.alert("Error", "No email found. Please log in again.");
      return;
    }

    const handleVerificationSuccess = () => {
      console.log(fromSignUp)
      if (fromSignUp === "true") {
        router.replace('/setPfp');
        console.log("from sign up")
      } else {
        router.replace('/(main)/(home)/main');
        console.log("why not")
      }
    };

    try {
      setLoading(true);
      
      const result = await verifyCode({ email, code: joined });
      if (!result.ok) {
        throw new Error(result.message || "Verification failed");
      }

      // Refresh the user so /auth/me reflects is_verified: true
      try {
        await refreshUser?.();
      } catch {}

      Alert.alert("Success", "Email verified successfully.", [
        { text: "OK", onPress: () => handleVerificationSuccess()},
      ]);
    } catch (err: any) {
          console.log(`${email}, ${code}`)
      Alert.alert(
        "Verification Error",
        err?.message || "Failed to verify code."
      );
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email) {
      Alert.alert("Error", "No email found. Please log in again.");
      return;
    }
    try {
      setResending(true);
      const result = await resendCode(email);
      if (!result.ok) {
        throw new Error(result.message || "Failed to resend code");
      }
      Alert.alert(
        "Sent",
        "A new verification code has been sent to your email."
      );
      // Clear inputs after resend
      setCode(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      Alert.alert("Resend Error", err?.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Authentication</Text>
            <Text style={styles.subtitle}>
              Enter the {CODE_LENGTH}-digit code sent to{"\n"}
              <Text style={{ fontWeight: "600", color: "#333" }}>
                {email || "your email"}
              </Text>
              .
            </Text>
          </View>

          {/* Code Inputs */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref: TextInput | null) => {
                  inputRefs.current[index] = ref;
                }}
                style={styles.codeInput}
                value={digit}
                onChangeText={(t) => handleCodeChange(t, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (loading || resending) && { opacity: 0.7 },
            ]}
            onPress={onVerify}
            activeOpacity={0.9}
            disabled={loading || resending}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={onResend}
              activeOpacity={0.7}
              disabled={resending || loading}
            >
              {resending ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.resendLink}>Resend</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 70,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    fontSize: 24,
    color: "#000",
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 24,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  codeInput: {
    width: 54,
    height: 68,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    fontSize: 28,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  verifyButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#00A86B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 40,
  },
  resendText: {
    fontSize: 15,
    color: "#999",
  },
  resendLink: {
    fontSize: 15,
    fontWeight: "600",
    color: "#00A86B",
  },
});

export default VerificationScreen;
