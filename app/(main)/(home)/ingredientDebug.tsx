/**
 * ============================================
 * INGREDIENT DETAIL DEBUG SCREEN (Phase F7)
 * ============================================
 * 
 * Admin/debug UI for viewing and editing ingredient
 * canonical unit metadata and conversion factors.
 * 
 * Helps diagnose issues where unit conversions fail
 * in grocery list calculations.
 */

import {
    useIngredientByName,
    useUpdateIngredientConversions,
} from '@/src/hooks/ingredient';
import {
    CanonicalUnitType,
    getCanonicalUnitLabel,
    getConversionFieldDescription,
    hasCompleteConversionData
} from '@/src/services/ingredient.service';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// COLORS (Debug theme)
// ============================================

const COLORS = {
  debugBg: '#1E1E1E',
  debugText: '#D4D4D4',
  debugAccent: '#569CD6',
  debugSuccess: '#4EC9B0',
  debugWarning: '#DCDCAA',
  debugError: '#F14C4C',
  inputBg: '#2D2D2D',
  inputBorder: '#404040',
  white: '#FFFFFF',
  textLight: '#999999',
  primary: '#00A86B',
};

// ============================================
// UNIT SELECTOR COMPONENT
// ============================================

interface UnitSelectorProps {
  value: CanonicalUnitType;
  onChange: (unit: CanonicalUnitType) => void;
  disabled?: boolean;
}

