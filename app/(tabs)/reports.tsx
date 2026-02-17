// =====================================================
// Reports Screen - Export and Analytics
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  RadioButton,
  Text,
  Divider,
  Chip,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';

import {
  generateExcelReport,
  generatePdfReport,
  shareReport,
  printReport,
  getSavedReports,
  deleteReport,
  ExportOptions,
} from '../../services/export';
import { useEmployees } from '../../hooks/useEmployees';
import { useTimeEntries } from '../../hooks/useTimeEntries';

// Types
type ExportFormat = 'excel' | 'pdf';
type DateRangeType = 'thisMonth' | 'lastMonth' | 'custom';

// =====================================================
// Main Component
// =====================================================

export default function ReportsScreen() {
  // State
  const[dateRangeType, setDateRangeType] = useState<DateRangeType>('thisMonth');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [savedReports, setSavedReports] = useState<Array<{
    uri: string;
    name: string;
    size: number;
    modified: Date;
  }>>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { data: timeEntries = [], isLoading: isLoadingEntries } = useTimeEntries({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  });

  // Effects
  useEffect(() => {
    loadSavedReports();
    updateDateRange();
  }, [dateRangeType]);

  // =====================================================
  // Date Range Handlers
  // =====================================================

  const updateDateRange = () => {
    const now = new Date();
    
    switch (dateRangeType) {
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      // custom pozostawia obecne daty
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      setDateRangeType('custom');
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setDateRangeType('custom');
    }
  };

  // =====================================================
  // Employee Selection
  // =====================================================

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map(emp => emp.id));
  };

  const clearEmployeeSelection = () => {
    setSelectedEmployees([]);
  };

  // =====================================================
  // Export Functions
  // =====================================================

  const handleExport = async () => {
    if (startDate > endDate) {
      Alert.alert('Błąd', 'Data początkowa nie może być późniejsza niż data końcowa');
      return;
    }

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        startDate,
        endDate,
        employeeIds: selectedEmployees.length > 0 ? selectedEmployees : undefined,
        includeNotes,
        format: exportFormat,
      };

      let fileUri: string;
      
      if (exportFormat === 'excel') {
        fileUri = await generateExcelReport(options);
      } else {
        fileUri = await generatePdfReport(options);
      }

      // Pokaż opcje po wygenerowaniu
      Alert.alert(
        'Raport wygenerowany',
        'Co chcesz zrobić z raportem?',
        [
          {
            text: 'Udostępnij',
            onPress: () => shareReport(fileUri),
          },
          {
            text: 'Drukuj (PDF)',
            onPress: () => exportFormat === 'pdf' && printReport(fileUri),
            style: exportFormat === 'pdf' ? 'default' : 'disabled',
          },
          {
            text: 'Zapisz',
            onPress: () => {
              Alert.alert('Sukces', 'Raport został zapisany');
              loadSavedReports();
            },
          },
          {
            text: 'Anuluj',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Błąd',
        error instanceof Error ? error.message : 'Nie udało się wygenerować raportu'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // =====================================================
  // Saved Reports Management
  // =====================================================

  const loadSavedReports = async () => {
    setIsLoadingReports(true);
    try {
      const reports = await getSavedReports();
      setSavedReports(reports);
    } catch (error) {
      console.error('Błąd ładowania zapisanych raportów:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleShareReport = async (uri: string) => {
    try {
      await shareReport(uri);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się udostępnić raportu');
    }
  };

  const handleDeleteReport = async (uri: string, name: string) => {
    Alert.alert(
      'Usuń raport',
      `Czy na pewno chcesz usunąć raport "${name}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReport(uri);
              loadSavedReports();
              Alert.alert('Sukces', 'Raport został usunięty');
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć raportu');
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // Statistics Calculation
  // =====================================================

  const calculateStats = () => {
    const filteredEntries = selectedEmployees.length > 0
      ? timeEntries.filter(entry => selectedEmployees.includes(entry.employee_id))
      : timeEntries;

    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const workHours = filteredEntries
      .filter(entry => entry.status === 'work')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const sickHours = filteredEntries
      .filter(entry => entry.status === 'sick')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const vacationHours = filteredEntries
      .filter(entry => entry.status === 'vacation')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const fzaHours = filteredEntries
      .filter(entry => entry.status === 'fza')
      .reduce((sum, entry) => sum + entry.hours, 0);

    return {
      totalHours: totalHours.toFixed(2),
      workHours: workHours.toFixed(2),
      sickHours: sickHours.toFixed(2),
      vacationHours: vacationHours.toFixed(2),
      fzaHours: fzaHours.toFixed(2),
      entriesCount: filteredEntries.length,
      employeesCount: new Set(filteredEntries.map(entry => entry.employee_id)).size,
    };
  };

  const stats = calculateStats();

  // =====================================================
  // Render
  // =====================================================

  if (isLoadingEmployees || isLoadingEntries) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Ładowanie danych...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Nagłówek */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>Raporty i eksport</Title>
            <Paragraph>
              Generuj raporty czasu pracy w formacie Excel lub PDF
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Zakres dat */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Zakres dat</Title>
            
            <RadioButton.Group
              onValueChange={value => setDateRangeType(value as DateRangeType)}
              value={dateRangeType}
            >
              <View style={styles.radioRow}>
                <RadioButton value="thisMonth" />
                <Text>Bieżący miesiąc</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton value="lastMonth" />
                <Text>Poprzedni miesiąc</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton value="custom" />
                <Text>Niestandardowy</Text>
              </View>
            </RadioButton.Group>

            <Divider style={styles.divider} />

            <View style={styles.dateRow}>
              <View style={styles.dateInput}>
                <Text>Od:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {format(startDate, 'dd.MM.yyyy', { locale: pl })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateInput}>
                <Text>Do:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {format(endDate, 'dd.MM.yyyy', { locale: pl })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onStartDateChange}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={onEndDateChange}
              />
            )}
          </Card.Content>
        </Card>

        {/* Pracownicy */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Pracownicy</Title>
              <View style={styles.employeeActions}>
                <Button mode="outlined" onPress={selectAllEmployees} compact>
                  Wszyscy
                </Button>
                <Button mode="outlined" onPress={clearEmployeeSelection} compact>
                  Wyczyść
                </Button>
              </View>
            </View>

            <Paragraph style={styles.hint}>
              {selectedEmployees.length === 0
                ? 'Wszyscy pracownicy (wybierz konkretnych jeśli potrzebujesz)'
                : `Wybrano: ${selectedEmployees.length} pracowników`}
            </Paragraph>

            <ScrollView horizontal style={styles.employeeScroll}>
              <View style={styles.employeeChips}>
                {employees.map(employee => (
                  <Chip
                    key={employee.id}
                    selected={selectedEmployees.includes(employee.id)}
                    onPress={() => toggleEmployeeSelection(employee.id)}
                    style={styles.employeeChip}
                  >
                    {employee.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Opcje eksportu */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Opcje eksportu</Title>
            
            <RadioButton.Group
              onValueChange={value => setExportFormat(value as ExportFormat)}
              value={exportFormat}
            >
              <View style={styles.radioRow}>
                <RadioButton value="excel" />
                <Text>Excel (.xlsx) - edytowalny</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton value="pdf" />
                <Text>PDF (.pdf) - do druku</Text>
              </View>
            </RadioButton.Group>

            <Divider style={styles.divider} />

            <View style={styles.radioRow}>
              <RadioButton
                value={includeNotes ? 'checked' : 'unchecked'}
                status={includeNotes ? 'checked' : 'unchecked'}
                onPress={() => setIncludeNotes(!includeNotes)}
              />
              <Text>Uwzględnij notatki</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Statystyki */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Podsumowanie</Title>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Łącznie godzin</Text>
                <Text style={styles.statValue}>{stats.totalHours}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Praca</Text>
                <Text style={styles.statValue}>{stats.workHours}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Chorobowe</Text>
                <Text style={styles.statValue}>{stats.sickHours}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Urlop</Text>
                <Text style={styles.statValue}>{stats.vacationHours}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>FZA</Text>
                <Text style={styles.statValue}>{stats.fzaHours}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Wpisy</Text>
                <Text style={styles.statValue}>{stats.entriesCount}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Przycisk eksportu */}
        <Button
          mode="contained"
          onPress={handleExport}
          loading={isExporting}
          disabled={isExporting}
          style={styles.exportButton}
          icon="file-export"
        >
          {isExporting ? 'Generowanie...' : 'Generuj raport'}
        </Button>

        {/* Zapisane raporty */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Zapisane raporty</Title>
              <Button
                icon="refresh"
                mode="text"
                onPress={loadSavedReports}
                loading={isLoadingReports}
              >
                Odśwież
              </Button>
            </View>

            {isLoadingReports ? (
              <ActivityIndicator style={styles.reportsLoading} />
            ) : savedReports.length === 0 ? (
              <Paragraph style={styles.emptyText}>
                Brak zapisanych raportów
              </Paragraph>
            ) : (
              savedReports.map(report => (
                <View key={report.uri} style={styles.reportItem}>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportName}>{report.name}</Text>
                    <Text style={styles.reportDetails}>
                      {format(report.modified, 'dd.MM.yyyy HH:mm')} •{' '}
                      {(report.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                  <View style={styles.reportActions}>
                    <IconButton
                      icon="share-variant"
                      size={20}
                      onPress={() => handleShareReport(report.uri)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteReport(report.uri, report.name)}
                    />
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// Styles
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: '#2196f3',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  divider: {
    marginVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    marginTop: 4,
    backgroundColor: 'white',
  },
  dateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  employeeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  employeeScroll: {
    maxHeight: 120,
  },
  employeeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  employeeChip: {
    margin: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  exportButton: {
    marginVertical: 24,
    paddingVertical: 10,
  },
  reportsLoading: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  reportDetails: {
    fontSize: 12,
    color: '#666',
  },
  reportActions: {
    flexDirection: 'row',
  },
});