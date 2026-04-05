// =====================================================
// Supabase Client Configuration
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Brak zmiennych środowiskowych Supabase. ' +
    'Utwórz plik .env.local z EXPO_PUBLIC_SUPABASE_URL i EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(
  supabaseUrl ?? PLACEHOLDER_URL,
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Sprawdza czy Supabase jest poprawnie skonfigurowany.
 * Gdy brak .env.local, klient używa placeholder URL — wszystkie requesty zakończą się błędem.
 */
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && supabaseUrl !== PLACEHOLDER_URL;
}

/**
 * Zwraca czytelny komunikat błędu zamiast surowego "Network request failed".
 */
export function getSupabaseErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (!isSupabaseConfigured()) {
    return 'Brak konfiguracji bazy danych. Utwórz plik .env.local z EXPO_PUBLIC_SUPABASE_URL i EXPO_PUBLIC_SUPABASE_ANON_KEY.';
  }

  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'Błąd połączenia z serwerem. Sprawdź połączenie z internetem i konfigurację Supabase.';
  }

  return msg;
}