const UnitSelector: React.FC<UnitSelectorProps> = ({ value, onChange, disabled }) => {
  const units: CanonicalUnitType[] = ['g', 'ml', 'count'];
  
  return (
    <View style={styles.unitSelectorContainer}>
      {units.map((unit) => (
        <TouchableOpacity
          key={unit}
          style={[
            styles.unitButton,
            value === unit && styles.unitButtonActive,
            disabled && styles.unitButtonDisabled,
          ]}
          onPress={() => !disabled && onChange(unit)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.unitButtonText,
              value === unit && styles.unitButtonTextActive,
            ]}
          >
            {unit.toUpperCase()}
          </Text>
          <Text style={styles.unitButtonLabel}>
            {getCanonicalUnitLabel(unit).split(' ')[0]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================
// NUMERIC INPUT COMPONENT
// ============================================

interface NumericInputProps {
  label: string;
  description: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const NumericInput: React.FC<NumericInputProps> = ({
  label,
  description,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [inputValue, setInputValue] = useState(
    value !== null ? value.toString() : ''
  );

  useEffect(() => {
    setInputValue(value !== null ? value.toString() : '');
  }, [value]);

  const handleChange = (text: string) => {
    setInputValue(text);
    if (text === '') {
      onChange(null);
    } else {
      const parsed = parseFloat(text);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Text style={styles.inputDescription}>{description}</Text>
      <TextInput
        style={[styles.textInput, disabled && styles.textInputDisabled]}
        value={inputValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        keyboardType="decimal-pad"
        editable={!disabled}
      />
    </View>
  );
};

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  isComplete: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ isComplete }) => (
  <View
    style={[
      styles.statusBadge,
      isComplete ? styles.statusBadgeComplete : styles.statusBadgeIncomplete,
    ]}
  >
    <Text style={styles.statusBadgeText}>
      {isComplete ? '✓ Complete' : '⚠ Missing Data'}
    </Text>
  </View>
);

// ============================================
// MAIN SCREEN
// ============================================

const IngredientDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; id?: string }>();
  const ingredientName = params.name || '';

  // State for editing
  const [canonicalUnit, setCanonicalUnit] = useState<CanonicalUnitType>('g');
  const [avgWeightPerUnit, setAvgWeightPerUnit] = useState<number | null>(null);
  const [densityGPerMl, setDensityGPerMl] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Query & Mutation
  const {
    data: ingredient,
    isLoading,
    error,
    refetch,
  } = useIngredientByName(ingredientName, { enabled: !!ingredientName });

  const updateMutation = useUpdateIngredientConversions();

  // Initialize form when ingredient loads
  useEffect(() => {
    if (ingredient) {
      setCanonicalUnit(ingredient.canonical_unit);
      setAvgWeightPerUnit(ingredient.avg_weight_per_unit_g);
      setDensityGPerMl(ingredient.density_g_per_ml);
      setHasChanges(false);
    }
  }, [ingredient]);

  const handleGoBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!ingredient) return;

    try {
      await updateMutation.mutateAsync({
        id: ingredient.id,
        updates: {
          canonical_unit: canonicalUnit,
          avg_weight_per_unit_g: avgWeightPerUnit,
          density_g_per_ml: densityGPerMl,
        },
      });
      setHasChanges(false);
      Alert.alert('Success', 'Ingredient conversion data saved successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save changes.');
    }
  };

  const handleChange = (
    field: 'canonicalUnit' | 'avgWeightPerUnit' | 'densityGPerMl',
    value: any
  ) => {
    setHasChanges(true);
    switch (field) {
      case 'canonicalUnit':
        setCanonicalUnit(value);
        break;
      case 'avgWeightPerUnit':
        setAvgWeightPerUnit(value);
        break;
      case 'densityGPerMl':
        setDensityGPerMl(value);
        break;
    }
  };

  // ============================================
  // RENDER STATES
  // ============================================

  if (!ingredientName) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧪 Ingredient Debug</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>No ingredient name provided</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧪 Ingredient Debug</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.debugAccent} />
          <Text style={styles.loadingText}>Loading ingredient data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !ingredient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧪 Ingredient Debug</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>Failed to load ingredient</Text>
          <Text style={styles.errorSubtext}>
            {error?.message || `"${ingredientName}" not found`}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================
  // MAIN CONTENT
  // ============================================

  const isComplete = hasCompleteConversionData({
    ...ingredient,
    canonical_unit: canonicalUnit,
    avg_weight_per_unit_g: avgWeightPerUnit,
    density_g_per_ml: densityGPerMl,
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧪 Ingredient Debug</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ingredient Name Card */}
          <View style={styles.card}>
            <Text style={styles.ingredientName}>{ingredient.name}</Text>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>ID: {ingredient.id}</Text>
            </View>
            <StatusBadge isComplete={isComplete} />
          </View>

          {/* Canonical Unit Selection */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Canonical Unit</Text>
            <Text style={styles.sectionDescription}>
              The base unit used for normalization in grocery calculations.
            </Text>
            <UnitSelector
              value={canonicalUnit}
              onChange={(unit) => handleChange('canonicalUnit', unit)}
            />
          </View>

          {/* Weight Per Unit (for count-based items) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weight Per Unit</Text>
            <NumericInput
              label="avg_weight_per_unit_g"
              description={getConversionFieldDescription('avg_weight_per_unit_g')}
              value={avgWeightPerUnit}
              onChange={(val) => handleChange('avgWeightPerUnit', val)}
              placeholder="e.g., 50 for eggs"
            />
            {canonicalUnit === 'count' && avgWeightPerUnit === null && (
              <Text style={styles.warningText}>
                ⚠ Required for count-based ingredients
              </Text>
            )}
          </View>

          {/* Density (for volume-based items) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Density</Text>
            <NumericInput
              label="density_g_per_ml"
              description={getConversionFieldDescription('density_g_per_ml')}
              value={densityGPerMl}
              onChange={(val) => handleChange('densityGPerMl', val)}
              placeholder="e.g., 1.03 for milk"
            />
            {canonicalUnit === 'ml' && densityGPerMl === null && (
              <Text style={styles.warningText}>
                ⚠ Required for volume-based ingredients
              </Text>
            )}
          </View>

          {/* Info Card */}
          <View style={[styles.card, styles.infoCard]}>
            <Text style={styles.infoTitle}>📖 How Conversions Work</Text>
            <Text style={styles.infoText}>
              • <Text style={styles.infoHighlight}>Grams (g)</Text>: Base weight unit, no conversion needed.
            </Text>
            <Text style={styles.infoText}>
              • <Text style={styles.infoHighlight}>Milliliters (ml)</Text>: Uses density to convert to grams.
            </Text>
            <Text style={styles.infoText}>
              • <Text style={styles.infoHighlight}>Count</Text>: Uses avg_weight_per_unit to convert to grams.
            </Text>
          </View>
        </ScrollView>

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                updateMutation.isPending && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.debugBg,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backButtonText: {
    color: COLORS.debugAccent,
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: COLORS.debugText,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Cards
  card: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ingredientName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  idBadge: {
    backgroundColor: '#404040',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  idBadgeText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusBadgeComplete: {
    backgroundColor: 'rgba(78, 201, 176, 0.2)',
  },
  statusBadgeIncomplete: {
    backgroundColor: 'rgba(220, 220, 170, 0.2)',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.debugText,
  },

  // Section
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    color: COLORS.textLight,
    fontSize: 13,
    marginBottom: 12,
  },

  // Unit Selector
  unitSelectorContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  unitButton: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
  },
  unitButtonActive: {
    borderColor: COLORS.debugAccent,
    backgroundColor: 'rgba(86, 156, 214, 0.2)',
  },
  unitButtonDisabled: {
    opacity: 0.5,
  },
  unitButtonText: {
    color: COLORS.debugText,
    fontSize: 18,
    fontWeight: '700',
  },
  unitButtonTextActive: {
    color: COLORS.debugAccent,
  },
  unitButtonLabel: {
    color: COLORS.textLight,
    fontSize: 11,
    marginTop: 4,
  },

  // Input Group
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    color: COLORS.debugAccent,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  inputDescription: {
    color: COLORS.textLight,
    fontSize: 12,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    padding: 12,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  textInputDisabled: {
    opacity: 0.5,
  },

  // Warning
  warningText: {
    color: COLORS.debugWarning,
    fontSize: 12,
    marginTop: 8,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#252525',
  },
  infoTitle: {
    color: COLORS.debugText,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  infoHighlight: {
    color: COLORS.debugAccent,
    fontWeight: '600',
  },

  // Save Button
  saveButtonContainer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textLight,
    fontSize: 14,
    marginTop: 16,
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.debugError,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    color: COLORS.textLight,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: COLORS.debugAccent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default IngredientDetailScreen;
