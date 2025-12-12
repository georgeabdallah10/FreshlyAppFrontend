import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    StyleSheet,
    Switch,
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
  isAthlete: boolean;
  trainingLevel: "light" | "casual" | "intense" | null;
  ageError?: string | null;
  heightError?: string | null;
  weightError?: string | null;
  onChange: (
    field: "age" | "height" | "weight" | "gender",
    value: string
  ) => void;
  onUnitChange?: (field: "height" | "weight", unit: string) => void;
  onAthleteToggle: (value: boolean) => void;
  onTrainingLevelChange: (value: "light" | "casual" | "intense" | null) => void;
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
  isAthlete,
  trainingLevel,
  ageError,
  heightError,
  weightError,
  onChange,
  onUnitChange,
  onAthleteToggle,
  onTrainingLevelChange,
}) => {
  const [focusedField, setFocusedField] = useState<
    "age" | "height" | "weight" | null
  >(null);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("ft");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");
  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">(
    "imperial"
  );
  const [switchWidth, setSwitchWidth] = useState(0);
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightLbsInput, setWeightLbsInput] = useState("");
  const [weightKgInput, setWeightKgInput] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const unitThumbAnim = useRef(new Animated.Value(0)).current;

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

  const applyUnitSystem = (system: "imperial" | "metric") => {
    const nextHeightUnit: HeightUnit = system === "imperial" ? "ft" : "cm";
    const nextWeightUnit: WeightUnit = system === "imperial" ? "lbs" : "kg";
    setUnitSystem(system);
    setHeightUnit(nextHeightUnit);
    setWeightUnit(nextWeightUnit);
    onUnitChange?.("height", nextHeightUnit);
    onUnitChange?.("weight", nextWeightUnit);
    onChange("height", "");
    onChange("weight", "");
    setHeightFeet("");
    setHeightInches("");
    setWeightKgInput("");
    setWeightLbsInput("");
    Animated.spring(unitThumbAnim, {
      toValue: system === "imperial" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 120,
    }).start();
  };

  const getHeightPlaceholder = () => {
    return heightUnit === "cm" ? "100-250 cm" : "4'0\" - 7'0\"";
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
    if (heightUnit !== "ft") return;
    if (focusedField === "height") return;
    if (height === null || Number.isNaN(height)) return;
    if (heightFeet !== "" || heightInches !== "") return;
    const totalInches = Math.round(height / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    setHeightFeet(ft ? String(ft) : "");
    setHeightInches(String(inch));
  }, [height, heightUnit, focusedField, heightFeet, heightInches]);

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

    if (!feetValue && !inchesValue) {
      onChange("height", "");
      return;
    }

    if (feetValid && inchesValid) {
      const totalInches = ft * 12 + inch;
      onChange("height", String(totalInches));
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
    <Animated.View 
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
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
            { id: "male" as const, label: "Male" , color: ""},
            { id: "female" as const, label: "Female", color: "" },
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

      {/* Athlete Mode */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <View>
            <Text style={styles.inputLabel}>Athlete Mode</Text>
            <Text style={styles.helperText}>Turn on if you train often</Text>
          </View>
          <Switch
            value={isAthlete}
            onValueChange={(val) => {
              onAthleteToggle(val);
              if (!val) onTrainingLevelChange(null);
            }}
            thumbColor={isAthlete ? "#00C853" : "#FFFFFF"}
            trackColor={{ false: "#E5E7EB", true: "#C8F8DF" }}
          />
        </View>

        {isAthlete && (
          <View style={styles.trainingSection}>
            <Text style={styles.trainingTitle}>Training level</Text>
            <Text style={styles.helperText}>How hard do you usually train?</Text>
            <View style={styles.trainingRow}>
              {[
                { id: "light", label: "Light", sub: "3–4 days a week" },
                { id: "casual", label: "Casual", sub: "5–6 days a week" },
                { id: "intense", label: "Intense", sub: "Daily or 2× a day" },
              ].map((opt) => {
                const active = trainingLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.trainingOption, active && styles.trainingOptionActive]}
                    onPress={() => onTrainingLevelChange(opt.id as "light" | "casual" | "intense")}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.trainingLabel, active && styles.trainingLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.trainingSub, active && styles.trainingSubActive]}>
                      {opt.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Unit system switch (small, below gender) */}
      <View
        style={styles.unitSwitch}
        onLayout={(e) => setSwitchWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.unitThumb,
            {
              width: switchWidth ? switchWidth / 2 - 10 : "46%",
              backgroundColor:
                unitSystem === "imperial"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(249, 115, 22, 0.12)",
              borderColor:
                unitSystem === "imperial"
                  ? "rgba(16, 185, 129, 0.35)"
                  : "rgba(249, 115, 22, 0.35)",
              transform: [
                {
                  translateX: unitThumbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, switchWidth ? switchWidth / 2 : 0],
                  }),
                },
              ],
            },
          ]}
        />
        <TouchableOpacity
          style={styles.unitOption}
          activeOpacity={0.9}
          onPress={() => applyUnitSystem("imperial")}
        >
          <Text
            style={[
              styles.unitLabel,
              unitSystem === "imperial" && styles.unitLabelActive,
            ]}
          >
            Imperial
          </Text>
          <Text style={styles.unitHint}>lbs / ft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.unitOption}
          activeOpacity={0.9}
          onPress={() => applyUnitSystem("metric")}
        >
          <Text
            style={[
              styles.unitLabel,
              unitSystem === "metric" && styles.unitLabelActiveOrange,
            ]}
          >
            Metric
          </Text>
          <Text style={styles.unitHint}>kg / cm</Text>
        </TouchableOpacity>
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
          <Text style={styles.inputLabel}>
            {heightUnit === "cm" ? "Height * (cm)" : "Height * (ft / in)"}
          </Text>
          <Text style={styles.unitChip}>{heightUnit}</Text>
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
          <Text style={styles.inputLabel}>
            {weightUnit === "kg" ? "Weight * (kg)" : "Weight * (lbs)"}
          </Text>
          <Text style={styles.unitChip}>{weightUnit}</Text>
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

    </Animated.View>
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
  helperText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  unitChip: {
    backgroundColor: "#EEF7F2",
    color: "#0A8F5D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "700",
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
    borderColor: "#FD8100",
    backgroundColor: "#FFF4EC",
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },
  genderLabelSelected: {
    color: "#FD8100",
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
  unitSwitch: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 14,
    padding: 4,
    paddingRight: 6,
    marginTop: -4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.12)",
    overflow: "hidden",
  },
  unitThumb: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  unitOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  unitLabelActive: {
    color: "#0A8F5D",
  },
  unitLabelActiveOrange: {
    color: "#F97316",
  },
  unitHint: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  trainingSection: {
    marginTop: 12,
    gap: 8,
  },
  trainingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },
  trainingRow: {
    flexDirection: "row",
    gap: 8,
  },
  trainingOption: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEEFF3",
  },
  trainingOptionActive: {
    borderColor: "#00C853",
    backgroundColor: "#E8F8F2",
  },
  trainingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },
  trainingLabelActive: {
    color: "#00C853",
  },
  trainingSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  trainingSubActive: {
    color: "#0A8F5D",
  },
});

export default BasicBodyInformationScreen;
