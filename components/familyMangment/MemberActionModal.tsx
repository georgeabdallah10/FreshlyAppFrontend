import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type MemberActionModalProps = {
  visible: boolean;
  memberName: string;
  memberRole: "owner" | "admin" | "member";
  onClose: () => void;
  onPromote?: () => Promise<void> | void;
  onDemote?: () => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  onViewMeals?: () => void;
  canPromote?: boolean;
  canDemote?: boolean;
  canRemove?: boolean;
  canViewMeals?: boolean;
  isPromoting?: boolean;
  isDemoting?: boolean;
  isRemoving?: boolean;
};

const MemberActionModal: React.FC<MemberActionModalProps> = ({
  visible,
  memberName,
  memberRole,
  onClose,
  onPromote,
  onDemote,
  onRemove,
  onViewMeals,
  canPromote = false,
  canDemote = false,
  canRemove = false,
  canViewMeals = false,
  isPromoting = false,
  isDemoting = false,
  isRemoving = false,
}) => {
  const hasActions = canPromote || canDemote || canRemove || canViewMeals;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalCard}>
          <Text style={styles.title}>Manage Member</Text>
          <Text style={styles.subtitle}>{memberName}</Text>
          {!hasActions ? (
            <Text style={styles.helperText}>
              No actions available for this member (role: {memberRole}).
            </Text>
          ) : null}
          {canViewMeals && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewMealsButton]}
              onPress={onViewMeals}
            >
              <Ionicons name="restaurant-outline" size={18} color="#0891B2" style={{ marginRight: 8 }} />
              <Text style={styles.viewMealsText}>View Meals</Text>
            </TouchableOpacity>
          )}
          {canPromote && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                (isPromoting || !hasActions) && styles.actionButtonDisabled,
              ]}
              onPress={onPromote}
              disabled={isPromoting}
            >
              <Text style={styles.actionText}>
                {isPromoting ? "Promoting..." : "Promote to Admin"}
              </Text>
            </TouchableOpacity>
          )}
          {canDemote && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                (isDemoting || !hasActions) && styles.actionButtonDisabled,
              ]}
              onPress={onDemote}
              disabled={isDemoting}
            >
              <Text style={styles.actionText}>
                {isDemoting ? "Demoting..." : "Demote to Member"}
              </Text>
            </TouchableOpacity>
          )}
          {canRemove && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.destructiveButton,
                isRemoving && styles.actionButtonDisabled,
              ]}
              onPress={onRemove}
              disabled={isRemoving}
            >
              <Text style={styles.destructiveText}>
                {isRemoving ? "Removing..." : "Remove from Family"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
    padding: 20,
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 16,
  },
  helperText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  destructiveButton: {
    borderColor: "#FECACA",
    backgroundColor: "#FFF1F2",
  },
  destructiveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC2626",
  },
  viewMealsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#A5F3FC",
    backgroundColor: "#ECFEFF",
  },
  viewMealsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0891B2",
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
});

export default MemberActionModal;
