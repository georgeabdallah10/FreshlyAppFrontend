// ==================== screens/SettingsScreen.tsx ====================
import ToastBanner from '@/components/generalMessage';
import { useThemeContext } from '@/context/ThemeContext';
import { ThemePreference } from '@/theme/theme';
import { ColorTokens } from '@/theme/colors';
import { useScrollContentStyle } from '@/hooks/useBottomNavInset';
import { Storage } from '@/src/utils/storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from './components/icon';

const TUTORIAL_KEY = 'tutorialCompleted';

type ToastType = 'success' | 'error';
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
}

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
  const router = useRouter();
  const scrollContentStyle = useScrollContentStyle();
  const { theme, mode, setMode } = useThemeContext();
  const { colors } = theme;
  const [settings, setSettings] = useState<SettingsState>({
    notifications: true,
    emailAlerts: true,
    darkMode: false,
  });
  const [locationStatus, setLocationStatus] = useState<string>('unknown');
  const [galleryStatus, setGalleryStatus] = useState<string>('unknown');
  const [cameraStatus, setCameraStatus] = useState<string>('unknown');
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'success',
    message: '',
  });

  const showToast = (type: ToastType, message: string) => {
    setToast({ visible: true, type, message });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Check permissions status on mount
  useEffect(() => {
    checkLocationPermission();
    checkGalleryPermission();
    checkCameraPermission();
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationStatus(status);
  };

  const checkGalleryPermission = async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    setGalleryStatus(status);
  };

  const checkCameraPermission = async () => {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    setCameraStatus(status);
  };

  const handleLocationPermission = async () => {
    if (locationStatus === 'granted') {
      // Already granted, open settings to revoke
      Alert.alert(
        'Manage Location Access',
        'To disable location access, please go to your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status);

    if (status === 'granted') {
      showToast('success', 'Location access has been granted');
    } else if (!canAskAgain) {
      Alert.alert(
        'Location Access Required',
        'Location permission was denied. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      showToast('error', 'Location permission denied');
    }
  };

  const handleCameraPermission = async () => {
    if (cameraStatus === 'granted') {
      Alert.alert(
        'Manage Camera Access',
        'To disable camera access, please go to your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraStatus(status);

    if (status === 'granted') {
      showToast('success', 'Camera access has been granted');
    } else if (!canAskAgain) {
      Alert.alert(
        'Camera Access Required',
        'Camera permission is required, Please enable it in settings..',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      showToast('error', 'Camera permission is required, Please enable it in settings..');
    }
  };

  const handleGalleryPermission = async () => {
    if (galleryStatus === 'granted') {
      // Already granted, open settings to revoke
      Alert.alert(
        'Manage Gallery Access',
        'To disable gallery access, please go to your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setGalleryStatus(status);

    if (status === 'granted') {
      showToast('success', 'Gallery access has been granted');
    } else if (!canAskAgain) {
      Alert.alert(
        'Gallery Access Required',
        'Gallery permission was denied. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      showToast('error', 'Gallery permission denied');
    }
  };

  const handleRestartTutorial = async () => {
    Alert.alert(
      'Restart Tutorial',
      'This will take you back to the home screen and restart the tutorial walkthrough.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: async () => {
            // Clear the tutorial completed flag
            await Storage.removeItem(TUTORIAL_KEY);
            // Show toast before navigating
            showToast('success', 'Tutorial restarting...');
            // Small delay to show toast, then navigate
            setTimeout(() => {
              router.replace('/(main)/(home)/main');
            }, 500);
          },
        },
      ]
    );
  };

  const settingItems: SettingItem[] = useMemo(
    () => [
      {
        id: 'subscription',
        icon: 'crown',
        label: 'Current Subscription',
        value: 'Premium Plan',
        color: colors.primary,
      },
      {
        id: 'payment',
        icon: 'card',
        label: 'Payment Method',
        value: 'Visa •••• 4242',
        color: colors.warning,
      },
    ],
    [colors.primary, colors.warning]
  );

  const styles = useMemo(() => createStyles(colors), [colors]);
  const appearanceOptions: { label: string; value: ThemePreference }[] = useMemo(
    () => [
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
      { label: 'System', value: 'system' },
    ],
    []
  );

  return (
    <View style={styles.screenContainer}>
      <View className="header" style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={scrollContentStyle} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.sectionTitle}>FeedBack</Text>

          <TouchableOpacity
            style={styles.feedBackItem}
            activeOpacity={0.8}
            onPress={() =>
              Linking.openURL(
                'https://docs.google.com/forms/d/e/1FAIpQLSdXLWW6aYIaFI_xUUsA1ybpP2vz36qxTXiFcVgGi-g1G44qjg/viewform' // TODO: replace with provided Google Form URL
              )
            }
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Icon name="email" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.settingLabel}>Feedback</Text>
            </View>
        </TouchableOpacity>
        
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.segmentGroup}>
            {appearanceOptions.map(option => {
              const isActive = mode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segmentButton,
                    isActive && styles.segmentButtonActive,
                  ]}
                  onPress={() => setMode(option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      isActive && styles.segmentLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
         <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                <Icon name="location" size={20} color={colors.primary} />
              </View>
              <Text style={styles.settingLabel}>Location Access</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: locationStatus === 'granted' }}
              style={[styles.toggle, locationStatus === 'granted' && styles.toggleActive]}
              onPress={handleLocationPermission}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleThumb,
                  locationStatus === 'granted' && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                <Icon name="gallery" size={20} color={colors.primary} />
              </View>
              <Text style={styles.settingLabel}>Gallery Access</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: galleryStatus === 'granted' }}
              style={[styles.toggle, galleryStatus === 'granted' && styles.toggleActive]}
              onPress={handleGalleryPermission}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleThumb,
                  galleryStatus === 'granted' && styles.toggleThumbActive,
              ]}
            />
          </TouchableOpacity>
          </View>

          <View style={[styles.settingItem, styles.lastPermissionRow]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: withAlpha(colors.warning, 0.15) }]}>
                <Icon name="camera" size={20} color={colors.warning} />
              </View>
              <Text style={styles.settingLabel}>Camera Access</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityState={{ checked: cameraStatus === 'granted' }}
              style={[styles.toggle, cameraStatus === 'granted' && styles.toggleActive]}
              onPress={handleCameraPermission}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleThumb,
                  cameraStatus === 'granted' && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Icon name="bell" size={20} color={colors.textSecondary} />
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
                <Icon name="email" size={20} color={colors.textSecondary} />
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


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={handleRestartTutorial}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: withAlpha(colors.warning, 0.15) }]}>
                <Icon name="refresh" size={20} color={colors.warning} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Restart Tutorial</Text>
                <Text style={styles.settingValue}>View the app walkthrough again</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>


      </ScrollView>

      <ToastBanner
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={hideToast}
        topOffset={100}
      />
    </View>
  );
};

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
      paddingTop: 90,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: 10,
      backgroundColor: colors.card,
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
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lastPermissionRow: {
      borderBottomWidth: 0,
      paddingBottom: 4,
    },
    feedBackItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 40,
      padding: 10,
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
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    settingValue: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    chevron: {
      fontSize: 24,
      color: colors.textSecondary,
      fontWeight: '300',
    },
    toggle: {
      width: 50,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      padding: 2,
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: colors.primary,
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.card,
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    toggleThumbActive: {
      transform: [{ translateX: 22 }],
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    statusEnabled: {
      backgroundColor: withAlpha(colors.success, 0.12),
    },
    statusDisabled: {
      backgroundColor: withAlpha(colors.error, 0.12),
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    statusTextEnabled: {
      color: colors.success,
    },
    statusTextDisabled: {
      color: colors.error,
    },
    segmentGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    segmentButtonActive: {
      backgroundColor: withAlpha(colors.primary, 0.12),
      borderWidth: 1,
      borderColor: colors.primary,
    },
    segmentLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentLabelActive: {
      color: colors.primary,
    },
  });

export default SettingsScreen;
