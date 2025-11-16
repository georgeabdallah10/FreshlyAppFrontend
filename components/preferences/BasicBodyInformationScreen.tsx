import React, { useState } from "react";
import {
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
};

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
}) => {
  const [focusedField, setFocusedField] = useState<
    "age" | "height" | "weight" | null
  >(null);

  const fields: Array<{
    key: "age" | "height" | "weight";
    label: string;
    value: number | null;
    placeholder: string;
  }> = [
    { key: "age", label: "Age", value: age, placeholder: "Years" },
    { key: "height", label: "Height", value: height, placeholder: "cm" },
    { key: "weight", label: "Weight", value: weight, placeholder: "kg" },
  ];

  const renderField = ({
    key,
    label,
    value,
    placeholder,
  }: (typeof fields)[number]) => {
    const error =
      key === "age" ? ageError : key === "height" ? heightError : weightError;

    return (
      <View
        key={key}
        style={[
          styles.inputGroup,
          focusedField === key && styles.inputGroupFocused,
          error && styles.inputGroupError,
        ]}
      >
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={value !== null ? String(value) : ""}
          placeholder={placeholder}
          placeholderTextColor="#B0B0B0"
          onFocus={() => setFocusedField(key)}
          onBlur={() => setFocusedField(null)}
          onChangeText={(text) => onChange(key, text)}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Basic Body Information</Text>
      <Text style={styles.cardSubtitle}>
        Optional details help us personalize your experience later.
      </Text>

      {renderField(fields[0])}

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

      {fields.slice(1).map((field) => renderField(field))}
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
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 6,
  },
  input: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
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
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#FF3B30",
  },
});

export default BasicBodyInformationScreen;
