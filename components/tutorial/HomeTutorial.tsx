import { Storage } from '@/src/utils/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const TUTORIAL_KEY = 'tutorialCompleted';

// Step definitions
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetKey: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-1',
    title: 'Pantry',
    description: 'This is where your pantry lives. You can view, manage, and update everything you own.',
    targetKey: 'pantry',
  },
  {
    id: 'step-2',
    title: 'Meal Plans',
    description: 'Your saved meal plans live here. You can view, create, and share plans with your family.',
    targetKey: 'mealPlans',
  },
  {
    id: 'step-3',
    title: 'Grocery',
    description: 'Upload or organize all your grocery items here. Keep everything synced and tidy.',
    targetKey: 'grocery',
  },
  {
    id: 'step-4',
    title: 'Quick Meals',
    description: 'Short on time? Tap here to quickly generate or choose fast meals.',
    targetKey: 'quickMeals',
  },
  {
    id: 'step-5',
    title: 'All Features',
    description: 'Tap here to explore every feature SAVR offers — tools, insights, and more.',
    targetKey: 'allFeatures',
  },
  {
    id: 'step-6',
    title: 'Quick Add',
    description: 'Instantly add items to your pantry or grocery list with just one tap.',
    targetKey: 'quickAdd',
  },
  {
    id: 'step-7',
    title: 'Chat',
    description: 'Chat with SAVR AI to get recipe suggestions, meal ideas, and cooking tips.',
    targetKey: 'chatButton',
  },
  {
    id: 'step-8',
    title: 'Family',
    description: 'Manage your family members and share meal plans with everyone.',
    targetKey: 'familyButton',
  },
  {
    id: 'step-9',
    title: 'Settings',
    description: 'Customize your profile, preferences, and app settings.',
    targetKey: 'settingsButton',
  },
  {
    id: 'step-10',
    title: 'Congratulations! 🎉',
    description: "You're all set! You now know how to use all the main features of SAVR. Start exploring and enjoy your journey to smarter shopping and healthier living!",
    targetKey: 'settingsButton', // Reuse last target for final message
  },
];

