import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { TextStyle } from 'react-native';

const ICONS = {
  user: 'person-outline',
  settings: 'construct-outline',
  bell: 'notifications-outline',
  history: 'time-outline',
  help: 'chatbubble-outline',
  info: 'information',
  logout: 'exit-outline',
  back: 'arrow-back',
  edit: 'create-outline',
  check: 'checkmark',
  card: 'receipt',
  crown: 'star',
  lock: 'key-outline',
  phone: 'call-outline',
  email: 'mail-outline',
  location: 'location-outline',
  camera: 'camera-outline',
  trash: 'trash-outline',
  refresh: 'refresh',
  gallery: 'image-outline',
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName | string; // allows unknown names; falls back to bullet
  size?: number;
  color?: string;
  style?: TextStyle;
};

const Icon: React.FC<Props> = ({ name, size = 24, color = '#666', style }) => {
  const iconName = (ICONS as Record<string, string>)[name] ?? 'ellipse';
  return (
    <Ionicons
      name={iconName as any}
      size={size}
      color={color}
      style={style as any}
    />
  );
};

export default Icon;
