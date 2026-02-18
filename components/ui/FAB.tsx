import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

interface FABProps {
  label?: string;
  onPress: () => void;
  icon: string;
}

export const FAB: React.FC<FABProps> = ({ label, onPress, icon }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{icon}</Text>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  icon: {
    fontSize: theme.fontSize.md,
    color: theme.colors.card,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
});

export default FAB;
