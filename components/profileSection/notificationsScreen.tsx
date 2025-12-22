// ==================== screens/NotificationsScreen.tsx ====================
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from './components/icon';
type Props = {
  onBack: () => void;
};

type NotificationItem = {
  id: number;
  icon: string;
  title: string;
  time: string;
  color: string;
};

const NotificationsScreen: React.FC<Props> = ({ onBack }) => {
  const notifications: NotificationItem[] = [
    { id: 1, icon: 'receipt', title: 'Your order has arrived', time: '30m', color: '#00A86B' },
    { id: 2, icon: 'checkmark-circle', title: 'Payment verified', time: '1d', color: '#00A86B' },
    { id: 3, icon: 'gift-outline', title: 'New promo just for you!', time: '2d', color: '#FD8100' },
    { id: 4, icon: 'information', title: "It's time for survey", time: '2d', color: '#007AFF' },
  ];

  return (
    <View style={styles.screenContainer}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.map((notif) => (
          <TouchableOpacity key={notif.id} style={styles.notificationItem} activeOpacity={0.8}>
            <View style={[styles.notifIcon, { backgroundColor: notif.color + '20' }]}>
              <Ionicons name={notif.icon as any} size={24} color={notif.color} />
            </View>
            <View style={styles.notifContent}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifTime}>{notif.time}</Text>
              </View>
              <Text style={styles.notifText}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop:90,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#F5F7FA',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notifIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  notifTime: {
    fontSize: 12,
    color: '#999',
  },
  notifText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

export default NotificationsScreen;
