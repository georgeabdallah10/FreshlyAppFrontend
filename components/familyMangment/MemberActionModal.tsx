import React, { useMemo } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "@/context/ThemeContext";
import { ColorTokens } from "@/theme/colors";

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
  const { theme } = useThemeContext();
  const palette = useMemo(() => createPalette(theme.colors), [theme.colors]);
  const styles = useMemo(() => createStyles(palette), [palette]);
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
              <Ionicons name="restaurant-outline" size={18} color={palette.primary} style={{ marginRight: 8 }} />
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
  primary: colors.primary,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  error: colors.error,
  shadow: withAlpha(colors.textPrimary, 0.2),
});

const createStyles = (palette: ReturnType<typeof createPalette>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: withAlpha(palette.text, 0.45),
      justifyContent: "flex-end",
      padding: 20,
    },
    overlayTouchable: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      backgroundColor: palette.card,
      borderRadius: 20,
      padding: 24,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: palette.border,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 16,
      color: palette.textMuted,
      marginBottom: 16,
    },
    helperText: {
      fontSize: 14,
      color: palette.textMuted,
      marginBottom: 12,
    },
    actionButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 12,
      alignItems: "center",
      backgroundColor: palette.background,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    destructiveButton: {
      borderColor: withAlpha(palette.error, 0.25),
      backgroundColor: withAlpha(palette.error, 0.08),
    },
    destructiveText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.error,
    },
    viewMealsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderColor: withAlpha(palette.primary, 0.2),
      backgroundColor: withAlpha(palette.primary, 0.08),
    },
    viewMealsText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.primary,
    },
    cancelButton: {
      marginTop: 8,
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.primary,
    },
  });

export default MemberActionModal;
