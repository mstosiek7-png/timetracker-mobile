// =====================================================
// Tabs Layout - Bottom Tab Navigation
// =====================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: theme.colors.accent,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Dashboard Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
          headerTitle: 'TimeTracker - Dashboard',
        }}
      />

      {/* Monthly View Tab */}
      <Tabs.Screen
        name="monthly"
        options={{
          title: 'Miesięczny',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" size={size} color={color} />
          ),
          headerTitle: 'Widok Miesięczny',
        }}
      />

      {/* Scanner Tab */}
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Skaner',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="camera" size={size} color={color} />
          ),
          headerTitle: 'Skaner Dokumentów',
        }}
      />

      {/* Calculator Tab */}
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Kalkulator',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
          headerTitle: 'Kalkulator Asfaltu',
        }}
      />

      {/* Reports Tab */}
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Raporty',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-chart" size={size} color={color} />
          ),
          headerTitle: 'Raporty i Eksport',
        }}
      />
    </Tabs>
  );
}
