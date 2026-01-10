import { Storage } from '@/src/utils/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

const TUTORIAL_KEY = 'tutorialCompleted';

// Base dimensions (iPhone 14 Pro as reference)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Responsive scaling utilities
const createResponsiveUtils = (screenWidth: number, screenHeight: number) => {
  const widthScale = screenWidth / BASE_WIDTH;
  const heightScale = screenHeight / BASE_HEIGHT;
  const fontScale = Math.min(widthScale, heightScale);

  // Clamp values to prevent extreme scaling on very small or large devices
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  return {
    // Scale based on width (for horizontal spacing, widths)
    wp: (size: number) => size * clamp(widthScale, 0.7, 1.4),
    // Scale based on height (for vertical spacing, heights)
    hp: (size: number) => size * clamp(heightScale, 0.7, 1.4),
    // Scale for fonts (uses smaller dimension to ensure readability)
    fp: (size: number) => {
      const scaledSize = size * clamp(fontScale, 0.8, 1.3);
      // Ensure minimum readable font size
      return Math.max(scaledSize, size * 0.75);
    },
    // Normalize for pixel density
    normalize: (size: number) => {
      const newSize = size * fontScale;
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    },
    // Check if it's a small device (like iPhone SE)
    isSmallDevice: screenWidth < 375 || screenHeight < 700,
    // Check if it's a large device (like iPad or large phones)
    isLargeDevice: screenWidth > 428 || screenHeight > 926,
    // Check if it's a very small device
    isVerySmallDevice: screenWidth < 350 || screenHeight < 600,
  };
};

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
    title: 'Home',
    description: 'Tap here anytime to return to your main dashboard and see everything at a glance.',
    targetKey: 'homeButton',
  },
  {
    id: 'step-7',
    title: 'Quick Add',
    description: 'Instantly add items to your pantry with just one tap.',
    targetKey: 'quickAdd',
  },
  {
    id: 'step-8',
    title: 'Chat',
    description: 'Chat with SAVR AI to get recipe suggestions, meal ideas, and cooking tips.',
    targetKey: 'chatButton',
  },
  {
    id: 'step-9',
    title: 'Family',
    description: 'Manage your family members and share meal plans with everyone.',
    targetKey: 'familyButton',
  },
  {
    id: 'step-10',
    title: 'Settings',
    description: 'Customize your profile, preferences, and app settings.',
    targetKey: 'settingsButton',
  },
  {
    id: 'step-11',
    title: 'FAQ & Help',
    description: 'Need help? Tap here to access frequently asked questions and get support.',
    targetKey: 'faqButton',
  },
  {
    id: 'step-12',
    title: 'Notifications',
    description: 'Stay updated! View alerts about expiring items, meal reminders, and family activity.',
    targetKey: 'notificationsButton',
  },
  {
    id: 'step-13',
    title: 'Congratulations',
    description: "You're all set! You now know how to use all the main features of SAVR. Start exploring and enjoy your journey to smarter shopping and healthier living!",
    targetKey: 'notificationsButton', // Reuse last target for final message
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
  
  // TODO: Uncomment below for production
  try {
     const value = await Storage.getItem(TUTORIAL_KEY);
     return value === 'true';
  } catch (error) {
    console.log('Error checking tutorial status:', error);
    return false;
  }
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

  // Get dynamic screen dimensions
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Create responsive utilities based on current screen size
  const responsive = createResponsiveUtils(SCREEN_WIDTH, SCREEN_HEIGHT);

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
  const animatedSpotlightRadius = useRef(new Animated.Value(16)).current;

  // State values for SVG (updated via listeners for smooth animation)
  const [spotlightState, setSpotlightState] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    radius: 16,
  });

  // Set up listeners to sync animated values to state for SVG
  useEffect(() => {
    const listeners: string[] = [];

    listeners.push(
      animatedSpotlightX.addListener(({ value }) => {
        setSpotlightState(prev => ({ ...prev, x: value }));
      })
    );
    listeners.push(
      animatedSpotlightY.addListener(({ value }) => {
        setSpotlightState(prev => ({ ...prev, y: value }));
      })
    );
    listeners.push(
      animatedSpotlightWidth.addListener(({ value }) => {
        setSpotlightState(prev => ({ ...prev, width: value }));
      })
    );
    listeners.push(
      animatedSpotlightHeight.addListener(({ value }) => {
        setSpotlightState(prev => ({ ...prev, height: value }));
      })
    );
    listeners.push(
      animatedSpotlightRadius.addListener(({ value }) => {
        setSpotlightState(prev => ({ ...prev, radius: value }));
      })
    );

    return () => {
      animatedSpotlightX.removeAllListeners();
      animatedSpotlightY.removeAllListeners();
      animatedSpotlightWidth.removeAllListeners();
      animatedSpotlightHeight.removeAllListeners();
      animatedSpotlightRadius.removeAllListeners();
    };
  }, []);

  // Skip button position animation
  const skipButtonPosition = useRef(new Animated.Value(0)).current; // 0 = bottom, 1 = top

  // Track which step we've animated to, to prevent duplicate animations
  const animatedStepRef = useRef(-1);
  // Track previous visible state to detect when tutorial becomes visible again (for restart)
  const prevVisibleRef = useRef(false);

  // Reset to first step when tutorial becomes visible (for restart functionality)
  // This ensures the tutorial always starts from step 0 when restarted
  useEffect(() => {
    // If tutorial becomes visible (transitions from false to true), reset to first step
    if (visible && !prevVisibleRef.current) {
      setCurrentStepIndex(0);
      // Reset the animation ref so animations work correctly on restart
      animatedStepRef.current = -1;
    }
    // Update the previous visible state
    prevVisibleRef.current = visible;
  }, [visible]);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const targetMeasurement = targetMeasurements[currentStep?.targetKey];

  // Check if current step is a bottom navigation button
  const isBottomNavStep = currentStep && ['homeButton', 'quickAdd', 'chatButton', 'familyButton', 'settingsButton'].includes(currentStep.targetKey);

  // Check if current step is the congratulations step
  const isCongratulationsStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Check if current step is Grocery Lists or Quick Meals (keep skip button at bottom for these)
  const isGroceryOrQuickMealsStep = currentStep && ['grocery', 'quickMeals'].includes(currentStep.targetKey);

  // Check if card will be positioned in lower half of screen (and thus might overlap skip button)
  const isCardInLowerHalf = targetMeasurement ? (targetMeasurement.y + targetMeasurement.height) > (SCREEN_HEIGHT / 2) : false;

  // Move skip button up if card is in lower half or it's a bottom nav step
  // BUT keep it at bottom for Grocery Lists and Quick Meals steps
  const shouldMoveSkipButtonUp = !isGroceryOrQuickMealsStep && (isBottomNavStep || isCardInLowerHalf);

  // Calculate responsive card height based on screen size
  const getCardHeight = () => {
    if (responsive.isVerySmallDevice) return responsive.hp(200);
    if (responsive.isSmallDevice) return responsive.hp(220);
    if (responsive.isLargeDevice) return responsive.hp(280);
    return responsive.hp(250);
  };

  // Responsive spacing values
  const cardMarginHorizontal = responsive.wp(16);
  const spotlightPadding = 3; // Fixed 3px padding for precise, premium look

  // Border radius mapping - EXACT values from main.tsx styles
  const getBorderRadiusForTarget = (targetKey: string): number => {
    switch (targetKey) {
      // Cards: menuCard style has borderRadius: 18
      case 'pantry':
      case 'mealPlans':
      case 'grocery':
      case 'quickMeals':
        return 18;
      // All Features section: chatSection style has borderRadius: 18
      case 'allFeatures':
        return 18;
      // Bottom nav buttons: navIconContainer is 48x48 with borderRadius: 24 (circular)
      case 'homeButton':
      case 'quickAdd':
      case 'chatButton':
      case 'familyButton':
      case 'settingsButton':
        return 24;
      // Header buttons: menuButton & notificationButton are 48x48 with borderRadius: 24 (circular)
      case 'faqButton':
      case 'notificationsButton':
        return 24;
      default:
        return 18;
    }
  };

  // Add padding to border radius to maintain visual consistency
  // When spotlight is larger than target, radius needs to scale proportionally
  const baseBorderRadius = getBorderRadiusForTarget(currentStep?.targetKey || '');
  const currentBorderRadius = baseBorderRadius + spotlightPadding;

  // Initialize spotlight position when tutorial becomes visible
  useEffect(() => {
    if (visible && targetMeasurement) {
      // Set animated values
      animatedSpotlightX.setValue(targetMeasurement.x);
      animatedSpotlightY.setValue(targetMeasurement.y);
      animatedSpotlightWidth.setValue(targetMeasurement.width);
      animatedSpotlightHeight.setValue(targetMeasurement.height);
      animatedSpotlightRadius.setValue(currentBorderRadius);

      // Also set state for SVG (initial render before listeners fire)
      setSpotlightState({
        x: targetMeasurement.x,
        y: targetMeasurement.y,
        width: targetMeasurement.width,
        height: targetMeasurement.height,
        radius: currentBorderRadius,
      });

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
    // Skip if already animated this step, or conditions not met
    if (
      !visible ||
      !targetMeasurement ||
      currentStepIndex === 0 ||
      currentStepIndex === animatedStepRef.current
    ) {
      return;
    }

    // Mark this step as being animated
    animatedStepRef.current = currentStepIndex;

    // Capture current values for animation to avoid stale closures
    const targetX = targetMeasurement.x;
    const targetY = targetMeasurement.y;
    const targetWidth = targetMeasurement.width;
    const targetHeight = targetMeasurement.height;
    const targetRadius = currentBorderRadius;

    animateCardOut(() => {
      // Animate spotlight to new position
      Animated.parallel([
        Animated.spring(animatedSpotlightX, {
          toValue: targetX,
          friction: 9,
          tension: 60,
          useNativeDriver: false,
        }),
        Animated.spring(animatedSpotlightY, {
          toValue: targetY,
          friction: 9,
          tension: 60,
          useNativeDriver: false,
        }),
        Animated.spring(animatedSpotlightWidth, {
          toValue: targetWidth,
          friction: 9,
          tension: 60,
          useNativeDriver: false,
        }),
        Animated.spring(animatedSpotlightHeight, {
          toValue: targetHeight,
          friction: 9,
          tension: 60,
          useNativeDriver: false,
        }),
        Animated.spring(animatedSpotlightRadius, {
          toValue: targetRadius,
          friction: 9,
          tension: 60,
          useNativeDriver: false,
        }),
      ]).start();

      // Delay card animation to let spotlight move first
      setTimeout(() => {
        animateCardIn();
      }, 300);
    });
  }, [currentStepIndex, targetMeasurement, currentBorderRadius, visible]);

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

  // Calculate responsive card position
  const estimatedCardHeight = getCardHeight();
  const cardSpacing = responsive.hp(20);
  const minTopMargin = responsive.hp(Platform.OS === 'ios' ? 60 : 40);
  const minBottomMargin = responsive.hp(Platform.OS === 'ios' ? 100 : 80);

  let cardTop: number;
  if (isCongratulationsStep) {
    // Center the card vertically for congratulations
    cardTop = (SCREEN_HEIGHT - estimatedCardHeight) / 2;
  } else if (!targetMeasurement) {
    return null;
  } else {
    // Calculate available space above and below the target
    const spaceAbove = targetMeasurement.y - minTopMargin;
    const spaceBelow = SCREEN_HEIGHT - (targetMeasurement.y + targetMeasurement.height) - minBottomMargin;

    if (isBottomNavStep) {
      // For bottom navigation buttons, always position card above the spotlight
      // Calculate how much space we need and position accordingly
      const neededSpace = estimatedCardHeight + cardSpacing;
      cardTop = Math.max(
        minTopMargin,
        targetMeasurement.y - neededSpace
      );
    } else {
      // For other elements, prefer below if there's enough space
      const hasSpaceBelow = spaceBelow >= estimatedCardHeight;
      const hasSpaceAbove = spaceAbove >= estimatedCardHeight;

      if (hasSpaceBelow) {
        // Position below the target
        cardTop = targetMeasurement.y + targetMeasurement.height + cardSpacing;
      } else if (hasSpaceAbove) {
        // Position above the target
        cardTop = targetMeasurement.y - estimatedCardHeight - cardSpacing;
      } else {
        // Not enough space either way - center on screen with offset to avoid target
        const targetCenter = targetMeasurement.y + targetMeasurement.height / 2;
        if (targetCenter > SCREEN_HEIGHT / 2) {
          // Target is in lower half, put card in upper half
          cardTop = minTopMargin;
        } else {
          // Target is in upper half, put card in lower half
          cardTop = SCREEN_HEIGHT - estimatedCardHeight - minBottomMargin;
        }
      }
    }

    // Ensure card stays within screen bounds
    cardTop = Math.max(minTopMargin, Math.min(cardTop, SCREEN_HEIGHT - estimatedCardHeight - minBottomMargin));
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark Overlay with Rounded Cutout - Hidden for congratulations */}
      {!isCongratulationsStep && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: overlayOpacity },
          ]}
          pointerEvents="none"
        >
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="spotlight-mask">
                {/* White = visible (dark overlay) */}
                <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
                {/* Black = transparent (cutout hole with rounded corners) */}
                <Rect
                  x={spotlightState.x - spotlightPadding}
                  y={spotlightState.y - spotlightPadding}
                  width={spotlightState.width + spotlightPadding * 2}
                  height={spotlightState.height + spotlightPadding * 2}
                  rx={spotlightState.radius}
                  ry={spotlightState.radius}
                  fill="black"
                />
              </Mask>
            </Defs>
            {/* Dark overlay with mask applied */}
            <Rect
              x="0"
              y="0"
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              fill="rgba(0, 0, 0, 0.85)"
              mask="url(#spotlight-mask)"
            />
          </Svg>

          {/* Spotlight Border */}
          <View
            style={[
              {
                position: 'absolute',
                borderWidth: 2.5,
                borderColor: '#00C853',
                backgroundColor: 'transparent',
                shadowColor: '#00C853',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 10,
                left: spotlightState.x - spotlightPadding,
                top: spotlightState.y - spotlightPadding,
                width: spotlightState.width + spotlightPadding * 2,
                height: spotlightState.height + spotlightPadding * 2,
                borderRadius: spotlightState.radius,
              },
            ]}
            pointerEvents="none"
          />
        </Animated.View>
      )}

      {/* Step Card */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: cardMarginHorizontal,
            right: cardMarginHorizontal,
            backgroundColor: '#FFFFFF',
            borderRadius: responsive.wp(20),
            padding: responsive.wp(responsive.isSmallDevice ? 16 : 24),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: responsive.hp(8) },
            shadowOpacity: 0.2,
            shadowRadius: responsive.wp(16),
            elevation: 8,
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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: responsive.wp(responsive.isSmallDevice ? 4 : 8),
            marginBottom: responsive.hp(responsive.isSmallDevice ? 12 : 20),
          }}
          pointerEvents="none"
        >
          {TUTORIAL_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                {
                  width: responsive.wp(8),
                  height: responsive.wp(8),
                  borderRadius: responsive.wp(4),
                  backgroundColor: '#E5E7EB',
                },
                index === currentStepIndex && {
                  backgroundColor: '#00C853',
                  width: responsive.wp(24),
                },
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <View
          style={{ marginBottom: responsive.hp(responsive.isSmallDevice ? 12 : 20) }}
          pointerEvents="none"
        >
          <Text
            style={{
              fontSize: responsive.fp(responsive.isSmallDevice ? 20 : 24),
              fontWeight: '700',
              color: '#111111',
              marginBottom: responsive.hp(responsive.isSmallDevice ? 8 : 12),
            }}
          >
            {currentStep.title}
          </Text>
          <Text
            style={{
              fontSize: responsive.fp(responsive.isSmallDevice ? 14 : 16),
              lineHeight: responsive.fp(responsive.isSmallDevice ? 20 : 24),
              color: '#6B7280',
              fontWeight: '500',
            }}
          >
            {currentStep.description}
          </Text>
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#00C853',
            borderRadius: responsive.wp(14),
            paddingVertical: responsive.hp(responsive.isSmallDevice ? 12 : 16),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text
            style={{
              fontSize: responsive.fp(responsive.isSmallDevice ? 15 : 17),
              fontWeight: '700',
              color: '#FFFFFF',
            }}
          >
            {currentStepIndex === TUTORIAL_STEPS.length - 1 ? 'Got it!' : 'Next'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Skip Button - Always visible */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: responsive.hp(Platform.OS === 'ios' ? 60 : 40),
            left: 0,
            right: 0,
            alignItems: 'center',
          },
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
                  outputRange: [0, -(SCREEN_HEIGHT - responsive.hp(Platform.OS === 'ios' ? 180 : 140))],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={{
              paddingVertical: responsive.hp(12),
              paddingHorizontal: responsive.wp(24),
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: responsive.wp(24),
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: responsive.fp(responsive.isSmallDevice ? 13 : 15),
                fontWeight: '600',
                color: '#FFFFFF',
              }}
            >
              Skip Tutorial
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({});

export default HomeTutorial;
