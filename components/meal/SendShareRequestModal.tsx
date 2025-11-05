/**
 * ============================================
 * SEND MEAL SHARE REQUEST MODAL
 * ============================================
 * Modal for selecting family members to share a meal with
 */

import ToastBanner from '@/components/generalMessage';
import { useUser } from '@/context/usercontext';
import { useSendShareRequest } from '@/hooks/useMealShare';
import { listFamilyMembers } from '@/src/user/family';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface FamilyMember {
  id: number;
  user_id: number;
  name?: string;
  display_name?: string;
  email?: string;
  avatar_path?: string;
  user?: {
    id?: number;
    name?: string;
    full_name?: string;
    display_name?: string;
    email?: string;
    avatar_path?: string;
  };
}

interface SendShareRequestModalProps {
  visible: boolean;
  mealId: number;
  mealName: string;
  familyId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const SendShareRequestModal: React.FC<SendShareRequestModalProps> = ({
  visible,
  mealId,
  mealName,
  familyId,
  onClose,
  onSuccess,
}) => {
  const { user } = useUser();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ visible: false, type: 'success', message: '' });

  const sendRequest = useSendShareRequest();
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      loadFamilyMembers();
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
      setSelectedMemberId(null);
      setMessage('');
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

  const loadFamilyMembers = async () => {
    if (!familyId) {
      console.warn('[SendShareRequestModal] familyId is not set');
      return;
    }
    
    try {
      setLoading(true);
      console.log('[SendShareRequestModal] Loading members for familyId:', familyId);
      
      const data = await listFamilyMembers(familyId);
      
      // Filter out the current user from the list
      const currentUserId = user?.id;
      
      const filteredMembers = (data || []).filter((member: FamilyMember) => {
        const memberId = member.user_id || member.id;
        return memberId !== currentUserId;
      });
      
      console.log('[SendShareRequestModal] Loaded members:', filteredMembers.length);
      setMembers(filteredMembers);
      
      if (filteredMembers.length === 0) {
        setToast({
          visible: true,
          type: 'error',
          message: 'No other family members available to share with',
        });
      }
    } catch (error: any) {
      console.error('[SendShareRequestModal] Error loading members:', error);
      setToast({
        visible: true,
        type: 'error',
        message: error?.message || 'Failed to load family members',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedMemberId) {
      setToast({
        visible: true,
        type: 'error',
        message: 'Please select a family member',
      });
      return;
    }

    try {
      await sendRequest.mutateAsync({
        meal_id: mealId,
        recipientUserId: selectedMemberId,
        message: message.trim() || undefined,
      });

      setToast({
        visible: true,
        type: 'success',
        message: 'Share request sent successfully!',
      });

      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      console.error('[SendShareRequestModal] Error sending request:', error);
      const errorMessage = error?.message || 'Failed to send request';
      
      setToast({
        visible: true,
        type: 'error',
        message: errorMessage,
      });
    }
  };

  // Memoize member name extraction to prevent infinite logging
  const getMemberName = React.useCallback((member: FamilyMember): string => {
    // Try nested user object first (backend structure)
    const nestedUser = member.user;
    if (nestedUser) {
      const name = nestedUser.name || nestedUser.full_name || nestedUser.display_name;
      if (name) {
        return String(name).trim();
      }
      
      // Fallback to nested email
      if (nestedUser.email) {
        const emailName = nestedUser.email.split('@')[0];
        return String(emailName).trim();
      }
    }
    
    // Try direct fields on member object
    const name = member.name 
      || member.display_name 
      || member.email?.split('@')[0] // Extract username from email
      || member.email;
    
    if (name) {
      return String(name).trim();
    }
    
    // Last resort fallback
    return `User ${member.user_id || member.id}`;
  }, []);

  const getMemberInitial = React.useCallback((member: FamilyMember): string => {
    const name = getMemberName(member);
    return (name.charAt(0) || 'U').toUpperCase();
  }, [getMemberName]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={styles.modalIconContainer}>
              <View style={styles.modalIcon}>
                <Ionicons name="share-social" size={24} color="#10B981" />
              </View>
            </View>
            <Text style={styles.modalTitle}>Share "{mealName}"</Text>
            <Text style={styles.modalSubtitle}>
              Select a family member to share this meal with
            </Text>
          </View>

          <ScrollView
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Loading family members...</Text>
              </View>
            ) : members.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No other family members available</Text>
                <Text style={styles.emptySubtext}>
                  Invite more family members to share meals with them
                </Text>
              </View>
            ) : (
              members.map((member) => (
                <TouchableOpacity
                  key={member.user_id || member.id}
                  style={[
                    styles.memberCard,
                    selectedMemberId === (member.user_id || member.id) &&
                      styles.memberCardSelected,
                  ]}
                  onPress={() => setSelectedMemberId(member.user_id || member.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {getMemberInitial(member)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {getMemberName(member)}
                    </Text>
                    {(member.user?.email || member.email) && (
                      <Text style={styles.memberEmail}>{member.user?.email || member.email}</Text>
                    )}
                  </View>
                  {selectedMemberId === (member.user_id || member.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Add a message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="e.g., Try this amazing recipe!"
              value={message}
              onChangeText={setMessage}
              maxLength={200}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!selectedMemberId || sendRequest.isPending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!selectedMemberId || sendRequest.isPending}
              activeOpacity={0.7}
            >
              {sendRequest.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ToastBanner
            visible={toast.visible}
            type={toast.type}
            message={toast.message}
            onHide={() => setToast({ ...toast, visible: false })}
            topOffset={60}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    marginBottom: 12,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  membersList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  messageSection: {
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#10B981',
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SendShareRequestModal;
