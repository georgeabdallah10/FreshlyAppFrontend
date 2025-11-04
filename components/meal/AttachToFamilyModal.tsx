/**
 * ============================================
 * ATTACH TO FAMILY MODAL
 * ============================================
 * Modal for selecting a family to attach a meal to
 */

import ToastBanner from '@/components/generalMessage';
import { useUser } from '@/context/usercontext';
import { listMyFamilies } from '@/src/user/family';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { attachMealToFamily } from '@/src/services/mealFamily.service';

interface Family {
  id: number;
  name: string;
  description?: string;
  member_count?: number;
}

interface AttachToFamilyModalProps {
  visible: boolean;
  mealId: number;
  mealName: string;
  onClose: () => void;
  onSuccess?: (familyId: number, familyName: string) => void;
}

const AttachToFamilyModal: React.FC<AttachToFamilyModalProps> = ({
  visible,
  mealId,
  mealName,
  onClose,
  onSuccess,
}) => {
  const { user } = useUser();
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ visible: false, type: 'success', message: '' });

  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      loadFamilies();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setSelectedFamilyId(null);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadFamilies = async () => {
    setLoading(true);
    try {
      const res = await listMyFamilies();
      if (res?.ok) {
        const data = await res.json();
        const familyList = Array.isArray(data) ? data : [];
        setFamilies(familyList);
      } else {
        showToast('error', 'Failed to load families');
      }
    } catch (error) {
      console.error('[AttachToFamilyModal] Error loading families:', error);
      showToast('error', 'Failed to load families');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async () => {
    if (!selectedFamilyId) {
      showToast('error', 'Please select a family');
      return;
    }

    const selectedFamily = families.find(f => f.id === selectedFamilyId);
    if (!selectedFamily) {
      showToast('error', 'Family not found');
      return;
    }

    setAttaching(true);
    try {
      await attachMealToFamily(mealId, selectedFamilyId);
      showToast('success', `Meal attached to ${selectedFamily.name}`);
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.(selectedFamilyId, selectedFamily.name);
        onClose();
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to attach meal to family';
      showToast('error', errorMessage);
    } finally {
      setAttaching(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast({ visible: false, type: 'success', message: '' }), 3000);
  };

  const handleClose = () => {
    if (!attaching) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="git-network-outline" size={24} color="#10B981" />
              <Text style={styles.headerTitle}>Attach to Family</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={attaching}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Meal Name */}
          <View style={styles.mealInfo}>
            <Text style={styles.mealLabel}>Meal:</Text>
            <Text style={styles.mealName} numberOfLines={1}>
              {mealName}
            </Text>
          </View>

          {/* Family Selection */}
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Select a Family</Text>
            <Text style={styles.sectionSubtitle}>
              Choose which family this meal belongs to. You'll be able to share it with family members.
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Loading families...</Text>
              </View>
            ) : families.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Families Found</Text>
                <Text style={styles.emptySubtitle}>
                  You need to be part of a family to attach meals.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.familyList}
                showsVerticalScrollIndicator={false}
              >
                {families.map((family) => (
                  <TouchableOpacity
                    key={family.id}
                    style={[
                      styles.familyItem,
                      selectedFamilyId === family.id && styles.familyItemSelected,
                    ]}
                    onPress={() => setSelectedFamilyId(family.id)}
                    disabled={attaching}
                  >
                    <View style={styles.familyInfo}>
                      <View style={styles.familyIcon}>
                        <Ionicons
                          name="people"
                          size={20}
                          color={selectedFamilyId === family.id ? '#FFFFFF' : '#10B981'}
                        />
                      </View>
                      <View style={styles.familyDetails}>
                        <Text
                          style={[
                            styles.familyName,
                            selectedFamilyId === family.id && styles.familyNameSelected,
                          ]}
                        >
                          {family.name}
                        </Text>
                        {family.description && (
                          <Text
                            style={[
                              styles.familyDescription,
                              selectedFamilyId === family.id && styles.familyDescriptionSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {family.description}
                          </Text>
                        )}
                        {family.member_count != null && (
                          <Text
                            style={[
                              styles.memberCount,
                              selectedFamilyId === family.id && styles.memberCountSelected,
                            ]}
                          >
                            {family.member_count} {family.member_count === 1 ? 'member' : 'members'}
                          </Text>
                        )}
                      </View>
                    </View>
                    {selectedFamilyId === family.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Actions */}
          {families.length > 0 && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={attaching}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.attachButton,
                  (!selectedFamilyId || attaching) && styles.attachButtonDisabled,
                ]}
                onPress={handleAttach}
                disabled={!selectedFamilyId || attaching}
              >
                {attaching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color="#FFFFFF" />
                    <Text style={styles.attachButtonText}>Attach to Family</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>

      {toast.visible && (
        <ToastBanner
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast({ ...toast, visible: false })}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  mealInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  familyList: {
    flex: 1,
  },
  familyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  familyItemSelected: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  familyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  familyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyDetails: {
    flex: 1,
  },
  familyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  familyNameSelected: {
    color: '#FFFFFF',
  },
  familyDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  familyDescriptionSelected: {
    color: '#D1FAE5',
  },
  memberCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  memberCountSelected: {
    color: '#D1FAE5',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  attachButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  attachButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  attachButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AttachToFamilyModal;
