// ==================== screens/SettingsScreen.tsx ====================
import React, { useState } from 'react';
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

type SettingsState = {
  notifications: boolean;
  emailAlerts: boolean;
  darkMode: boolean;
};

type SettingItem = {
  id: 'subscription' | 'payment';
  icon: 'crown' | 'card';
  label: string;
  value: string;
  color: string;
};

const SettingsScreen: React.FC<Props> = ({ onBack }) => {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: true,
    emailAlerts: true,
    darkMode: false,
  });

  const settingItems: SettingItem[] = [
    {
      id: 'subscription',
      icon: 'crown',
      label: 'Current Subscription',
      value: 'Premium Plan',
      color: '#00A86B',
    },
    {
      id: 'payment',
      icon: 'card',
      label: 'Payment Method',
      value: 'Visa •••• 4242',
      color: '#FD8100',
    },
  ];

  return (
    <View style={styles.screenContainer}>
      <View className="header" style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {settingItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.settingItem} activeOpacity={0.8}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: `${item.color}20` }, // add alpha
                  ]}
                >
                  <Icon name={item.icon} size={20} color={item.color} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingValue}>{item.value}</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Icon name="bell" size={20} color="#666" />
              </View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.notifications }}
              style={[styles.toggle, settings.notifications && styles.toggleActive]}
              onPress={() =>
                setSettings((s) => ({ ...s, notifications: !s.notifications }))
              }
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleThumb,
                  settings.notifications && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Icon name="email" size={20} color="#666" />
              </View>
              <Text style={styles.settingLabel}>Email Alerts</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.emailAlerts }}
              style={[styles.toggle, settings.emailAlerts && styles.toggleActive]}
              onPress={() =>
                setSettings((s) => ({ ...s, emailAlerts: !s.emailAlerts }))
              }
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleThumb,
                  settings.emailAlerts && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop: 90,
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  settingValue: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5E5',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#00A86B',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
});

export default SettingsScreen;