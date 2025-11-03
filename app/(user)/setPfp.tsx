// ==================== FaceVerificationFlow.tsx ====================
import ToastBanner from "@/components/generalMessage";
import Icon from "@/components/profileSection/components/icon";
import { useUser } from "@/context/usercontext";
import { getCurrentUser } from "@/src/auth/auth";
import { getAuthToken } from "@/src/client/apiClient";
import { uploadAvatarViaProxy } from "@/src/user/uploadViaBackend";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";


type Step = "initial" | "scanning" | "captured" | "success";
type ToastType = "success" | "error";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
  duration?: number;
  topOffset?: number;
}

// Cache-bust helper to avoid stale images when re-uploading the same path
const cacheBust = (url: string) => `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;

const toErrorText = (err: any): string => {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  if (Array.isArray(err)) {
    return err.map((e) => (e?.msg ?? e?.message ?? String(e))).join("\n");
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

export const SetPfp = () => {
  const router = useRouter();
  const { fromProfile } = useLocalSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>("initial");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userID, setUserID] = useState("");
  const { user, updateUserInfo, refreshUser } = useUser();

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
    duration: 3000,
    topOffset: 40,
  });
  const showToast = (
    type: ToastType,
    message: unknown,
    duration: number = 3000,
    topOffset: number = 40
  ) => {
    const text = toErrorText(message);
    setToast({ visible: true, type, message: text, duration, topOffset });
  };

  const scanAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const successAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[setPfp] useEffect triggered, user:', user?.id);
    
    // Try to get user ID immediately from context
    if (user?.id) {
      console.log('[setPfp] Setting userID from context:', user.id);
      setUserID(String(user.id));
      return;
    }

    // Check if token exists before making API call
    const fetchUser = async () => {
      console.log('[setPfp] Checking for auth token...');
      const token = await getAuthToken();
      console.log('[setPfp] Token exists:', !!token);
      
      // No token means user is not logged in - don't spam the backend
      if (!token) {
        console.log('[setPfp] No token found');
        if (fromProfile === "true") {
          showToast("error", "Please log in to continue");
          setTimeout(() => router.replace("/(auth)/Login"), 1000);
        } else {
          console.log('[setPfp] Coming from signup, will retry in 1 second...');
          // Coming from signup - wait for token to be set
          setTimeout(async () => {
            console.log('[setPfp] Retrying token check...');
            const retryToken = await getAuthToken();
            console.log('[setPfp] Retry - Token exists:', !!retryToken);
            if (retryToken) {
              const retryRes = await getCurrentUser();
              console.log('[setPfp] Retry - getCurrentUser result:', retryRes.ok, retryRes.data?.id);
              if (retryRes.ok && retryRes.data) {
                console.log('[setPfp] Setting userID from retry:', retryRes.data.id);
                setUserID(String(retryRes.data.id));
              }
            }
          }, 1500); // Increased to 1.5 seconds
        }
        return;
      }

      // Token exists - fetch user
      console.log('[setPfp] Fetching user with token...');
      const res = await getCurrentUser();
      console.log('[setPfp] getCurrentUser result:', res.ok, res.data?.id);
      if (res.ok && res.data) {
        console.log('[setPfp] Setting userID:', res.data.id);
        setUserID(String(res.data.id));
      } else {
        console.log('[setPfp] Failed to get user');
        // Failed to fetch user even with token
        if (fromProfile === "true") {
          showToast("error", "Please log in to continue");
          setTimeout(() => router.replace("/(auth)/Login"), 1000);
        }
      }
    };

    fetchUser();
  }, [user]);

  const persistAvatar = async (publicUrl: string) => {
    // 1) Bust cache so RN doesn't show the old image
    const busted = cacheBust(publicUrl);
    setSelectedImage(busted);

    // 2) Persist to backend (PATCH /users/me via your context method)
    // Make sure updateUserInfo returns a promise; if not, wrap it.
    await Promise.resolve(updateUserInfo({ avatar_path: busted }));

    // 3) Give the backend a tick to commit, then refresh local user data
    await new Promise((r) => setTimeout(r, 300));
    await Promise.resolve(refreshUser());
    showToast("success", "Profile photo updated!");
  };

  // Animated scanning circle
  useEffect(() => {
    if (currentStep === "scanning") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentStep]);

  // Progress animation
  useEffect(() => {
    if (currentStep === "scanning") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setCurrentStep("captured"), 500);
            return 100;
          }
          return prev + 2;
        });
      }, 40);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  // Success animation
  useEffect(() => {
    if (currentStep === "success") {
      Animated.spring(successAnimation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStep]);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showToast("error", "Camera permission is required");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      // Pre-check userID before starting scanning/upload
      if (!userID) {
        showToast("error", "No user ID; please sign in and try again.");
        setCurrentStep("initial");
        setUploading(false);
        return;
      }

      setCurrentStep("scanning");
      setUploading(true);

      const assetUri = result.assets?.[0]?.uri;
      if (!assetUri) throw new Error("No image URI from camera.");
      setSelectedImage(assetUri);

      // Upload via backend proxy
      console.log('[UPLOAD] Uploading via backend proxy, userId:', userID);
      
      try {
        const uploadResult = await uploadAvatarViaProxy({
          uri: assetUri,
          appUserId: userID,
        });

        const publicUrl = uploadResult.publicUrl || uploadResult.path;
        console.log('[UPLOAD] Upload successful, publicUrl:', publicUrl);
        await persistAvatar(publicUrl);
      } catch (uploadError: any) {
        console.log('ERROR [UPLOAD] Backend upload failed:', uploadError);
        
        let errorMessage = "Unable to upload your photo. ";
        if (uploadError?.message?.toLowerCase().includes("network")) {
          errorMessage = "No internet connection. Please check your network and try again.";
        } else if (uploadError?.message?.toLowerCase().includes("timeout")) {
          errorMessage = "Upload timed out. Please try again with a smaller image.";
        } else if (uploadError?.message?.toLowerCase().includes("size") || uploadError?.message?.toLowerCase().includes("large")) {
          errorMessage = "Image is too large. Please choose a smaller photo.";
        } else if (uploadError?.message?.toLowerCase().includes("format") || uploadError?.message?.toLowerCase().includes("type")) {
          errorMessage = "Invalid image format. Please use a JPG or PNG image.";
        } else if (uploadError?.message?.toLowerCase().includes("permission")) {
          errorMessage = "Permission denied. Please check your account settings.";
        } else if (uploadError?.message) {
          errorMessage = uploadError.message;
        } else {
          errorMessage += "Please try again.";
        }
        
        showToast("error", errorMessage);
        setUploading(false);
        setCurrentStep("initial");
        return;
      }

      setUploading(false);
      setCurrentStep("captured");
    } catch (err: any) {
      setUploading(false);
      
      let errorMessage = "Unable to capture photo. ";
      if (err?.message?.toLowerCase().includes("permission")) {
        errorMessage = "Camera permission denied. Please enable camera access in your device settings.";
      } else if (err?.message?.toLowerCase().includes("cancelled") || err?.message?.toLowerCase().includes("canceled")) {
        // User cancelled, don't show error
        setCurrentStep("initial");
        return;
      } else if (err?.message) {
        errorMessage = err.message;
      } else {
        errorMessage += "Please try again.";
      }
      
      showToast("error", errorMessage);
      setCurrentStep("initial");
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast("error", "Gallery permission is required");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled) return;

      // Pre-check userID before starting scanning/upload
      if (!userID) {
        showToast("error", "No user ID; please sign in and try again.");
        setCurrentStep("initial");
        setUploading(false);
        return;
      }

      setCurrentStep("scanning");
      setUploading(true);

      const assetUri = result.assets?.[0]?.uri;
      if (!assetUri) throw new Error("No image URI from gallery.");
      setSelectedImage(assetUri);

      // Upload via backend proxy
      console.log('[UPLOAD] Uploading via backend proxy from gallery, userId:', userID);
      
      try {
        const uploadResult = await uploadAvatarViaProxy({
          uri: assetUri,
          appUserId: userID,
        });

        const publicUrl = uploadResult.publicUrl || uploadResult.path;
        console.log('[UPLOAD] Upload successful, publicUrl:', publicUrl);
        await persistAvatar(publicUrl);
      } catch (uploadError: any) {
        console.log('ERROR [UPLOAD] Backend upload failed:', uploadError);
        
        let errorMessage = "Unable to upload your photo. ";
        if (uploadError?.message?.toLowerCase().includes("network")) {
          errorMessage = "No internet connection. Please check your network and try again.";
        } else if (uploadError?.message?.toLowerCase().includes("timeout")) {
          errorMessage = "Upload timed out. Please try again with a smaller image.";
        } else if (uploadError?.message?.toLowerCase().includes("size") || uploadError?.message?.toLowerCase().includes("large")) {
          errorMessage = "Image is too large. Please choose a smaller photo.";
        } else if (uploadError?.message?.toLowerCase().includes("format") || uploadError?.message?.toLowerCase().includes("type")) {
          errorMessage = "Invalid image format. Please use a JPG or PNG image.";
        } else if (uploadError?.message?.toLowerCase().includes("permission")) {
          errorMessage = "Permission denied. Please check your account settings.";
        } else if (uploadError?.message) {
          errorMessage = uploadError.message;
        } else {
          errorMessage += "Please try again.";
        }
        
        showToast("error", errorMessage);
        setUploading(false);
        setCurrentStep("initial");
        return;
      }

      setUploading(false);
      setCurrentStep("captured");
    } catch (err: any) {
      setUploading(false);
      
      let errorMessage = "Unable to select photo. ";
      if (err?.message?.toLowerCase().includes("permission")) {
        errorMessage = "Gallery permission denied. Please enable photo access in your device settings.";
      } else if (err?.message?.toLowerCase().includes("cancelled") || err?.message?.toLowerCase().includes("canceled")) {
        // User cancelled, don't show error
        setCurrentStep("initial");
        return;
      } else if (err?.message) {
        errorMessage = err.message;
      } else {
        errorMessage += "Please try again.";
      }
      
      showToast("error", errorMessage);
      setCurrentStep("initial");
    }
  };

  const handleContinue = () => {
    if (fromProfile == "true") {
      router.back();
    } else {
      if (currentStep === "captured") {
        setCurrentStep("success");
      } else if (currentStep === "success") {
        showToast("success", "Account created successfully!");
        router.replace("/(auth)/familyAuth");
      }
    }
  };

  const handleClose = () => {
    setCurrentStep("initial");
    setSelectedImage(null);
    setProgress(0);
    setUploading(false);
  };

  const renderInitialScreen = () => (
    <View style={styles.content}>
      {fromProfile == "true" ? (
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="back" size={24} color="#333" />
        </TouchableOpacity>
      ) : null}

      <Text style={styles.title}>Set a profile picture</Text>
      <Text style={styles.subtitle}>
        Choose a photo that represents you
      </Text>
      
      {/* Debug info - remove in production */}
      {__DEV__ && (
        <Text style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>
          UserID: {userID || 'Not set'} | From: {fromProfile || 'signup'}
        </Text>
      )}

      <View style={styles.faceIconContainer}>
        <View style={styles.faceCircleOuter}>
          <View style={styles.faceCircleInner}>
            <Icon name="user" size={80} color="#00A86B" />
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.scanButton, !userID && { opacity: 0.6 }]}
          onPress={() => {
            console.log('[setPfp] Take Photo pressed, userID:', userID);
            if (!userID) {
              showToast("error", "Please wait, loading user information...");
              return;
            }
            handleTakePhoto();
          }}
          activeOpacity={0.9}
          disabled={!userID}
        >
          <Icon name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.scanButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.galleryButton, !userID && { opacity: 0.6 }]}
          onPress={() => {
            console.log('[setPfp] Choose from Gallery pressed, userID:', userID);
            if (!userID) {
              showToast("error", "Please wait, loading user information...");
              return;
            }
            handleChooseFromGallery();
          }}
          activeOpacity={0.9}
          disabled={!userID}
        >
          <Icon name="image" size={20} color="#00A86B" style={{ marginRight: 8 }} />
          <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScanningScreen = () => {
    const rotate = scanAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View style={styles.content}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.scanningContainer}>
          <View style={styles.faceImageContainer}>
            <View style={styles.faceImageCircle}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.faceImageEmoji}>👨</Text>
              )}
            </View>

            <Animated.View
              style={[styles.scanningRing, { transform: [{ rotate }] }]}
            >
              <View style={styles.scanningRingSegment} />
            </Animated.View>
          </View>

          <Text style={styles.progressText}>
            {uploading ? Math.min(progress, 99) : 100}%
          </Text>
          <Text style={styles.scanningText}>
            {uploading ? "Uploading your photo..." : "Processing..."}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentStep("captured")}
        >
          <Text style={styles.nextButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCapturedScreen = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Face ID Verification</Text>
      <Text style={styles.subtitle}>
        Please put your phone in front{"\n"}of your face.
      </Text>

      <View style={styles.capturedImageContainer}>
        <View style={styles.capturedImageCircle}>
          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.capturedImageEmoji}>👨</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
        activeOpacity={0.9}
      >
        <Text style={styles.continueButtonText}>→</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuccessScreen = () => {
    const scale = successAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <View style={styles.content}>
        <View style={styles.successContainer}>
          <View style={styles.successImageContainer}>
            <View style={styles.successImageCircle}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.successImageEmoji}>👨</Text>
              )}
            </View>
          </View>

          <Animated.View
            style={[styles.successCheckContainer, { transform: [{ scale }] }]}
          >
            <View style={styles.successCheck}>
              <Text style={styles.successCheckIcon}>✓</Text>
            </View>
            <View style={[styles.successDot, { top: -10, left: -10 }]} />
            <View style={[styles.successDot, { top: -15, right: 10 }]} />
            <View style={[styles.successDot, { bottom: 0, left: -15 }]} />
            <View style={[styles.successDot, { bottom: -5, right: -10 }]} />
          </Animated.View>

          <Text style={styles.successTitle}>Congratulations!</Text>
          <Text style={styles.successSubtitle}>
            Your account has been{"\n"}created successfully.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.okButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.okButtonText}>Ok</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {currentStep === "initial" && renderInitialScreen()}
      {currentStep === "scanning" && renderScanningScreen()}
      {currentStep === "captured" && renderCapturedScreen()}
      {currentStep === "success" && renderSuccessScreen()}
      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        duration={toast.duration ?? 3000}
        topOffset={toast.topOffset ?? 40}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 90,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    left: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 60,
  },
  faceIconContainer: {
    alignItems: "center",
    marginBottom: 80,
  },
  faceCircleOuter: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#E8F5F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#00A86B",
    borderStyle: "dashed",
  },
  faceCircleInner: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#D4F1E5",
    alignItems: "center",
    justifyContent: "center",
  },
  faceIcon: {
    fontSize: 80,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  scanButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A86B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  galleryButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "600",
  },
  scanningContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  faceImageContainer: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    position: "relative",
  },
  faceImageCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  faceImageEmoji: {
    fontSize: 120,
  },
  scanningRing: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  scanningRingSegment: {
    width: "100%",
    height: "100%",
    borderRadius: 140,
    borderWidth: 4,
    borderColor: "transparent",
    borderTopColor: "#00A86B",
    borderRightColor: "#00A86B",
  },
  progressText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#00A86B",
    marginBottom: 8,
  },
  scanningText: {
    fontSize: 16,
    color: "#333",
    opacity: 0.9,
  },
  nextButton: {
    position: "absolute",
    bottom: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A86B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "600",
  },
  capturedImageContainer: {
    alignItems: "center",
    marginBottom: 100,
  },
  capturedImageCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  capturedImageEmoji: {
    fontSize: 120,
  },
  continueButton: {
    position: "absolute",
    bottom: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A86B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successImageContainer: {
    marginBottom: 40,
  },
  successImageCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  successImageEmoji: {
    fontSize: 80,
  },
  successCheckContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    position: "relative",
  },
  successCheck: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
  },
  successCheckIcon: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "700",
  },
  successDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00A86B",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
  },
  okButton: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00A86B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A86B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  okButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
});

export default SetPfp;

// ==================== USAGE INSTRUCTIONS ====================
//
// To actually use the camera and image picker, install these packages:
//
// expo install expo-image-picker expo-camera
//
// Then replace the Alert simulations with real functionality:
//
// import * as ImagePicker from 'expo-image-picker';
//
// const handleTakePhoto = async () => {
//   const { status } = await ImagePicker.requestCameraPermissionsAsync();
//   if (status !== 'granted') {
//     Alert.alert('Permission needed', 'Camera permission is required');
//     return;
//   }
//   const result = await ImagePicker.launchCameraAsync({
//     mediaTypes: [ImagePicker.MediaType.Images],
//     allowsEditing: true,
//     aspect: [1, 1],
//     quality: 1,
//   });
//   if (!result.canceled) {
//     setSelectedImage(result.assets[0].uri);
//     setCurrentStep('scanning');
//   }
// };
//
// const handleChooseFromGallery = async () => {
//   const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//   if (status !== 'granted') {
//     Alert.alert('Permission needed', 'Gallery permission is required');
//     return;
//   }
//   const result = await ImagePicker.launchImageLibraryAsync({
//     mediaTypes: [ImagePicker.MediaType.Images],
//     allowsEditing: true,
//     aspect: [1, 1],
//     quality: 1,
//   });
//   if (!result.canceled) {
//     setSelectedImage(result.assets[0].uri);
//     setCurrentStep('scanning');
//   }
// };
