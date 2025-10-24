
import React from 'react';
import { Text, TextStyle } from 'react-native';

const ICONS = {
  user: '👤',
  settings: '⚙️',
  bell: '🔔',
  history: '📄',
  help: '❓',
  info: 'ℹ️',
  logout: '🚪',
  back: '←',
  edit: '✏️',
  check: '✓',
  card: '💳',
  crown: '👑',
  lock: '🔒',
  phone: '📱',
  email: '✉️',
  location: '📍',
  camera: '📷',
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName | string; // allows unknown names; falls back to bullet
  size?: number;
  color?: string;
  style?: TextStyle;
};

const Icon: React.FC<Props> = ({ name, size = 24, color = '#666', style }) => {
  const glyph = (ICONS as Record<string, string>)[name] ?? '•';
  return <Text style={[{ fontSize: size, color }, style]}>{glyph}</Text>;
};

export default Icon;