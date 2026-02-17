// =====================================================
// TimeTracker - Global Type Declarations
// =====================================================

// Declare module types for Expo packages
declare module 'expo-camera' {
  export * from 'expo-camera';
}

declare module 'expo-file-system' {
  export * from 'expo-file-system';
}

declare module 'expo-image-picker' {
  export * from 'expo-image-picker';
}

// Environment variables type declarations
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    EXPO_PUBLIC_OPENAI_API_KEY?: string;
    EXPO_PUBLIC_APP_VERSION: string;
    EXPO_PUBLIC_ENV: 'development' | 'production' | 'test';
  }
}

// Global types for React Native
declare global {
  // Add any additional global type declarations here
}