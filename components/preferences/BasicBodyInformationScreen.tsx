import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type BasicBodyInformationScreenProps = {
  age: number | null;
  height: number | null;
  weight: number | null;
  gender: "male" | "female" | null;
  ageError?: string | null;
  heightError?: string | null;
  weightError?: string | null;
  onChange: (
    field: "age" | "height" | "weight" | "gender",
    value: string
  ) => void;
  onUnitChange?: (field: "height" | "weight", unit: string) => void;
};

type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";

const BasicBodyInformationScreen: React.FC<
  BasicBodyInformationScreenProps
> = ({
  age,
  height,
  weight,
  gender,
  ageError,
  heightError,
  weightError,
  onChange,
  onUnitChange,
}) => {
  const [focusedField, setFocusedField] = useState<
    "age" | "height" | "weight" | null
  >(null);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [showHeightUnitPicker, setShowHeightUnitPicker] = useState(false);
  const [showWeightUnitPicker, setShowWeightUnitPicker] = useState(false);
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightLbsInput, setWeightLbsInput] = useState("");
  const [weightKgInput, setWeightKgInput] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Entrance animation - super fast and snappy
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleHeightUnitChange = (unit: HeightUnit) => {
    setHeightUnit(unit);
    setShowHeightUnitPicker(false);
    onUnitChange?.("height", unit);
    // Clear height value when switching units to avoid confusion
    onChange("height", "");
    if (unit === "cm") {
      setHeightFeet("");
      setHeightInches("");
    }
  };

  const handleWeightUnitChange = (unit: WeightUnit) => {
    setWeightUnit(unit);
    setShowWeightUnitPicker(false);
    onUnitChange?.("weight", unit);
    // Clear weight value when switching units to avoid confusion
    onChange("weight", "");
    setWeightLbsInput("");
    setWeightKgInput("");
  };

  const getHeightPlaceholder = () => {
    return "100-250 cm";
  };

  const getWeightPlaceholder = () => {
    return weightUnit === "kg" ? "30-300 kg" : "66-660 lbs";
  };

  const getWeightValue = () => {
    if (weightUnit === "kg") {
      if (weightKgInput !== "") return weightKgInput;
      return weight !== null && !Number.isNaN(weight) ? String(weight) : "";
    }
    return weightLbsInput;
  };

  useEffect(() => {
    if (heightUnit === "ft" && height !== null && !Number.isNaN(height)) {
      const totalInches = Math.round(height / 2.54);
      const ft = Math.floor(totalInches / 12);
      const inch = totalInches % 12;
      setHeightFeet(ft ? String(ft) : "");
      setHeightInches(String(inch));
    }
  }, [height, heightUnit]);

  const parsedFeet = heightFeet ? Number(heightFeet) : NaN;
  const parsedInches = heightInches ? Number(heightInches) : NaN;
  const feetOutOfRange =
    heightFeet !== "" && (Number.isNaN(parsedFeet) || parsedFeet < 3 || parsedFeet > 8);
  const inchesOutOfRange =
    heightInches !== "" &&
    (Number.isNaN(parsedInches) || parsedInches < 0 || parsedInches > 11);
  const heightRestrictionInvalid = feetOutOfRange || inchesOutOfRange;
  const weightInput = weightUnit === "kg" ? weightKgInput : weightLbsInput;
  const parsedWeight = weightInput ? Number(weightInput) : NaN;
  const weightRange =
    weightUnit === "kg" ? { min: 30, max: 300 } : { min: 66, max: 660 };
  const weightOutOfRange =
    weightInput !== "" &&
    (Number.isNaN(parsedWeight) ||
      parsedWeight < weightRange.min ||
      parsedWeight > weightRange.max);

  const updateHeightFromParts = (feetValue: string, inchesValue: string) => {
    const ft = feetValue ? Number(feetValue) : NaN;
    const inch = inchesValue ? Number(inchesValue) : NaN;

    const feetValid = !Number.isNaN(ft) && ft >= 3 && ft <= 8;
    const inchesValid = !Number.isNaN(inch) && inch >= 0 && inch <= 11;

    if (feetValid && inchesValid) {
      const totalInches = ft * 12 + inch;
      onChange("height", String(totalInches));
    } else {
      onChange("height", "");
    }
  };

  const handleFeetChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "");
    if (!digitsOnly) {
      setHeightFeet("");
      updateHeightFromParts("", heightInches);
      return;
    }
    setHeightFeet(digitsOnly);
    updateHeightFromParts(digitsOnly, heightInches);
  };

  const handleInchesChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "");
    if (digitsOnly === "") {
      setHeightInches("");
      updateHeightFromParts(heightFeet, "");
      return;
    }
    setHeightInches(digitsOnly);
    updateHeightFromParts(heightFeet, digitsOnly);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Basic Body Information</Text>
      <Text style={styles.cardSubtitle}>
        Please fill in all fields to continue. This helps us personalize your
        meal recommendations.
      </Text>

      {/* Age Input */}
      <View
        style={[
          styles.inputGroup,
          focusedField === "age" && styles.inputGroupFocused,
          ageError && styles.inputGroupError,
        ]}
      >
        <Text style={styles.inputLabel}>Age *</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={age !== null ? String(age) : ""}
          placeholder="10-120 years"
          placeholderTextColor="#B0B0B0"
          onFocus={() => setFocusedField("age")}
          onBlur={() => setFocusedField(null)}
          onChangeText={(text) => onChange("age", text)}
        />
        {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}
      </View>

      {/* Gender Selection */}
      <View style={styles.genderContainer}>
        <Text style={styles.genderTitle}>Gender *</Text>
        <View style={styles.genderRow}>
          {[
            { id: "male" as const, label: "Male" },
            { id: "female" as const, label: "Female" },
          ].map((option) => {
            const isSelected = gender === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.genderOption,
                  isSelected && styles.genderOptionSelected,
                ]}
                onPress={() => onChange("gender", option.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.genderLabel,
                    isSelected && styles.genderLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Height Input with Unit Picker */}
      <View
        style={[
          styles.inputGroup,
          focusedField === "height" && styles.inputGroupFocused,
          heightError && styles.inputGroupError,
        ]}
      >
        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>Height *</Text>
          <TouchableOpacity
            style={styles.unitButton}
            onPress={() => setShowHeightUnitPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.unitButtonText}>{heightUnit}</Text>
            <Text style={styles.unitButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>
        {heightUnit === "cm" ? (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={height !== null ? String(height) : ""}
            placeholder={getHeightPlaceholder()}
            placeholderTextColor="#B0B0B0"
            onFocus={() => setFocusedField("height")}
            onBlur={() => setFocusedField(null)}
            onChangeText={(text) => onChange("height", text)}
          />
        ) : (
          <View style={styles.heightSplitRow}>
            <TextInput
              style={[styles.input, styles.heightSplitInput]}
              keyboardType="numeric"
              value={heightFeet}
              placeholder="ft"
              placeholderTextColor="#B0B0B0"
              maxLength={1}
              onFocus={() => setFocusedField("height")}
              onBlur={() => setFocusedField(null)}
              onChangeText={handleFeetChange}
            />
            <Text style={styles.heightDelimiter}>'</Text>
            <TextInput
              style={[styles.input, styles.heightSplitInput]}
              keyboardType="numeric"
              value={heightInches}
              placeholder="in"
              placeholderTextColor="#B0B0B0"
              maxLength={2}
              onFocus={() => setFocusedField("height")}
              onBlur={() => setFocusedField(null)}
              onChangeText={handleInchesChange}
            />
            <Text style={styles.heightDelimiter}>"</Text>
          </View>
        )}
        {heightUnit === "ft" && (
          <Text
            style={[
              styles.heightRestrictionText,
              heightRestrictionInvalid && styles.heightRestrictionTextInvalid,
            ]}
          >
            Feet: 3-8 | Inches: 0-11
          </Text>
        )}
        {heightError ? (
          <Text style={styles.errorText}>{heightError}</Text>
        ) : null}
      </View>

      {/* Weight Input with Unit Picker */}
      <View
        style={[
          styles.inputGroup,
          focusedField === "weight" && styles.inputGroupFocused,
          weightError && styles.inputGroupError,
        ]}
      >
        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>Weight *</Text>
          <TouchableOpacity
            style={styles.unitButton}
            onPress={() => setShowWeightUnitPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.unitButtonText}>{weightUnit}</Text>
            <Text style={styles.unitButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={getWeightValue()}
          placeholder={getWeightPlaceholder()}
          placeholderTextColor="#B0B0B0"
          onFocus={() => setFocusedField("weight")}
          onBlur={() => setFocusedField(null)}
          onChangeText={(text) => {
            const sanitized = text.replace(/[^0-9.]/g, "");
            if (weightUnit === "kg") {
              setWeightKgInput(sanitized);
            } else {
              setWeightLbsInput(sanitized);
            }
            onChange("weight", sanitized);
          }}
        />
        <Text
          style={[
            styles.weightRestrictionText,
            weightOutOfRange && styles.weightRestrictionTextInvalid,
          ]}
        >
          {weightUnit === "kg"
            ? "Weight range: 30 - 300 kg"
            : "Weight range: 66 - 660 lbs"}
        </Text>
        {weightError ? (
          <Text style={styles.errorText}>{weightError}</Text>
        ) : null}
      </View>

      {/* Height Unit Picker Modal */}
      <Modal
        visible={showHeightUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeightUnitPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHeightUnitPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Height Unit</Text>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                heightUnit === "cm" && styles.pickerOptionSelected,
              ]}
              onPress={() => handleHeightUnitChange("cm")}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  heightUnit === "cm" && styles.pickerOptionTextSelected,
                ]}
              >
                Centimeters (cm)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                heightUnit === "ft" && styles.pickerOptionSelected,
              ]}
              onPress={() => handleHeightUnitChange("ft")}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  heightUnit === "ft" && styles.pickerOptionTextSelected,
                ]}
              >
                Feet & Inches (ft)
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Weight Unit Picker Modal */}
      <Modal
        visible={showWeightUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightUnitPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWeightUnitPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Weight Unit</Text>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                weightUnit === "kg" && styles.pickerOptionSelected,
              ]}
              onPress={() => handleWeightUnitChange("kg")}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  weightUnit === "kg" && styles.pickerOptionTextSelected,
                ]}
              >
                Kilograms (kg)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pickerOption,
                weightUnit === "lbs" && styles.pickerOptionSelected,
              ]}
              onPress={() => handleWeightUnitChange("lbs")}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  weightUnit === "lbs" && styles.pickerOptionTextSelected,
                ]}
              >
                Pounds (lbs)
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F7F8FA",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EEEFF3",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EEEFF3",
    marginBottom: 16,
  },
  inputGroupFocused: {
    borderColor: "#00C853",
  },
  inputGroupError: {
    borderColor: "#FF3B30",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  input: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
  },
  unitButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEEFF3",
    gap: 4,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },
  unitButtonArrow: {
    fontSize: 10,
    color: "#666666",
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEFF3",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  genderOptionSelected: {
    borderColor: "#00C853",
    backgroundColor: "#E8F8F2",
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },
  genderLabelSelected: {
    color: "#00C853",
  },
  heightSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heightSplitInput: {
    width: 72,
    backgroundColor: "#E0E4EB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    textAlign: "center",
  },
  heightDelimiter: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666666",
  },
  heightRestrictionText: {
    marginTop: 6,
    fontSize: 12,
    color: "#666666",
  },
  heightRestrictionTextInvalid: {
    color: "#FF3B30",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#FF3B30",
  },
  weightRestrictionText: {
    marginTop: 6,
    fontSize: 12,
    color: "#666666",
  },
  weightRestrictionTextInvalid: {
    color: "#FF3B30",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 16,
    textAlign: "center",
  },
  pickerOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEFF3",
    marginBottom: 12,
    backgroundColor: "#F7F8FA",
  },
  pickerOptionSelected: {
    borderColor: "#00C853",
    backgroundColor: "#E8F8F2",
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    textAlign: "center",
  },
  pickerOptionTextSelected: {
    color: "#00C853",
  },
});

export default BasicBodyInformationScreen;
