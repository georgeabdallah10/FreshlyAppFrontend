/**
 * ============================================
 * SEND MEAL SHARE REQUEST MODAL
 * ============================================
 * Modal for searching any user to share a meal with
 */

import ToastBanner from '@/components/generalMessage';
import { useUser } from '@/context/usercontext';
import { useSendShareRequest } from '@/hooks/useMealShare';
import { searchUsers, type UserSearchResult } from '@/src/services/user.service';
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
  user_id?: number;
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
  familyId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const SendShareRequestModal: React.FC<SendShareRequestModalProps> = ({
  visible,
  mealId,
  mealName,
  familyId = null,
  onClose,
  onSuccess,
}) => {
  const { user } = useUser();
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<UserSearchResult[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ visible: false, type: 'success', message: '' });

  const sendRequest = useSendShareRequest();
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const mapMemberToUser = React.useCallback((member: FamilyMember): UserSearchResult | null => {
    const id = member.user?.id ?? member.user_id ?? member.id;
    if (!id) {
      return null;
    }

    return {
      id,
      name: member.user?.name ?? member.name,
      full_name: member.user?.full_name,
      display_name: member.user?.display_name ?? member.display_name,
      email: member.user?.email ?? member.email,
      avatar_path: member.user?.avatar_path ?? member.avatar_path,
    };
  }, []);

  const loadFamilyMembers = React.useCallback(async () => {
    if (!familyId) {
      setFamilyMembers([]);
      setFamilyError(null);
      return;
    }

    try {
      setFamilyLoading(true);
      setFamilyError(null);
      const data = await listFamilyMembers(familyId);
      const normalized = (data || [])
        .map(mapMemberToUser)
        .filter((member): member is UserSearchResult => Boolean(member && member.id !== user?.id));
      setFamilyMembers(normalized);
    } catch (error: any) {
      console.error('[SendShareRequestModal] Error loading family members:', error);
      setFamilyError(error?.message || 'Failed to load family members');
    } finally {
      setFamilyLoading(false);
    }
  }, [familyId, mapMemberToUser, user?.id]);

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
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      setFamilyMembers([]);
      setFamilyError(null);
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
  }, [visible, loadFamilyMembers]);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    let isCancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const results = await searchUsers(trimmed);
        if (isCancelled) return;
        const filtered = (results || []).filter((candidate) => candidate.id !== user?.id);
        setSearchResults(filtered);
      } catch (error: any) {
        if (isCancelled) return;
        console.error('[SendShareRequestModal] Error searching users:', error);
        setToast({
          visible: true,
          type: 'error',
          message: error?.message || 'Failed to search users',
        });
      } finally {
        if (!isCancelled) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery, user?.id, visible]);

  const handleSend = async () => {
    if (!selectedUser?.id) {
      setToast({
        visible: true,
        type: 'error',
        message: 'Please select a recipient',
      });
      return;
    }

    try {
      await sendRequest.mutateAsync({
        mealId,
        recipientUserId: selectedUser.id,
        message: message.trim() || undefined,
      });

      setToast({
        visible: true,
        type: 'success',
        message: `Share request sent to ${getUserName(selectedUser)}!`,
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
  const getUserName = React.useCallback((candidate: UserSearchResult | null | undefined): string => {
    if (!candidate) return 'User';

    const name =
      candidate.name ||
      candidate.full_name ||
      candidate.display_name ||
      candidate.email?.split('@')[0];

    if (name) {
      return String(name).trim();
    }

    return `User ${candidate.id}`;
  }, []);

  const getUserInitial = React.useCallback((candidate: UserSearchResult | null | undefined): string => {
    const name = getUserName(candidate);
    return (name.charAt(0) || 'U').toUpperCase();
  }, [getUserName]);

  const renderUserOption = (candidate: UserSearchResult) => (
    <TouchableOpacity
      key={candidate.id}
      style={[
        styles.memberCard,
        selectedUser?.id === candidate.id && styles.memberCardSelected,
      ]}
      onPress={() => setSelectedUser(candidate)}
      activeOpacity={0.7}
    >
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>{getUserInitial(candidate)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{getUserName(candidate)}</Text>
        {candidate.email && <Text style={styles.memberEmail}>{candidate.email}</Text>}
      </View>
      {selectedUser?.id === candidate.id && (
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      )}
    </TouchableOpacity>
  );

  const renderFamilySection = () => {
    if (!familyId) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No family connected</Text>
          <Text style={styles.emptySubtext}>
            Join or create a family to quickly send meals to them.
          </Text>
        </View>
      );
    }

    if (familyLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      );
    }

    if (familyError) {
      return <Text style={styles.errorText}>{familyError}</Text>;
    }

    if (familyMembers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No family members available</Text>
          <Text style={styles.emptySubtext}>
            Invite more family members to share meals with them.
          </Text>
        </View>
      );
    }

    return familyMembers.map(renderUserOption);
  };

  const renderSearchResultsSection = () => {
    if (searchQuery.trim().length < 2) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Search the Freshly community</Text>
          <Text style={styles.emptySubtext}>
            Enter at least 2 characters to find other users by name or email.
          </Text>
        </View>
      );
    }

    if (searching) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Searching users...</Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            Try a different name or search by their email address.
          </Text>
        </View>
      );
    }

    return searchResults.map(renderUserOption);
  };

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
              Pick a family member or search the Freshly community to share this meal.
            </Text>
          </View>

          <View style={styles.searchSection}>
            <Text style={styles.messageLabel}>Send to any Freshly user</Text>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Type a name or email"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            {selectedUser && (
              <View style={styles.selectedRecipient}>
                <Ionicons name="person-circle" size={32} color="#10B981" />
                <View style={styles.selectedRecipientInfo}>
                  <Text style={styles.selectedRecipientLabel}>Selected recipient</Text>
                  <Text style={styles.selectedRecipientName}>{getUserName(selectedUser)}</Text>
                  {selectedUser.email && (
                    <Text style={styles.selectedRecipientEmail}>{selectedUser.email}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedUser(null)}
                  style={styles.selectedRecipientClear}
                >
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Family members</Text>
              {renderFamilySection()}
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Search results</Text>
              {renderSearchResultsSection()}
            </View>
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
                (!selectedUser?.id || sendRequest.isPending) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!selectedUser?.id || sendRequest.isPending}
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
  sectionContainer: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  clearButton: {
    marginLeft: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  selectedRecipient: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  selectedRecipientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedRecipientLabel: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 2,
  },
  selectedRecipientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  selectedRecipientEmail: {
    fontSize: 13,
    color: '#047857',
  },
  selectedRecipientClear: {
    padding: 6,
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
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
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
