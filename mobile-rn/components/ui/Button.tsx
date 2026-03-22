import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const variants = {
    primary: {
      backgroundColor: theme.colors.primary[600],
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: theme.colors.border,
      color: theme.colors.text,
    },
    danger: {
      backgroundColor: theme.colors.error,
      color: '#ffffff',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.text,
    },
  };

  const sizes = {
    sm: {
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[2],
    },
    md: {
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[2],
    },
    lg: {
      paddingHorizontal: theme.spacing[6],
      paddingVertical: theme.spacing[3],
    },
  };

  const buttonStyle = [
    styles.base,
    {
      backgroundColor: variants[variant].backgroundColor,
      ...sizes[size],
    },
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    {
      color: variants[variant].color,
      fontSize: theme.fontSize.sm,
    },
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyle}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variants[variant].color}
          style={styles.spinner}
        />
      )}
      <Text style={textStyle}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  text: {
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  spinner: {
    marginRight: 8,
  },
});
