import { setPrefrences } from "@/src/user/setPrefrences";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type PreferenceOption = {
  id: string;
  label: string;
};

const OnboardingPreferences = () => {
  const router = useRouter();
  const { fromProfile } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [medicalRestrictions, setMedicalRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [editingAllergyIndex, setEditingAllergyIndex] = useState<number | null>(null);
  const [culturalPreferences, setCulturalPreferences] = useState<string[]>([]);
  const [lifestylePreferences, setLifestylePreferences] = useState<string[]>(
    []
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [otherRestrictions, setOtherRestrictions] = useState<string[]>([]);
  const [goal, setGoal] = useState<string>("balanced");
  const [calorieTarget, setCalorieTarget] = useState<string>("2200");
  const [focusedCalorie, setFocusedCalorie] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Common allergy suggestions
  const commonAllergies = [
    "Peanuts", "Tree Nuts", "Milk", "Eggs", "Soy", "Wheat", 
    "Fish", "Shellfish", "Sesame", "Mustard", "Celery", "Sulfites"
  ];

  const screens = [
    {
      title: "Medical or Health\nRelated Restrictions",
      options: [
        { id: "gluten-free", label: "Gluten-Free" },
        { id: "lactose-free", label: "Lactose-Free" },
        { id: "soy-free", label: "Soy-Free" },
        { id: "egg-free", label: "Egg-Free" },
        { id: "shellfish-free", label: "Shellfish-Free" },
        { id: "low-sugar", label: "Low-Sugar" },
        { id: "nut-free", label: "Nut-Free" },
      ],
      state: medicalRestrictions,
      setState: setMedicalRestrictions,
    },
    {
      title: "Cultural and religious",
      options: [
        { id: "halal", label: "Halal" },
        { id: "kosher", label: "Kosher" },
      ],
      state: culturalPreferences,
      setState: setCulturalPreferences,
    },
    {
      title: "Lifestyle preferences",
      options: [
        { id: "vegetarian", label: "Vegetarian" },
        { id: "vegan", label: "Vegan" },
        { id: "pescatarian", label: "Pescatarian" },
      ],
      state: lifestylePreferences,
      setState: setLifestylePreferences,
    },
    {
      title: "Dietary preferences",
      options: [
        { id: "ketogenic", label: "Ketogenic" },
        { id: "paleo", label: "Paleo" },
        { id: "whole30", label: "Whole30" },
        { id: "low-calorie", label: "Low-Calorie" },
      ],
      state: dietaryPreferences,
      setState: setDietaryPreferences,
    },
    {
      title: "Other Restrictions",
      options: [
        { id: "no-spicy", label: "No Spicy Foods" },
        { id: "allergen-free", label: "Allergen-Free" },
        { id: "diabetic-friendly", label: "Diabetic-Friendly" },
      ],
      state: otherRestrictions,
      setState: setOtherRestrictions,
    },
    {
      title: "What is your goal?",
      options: [
        { id: "lose-weight", label: "Lose Weight" },
        { id: "weight-gain", label: "Gain Weight" },
        { id: "muscle-gain", label: "Muscle Gain" },
        { id: "balanced", label: "Balanced" },
      ],
      state: [goal],
      setState: (value: string[]) => setGoal(value[0] || "balanced"),
    },
  ];

  // Adjust for allergies screen at step 1
  const currentScreen = currentStep >= 2 ? screens[currentStep - 2] : null;
  const isLastStep = currentStep === screens.length + 1; // +1 for allergies screen
  const isCalorieStep = currentStep === screens.length + 2; // +2 for allergies screen

  const toggleOption = (id: string) => {
    if (!currentScreen) return;
    
    const { state, setState } = currentScreen;

    // For goal selection, only allow one option (adjusted for allergies screen)
    if (currentStep === 7) { // Goal is now at step 7 (was 5)
      setGoal(id);
      return;
    }

    if (state.includes(id)) {
      setState(state.filter((item: string) => item !== id));
    } else {
      setState([...state, id]);
    }
  };

  const handleNext = async () => {
    if (isCalorieStep) {
      // Submit all preferences
      try {
        const allDietCodes = [
          ...dietaryPreferences,
          ...lifestylePreferences,
          ...culturalPreferences,
          ...otherRestrictions,
          ...medicalRestrictions,
        ];

        // Convert allergies to a format the backend can use
        // For now, we'll store them as part of diet_codes with a prefix
        const allergyDietCodes = allergies.map(allergy => `allergy-${allergy.toLowerCase().replace(/\s+/g, '-')}`);

        console.log("Submitting preferences:", {
          diet_codes: [...allDietCodes, ...allergyDietCodes],
          allergen_ingredient_ids: [],
          disliked_ingredient_ids: [],
          goal: goal,
          calorie_target: parseInt(calorieTarget) || 2200,
          allergies: allergies, // Store raw allergies list
        });

        const result = await setPrefrences({
          diet_codes: [...allDietCodes, ...allergyDietCodes],
          allergen_ingredient_ids: [],
          disliked_ingredient_ids: [],
          goal: goal,
          calorie_target: parseInt(calorieTarget) || 2200,
        });

        if (result.ok) {
          console.log("Preferences saved successfully!");
          if (fromProfile === "true") {
            router.replace("/(home)/profile");
          } else {
            router.replace("/(user)/getLocation");
          }
        } else {
          alert(`Error: ${result.message}`);
          console.log(result);
        }
      } catch (error) {
        console.error("Error saving preferences:", error);
        alert("Failed to save preferences. Please try again.");
      }
    } else if (isLastStep) {
      // Go to calorie target screen
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(currentStep + 1);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(currentStep + 1);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(currentStep - 1);
        slideAnim.setValue(-50);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  };

  // Allergy Management Functions
  const addAllergy = () => {
    const trimmed = allergyInput.trim();
    if (!trimmed) return;
    
    if (editingAllergyIndex !== null) {
      // Update existing allergy
      const updated = [...allergies];
      updated[editingAllergyIndex] = trimmed;
      setAllergies(updated);
      setEditingAllergyIndex(null);
    } else {
      // Add new allergy
      if (!allergies.includes(trimmed)) {
        setAllergies([...allergies, trimmed]);
      }
    }
    setAllergyInput("");
  };

  const editAllergy = (index: number) => {
    setAllergyInput(allergies[index]);
    setEditingAllergyIndex(index);
  };

  const deleteAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
    if (editingAllergyIndex === index) {
      setAllergyInput("");
      setEditingAllergyIndex(null);
    }
  };

  const selectCommonAllergy = (allergy: string) => {
    if (!allergies.includes(allergy)) {
      setAllergies([...allergies, allergy]);
    }
  };

  // Welcome Screen
  if (currentStep === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.welcomeContainer}>
          {fromProfile === "true" ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/(home)/profile")}
              activeOpacity={0.6}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.welcomeTitle}>
            Now let's{"\n"}set up{"\n"}your{"\n"}preferences
          </Text>

          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Allergies Screen (Step 1)
  if (currentStep === 1) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.6}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <Text style={styles.title}>Food Allergies</Text>
            <Text style={styles.subtitle}>
              Let us know about any food allergies you have
            </Text>

            {/* Custom Input */}
            <View style={styles.allergyInputSection}>
              <Text style={styles.sectionLabel}>Add Custom Allergy</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.allergyInput}
                  placeholder="Enter allergy (e.g., Peanuts)"
                  placeholderTextColor="#B0B0B0"
                  value={allergyInput}
                  onChangeText={setAllergyInput}
                  onSubmitEditing={addAllergy}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !allergyInput.trim() && styles.addButtonDisabled,
                  ]}
                  onPress={addAllergy}
                  disabled={!allergyInput.trim()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addButtonText}>
                    {editingAllergyIndex !== null ? "Update" : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* User's Allergies List */}
            {allergies.length > 0 && (
              <View style={styles.allergiesListSection}>
                <Text style={styles.sectionLabel}>Your Allergies</Text>
                <View style={styles.allergiesList}>
                  {allergies.map((allergy, index) => (
                    <View
                      key={index}
                      style={[
                        styles.allergyTag,
                        editingAllergyIndex === index && styles.allergyTagEditing,
                      ]}
                    >
                      <Text style={styles.allergyTagText}>{allergy}</Text>
                      <View style={styles.allergyActions}>
                        <TouchableOpacity
                          onPress={() => editAllergy(index)}
                          style={styles.allergyActionButton}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.allergyEditIcon}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteAllergy(index)}
                          style={styles.allergyActionButton}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.allergyDeleteIcon}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Common Allergies Quick Select */}
            <View style={styles.commonAllergiesSection}>
              <Text style={styles.sectionLabel}>Common Allergies (Tap to Add)</Text>
              <View style={styles.commonAllergiesGrid}>
                {commonAllergies.map((allergy) => (
                  <TouchableOpacity
                    key={allergy}
                    style={[
                      styles.commonAllergyChip,
                      allergies.includes(allergy) && styles.commonAllergyChipSelected,
                    ]}
                    onPress={() => selectCommonAllergy(allergy)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.commonAllergyText,
                        allergies.includes(allergy) && styles.commonAllergyTextSelected,
                      ]}
                    >
                      {allergy}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Calorie Target Screen
  if (isCalorieStep) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.6}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <Text style={styles.title}>Daily Calorie Target</Text>

            <View style={styles.calorieCard}>
              <View style={styles.calorieIconContainer}>
                <Text style={styles.calorieIcon}>🎯</Text>
              </View>

              <Text style={styles.calorieSubtitle}>
                Set your daily calorie goal{"\n"}or use the default (2200 cal)
              </Text>

              <View
                style={[
                  styles.calorieInputContainer,
                  focusedCalorie && styles.calorieInputFocused,
                ]}
              >
                <TextInput
                  style={styles.calorieInput}
                  placeholder="2200"
                  placeholderTextColor="#B0B0B0"
                  value={calorieTarget}
                  onChangeText={setCalorieTarget}
                  onFocus={() => setFocusedCalorie(true)}
                  onBlur={() => setFocusedCalorie(false)}
                  keyboardType="numeric"
                />
                <Text style={styles.calorieUnit}>cal/day</Text>
              </View>

              <Text style={styles.calorieHint}>
                💡 Recommended: 1800-2400 calories per day
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>Complete Setup</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Regular Preference Screens
  if (!currentScreen) {
    return null; // Safety check
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.6}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <Text style={styles.title}>{currentScreen.title}</Text>

          <View style={styles.progressContainer}>
            {screens.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  currentStep - 2 === index && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.optionsContainer}>
            {currentScreen.options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={() => toggleOption(option.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <View style={styles.radioOuter}>
                  {(currentStep === 7
                    ? goal === option.id
                    : currentScreen.state.includes(option.id)) && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.nextButtonText}>
            {isLastStep ? "Next" : "Next"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
  },
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 60,
    justifyContent: "space-between",
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 44,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F7F8FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  backIcon: {
    fontSize: 20,
    color: "#111111",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    marginBottom: 24,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 30,
  },
  progressDot: {
    width: 50,
    height: 3,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: "#FF8C00",
  },
  optionsContainer: {
    marginBottom: 40,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEEFF3",
  },
  optionLabel: {
    fontSize: 16,
    color: "#111111",
    fontWeight: "400",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#00C853",
  },
  nextButton: {
    backgroundColor: "#00C853",
    borderRadius: 12,
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  calorieCard: {
    backgroundColor: "#F7F8FA",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    marginBottom: 30,
  },
  calorieIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F8F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  calorieIcon: {
    fontSize: 40,
  },
  calorieSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  calorieInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "#EEEFF3",
    width: "100%",
    marginBottom: 20,
  },
  calorieInputFocused: {
    borderColor: "#00C853",
  },
  calorieInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
  },
  calorieUnit: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "600",
  },
  calorieHint: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  // Allergy Management Styles
  allergyInputSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  allergyInput: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111111",
    borderWidth: 1,
    borderColor: "#EEEFF3",
  },
  addButton: {
    backgroundColor: "#00A86B",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  addButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  allergiesListSection: {
    marginBottom: 24,
  },
  allergiesList: {
    gap: 10,
  },
  allergyTag: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FD8100",
  },
  allergyTagEditing: {
    backgroundColor: "#E8F8F2",
    borderColor: "#00A86B",
  },
  allergyTagText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    flex: 1,
  },
  allergyActions: {
    flexDirection: "row",
    gap: 12,
  },
  allergyActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  allergyEditIcon: {
    fontSize: 16,
    color: "#00A86B",
  },
  allergyDeleteIcon: {
    fontSize: 22,
    color: "#FF4444",
    fontWeight: "600",
  },
  commonAllergiesSection: {
    marginBottom: 24,
  },
  commonAllergiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  commonAllergyChip: {
    backgroundColor: "#F7F8FA",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EEEFF3",
  },
  commonAllergyChipSelected: {
    backgroundColor: "#E8F8F2",
    borderColor: "#00A86B",
  },
  commonAllergyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
  },
  commonAllergyTextSelected: {
    color: "#00A86B",
    fontWeight: "600",
  },
});

export default OnboardingPreferences;
