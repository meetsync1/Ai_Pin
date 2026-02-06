import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.select({ android: 'sans-serif', ios: 'System' }), // Clean sans-serif
    letterSpacing: 0.5,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '300', // Thinner, more elegant title
    lineHeight: 40,
    letterSpacing: -1, // Tight tracking for headers
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500', // Medium weight
    letterSpacing: 0.5,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#FFFFFF', // White for links
    textDecorationLine: 'underline',
  },
});
