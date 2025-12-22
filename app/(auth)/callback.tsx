import { supabase } from "@/src/supabase/client";
import { Storage } from "@/src/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { authenticateWithOAuth, type OAuthProvider } from "../../src/auth/auth";

/**
 * OAuth Callback Handler
 * 
 * This route handles the OAuth redirect after successful authentication.
 * It processes the tokens and completes the authentication flow.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      console.log("[Callback] Processing OAuth callback...");

      // Get the current session from Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.log("[Callback] Session error:", sessionError);
        setError("Authentication failed. Please try again.");
        setTimeout(() => router.replace("/(auth)/Login"), 3000);
        return;
      }

      const supabaseToken = sessionData.session?.access_token;
      const provider = sessionData.session?.user?.app_metadata?.provider as OAuthProvider;

      if (!supabaseToken) {
        console.log("[Callback] No access token in session");
        setError("Missing authentication token. Please try again.");
        setTimeout(() => router.replace("/(auth)/Login"), 3000);
        return;
      }

      if (!provider) {
        console.log("[Callback] No provider information");
        setError("Missing provider information. Please try again.");
        setTimeout(() => router.replace("/(auth)/Login"), 3000);
        return;
      }

      console.log("[Callback] Authenticating with backend...");

      // Authenticate with backend
      const backend = await authenticateWithOAuth(supabaseToken, provider);

      if (!backend.ok) {
        console.log("[Callback] Backend authentication failed:", backend.message);
        let errorMessage = "Unable to complete authentication. ";
        
        if (backend.status === 400) {
          errorMessage += "Provider mismatch detected.";
        } else if (backend.status === 401) {
          errorMessage += "Authentication failed.";
        } else if (backend.status === 409) {
          errorMessage += "Account already exists.";
        } else {
          errorMessage += "Please try again.";
        }
        
        setError(errorMessage);
        setTimeout(() => router.replace("/(auth)/Login"), 3000);
        return;
      }

      // Store tokens
      await Storage.setItem("access_token", backend.data.access_token);
      await Storage.setItem("refresh_token", backend.data.refresh_token);

      console.log("[Callback] Authentication successful, redirecting...");

      // Redirect to main app
      router.replace("/(main)/(home)/main");
    } catch (err: any) {
      console.log("[Callback] Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setTimeout(() => router.replace("/(auth)/Login"), 3000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color="#DC2626"
              style={styles.errorIcon}
            />
            <Text style={styles.errorTitle}>Authentication Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.redirectText}>Redirecting to login...</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#00C853" />
            <Text style={styles.loadingText}>Completing authentication...</Text>
            <Text style={styles.subText}>Please wait a moment</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
    marginTop: 20,
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    color: "#B0B0B0",
    marginTop: 8,
    textAlign: "center",
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#111111",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  redirectText: {
    fontSize: 14,
    color: "#B0B0B0",
    marginTop: 16,
    textAlign: "center",
  },
});
