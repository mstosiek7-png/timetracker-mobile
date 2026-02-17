// =====================================================
// MonthlyViewScreen - Widok miesięczny pracownika
// =====================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Text,
  Divider,
  Chip,
  IconButton,
  ActivityIndicator,
  SegmentedButtons,
  Button,
  Modal,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, 
         isSameMonth, isSameDay, addMonths, subMonths, eachWeekOfInterval, 
         startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';

import { useEmployees } from '../../hooks/useEmployees';
import { useMonthlySummary } from '../../hooks/useTimeEntries';
import { TimeEntryStatus } from '../../types/models';

// =====================================================
// Types
// =====================================================

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  entries: Array<{
    hours: number;
    status: TimeEntryStatus;
    notes?: string | null;
  }>;
  totalHours: number;
}

// =====================================================
// Main Component
// =====================================================

export default function MonthlyViewScreen() {
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'summary'>('calendar');

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { data: timeEntries = [], isLoading: isLoadingEntries } = useMonthlySummary(
    selectedEmployeeId,
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );

  // =====================================================
  // Computed Values
// =====================================================

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const startOfFirstWeek = startOfWeek(start, { weekStartsOn: 1 });
    const endOfLastWeek = endOfWeek(end, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: startOfFirstWeek, end: endOfLastWeek });
    
    return days.map(date => {
      const dayEntries = timeEntries.filter(entry => 
        isSameDay(parseISO(entry.date), date)
      );
      
      return {
        date,
        isCurrentMonth: isSameMonth(date, selectedDate),
        entries: dayEntries.map(entry => ({
          hours: entry.hours,
          status: entry.status,
          notes: entry.notes,
        })),
        totalHours: dayEntries.reduce((sum, entry) => sum + entry.hours, 0),
      };
    });
  }, [selectedDate, timeEntries]);

  const monthlyStats = useMemo(() => {
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const workHours = timeEntries
      .filter(entry => entry.status === 'work')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const sickHours = timeEntries
      .filter(entry => entry.status === 'sick')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const vacationHours = timeEntries
      .filter(entry => entry.status === 'vacation')
      .reduce((sum, entry) => sum + entry.hours, 0);
    const fzaHours = timeEntries
      .filter(entry => entry.status === 'fza')
      .reduce((sum, entry) => sum + entry.hours, 0);
    
    const daysWithEntries = new Set(timeEntries.map(entry => entry.date)).size;
    
    return {
      totalHours,
      workHours,
      sickHours,
      vacationHours,
      fzaHours,
      daysWithEntries,
      averagePerDay: daysWithEntries > 0 ? totalHours / daysWithEntries : 0,
    };
  }, [timeEntries]);

  // =====================================================
  // Handlers
// =====================================================

  const handlePrevMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowEmployeeModal(false);
  };

  // =====================================================
  // Render
