// app/components/ScanConfirmModal.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

type ApprovePayload = {
  ingredient_name?: string;        // if no id, send name
  quantity?: number;
  unit_id?: number | null;
  expires_at?: string | null;      // ISO or null
  category: string | null;
};

type Props = {
  visible: boolean;
  product: any;
  onApprove: (payload: ApprovePayload) => void;
  onCancel: () => void;
};

const ScanConfirmModal: React.FC<Props> = ({
  visible,
  product,
  onApprove,
  onCancel,
}) => {
  // stable animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible || !product) return null;

  const name: string =
    product.name ||
    product.product_name ||
    product.product_name_en ||
    "Unknown";

  const imageUri: string | null =
    product.images?.front ||
    product.image_url ||
    product.image_front_url ||
    product.image_small_url ||
    null;

  const primaryLabel =
    product.health?.labels?.[0] ??
    product.category ??
    "General";

  const handleApprove = () => {
    const payload: ApprovePayload = {
      ingredient_name: name,
      quantity: 1,
      unit_id: null,
      expires_at: null,
      category: primaryLabel,
    };
    onApprove(payload);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
    >
      {/* Blurred backdrop */}
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={30}
        tint={Platform.OS === "ios" ? "systemThinMaterialDark" : "dark"}
      />

      {/* Subtle dark overlay on top of blur for contrast */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      />

      {/* Card */}
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.title}>Confirm Product</Text>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.rescanBtn]} onPress={onCancel}>
            <Text style={[styles.btnText, styles.rescanText]}>Rescan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={handleApprove}>
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

export default ScanConfirmModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  card: {
    position: "absolute",
    left: "8%",
    right: "8%",
    top: "22%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 10,
  },
  image: {
    width: 128,
    height: 128,
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  placeholderText: {
    color: "#888",
    fontSize: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  rescanBtn: {
    backgroundColor: "#F3F4F6",
  },
  approveBtn: {
    backgroundColor: "#00A86B", // your green
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
  rescanText: {
    color: "#111827",
  },
});