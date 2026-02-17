// =====================================================
// Scanner Screen - Document OCR Scanning (Simplified)
// =====================================================

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Divider,
  Chip,
  IconButton,
  Modal,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { OCRResult } from '../../services/ocr';
import {
  useScanDocument,
  useProcessImage,
  useDocumentHistory,
  useDeleteDocument,
} from '../../hooks/useOCR';
import { Document } from '../../types/models';

// Types
type ScanSource = 'camera' | 'gallery';
type ProcessingStatus = 'idle' | 'scanning' | 'completed' | 'error';

// =====================================================
// Main Component
// =====================================================

export default function ScannerScreen() {
  // State
  const[scanSource, setScanSource] = useState<ScanSource>('camera');
  const [useOpenAI, setUseOpenAI] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Hooks
  const { mutateAsync: scanDocument, isPending: isScanning } = useScanDocument();
  const { mutateAsync: processImage, isPending: isProcessingImage } = useProcessImage();
  const { data: documents = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useDocumentHistory();
  const { mutateAsync: deleteDocument } = useDeleteDocument();

  // =====================================================
  // Camera & Gallery Functions
  // =====================================================

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Aparat wymaga uprawnień do działania');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await handleProcessImage(uri);
      }
    } catch (error) {
      console.error('Błąd przechwytywania zdjęcia:', error);
      Alert.alert('Błąd', 'Nie udało się przechwycić zdjęcia');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Galeria wymaga uprawnień do działania');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await handleProcessImage(uri);
      }
    } catch (error) {
      console.error('Błąd wybierania zdjęcia:', error);
      Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia');
    }
  };

  // =====================================================
  // OCR Processing
  // =====================================================

  const handleProcessImage = async (uri: string) => {
    setStatus('scanning');
    
    try {
      const options = {
        source: scanSource,
        useOpenAI,
        language: 'pol' as const,
      };

      const result = await processImage(uri);
      
      setOcrResult(result);
      setStatus('completed');
      setShowResultModal(true);
      
      // Odśwież historię
      refetchHistory();
    } catch (error) {
      console.error('Błąd przetwarzania obrazu:', error);
      setStatus('error');
      Alert.alert(
        'Błąd',
        error instanceof Error ? error.message : 'Nie udało się przetworzyć dokumentu'
      );
    }
  };

  const handleScanNew = () => {
    setImageUri(null);
    setOcrResult(null);
    setStatus('idle');
    setShowResultModal(false);
  };

  // =====================================================
  // Document History Management
  // =====================================================

  const handleViewDocument = (document: Document) => {
    if (document.ocr_text) {
      setOcrResult({
        text: document.ocr_text,
        confidence: 0.9,
        data: document.ocr_data || {},
        processedData: document.ocr_data as any,
      });
      setShowResultModal(true);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    Alert.alert(
      'Usuń dokument',
      'Czy na pewno chcesz usunąć ten dokument?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(documentId);
              refetchHistory();
              Alert.alert('Sukces', 'Dokument został usunięty');
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć dokumentu');
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // Render OCR Result Modal
  // =====================================================

  const renderResultModal = () => {
    if (!showResultModal || !ocrResult) return null;

    return (
      <Portal>
        <Modal
          visible={showResultModal}
          onDismiss={() => setShowResultModal(false)}
          contentContainerStyle={styles.resultModal}
        >
          <ScrollView>
            <Card style={styles.resultCard}>
              <Card.Content>
                <View style={styles.modalHeader}>
                  <Title style={styles.modalTitle}>Wynik skanowania</Title>
                  <IconButton
                    icon="close"
                    size={24}
                    onPress={() => setShowResultModal(false)}
                  />
                </View>

                <Divider style={styles.divider} />

                {/* Przetworzone dane */}
                {ocrResult.processedData && (
                  <>
                    <Title style={styles.sectionTitle}>Wydobyte dane</Title>
                    
                    {ocrResult.processedData.supplierName && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Dostawca:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.supplierName}
                        </Text>
                      </View>
                    )}

                    {ocrResult.processedData.invoiceNumber && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Numer faktury:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.invoiceNumber}
                        </Text>
                      </View>
                    )}

                    {ocrResult.processedData.date && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Data:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.date}
                        </Text>
                      </View>
                    )}

                    {ocrResult.processedData.amount && (
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Kwota:</Text>
                        <Text style={styles.dataValue}>
                          {ocrResult.processedData.amount}
                        </Text>
                      </View>
                    )}

                    <Divider style={styles.divider} />
                  </>
                )}

                {/* Surowy tekst */}
                <Title style={styles.sectionTitle}>Rozpoznany tekst</Title>
                <Card style={styles.textCard}>
                  <Card.Content>
                    <ScrollView style={styles.textScroll}>
                      <Text style={styles.ocrText}>{ocrResult.text}</Text>
                    </ScrollView>
                  </Card.Content>
                </Card>

                <View style={styles.statsRow}>
                  <Chip icon="chart-line" style={styles.confidenceChip}>
                    Dokładność: {(ocrResult.confidence * 100).toFixed(1)}%
                  </Chip>
                </View>

                <Divider style={styles.divider} />

                {/* Akcje */}
                <View style={styles.modalActions}>
                  <Button
                    mode="outlined"
                    onPress={handleScanNew}
                    style={styles.actionButton}
                  >
                    Nowe skanowanie
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => setShowResultModal(false)}
                    style={styles.actionButton}
                  >
                    Zamknij
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  // =====================================================
  // Main Render
  // =====================================================

  const isProcessing = isScanning || isProcessingImage;
  const processingStatus = isProcessing ? 'scanning' : status;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Nagłówek */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>Skaner dokumentów</Title>
            <Paragraph>
              Skanuj faktury i dokumenty dostaw za pomocą OCR
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Status skanowania */}
        {processingStatus !== 'idle' && (
          <Card style={styles.statusCard}>
            <Card.Content style={styles.statusContent}>
              <ActivityIndicator
                size="small"
                color="#2196f3"
                animating={processingStatus === 'scanning'}
              />
              <Text style={styles.statusText}>
                {processingStatus === 'scanning' && 'Skanowanie dokumentu...'}
                {processingStatus === 'completed' && 'Skanowanie zakończone!'}
                {processingStatus === 'error' && 'Błąd skanowania'}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Wybór źródła */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Źródło dokumentu</Title>
            
            <View style={styles.sourceButtons}>
              <Button
                mode={scanSource === 'camera' ? 'contained' : 'outlined'}
                onPress={() => setScanSource('camera')}
                style={styles.sourceButton}
                icon="camera"
                disabled={isProcessing}
              >
                Aparat
              </Button>
              
              <Button
                mode={scanSource === 'gallery' ? 'contained' : 'outlined'}
                onPress={() => setScanSource('gallery')}
                style={styles.sourceButton}
                icon="image"
                disabled={isProcessing}
              >
                Galeria
              </Button>
            </View>

            <Divider style={styles.divider} />

            {/* Opcje OCR */}
            <Title style={styles.sectionTitle}>Opcje OCR</Title>
            
            <View style={styles.optionRow}>
              <Chip
                selected={useOpenAI}
                onPress={() => !isProcessing && setUseOpenAI(!useOpenAI)}
                icon={useOpenAI ? 'check' : 'robot'}
                style={styles.optionChip}
                disabled={isProcessing}
              >
                {useOpenAI ? 'OpenAI (zaawansowane)' : 'Tesseract (podstawowe)'}
              </Chip>
              
              {useOpenAI && (
                <Chip icon="information" style={styles.infoChip}>
                  Wymaga klucza API
                </Chip>
              )}
            </View>

            <Paragraph style={styles.hint}>
              {useOpenAI
                ? 'OpenAI Vision API zapewnia lepszą dokładność, ale wymaga klucza API'
                : 'Tesseract działa offline, ale może być mniej dokładny'}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Przyciski akcji */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Skanuj dokument</Title>
            
            <View style={styles.actionButtons}>
              {scanSource === 'camera' ? (
                <Button
                  mode="contained"
                  onPress={handleTakePhoto}
                  style={styles.scanButton}
                  icon="camera"
                  disabled={isProcessing}
                  loading={isProcessing}
                >
                  {isProcessing ? 'Przetwarzanie...' : 'Zrób zdjęcie'}
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={handlePickFromGallery}
                  style={styles.scanButton}
                  icon="image"
                  disabled={isProcessing}
                  loading={isProcessing}
                >
                  {isProcessing ? 'Przetwarzanie...' : 'Wybierz z galerii'}
                </Button>
              )}
            </View>

            {imageUri && (
              <>
                <Divider style={styles.divider} />
                <Title style={styles.sectionTitle}>Podgląd</Title>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              </>
            )}
          </Card.Content>
        </Card>

        {/* Historia dokumentów */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Ostatnie dokumenty</Title>
              <Button
                icon="refresh"
                mode="text"
                onPress={() => refetchHistory()}
                loading={isLoadingHistory}
                disabled={isProcessing}
              >
                Odśwież
              </Button>
            </View>

            {isLoadingHistory ? (
              <ActivityIndicator style={styles.historyLoading} />
            ) : documents.length === 0 ? (
              <Paragraph style={styles.emptyText}>
                Brak zeskanowanych dokumentów
              </Paragraph>
            ) : (
              documents.map((document: Document) => (
                <View key={document.id} style={styles.documentItem}>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>
                      {document.file_name}
                    </Text>
                    <Text style={styles.documentDetails}>
                      {new Date(document.created_at).toLocaleDateString('pl-PL')} •{' '}
                      {document.status}
                    </Text>
                  </View>
                  <View style={styles.documentActions}>
                    <IconButton
                      icon="eye"
                      size={20}
                      onPress={() => handleViewDocument(document)}
                      disabled={isProcessing}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteDocument(document.id)}
                      disabled={isProcessing}
                    />
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Modal wyników */}
      {renderResultModal()}
    </SafeAreaView>
  );
}

// =====================================================
// Styles
// =====================================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: '#4caf50',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#1976d2',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  sourceButton: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionChip: {
    flex: 1,
  },
  infoChip: {
    backgroundColor: '#fff3e0',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    alignItems: 'center',
  },
  scanButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  historyLoading: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  documentDetails: {
    fontSize: 12,
    color: '#666',
  },
  documentActions: {
    flexDirection: 'row',
  },
  // Result Modal
  resultModal: {
    flex: 1,
    margin: 20,
    marginTop: 60,
    marginBottom: 40,
  },
  resultCard: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dataLabel: {
    fontWeight: '600',
    width: 120,
    color: '#333',
  },
  dataValue: {
    flex: 1,
    color: '#555',
  },
  textCard: {
    marginVertical: 12,
    maxHeight: 200,
  },
  textScroll: {
    maxHeight: 180,
  },
  ocrText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#333',
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
  },
  confidenceChip: {
    backgroundColor: '#e8f5e9',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
  },
});