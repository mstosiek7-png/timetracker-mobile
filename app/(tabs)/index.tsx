// =====================================================
// Dashboard Screen - TimeTracker Main Dashboard
// =====================================================

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Text,
  Divider,
  ActivityIndicator,
  Chip,
  FAB,
  Modal,
  Portal,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { useEmployees } from '../../hooks/useEmployees';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { useTimeEntryStats } from '../../hooks/useTimeEntries';
import TimeEntryForm from '../../components/time/TimeEntryForm';
import BulkTimeEntryModal from '../../components/time/BulkTimeEntryModal';
import { useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '../../hooks/useTimeEntries';
import { TimeEntry, TimeEntryInsert } from '../../types/models';

// =====================================================
// Main Component
// =====================================================

export default function DashboardScreen() {
  // State
  const [refreshing, setRefreshing] = useState(false);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [showBulkEntryModal, setShowBulkEntryModal] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | null>(null);

  // Hooks
  const { 
    data: employees = [], 
    isLoading: isLoadingEmployees,
    error: employeesError,
    refetch: refetchEmployees 
  } = useEmployees();

  const { 
    data: timeEntries = [], 
    isLoading: isLoadingEntries,
    error: timeEntriesError,
    refetch: refetchEntries 
  } = useTimeEntries();

  const { data: stats } = useTimeEntryStats();
  const { mutateAsync: createTimeEntry, isPending: isCreating } = useCreateTimeEntry();
  const { mutateAsync: updateTimeEntry, isPending: isUpdating } = useUpdateTimeEntry();
  const { mutateAsync: deleteTimeEntry } = useDeleteTimeEntry();

  // =====================================================
  // Handlers
// =====================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchEmployees(), refetchEntries()]);
    } catch (error) {
      console.error('Błąd odświeżania danych:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTimeEntrySubmit = async (data: TimeEntryInsert | TimeEntry) => {
    try {
      if (selectedTimeEntry) {
        // Usuń id z data, ponieważ przekazujemy je osobno
        const { id, ...updateData } = data as TimeEntry;
        await updateTimeEntry({ id: selectedTimeEntry.id, ...updateData });
        Alert.alert('Sukces', 'Wpis czasu pracy został zaktualizowany');
      } else {
        await createTimeEntry(data as TimeEntryInsert);
        Alert.alert('Sukces', 'Nowy wpis czasu pracy został dodany');
      }
      setShowTimeEntryModal(false);
      setSelectedTimeEntry(null);
    } catch (error) {
      Alert.alert('Błąd', error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania');
    }
  };

  const handleTimeEntryCancel = () => {
    setShowTimeEntryModal(false);
    setSelectedTimeEntry(null);
  };

  const handleEditTimeEntry = (timeEntry: TimeEntry) => {
    setSelectedTimeEntry(timeEntry);
    setShowTimeEntryModal(true);
  };

  const handleDeleteTimeEntry = (timeEntry: TimeEntry) => {
    Alert.alert(
      'Usuń wpis',
      `Czy na pewno chcesz usunąć wpis z ${format(new Date(timeEntry.date), 'dd.MM.yyyy')}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTimeEntry(timeEntry.id);
              Alert.alert('Sukces', 'Wpis został usunięty');
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się usunąć wpisu');
            }
          },
        },
      ]
    );
  };

  const handleBulkEntrySuccess = () => {
    setShowBulkEntryModal(false);
    Alert.alert('Sukces', 'Zbiorcze wpisy zostały dodane');
  };

  // =====================================================
  // Render
// =====================================================

  const isLoading = isLoadingEmployees || isLoadingEntries;
  const hasError = employeesError || timeEntriesError;

  if (isLoading && !hasError) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Ładowanie dashboardu...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Błąd ładowania danych</Text>
        <Text style={styles.errorText}>
          {employeesError?.message || timeEntriesError?.message || 'Wystąpił nieoczekiwany błąd'}
        </Text>
        <Button 
          mode="contained" 
          onPress={() => {
            if (employeesError) refetchEmployees();
            if (timeEntriesError) refetchEntries();
          }}
          style={styles.retryButton}
          icon="refresh"
        >
          Spróbuj ponownie
        </Button>
      </View>
    );
  }

  const activeEmployees = employees.filter(emp => emp.active).length;
  const recentEntries = timeEntries.slice(0, 5);
  const today = format(new Date(), 'dd.MM.yyyy', { locale: pl });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Nagłówek */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>TimeTracker</Title>
            <Paragraph>
              Zarządzanie czasem pracy • {today}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Statystyki */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Podsumowanie</Title>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Pracownicy</Text>
                <Text style={styles.statValue}>{activeEmployees}</Text>
                <Text style={styles.statSubtext}>Aktywni</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Wpisy</Text>
                <Text style={styles.statValue}>{timeEntries.length}</Text>
                <Text style={styles.statSubtext}>Ostatnie 30 dni</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Godziny</Text>
                <Text style={styles.statValue}>
                  {stats?.totalHours?.toFixed(1) || '0.0'}
                </Text>
                <Text style={styles.statSubtext}>Łącznie</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailedStats}>
              <Chip mode="outlined" style={styles.workChip}>
                Praca: {stats?.workHours?.toFixed(1) || '0.0'}h
              </Chip>
              <Chip mode="outlined" style={styles.sickChip}>
                Chorobowe: {stats?.sickHours?.toFixed(1) || '0.0'}h
              </Chip>
              <Chip mode="outlined" style={styles.vacationChip}>
                Urlopy: {stats?.vacationHours?.toFixed(1) || '0.0'}h
              </Chip>
              <Chip mode="outlined" style={styles.fzaChip}>
                FZA: {stats?.fzaHours?.toFixed(1) || '0.0'}h
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Szybkie akcje */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Szybkie akcje</Title>
            
            <View style={styles.quickActions}>
              <Button
                mode="contained"
                onPress={() => setShowTimeEntryModal(true)}
                style={styles.actionButton}
                icon="plus"
              >
                Dodaj wpis
              </Button>
              <Button
                mode="contained"
                onPress={() => setShowBulkEntryModal(true)}
                style={styles.actionButton}
                icon="account-multiple-plus"
              >
                Zbiorczo
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Ostatnie wpisy */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Ostatnie wpisy</Title>
              <Button
                mode="text"
                onPress={() => {/* Można dodać nawigację do listy wszystkich wpisów */}}
                compact
              >
                Zobacz wszystkie
              </Button>
            </View>

            {recentEntries.length === 0 ? (
              <Paragraph style={styles.emptyText}>
                Brak ostatnich wpisów
              </Paragraph>
            ) : (
              <View style={styles.entriesList}>
                {recentEntries.map(entry => {
                  const employee = employees.find(emp => emp.id === entry.employee_id);
                  return (
                    <View key={entry.id} style={styles.entryItem}>
                      <View style={styles.entryInfo}>
                        <Text style={styles.entryDate}>
                          {format(new Date(entry.date), 'dd.MM.yyyy')}
                        </Text>
                        <Text style={styles.entryEmployee}>
                          {employee?.name || 'Nieznany pracownik'}
                        </Text>
                        <View style={styles.entryDetails}>
                          <Chip
                            mode="outlined"
                            style={styles.entryStatus}
                            compact
                          >
                            {entry.hours}h • {getStatusLabel(entry.status)}
                          </Chip>
                          {entry.notes && (
                            <Text style={styles.entryNotes} numberOfLines={1}>
                              {entry.notes}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.entryActions}>
                        <IconButton
                          icon="pencil"
                          size={16}
                          onPress={() => handleEditTimeEntry(entry)}
                          mode="contained-tonal"
                        />
                        <IconButton
                          icon="delete"
                          size={16}
                          onPress={() => handleDeleteTimeEntry(entry)}
                          mode="contained-tonal"
                          containerColor="#ffebee"
                          iconColor="#d32f2f"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Aktywni pracownicy */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Aktywni pracownicy</Title>
            
            <View style={styles.employeesGrid}>
              {employees
                .filter(emp => emp.active)
                .slice(0, 6)
                .map(employee => (
                  <Chip
                    key={employee.id}
                    style={styles.employeeChip}
                    mode="outlined"
                    avatar={employee.position ? <Text>{employee.position.charAt(0)}</Text> : undefined}
                  >
                    {employee.name}
                  </Chip>
                ))}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowTimeEntryModal(true)}
        label="Dodaj wpis"
      />

      {/* Modal dla pojedynczego wpisu */}
      <Portal>
        <Modal
          visible={showTimeEntryModal}
          onDismiss={handleTimeEntryCancel}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>
                {selectedTimeEntry ? 'Edytuj wpis czasu pracy' : 'Dodaj nowy wpis czasu pracy'}
              </Title>
              
              <TimeEntryForm
                onSubmit={handleTimeEntrySubmit}
                onCancel={handleTimeEntryCancel}
                initialData={selectedTimeEntry || undefined}
                isLoading={isCreating || isUpdating}
                submitButtonText={selectedTimeEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
              />
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Modal dla zbiorczego wpisu */}
      <BulkTimeEntryModal
        visible={showBulkEntryModal}
        onDismiss={() => setShowBulkEntryModal(false)}
        onSuccess={handleBulkEntrySuccess}
      />
    </SafeAreaView>
  );
}

// =====================================================
// Helper Functions
// =====================================================

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    work: 'Praca',
    sick: 'Chorobowe',
    vacation: 'Urlop',
    fza: 'FZA',
  };
  return labels[status] || status;
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
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
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
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statSubtext: {
    fontSize: 10,
    color: '#999',
  },
  divider: {
    marginVertical: 16,
  },
  detailedStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  workChip: {
    backgroundColor: '#e8f5e9',
  },
  sickChip: {
    backgroundColor: '#fff3e0',
  },
  vacationChip: {
    backgroundColor: '#e3f2fd',
  },
  fzaChip: {
    backgroundColor: '#f3e5f5',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  entriesList: {
    gap: 12,
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  entryEmployee: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  entryDetails: {
    marginTop: 4,
    gap: 4,
  },
  entryStatus: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f9ff',
  },
  entryNotes: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 4,
  },
  employeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  employeeChip: {
    margin: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196f3',
  },
  modalContainer: {
    margin: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
  },
});
