// =====================================================
// TimeTracker - Main App Entry Point
// =====================================================

// Ten plik jest głównym punktem wejścia Expo.
// Główny layout aplikacji znajduje się w app/_layout.tsx
// Ten plik pozostaje jako fallback dla kompatybilności.

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        TimeTracker jest ładowany...
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    color: '#666',
  },
});