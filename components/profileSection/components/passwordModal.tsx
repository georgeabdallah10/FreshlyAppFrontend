
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PasswordModal: React.FC<Props> = ({ visible, onClose }) => {
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  const handleSubmit = () => {
    if (passwords.new !== passwords.confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    Alert.alert('Success', 'Password updated successfully!');
    setPasswords({ new: '', confirm: '' });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          <Text style={styles.modalSubtitle}>Enter your new password below</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={passwords.new}
              onChangeText={(text) => setPasswords({ ...passwords, new: text })}
              placeholder="Enter new password"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={passwords.confirm}
              onChangeText={(text) =>
                setPasswords({ ...passwords, confirm: text })
              }
              placeholder="Confirm new password"
              secureTextEntry
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.modalSubmitText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#00A86B',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PasswordModal;