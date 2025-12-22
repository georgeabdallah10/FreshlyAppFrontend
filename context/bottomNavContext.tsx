/**
 * Context for sharing bottom navigation measurements and tutorial state
 * between the layout and screen components.
 */
import React, { createContext, useContext, useState, useCallback } from "react";
import type { NavButtonMeasurements } from "@/components/BottomNavigation";
import type { TargetMeasurements } from "@/components/tutorial/HomeTutorial";

interface TutorialState {
  visible: boolean;
  targetMeasurements: Record<string, TargetMeasurements>;
}

interface BottomNavContextType {
  // Bottom nav button measurements
  measurements: NavButtonMeasurements;
  setMeasurements: (measurements: NavButtonMeasurements) => void;
  // Tutorial state (controlled from main.tsx, rendered in layout)
  tutorialState: TutorialState;
  setTutorialVisible: (visible: boolean) => void;
  setTutorialMeasurements: (measurements: Record<string, TargetMeasurements>) => void;
  onTutorialComplete: () => void;
  setOnTutorialComplete: (callback: () => void) => void;
}

const BottomNavContext = createContext<BottomNavContextType | null>(null);

export const BottomNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [measurements, setMeasurementsState] = useState<NavButtonMeasurements>({});
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    visible: false,
    targetMeasurements: {},
  });
  const [completeCallback, setCompleteCallback] = useState<() => void>(() => () => {});

  const setMeasurements = useCallback((newMeasurements: NavButtonMeasurements) => {
    setMeasurementsState(prev => ({ ...prev, ...newMeasurements }));
    // Also update tutorial measurements with bottom nav buttons
    setTutorialState(prev => ({
      ...prev,
      targetMeasurements: { ...prev.targetMeasurements, ...newMeasurements },
    }));
  }, []);

  const setTutorialVisible = useCallback((visible: boolean) => {
    setTutorialState(prev => ({ ...prev, visible }));
  }, []);

  const setTutorialMeasurements = useCallback((newMeasurements: Record<string, TargetMeasurements>) => {
    setTutorialState(prev => ({
      ...prev,
      targetMeasurements: { ...prev.targetMeasurements, ...newMeasurements },
    }));
  }, []);

  const onTutorialComplete = useCallback(() => {
    completeCallback();
  }, [completeCallback]);

  const setOnTutorialComplete = useCallback((callback: () => void) => {
    setCompleteCallback(() => callback);
  }, []);

  return (
    <BottomNavContext.Provider value={{
      measurements,
      setMeasurements,
      tutorialState,
      setTutorialVisible,
      setTutorialMeasurements,
      onTutorialComplete,
      setOnTutorialComplete,
    }}>
      {children}
    </BottomNavContext.Provider>
  );
};

export const useBottomNavMeasurements = () => {
  const context = useContext(BottomNavContext);
  if (!context) {
    return { measurements: {}, setMeasurements: () => {} };
  }
  return { measurements: context.measurements, setMeasurements: context.setMeasurements };
};

export const useTutorialContext = () => {
  const context = useContext(BottomNavContext);
  if (!context) {
    return {
      tutorialState: { visible: false, targetMeasurements: {} },
      setTutorialVisible: () => {},
      setTutorialMeasurements: () => {},
      onTutorialComplete: () => {},
      setOnTutorialComplete: () => {},
    };
  }
  return {
    tutorialState: context.tutorialState,
    setTutorialVisible: context.setTutorialVisible,
    setTutorialMeasurements: context.setTutorialMeasurements,
    onTutorialComplete: context.onTutorialComplete,
    setOnTutorialComplete: context.setOnTutorialComplete,
  };
};
