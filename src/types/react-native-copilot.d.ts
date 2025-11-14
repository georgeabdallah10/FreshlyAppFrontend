declare module '@okgrow/react-native-copilot' {
  import { ComponentType } from 'react';
  import { ViewStyle } from 'react-native';

  export interface CopilotEvents {
    on(event: string, callback: () => void): void;
    off?(event: string, callback: () => void): void;
  }

  export interface CopilotProps {
    start?: () => void;
    copilotEvents?: CopilotEvents;
    visible?: boolean;
  }

  export interface CopilotOptions {
    overlay?: 'svg' | 'view';
    animated?: boolean;
    tooltipStyle?: ViewStyle;
    tooltipComponent?: ComponentType<any>;
    stepNumberComponent?: ComponentType<{ isFirstStep?: boolean; isLastStep?: boolean }>;
    labels?: {
      skip?: string;
      previous?: string;
      next?: string;
      finish?: string;
    };
    backdropColor?: string;
    androidStatusBarVisible?: boolean;
    verticalOffset?: number;
  }

  export function copilot<P = {}>(
    options?: CopilotOptions
  ): (component: ComponentType<P & CopilotProps>) => ComponentType<P>;

   export function walkthroughable<P>(
    component: ComponentType<P>
  ): ComponentType<P>;

  export const CopilotStep: ComponentType<{
    text: string;
    order: number;
    name: string;
  }>;
}
