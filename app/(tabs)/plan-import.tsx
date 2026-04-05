// =====================================================
// Plan importieren — Import planu budowy (Bauplan)
// =====================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { theme } from '../../constants/theme';
import { supabase, isSupabaseConfigured, getSupabaseErrorMessage } from '../../services/supabase';
import { BuildingPlanInsert } from '../../types/models';

export default function PlanImportScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const handleSelectImage = async () => {
    try {
      Alert.alert(
        'Wybierz źródło',
        'Skąd chcesz zaimportować plan?',
        [
          {
            text: 'Aparat',
            onPress: handleTakePhoto,
          },
          {
            text: 'Galeria',
            onPress: handlePickFromGallery,
          },
          {
            text: 'Anuluj',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Błąd wyboru źródła:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Aparat wymaga uprawnień do działania');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Błąd aparatu:', error);
      Alert.alert('Błąd', 'Nie udało się uruchomić aparatu');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Galeria wymaga uprawnień do działania');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Błąd galerii:', error);
      Alert.alert('Błąd', 'Nie udało się otworzyć galerii');
    }
  };

  const handleUpload = async () => {
    if (!imageUri) {
      Alert.alert('Błąd', 'Najpierw wybierz zdjęcie planu');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Błąd konfiguracji',
        'Brak połączenia z bazą danych.\n\nUtwórz plik .env.local z EXPO_PUBLIC_SUPABASE_URL i EXPO_PUBLIC_SUPABASE_ANON_KEY.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsUploading(true);
    try {
      // Wczytaj obraz jako base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileName = `plan_${Date.now()}.jpg`;
      const filePath = siteId ? `sites/${siteId}/${fileName}` : `plans/${fileName}`;

      // Prześlij do Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('building-plans')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Pobierz publiczny URL
      const { data: urlData } = supabase.storage
        .from('building-plans')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Zapisz w bazie danych
      if (siteId) {
        const planData: BuildingPlanInsert = {
          site_id: siteId,
          name: `Plan ${new Date().toLocaleDateString('pl-PL')}`,
          plan_url: publicUrl,
          file_size: null,
          mime_type: 'image/jpeg',
        };

        const { error: dbError } = await supabase
          .from('building_plans')
          .insert([{ ...planData, created_by: null }]);

        if (dbError) {
          console.error('Błąd zapisu do bazy:', dbError);
          // Kontynuuj — plan jest w storage nawet jeśli DB zawiedzie
        }

        queryClient.invalidateQueries({ queryKey: ['building-plans', siteId] });
      }

      Alert.alert('Sukces', 'Plan budowy został zaimportowany pomyślnie', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Błąd importu planu:', error);
      const message = getSupabaseErrorMessage(error);
      Alert.alert('Błąd', message, [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Spróbuj ponownie', onPress: handleUpload },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Podgląd zdjęcia lub placeholder */}
        <View style={styles.previewContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="document-outline" size={64} color={theme.colors.muted} />
              <Text style={styles.placeholderText}>Brak wybranego planu</Text>
              <Text style={styles.placeholderSubtext}>
                Zrób zdjęcie lub wybierz z galerii
              </Text>
            </View>
          )}
        </View>

        {/* Ostrzeżenie o braku konfiguracji */}
        {!isSupabaseConfigured() && (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color="#92400e" />
            <Text style={styles.warningText}>
              Brak konfiguracji bazy danych. Zdjęcie zostanie zrobione, ale nie można go przesłać bez pliku .env.local.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Przyciski akcji */}
      <View style={styles.actionContainer}>
        {imageUri && (
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleSelectImage}
            disabled={isUploading}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.retakeButtonText}>Zmień zdjęcie</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.importButton,
            imageUri ? styles.importButtonActive : styles.importButtonPrimary,
            isUploading && styles.disabledButton,
          ]}
          onPress={imageUri ? handleUpload : handleSelectImage}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.card} />
              <Text style={styles.importButtonText}>Przesyłanie...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={imageUri ? 'cloud-upload-outline' : 'camera-outline'}
                size={22}
                color={theme.colors.card}
              />
              <Text style={styles.importButtonText}>
                {imageUri ? 'Prześlij plan' : 'Plan importieren'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Pomocnicza funkcja do dekodowania base64 do Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  previewContainer: {
    flex: 1,
    minHeight: 400,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewImage: {
    flex: 1,
    width: '100%',
    minHeight: 400,
  },
  previewPlaceholder: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  placeholderText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  placeholderSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    backgroundColor: '#fef3c7',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: '#92400e',
    lineHeight: 18,
  },
  actionContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  retakeButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
  },
  importButtonPrimary: {
    backgroundColor: theme.colors.accent,
  },
  importButtonActive: {
    backgroundColor: theme.colors.success,
  },
  importButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.card,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
