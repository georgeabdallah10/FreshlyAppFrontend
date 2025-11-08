declare module '@okgrow/react-native-copilot' {
  import { ComponentType } from 'react';
  import { ViewStyle } from 'react-native';

  export interface CopilotProps {
    start?: () => void;
    copilotEvents?: {
      on(event: string, callback: () => void): void;
    };
    visible?: boolean;
  }

  export function copilot<P>(
    options?: {
      overlay?: 'svg' | 'view';
      animated?: boolean;
      tooltipStyle?: ViewStyle;
      stepNumberComponent?: ComponentType<{ isFirstStep?: boolean; isLastStep?: boolean }>;
      labels?: {
        skip?: string;
        previous?: string;
        next?: string;
        finish?: string;
      };
    }
  ): (component: ComponentType<P>) => ComponentType<P & CopilotProps>;

  export function walkthroughable<P>(
    component: ComponentType<P>
  ): ComponentType<P>;

  export const CopilotStep: ComponentType<{
    text: string;
    order: number;
    name: string;
  }>;
}