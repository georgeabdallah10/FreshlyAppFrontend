// ==================== screens/AboutAppScreen.tsx ====================
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useScrollContentStyle } from '@/hooks/useBottomNavInset';
import Icon from './components/icon';

type Props = {
  onBack: () => void;
};

const AboutAppScreen: React.FC<Props> = ({ onBack }) => {
  const scrollContentStyle = useScrollContentStyle();
  return (
    <View style={styles.screenContainer}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>About App</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={scrollContentStyle} showsVerticalScrollIndicator={false}>
        <View style={styles.aboutContainer}>
          <View style={styles.appIconLarge}>
            <Ionicons name="sparkles" size={50} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>Profile Dashboard</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>

          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>About</Text>
            <Text style={styles.aboutText}>
              A modern and elegant profile management application designed to help you
              manage your personal information with ease and security.
            </Text>
          </View>

          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>Features</Text>
            <Text style={styles.aboutText}>
              • Secure profile management{'\n'}
              • Real-time notifications{'\n'}
              • Subscription management{'\n'}
              • Payment method integration{'\n'}
              • Beautiful minimalist design
            </Text>
          </View>

          <TouchableOpacity style={styles.aboutButton} activeOpacity={0.8}>
            <Text style={styles.aboutButtonText}>Terms of Service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutButton} activeOpacity={0.8}>
            <Text style={styles.aboutButtonText}>Privacy Policy</Text>
          </TouchableOpacity>

          <Text style={styles.copyright}>
            (c) 2025 Profile Dashboard. All rights reserved.
          </Text>
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
  aboutContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: '#00A86B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appIconText: {
    fontSize: 50,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },
  aboutSection: {
    width: '100%',
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
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  aboutButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aboutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00A86B',
  },
  copyright: {
    fontSize: 12,
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default AboutAppScreen;
