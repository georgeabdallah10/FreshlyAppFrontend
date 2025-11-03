/**
 * ============================================
 * MEAL SHARE REQUESTS INBOX SCREEN
 * ============================================
 * View received and sent meal share requests
 */

import ToastBanner from '@/components/generalMessage';
import {
    useAcceptShareRequest,
    useCancelShareRequest,
    useDeclineShareRequest,
    useReceivedShareRequests,
    useSentShareRequests,
} from '@/hooks/useMealShare';
import { MealShareRequest } from '@/src/services/mealShare.service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Tab = 'received' | 'sent';

const MealShareRequestsScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ visible: false, type: 'success', message: '' });

  const {
    data: receivedRequests,
    isLoading: loadingReceived,
    refetch: refetchReceived,
  } = useReceivedShareRequests();
  
  const {
    data: sentRequests,
    isLoading: loadingSent,
    refetch: refetchSent,
  } = useSentShareRequests();

  const acceptRequest = useAcceptShareRequest();
  const declineRequest = useDeclineShareRequest();
  const cancelRequest = useCancelShareRequest();

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'received') {
      await refetchReceived();
    } else {
      await refetchSent();
    }
    setRefreshing(false);
  };

  const handleAccept = async (requestId: number) => {
    try {
      await acceptRequest.mutateAsync(requestId);
      setToast({
        visible: true,
        type: 'success',
        message: 'Request accepted! You can now view this meal.',
      });
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to accept request',
      });
    }
  };

  const handleDecline = async (requestId: number) => {
    try {
      await declineRequest.mutateAsync(requestId);
      setToast({
        visible: true,
        type: 'success',
        message: 'Request declined',
      });
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to decline request',
      });
    }
  };

  const handleCancel = async (requestId: number) => {
    try {
      await cancelRequest.mutateAsync(requestId);
      setToast({
        visible: true,
        type: 'success',
        message: 'Request cancelled',
      });
    } catch (error: any) {
      setToast({
        visible: true,
        type: 'error',
        message: error.message || 'Failed to cancel request',
      });
    }
  };

  const renderReceivedRequest = (request: MealShareRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.senderAvatar}>
          <Text style={styles.senderInitial}>
            {request.sender?.name?.charAt(0).toUpperCase() || 'F'}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>
            {request.sender?.name || 'Family Member'} sent you a meal
          </Text>
          <Text style={styles.requestTime}>
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, styles[`status${request.status}`]]}>
          <Text style={[styles.statusText, styles[`statusText${request.status}`]]}>
            {request.status}
          </Text>
        </View>
      </View>

      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{request.meal?.name || 'Meal'}</Text>
        {request.meal?.description && (
          <Text style={styles.mealDescription} numberOfLines={2}>
            {request.meal.description}
          </Text>
        )}
        {request.meal?.meal_type && (
          <View style={styles.mealMeta}>
            <Ionicons name="restaurant" size={14} color="#6B7280" />
            <Text style={styles.mealMetaText}>{request.meal.meal_type}</Text>
          </View>
        )}
      </View>

      {request.message && (
        <View style={styles.messageBox}>
          <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      {request.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleDecline(request.id)}
            disabled={declineRequest.isPending}
            activeOpacity={0.7}
          >
            {declineRequest.isPending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={styles.declineButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(request.id)}
            disabled={acceptRequest.isPending}
            activeOpacity={0.7}
          >
            {acceptRequest.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderSentRequest = (request: MealShareRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.receiverAvatar}>
          <Text style={styles.receiverInitial}>
            {request.receiver?.name?.charAt(0).toUpperCase() || 'F'}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>
            Sent to {request.receiver?.name || 'Family Member'}
          </Text>
          <Text style={styles.requestTime}>
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, styles[`status${request.status}`]]}>
          <Text style={[styles.statusText, styles[`statusText${request.status}`]]}>
            {request.status}
          </Text>
        </View>
      </View>

      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{request.meal?.name || 'Meal'}</Text>
        {request.meal?.description && (
          <Text style={styles.mealDescription} numberOfLines={2}>
            {request.meal.description}
          </Text>
        )}
      </View>

      {request.message && (
        <View style={styles.messageBox}>
          <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      {request.status === 'pending' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => handleCancel(request.id)}
          disabled={cancelRequest.isPending}
          activeOpacity={0.7}
        >
          {cancelRequest.isPending ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const pendingReceivedCount = receivedRequests?.filter(r => r.status === 'pending').length || 0;
  const pendingSentCount = sentRequests?.filter(r => r.status === 'pending').length || 0;

  const isLoading = activeTab === 'received' ? loadingReceived : loadingSent;
  const requests = activeTab === 'received' ? receivedRequests : sentRequests;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Requests</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received
          </Text>
          {pendingReceivedCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingReceivedCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent
          </Text>
          {pendingSentCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingSentCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : !requests || requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'received'
                ? "You haven't received any meal share requests"
                : "You haven't sent any meal share requests"}
            </Text>
          </View>
        ) : (
          requests.map((request) =>
            activeTab === 'received'
              ? renderReceivedRequest(request)
              : renderSentRequest(request)
          )
        )}
      </ScrollView>

      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast({ ...toast, visible: false })}
        topOffset={60}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#10B981',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#10B981',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  receiverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  senderInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  receiverInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statuspending: {
    backgroundColor: '#FEF3C7',
  },
  statusaccepted: {
    backgroundColor: '#D1FAE5',
  },
  statusdeclined: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusTextpending: {
    color: '#F59E0B',
  },
  statusTextaccepted: {
    color: '#10B981',
  },
  statusTextdeclined: {
    color: '#EF4444',
  },
  mealInfo: {
    marginBottom: 12,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealMetaText: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    backgroundColor: '#FEE2E2',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default MealShareRequestsScreen;
