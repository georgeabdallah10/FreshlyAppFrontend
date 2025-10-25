import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { setPrefrences } from "@/api/user/setPrefrences";

type PreferenceOption = {
  id: string;
  label: string;
};

const OnboardingPreferences = () => {
  const router = useRouter();
  const { fromProfile } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [medicalRestrictions, setMedicalRestrictions] = useState<string[]>([]);
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
        { id: "jain", label: "Jain Vegetarian" },
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
        { id: "flexitarian", label: "Flexitarian" },
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
        { id: "weight-loss", label: "Weight Loss" },
        { id: "weight-gain", label: "Gain Weight" },
        { id: "muscle-gain", label: "Muscle Gain" },
        { id: "balanced", label: "Balanced" },
      ],
      state: [goal],
      setState: (value: string[]) => setGoal(value[0] || "balanced"),
    },
  ];

  const currentScreen = screens[currentStep];
  const isLastStep = currentStep === screens.length - 1;
  const isCalorieStep = currentStep === screens.length;

  const toggleOption = (id: string) => {
    const { state, setState } = currentScreen;

    // For goal selection, only allow one option
    if (currentStep === 5) {
      setGoal(id);
      return;
    }

    if (state.includes(id)) {
      setState(state.filter((item) => item !== id));
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
        ];

        console.log("Submitting preferences:", {
          diet_codes: allDietCodes,
          allergen_ingredient_ids: [],
          disliked_ingredient_ids: [],
          goal: goal,
          calorie_target: parseInt(calorieTarget) || 2200,
        });

        const result = await setPrefrences({
          diet_codes: allDietCodes,
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
            router.replace("/(home)/main");
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
            Now let's{"\n"}Lock-In{"\n"}Your{"\n"}Preferences
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
            {screens.slice(1).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  currentStep - 1 === index && styles.progressDotActive,
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
                  {(currentStep === 5
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
});

export default OnboardingPreferences;