// Target element measurements
export interface TargetMeasurements {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HomeTutorialProps {
  visible: boolean;
  onComplete: () => void;
  targetMeasurements: Record<string, TargetMeasurements>;
}

// Check if tutorial has been completed
export const checkTutorialCompleted = async (): Promise<boolean> => {
  // TEMPORARY: Always return false for testing - tutorial will show on every reload
  return false;
  
  // TODO: Uncomment below for production
  // try {
  //   const value = await Storage.getItem(TUTORIAL_KEY);
  //   return value === 'true';
  // } catch (error) {
  //   console.log('Error checking tutorial status:', error);
  //   return false;
  // }
};

// Mark tutorial as completed
export const markTutorialCompleted = async (): Promise<void> => {
  try {
    await Storage.setItem(TUTORIAL_KEY, 'true');
  } catch (error) {
    console.log('Error marking tutorial as complete:', error);
  }
};

const HomeTutorial: React.FC<HomeTutorialProps> = ({
  visible,
  onComplete,
  targetMeasurements,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const spotlightAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(100)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;

  // Animated spotlight position and size for smooth transitions
  const animatedSpotlightX = useRef(new Animated.Value(0)).current;
  const animatedSpotlightY = useRef(new Animated.Value(0)).current;
  const animatedSpotlightWidth = useRef(new Animated.Value(100)).current;
  const animatedSpotlightHeight = useRef(new Animated.Value(100)).current;

  // Skip button position animation
  const skipButtonPosition = useRef(new Animated.Value(0)).current; // 0 = bottom, 1 = top

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const targetMeasurement = targetMeasurements[currentStep?.targetKey];

  // Check if current step is a bottom navigation button
  const isBottomNavStep = currentStep && ['quickAdd', 'chatButton', 'familyButton', 'settingsButton'].includes(currentStep.targetKey);

  // Check if current step is the congratulations step
  const isCongratulationsStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Check if card will be positioned in lower half of screen (and thus might overlap skip button)
  const isCardInLowerHalf = targetMeasurement ? (targetMeasurement.y + targetMeasurement.height) > (SCREEN_HEIGHT / 2) : false;
  
  // Move skip button up if card is in lower half or it's a bottom nav step
  const shouldMoveSkipButtonUp = isBottomNavStep || isCardInLowerHalf;

  // Initialize spotlight position when tutorial becomes visible
  useEffect(() => {
    if (visible && targetMeasurement) {
      animatedSpotlightX.setValue(targetMeasurement.x);
      animatedSpotlightY.setValue(targetMeasurement.y);
      animatedSpotlightWidth.setValue(targetMeasurement.width);
      animatedSpotlightHeight.setValue(targetMeasurement.height);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(spotlightAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      animateCardIn();
    } else if (!visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(spotlightAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Animate spotlight position/size when step changes
  useEffect(() => {
    if (visible && targetMeasurement && currentStepIndex > 0) {
      animateCardOut(() => {
        // Animate spotlight to new position
        const spotlightAnimation = Animated.parallel([
          Animated.spring(animatedSpotlightX, {
            toValue: targetMeasurement.x,
            friction: 9,
            tension: 60,
            useNativeDriver: false,
          }),
          Animated.spring(animatedSpotlightY, {
            toValue: targetMeasurement.y,
            friction: 9,
            tension: 60,
            useNativeDriver: false,
          }),
          Animated.spring(animatedSpotlightWidth, {
            toValue: targetMeasurement.width,
            friction: 9,
            tension: 60,
            useNativeDriver: false,
          }),
          Animated.spring(animatedSpotlightHeight, {
            toValue: targetMeasurement.height,
            friction: 9,
            tension: 60,
            useNativeDriver: false,
          }),
        ]);

        spotlightAnimation.start();

        // Delay card animation to let spotlight move first
        setTimeout(() => {
          animateCardIn();
        }, 300);
      });
    }
  }, [currentStepIndex, targetMeasurement]);

  // Animate skip button position based on current step
  useEffect(() => {
    if (visible) {
      Animated.spring(skipButtonPosition, {
        toValue: shouldMoveSkipButtonUp ? 1 : 0,
        friction: 7,
        tension: 50,
        useNativeDriver: false,
      }).start();
    }
  }, [shouldMoveSkipButtonUp, visible]);

  const animateCardIn = () => {
    cardSlideAnim.setValue(100);
    cardFadeAnim.setValue(0);

    Animated.parallel([
      Animated.spring(cardSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateCardOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(cardSlideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const handleNext = async () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      await handleComplete();
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleComplete = async () => {
    await markTutorialCompleted();
    onComplete();
  };

  if (!visible || !currentStep) {
    return null;
  }

  // For congratulations step, we don't need target measurements
  if (!isCongratulationsStep && !targetMeasurement) {
    console.warn(`[HomeTutorial] Missing target measurement for step ${currentStepIndex + 1}: ${currentStep.targetKey}`);
    console.warn('[HomeTutorial] Available measurements:', Object.keys(targetMeasurements));
    return null;
  }

  // Calculate card position
  let cardTop: number;
  if (isCongratulationsStep) {
    // Center the card vertically for congratulations
    cardTop = (SCREEN_HEIGHT - 300) / 2;
  } else if (!targetMeasurement) {
    return null;
  } else {
    // Calculate card position - for bottom nav, always show above; otherwise below or above based on space
    const spaceBelow = SCREEN_HEIGHT - (targetMeasurement.y + targetMeasurement.height);

    if (isBottomNavStep) {
      // For bottom navigation buttons, position card just above the spotlight
      cardTop = targetMeasurement.y - 290;
    } else {
      // For other elements, position below if there's space, otherwise above
      cardTop = spaceBelow > 250
        ? targetMeasurement.y + targetMeasurement.height + 20
        : targetMeasurement.y - 220;
    }
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark Overlay with Cutout Effect - Hidden for congratulations */}
      {!isCongratulationsStep && (
        <>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: overlayOpacity,
              },
            ]}
            pointerEvents="none"
          >
            {/* Top Dark Area */}
            <Animated.View
              style={[
                styles.overlaySection,
                {
                  height: Animated.add(animatedSpotlightY, -10),
                },
              ]}
            />

            {/* Middle Row with Left, Cutout, and Right */}
            <Animated.View
              style={{
                flexDirection: 'row',
                height: Animated.add(animatedSpotlightHeight, 20),
              }}
            >
              {/* Left Dark Area */}
              <Animated.View
                style={[
                  styles.overlaySection,
                  {
                    width: Animated.add(animatedSpotlightX, -10),
                  },
                ]}
              />

              {/* Cutout (transparent - shows content) */}
              <Animated.View
                style={{
                  width: Animated.add(animatedSpotlightWidth, 20),
                }}
              />

              {/* Right Dark Area */}
              <Animated.View
                style={[
                  styles.overlaySection,
                  {
                    flex: 1,
                  },
                ]}
              />
            </Animated.View>

            {/* Bottom Dark Area */}
            <Animated.View
              style={[
                styles.overlaySection,
                {
                  flex: 1,
                },
              ]}
            />
          </Animated.View>

          {/* Spotlight Border */}
          <Animated.View
            style={[
              styles.spotlight,
              {
                left: Animated.add(animatedSpotlightX, -10),
                top: Animated.add(animatedSpotlightY, -10),
                width: Animated.add(animatedSpotlightWidth, 20),
                height: Animated.add(animatedSpotlightHeight, 20),
              },
            ]}
            pointerEvents="none"
          />
        </>
      )}

      {/* Step Card */}
      <Animated.View
        style={[
          styles.stepCard,
          {
            top: cardTop,
            opacity: cardFadeAnim,
            transform: [
              {
                translateY: cardSlideAnim,
              },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Progress Indicators */}
        <View style={styles.progressContainer} pointerEvents="none">
          {TUTORIAL_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStepIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.cardContent} pointerEvents="none">
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepDescription}>{currentStep.description}</Text>
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentStepIndex === TUTORIAL_STEPS.length - 1 ? 'Got it!' : 'Next'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Skip Button - Hidden for congratulations */}
      {!isCongratulationsStep && (
        <Animated.View
          style={[
            styles.skipButtonContainer,
            {
              opacity: overlayOpacity,
            },
          ]}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateY: skipButtonPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(SCREEN_HEIGHT - (Platform.OS === 'ios' ? 180 : 140))],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip Tutorial</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#00C853',
    backgroundColor: 'transparent',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  stepCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#00C853',
    width: 24,
  },
  cardContent: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeTutorial;
