// =====================================================
// TimeTracker - Main App Entry Point
// =====================================================

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { COLORS } from '@/utils/constants';

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minut
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Custom theme dla React Native Paper
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryLight,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
  },
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>⏱️ TimeTracker</Text>
            <Text style={styles.subtitle}>Zarządzanie czasem pracy</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.info}>
              ✅ Konfiguracja środowiska zakończona!
            </Text>
            <Text style={styles.details}>
              • React Query: Skonfigurowany{'\n'}
              • React Native Paper: Skonfigurowany{'\n'}
              • Supabase Client: Gotowy{'\n'}
              • TypeScript Types: Zdefiniowane{'\n'}
              • Utils: Utworzone
            </Text>
            <Text style={styles.nextStep}>
              Następny krok: Implementacja ekranów i nawigacji
            </Text>
          </View>
          
          <StatusBar style="auto" />
        </View>
      </PaperProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  content: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  info: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 16,
  },
  details: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  nextStep: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
