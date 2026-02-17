// =====================================================
// Tabs Layout - Bottom Tab Navigation
// =====================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
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