// =====================================================

  if (isLoadingEmployees) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Ładowanie pracowników...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Nagłówek */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.title}>Widok miesięczny</Title>
            <Paragraph>
              Przeglądaj godzinę pracy dla poszczególnych pracowników
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Wybór pracownika */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Pracownik</Title>
              <Button
                mode="outlined"
                onPress={() => setShowEmployeeModal(true)}
                icon="account-switch"
              >
                {selectedEmployee ? selectedEmployee.name : 'Wybierz pracownika'}
              </Button>
            </View>
            
            {selectedEmployee && (
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{selectedEmployee.name}</Text>
                <Text style={styles.employeePosition}>{selectedEmployee.position}</Text>
                <Chip 
                  mode="outlined" 
                  icon={selectedEmployee.active ? 'check-circle' : 'close-circle'}
                >
                  {selectedEmployee.active ? 'Aktywny' : 'Nieaktywny'}
                </Chip>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Widok miesięczny - tylko jeśli wybrano pracownika */}
        {selectedEmployeeId ? (
          <>
            {/* Nawigacja miesiąca */}
            <Card style={styles.sectionCard}>
              <Card.Content>
                <View style={styles.monthNavigation}>
                  <IconButton
                    icon="chevron-left"
                    size={24}
                    onPress={handlePrevMonth}
                  />
                  <View style={styles.monthTitleContainer}>
                    <Text style={styles.monthTitle}>
                      {format(selectedDate, 'MMMM yyyy', { locale: pl })}
                    </Text>
                    <Text style={styles.monthSubtitle}>
                      {format(selectedDate, 'LLLL yyyy', { locale: pl })}
                    </Text>
                  </View>
                  <IconButton
                    icon="chevron-right"
                    size={24}
                    onPress={handleNextMonth}
                  />
                </View>

                <SegmentedButtons
                  value={viewMode}
                  onValueChange={value => setViewMode(value as typeof viewMode)}
                  buttons={[
                    { value: 'calendar', label: 'Kalendarz', icon: 'calendar' },
                    { value: 'summary', label: 'Podsumowanie', icon: 'chart-bar' },
                  ]}
                  style={styles.segmentedButtons}
                />
              </Card.Content>
            </Card>

            {isLoadingEntries ? (
              <Card style={styles.sectionCard}>
                <Card.Content style={styles.centeredContent}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>Ładowanie danych...</Text>
                </Card.Content>
              </Card>
            ) : (
              <>
                {/* Podsumowanie miesięczne */}
                <Card style={styles.sectionCard}>
                  <Card.Content>
                    <Title style={styles.sectionTitle}>Podsumowanie miesiąca</Title>
                    
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Łącznie godzin</Text>
                        <Text style={styles.statValue}>
                          {monthlyStats.totalHours.toFixed(1)}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Dni z wpisami</Text>
                        <Text style={styles.statValue}>
                          {monthlyStats.daysWithEntries}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Średnia/dzień</Text>
                        <Text style={styles.statValue}>
                          {monthlyStats.averagePerDay.toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.detailedStats}>
                      <View style={styles.statusStat}>
                        <Chip mode="outlined" style={styles.workChip}>Praca</Chip>
                        <Text style={styles.statusValue}>
                          {monthlyStats.workHours.toFixed(1)}h
                        </Text>
                      </View>
                      <View style={styles.statusStat}>
                        <Chip mode="outlined" style={styles.sickChip}>Chorobowe</Chip>
                        <Text style={styles.statusValue}>
                          {monthlyStats.sickHours.toFixed(1)}h
                        </Text>
                      </View>
                      <View style={styles.statusStat}>
                        <Chip mode="outlined" style={styles.vacationChip}>Urlop</Chip>
                        <Text style={styles.statusValue}>
                          {monthlyStats.vacationHours.toFixed(1)}h
                        </Text>
                      </View>
                      <View style={styles.statusStat}>
                        <Chip mode="outlined" style={styles.fzaChip}>FZA</Chip>
                        <Text style={styles.statusValue}>
                          {monthlyStats.fzaHours.toFixed(1)}h
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                {/* Kalendarz lub szczegółowy widok */}
                {viewMode === 'calendar' ? (
                  <Card style={styles.sectionCard}>
                    <Card.Content>
                      <Title style={styles.sectionTitle}>Kalendarz</Title>
                      
                      {/* Nagłówki dni tygodnia */}
                      <View style={styles.weekDays}>
                        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(day => (
                          <Text key={day} style={styles.weekDay}>
                            {day}
                          </Text>
                        ))}
                      </View>

                      {/* Dni kalendarza */}
                      <View style={styles.calendarGrid}>
                        {calendarDays.map((day, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dayCell,
                              !day.isCurrentMonth && styles.dayCellOutside,
                              day.totalHours > 0 && styles.dayCellWithEntries,
                            ]}
                            onPress={() => {
                              // Można dodać nawigację do szczegółów dnia
                            }}
                          >
                            <Text
                              style={[
                                styles.dayNumber,
                                !day.isCurrentMonth && styles.dayNumberOutside,
                              ]}
                            >
                              {format(day.date, 'd')}
                            </Text>
                            
                            {day.totalHours > 0 && (
                              <View style={styles.dayEntries}>
                                <Text style={styles.dayHours}>
                                  {day.totalHours}h
                                </Text>
                                {day.entries.length > 0 && (
                                  <View style={styles.statusIndicators}>
                                    {day.entries.map((entry, idx) => (
                                      <View
                                        key={idx}
                                        style={[
                                          styles.statusDot,
                                          { backgroundColor: getStatusColor(entry.status) },
                                        ]}
                                      />
                                    ))}
                                  </View>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </Card.Content>
                  </Card>
                ) : (
                  /* Szczegółowy widok - lista dni */
                  <Card style={styles.sectionCard}>
                    <Card.Content>
                      <Title style={styles.sectionTitle}>Szczegółowy wykaz</Title>
                      
                      {timeEntries.length === 0 ? (
                        <Paragraph style={styles.emptyText}>
                          Brak wpisów dla wybranego miesiąca
                        </Paragraph>
                      ) : (
                        <View style={styles.detailedList}>
                          {timeEntries.map(entry => (
                            <View key={entry.id} style={styles.entryItem}>
                              <View style={styles.entryHeader}>
                                <Text style={styles.entryDate}>
                                  {format(parseISO(entry.date), 'dd.MM.yyyy')}
                                </Text>
                                <Chip
                                  mode="outlined"
                                  style={[
                                    styles.statusChip,
                                    { backgroundColor: getStatusColor(entry.status) + '20' },
                                  ]}
                                >
                                  {getStatusLabel(entry.status)}
                                </Chip>
                              </View>
                              <View style={styles.entryDetails}>
                                <Text style={styles.entryHours}>
                                  {entry.hours} godzin
                                </Text>
                                {entry.notes && (
                                  <Text style={styles.entryNotes}>
                                    {entry.notes}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                )}
              </>
            )}
          </>
        ) : (
          <Card style={styles.sectionCard}>
            <Card.Content style={styles.centeredContent}>
              <Text style={styles.infoText}>
                Wybierz pracownika, aby zobaczyć jego miesięczne podsumowanie
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Modal wyboru pracownika */}
      <Portal>
        <Modal
          visible={showEmployeeModal}
          onDismiss={() => setShowEmployeeModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>Wybierz pracownika</Title>
              
              <ScrollView style={styles.employeeList}>
                {employees
                  .filter(emp => emp.active)
                  .map(employee => (
                    <TouchableOpacity
                      key={employee.id}
                      style={styles.employeeItem}
                      onPress={() => handleSelectEmployee(employee.id)}
                    >
                      <Text style={styles.employeeItemName}>{employee.name}</Text>
                      <Text style={styles.employeeItemPosition}>{employee.position}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
              
              <Button
                mode="outlined"
                onPress={() => setShowEmployeeModal(false)}
                style={styles.modalCloseButton}
              >
                Zamknij
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

// =====================================================
// Helper Functions
// =====================================================

function getStatusLabel(status: TimeEntryStatus): string {
  const labels = {
    work: 'Praca',
    sick: 'Chorobowe',
    vacation: 'Urlop',
    fza: 'FZA',
  };
  return labels[status];
}

function getStatusColor(status: TimeEntryStatus): string {
  const colors = {
    work: '#4caf50', // zielony
    sick: '#ff9800', // pomarańczowy
    vacation: '#2196f3', // niebieski
    fza: '#9c27b0', // fioletowy
  };
  return colors[status];
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
  centeredContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  employeeInfo: {
    marginTop: 12,
    gap: 8,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  employeePosition: {
    fontSize: 16,
    color: '#666',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  monthSubtitle: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  segmentedButtons: {
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    width: '30%',
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
    color: '#4caf50',
  },
  divider: {
    marginVertical: 16,
  },
  detailedStats: {
    gap: 12,
  },
  statusStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekDay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: 40,
    height: 60,
    margin: 4,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  dayCellOutside: {
    backgroundColor: '#fafafa',
    borderColor: '#f0f0f0',
  },
  dayCellWithEntries: {
    backgroundColor: '#f0f9ff',
    borderColor: '#90caf9',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dayNumberOutside: {
    color: '#aaa',
  },
  dayEntries: {
    alignItems: 'center',
    marginTop: 2,
  },
  dayHours: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statusIndicators: {
    flexDirection: 'row',
    marginTop: 2,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailedList: {
    gap: 12,
  },
  entryItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusChip: {
    height: 24,
  },
  entryDetails: {
    gap: 4,
  },
  entryHours: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  entryNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    margin: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
  },
  employeeList: {
    maxHeight: 300,
  },
  employeeItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  employeeItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  employeeItemPosition: {
    fontSize: 14,
    color: '#666',
  },
  modalCloseButton: {
    marginTop: 16,
  },
});