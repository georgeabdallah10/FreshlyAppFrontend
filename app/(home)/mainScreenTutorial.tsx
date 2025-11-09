import React, { useEffect, useState, useCallback, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { copilot, walkthroughable, CopilotStep as CopilotStepType, CopilotProps } from '@okgrow/react-native-copilot';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TUTORIAL_KEY = 'hasSeenMainTutorial';
const DEV_MODE = false;
const ANIMATION_DURATION = 400;
const FADE_DURATION = 300;

const COLORS = {
  primary: '#00A86B',
  accent: '#FD8100',
  grey: '#4C4D59',
  white: '#FFFFFF',
  text: '#111214',
  subText: '#6B7280',
  overlay: 'rgba(0, 0, 0, 0.85)',
  highlight: 'rgba(0, 168, 107, 0.15)',
};

const TUTORIAL_STEPS = [
  {
    order: 1,
    name: 'welcome',
    title: 'Welcome to Freshly! 🍊',
    text: "Let's explore your main dashboard and discover how Freshly makes meal planning effortless.",
  },
  {
    order: 2,
    name: 'pantry',
    title: 'Track Your Pantry',
    text: 'Keep track of what you have at home and get notified before items expire.',
  },
  {
    order: 3,
    name: 'mealPlans',
    title: 'Personalized Meal Plans',
    text: 'Your weekly meal plans appear here, tailored to your preferences and dietary goals.',
  },
  {
    order: 4,
    name: 'grocery',
    title: 'Smart Grocery Lists',
    text: 'Upload receipts or scan items to automatically sync your grocery list.',
  },
  {
    order: 5,
    name: 'quickMeals',
    title: 'Quick & Healthy Recipes',
    text: 'Find delicious recipes perfect for busy days—ready in 30 minutes or less.',
  },
  {
    order: 6,
    name: 'allFeatures',
    title: 'Explore More Features',
    text: 'Access meal prep tips, exclusive offers, and smart shopping recommendations.',
  },
  {
    order: 7,
    name: 'complete',
    title: "You're All Set! 🎉",
    text: 'Smarter shopping and healthier eating starts now. Enjoy your Freshly experience!',
  },
];

interface MainScreenTutorialProps {
  children: (CopilotStep: typeof CopilotStepType) => ReactNode;
}

interface TooltipProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStep: {
    text: string;
    order: number;
    name: string;
  };
  handleNext: () => void;
  handleStop: () => void;
  handlePrev: () => void;
}

const CustomTooltip: React.FC<TooltipProps> = ({
  isFirstStep,
  isLastStep,
  currentStep,
  handleNext,
  handleStop,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep.order]);

  const stepInfo = TUTORIAL_STEPS.find((s) => s.order === currentStep.order);
  const totalSteps = TUTORIAL_STEPS.length;

  const handleNextPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleNext();
  };

  const handleSkipPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleStop();
  };

  return (
    <Animated.View
      style={[
        styles.tooltipContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.progressContainer}>
        {TUTORIAL_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index + 1 === currentStep.order && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.tooltipContent}>
        <Text style={styles.tooltipTitle}>{stepInfo?.title}</Text>
        <Text style={styles.tooltipText}>{stepInfo?.text}</Text>
      </View>

      <View style={styles.tooltipActions}>
        {!isLastStep && (
          <TouchableOpacity
            onPress={handleSkipPress}
            style={styles.skipButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={isLastStep ? handleSkipPress : handleNextPress}
          style={[
            styles.nextButton,
            isLastStep && styles.lastStepButton,
          ]}
        >
          <Text style={styles.nextButtonText}>
            {isLastStep ? "Let's Go!" : 'Next'}
          </Text>
          {!isLastStep && (
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.stepCounter}>
        {currentStep.order} of {totalSteps}
      </Text>
    </Animated.View>
  );
};

const WalkthroughableTooltip = walkthroughable(CustomTooltip);

const CustomStepNumber: React.FC<{
  isFirstStep?: boolean;
  isLastStep?: boolean;
  currentStepNumber?: number;
}> = () => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.stepNumber,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Ionicons name="information" size={24} color={COLORS.white} />
    </Animated.View>
  );
};

const WalkthroughableStepNumber = walkthroughable(CustomStepNumber);

export const hasSeenTutorial = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(TUTORIAL_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking tutorial status:', error);
    return false;
  }
};

export const markTutorialComplete = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    console.log('✅ Tutorial marked as complete');
  } catch (error) {
    console.error('Error saving tutorial status:', error);
  }
};

export const resetTutorial = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
    console.log('🔄 Tutorial reset - will show on next app launch');
  } catch (error) {
    console.error('Error resetting tutorial:', error);
  }
};

const MainScreenTutorialBase: React.FC<MainScreenTutorialProps & CopilotProps> = ({
  children,
  start,
  copilotEvents,
}) => {
  const [tutorialReady, setTutorialReady] = useState(false);
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkTutorial = async () => {
      try {
        if (DEV_MODE) {
          console.log('🔧 DEV_MODE: Tutorial will be shown');
          setTutorialReady(true);
          return;
        }

        const hasSeen = await hasSeenTutorial();
        
        if (!hasSeen) {
          console.log('📚 First time user - showing tutorial');
          setTutorialReady(true);
        } else {
          console.log('✅ User has seen tutorial - skipping');
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };

    checkTutorial();
  }, []);

  useEffect(() => {
    if (tutorialReady) {
      const timeout = setTimeout(() => {
        start?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [tutorialReady, start]);

  useEffect(() => {
    if (!copilotEvents) return;

    const handleStart = () => {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start();
    };

    const handleStop = async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start();

      await markTutorialComplete();
    };

    copilotEvents.on('start', handleStart);
    copilotEvents.on('stop', handleStop);

    return () => {
      copilotEvents?.off?.('start', handleStart);
      copilotEvents?.off?.('stop', handleStop);
    };
  }, [copilotEvents, overlayOpacity]);

  return <>{children(CopilotStepType)}</>;
};

const MainScreenTutorial = copilot<MainScreenTutorialProps>({
  overlay: 'svg',
  animated: true,
  backdropColor: COLORS.overlay,
  tooltipComponent: WalkthroughableTooltip,
  stepNumberComponent: WalkthroughableStepNumber,
  androidStatusBarVisible: true,
  verticalOffset: Platform.OS === 'ios' ? 24 : 0,
})(MainScreenTutorialBase);

const styles = StyleSheet.create({
  tooltipContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    margin: 16,
    maxWidth: Dimensions.get('window').width - 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
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
    backgroundColor: COLORS.primary,
    width: 24,
  },
  tooltipContent: {
    marginBottom: 24,
  },
  tooltipTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  tooltipText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.subText,
    fontWeight: '500',
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.subText,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lastStepButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepCounter: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.subText,
    marginTop: 16,
  },
  stepNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default MainScreenTutorial;
