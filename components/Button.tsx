import { TechNoir } from '@/constants/DesignSystem';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = 'primary', style, textStyle, icon }: ButtonProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return TechNoir.colors.textPrimary; // White button
      case 'secondary': return 'transparent';
      case 'ghost': return 'transparent';
      default: return TechNoir.colors.textPrimary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary': return TechNoir.colors.background; // Black text on white
      case 'secondary': return TechNoir.colors.textPrimary;
      case 'ghost': return TechNoir.colors.textSecondary;
      default: return TechNoir.colors.background;
    }
  };

  const getBorder = () => {
    if (variant === 'secondary') {
        return {
            borderWidth: 1,
            borderColor: TechNoir.colors.border,
        }
    }
    return {};
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        getBorder(),
        style,
      ]}
    >
      {icon && icon}
      <Text style={[styles.text, { color: getTextColor(), marginLeft: icon ? 8 : 0 }, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999, // Pill shape
    minHeight: 56,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase', // Sleek, technical feel
  },
});
