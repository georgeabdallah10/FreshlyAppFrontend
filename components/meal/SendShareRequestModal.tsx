/**
 * ============================================
 * SEND MEAL SHARE REQUEST MODAL
 * ============================================
 * Modal for sharing a meal with users in the same family
 */

import ToastBanner from '@/components/generalMessage';
import { useUser } from '@/context/usercontext';
import { useSendShareRequest } from '@/hooks/useMealShare';
import { type UserSearchResult } from '@/src/services/user.service';
import { listFamilyMembers } from '@/src/user/family';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import AppTextInput from '@/components/ui/AppTextInput';
import {
  ActivityIndicator,
  Animated,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const userContext = useUser();
  const user = userContext?.user;
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [familyMembers, setFamilyMembers] = useState<UserSearchResult[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ visible: false, type: 'success', message: '' });

  const sendRequest = useSendShareRequest();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const messageInputAnim = useRef(new Animated.Value(0)).current;
  const selectedUserScale = useRef(new Animated.Value(0)).current;

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
        .filter((member: any): member is UserSearchResult => Boolean(member && member.id !== user?.id));
      setFamilyMembers(normalized);
    } catch (error: any) {
      console.log('[SendShareRequestModal] Error loading family members:', error);
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
      setFamilyMembers([]);
      setFamilyError(null);
      setMessage('');
      setShowMessageInput(false);
      messageInputAnim.setValue(0);
      selectedUserScale.setValue(0);
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

  const normalizedQuery = React.useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const filteredFamilyMembers = React.useMemo(() => {
    if (!normalizedQuery) {
      return familyMembers;
    }

    return familyMembers.filter((member) => {
      const candidateFields = [
        member.name,
        member.full_name,
        member.display_name,
        member.email,
      ].filter(Boolean) as string[];

      return candidateFields.some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [familyMembers, normalizedQuery]);
  const hasSearchQuery = normalizedQuery.length > 0;

  const handleSend = async () => {
    if (!selectedUser?.id) {
      setToast({
        visible: true,
        type: 'error',
        message: 'Please select a recipient',
      });
      return;
    }

    const isFamilyMember = familyMembers.some((member) => member.id === selectedUser.id);
    if (!isFamilyMember) {
      setToast({
        visible: true,
        type: 'error',
        message: 'You can only share meals with members of your family.',
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
      console.log('[SendShareRequestModal] Error sending request:', error);
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

  // Handle user selection with animation
  const handleSelectUser = React.useCallback((candidate: UserSearchResult) => {
    setSelectedUser(candidate);
    selectedUserScale.setValue(0);
    Animated.spring(selectedUserScale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [selectedUserScale]);

  // Toggle message input with animation
  const toggleMessageInput = React.useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMessageInput(!showMessageInput);
    Animated.timing(messageInputAnim, {
      toValue: showMessageInput ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showMessageInput, messageInputAnim]);

  // Get avatar URI for a user
  const getAvatarUri = React.useCallback((candidate: UserSearchResult | null | undefined): string | null => {
    if (!candidate) return null;
    return candidate.avatar_path || null;
  }, []);

  const renderUserOption = (candidate: UserSearchResult) => {
    const avatarUri = getAvatarUri(candidate);
    const isSelected = selectedUser?.id === candidate.id;
    
    return (
      <TouchableOpacity
        key={candidate.id}
        style={[
          styles.memberCard,
          isSelected && styles.memberCardSelected,
        ]}
        onPress={() => handleSelectUser(candidate)}
        activeOpacity={0.7}
      >
        <View style={styles.memberAvatar}>
          {avatarUri ? (
            <Image 
              source={{ uri: avatarUri }} 
              style={styles.memberAvatarImage}
            />
          ) : (
            <Text style={styles.memberInitial}>{getUserInitial(candidate)}</Text>
          )}
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{getUserName(candidate)}</Text>
          {candidate.email && <Text style={styles.memberEmail}>{candidate.email}</Text>}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        )}
      </TouchableOpacity>
    );
  };

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

    if (hasSearchQuery && filteredFamilyMembers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No matching family members</Text>
          <Text style={styles.emptySubtext}>
            Try a different name or search by a family member's email address.
          </Text>
        </View>
      );
    }

    const membersToRender = hasSearchQuery ? filteredFamilyMembers : familyMembers;
    return membersToRender.map(renderUserOption);
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
              Pick a family member to share this meal.
            </Text>
          </View>

          {/* Selected User Display - Simple row */}
          {selectedUser && (
            <View style={styles.selectedUserRow}>
              <View style={styles.selectedUserAvatarSmall}>
                {getAvatarUri(selectedUser) ? (
                  <Image 
                    source={{ uri: getAvatarUri(selectedUser)! }} 
                    style={styles.selectedUserAvatarImageSmall}
                  />
                ) : (
                  <Text style={styles.selectedUserInitialSmall}>{getUserInitial(selectedUser)}</Text>
                )}
              </View>
              <View style={styles.selectedUserInfo}>
                <Text style={styles.selectedUserNameText}>{getUserName(selectedUser)}</Text>
                {selectedUser.email && (
                  <Text style={styles.selectedUserEmailText}>{selectedUser.email}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.selectedUserClearBtn}
                onPress={() => setSelectedUser(null)}
              >
                <Ionicons name="close-circle" size={20} color="#047857" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchSection}>
            <Text style={styles.messageLabel}>Send to a family member</Text>
            
            {/* Search Input */}
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <AppTextInput
                style={styles.searchInput}
                placeholder="Search by name or email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Vertical Family Members List */}
            <ScrollView 
              style={styles.membersList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.membersListContent}
            >
              {familyLoading && (
                <View style={styles.loadingContainerSmall}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.loadingTextSmall}>Loading...</Text>
                </View>
              )}

              {!familyId && !familyLoading && (
                <View style={styles.emptyContainerSmall}>
                  <Ionicons name="people-outline" size={32} color="#D1D5DB" />
                  <Text style={styles.emptyTextSmall}>No family connected</Text>
                </View>
              )}

              {familyId && !familyLoading && familyMembers.length === 0 && !familyError && (
                <View style={styles.emptyContainerSmall}>
                  <Ionicons name="people-circle-outline" size={32} color="#D1D5DB" />
                  <Text style={styles.emptyTextSmall}>No family members available</Text>
                </View>
              )}

              {familyError && (
                <Text style={styles.errorText}>{familyError}</Text>
              )}

              {hasSearchQuery && filteredFamilyMembers.length === 0 && familyMembers.length > 0 && (
                <View style={styles.emptyContainerSmall}>
                  <Ionicons name="search-outline" size={32} color="#D1D5DB" />
                  <Text style={styles.emptyTextSmall}>No matching members found</Text>
                </View>
              )}

              {!familyLoading && (hasSearchQuery ? filteredFamilyMembers : familyMembers).map((member) => {
                const avatarUri = getAvatarUri(member);
                const isSelected = selectedUser?.id === member.id;
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberCard,
                      isSelected && styles.memberCardSelected,
                    ]}
                    onPress={() => handleSelectUser(member)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.memberAvatar}>
                      {avatarUri ? (
                        <Image 
                          source={{ uri: avatarUri }} 
                          style={styles.memberAvatarImage}
                        />
                      ) : (
                        <Text style={styles.memberInitial}>{getUserInitial(member)}</Text>
                      )}
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{getUserName(member)}</Text>
                      {member.email && <Text style={styles.memberEmail}>{member.email}</Text>}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Message Section with Plus Button */}
          <View style={styles.messageSection}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageLabelSmall}>Add a message (optional)</Text>
              <TouchableOpacity 
                style={[
                  styles.messageToggleButton,
                  showMessageInput && styles.messageToggleButtonActive,
                ]}
                onPress={toggleMessageInput}
                activeOpacity={0.7}
              >
                <Animated.View style={{
                  transform: [{
                    rotate: messageInputAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  }],
                }}>
                  <Ionicons 
                    name="add" 
                    size={20} 
                    color={showMessageInput ? '#FFF' : '#10B981'} 
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
            
            {showMessageInput && (
              <Animated.View 
                style={[
                  styles.messageInputContainer,
                  {
                    opacity: messageInputAnim,
                    transform: [{
                      translateY: messageInputAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    }],
                  },
                ]}
              >
                <AppTextInput
                  style={styles.messageInputCompact}
                  placeholder="e.g., Try this amazing recipe!"
                  value={message}
                  onChangeText={setMessage}
                  maxLength={200}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.messageCharCount}>{message.length}/200</Text>
              </Animated.View>
            )}
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
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
    maxHeight: '80%',
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
    marginBottom: 16,
  },
  modalIconContainer: {
    marginBottom: 8,
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Selected User Display - Simple row
  selectedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  selectedUserAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectedUserAvatarImageSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  selectedUserInitialSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  selectedUserNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  selectedUserEmailText: {
    fontSize: 12,
    color: '#047857',
    marginTop: 1,
  },
  selectedUserClearBtn: {
    padding: 2,
  },

  // Legacy selected user styles (kept for compatibility)
  selectedUserContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  selectedUserAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  selectedUserAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  selectedUserAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#059669',
  },
  selectedUserInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedUserClearBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },

  // Avatar Row
  avatarRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  avatarRowContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  avatarItem: {
    alignItems: 'center',
    width: 70,
  },
  avatarItemSelected: {
    // Handled by child styles
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  avatarCircleSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B7280',
  },
  avatarCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  avatarNameSelected: {
    color: '#10B981',
    fontWeight: '600',
  },

  // Search Section
  searchSection: {
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
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

  // Loading & Empty States (Small versions)
  loadingContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingTextSmall: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainerSmall: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyTextSmall: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  
  // Original loading/empty states (kept for compatibility)
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

  // Member List (kept for compatibility)
  membersList: {
    maxHeight: 140,
    marginTop: 12,
  },
  membersListContent: {
    paddingBottom: 4,
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
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberInitial: {
    fontSize: 16,
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

  // Message Section
  messageSection: {
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  messageLabelSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  messageToggleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  messageToggleButtonActive: {
    backgroundColor: '#10B981',
  },
  messageInputContainer: {
    marginTop: 8,
  },
  messageInputCompact: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  messageCharCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
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

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#10B981',
    borderRadius: 10,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SendShareRequestModal;
