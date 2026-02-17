// =====================================================
// TimeEntryForm Component - Formularz wpisu czasu pracy
// =====================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Button,
  TextInput,
  RadioButton,
  Text,
  Divider,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { TimeEntry, TimeEntryInsert, TimeEntryStatus } from '../../types/models';
import { useEmployees } from '../../hooks/useEmployees';

// =====================================================
// Types
// =====================================================

interface TimeEntryFormProps {
  onSubmit: (data: TimeEntryInsert | TimeEntry) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TimeEntry>;
  isLoading?: boolean;
  submitButtonText?: string;
}

// =====================================================
// Main Component
// =====================================================

export default function TimeEntryForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  submitButtonText = 'Zapisz',
}: TimeEntryFormProps) {
  // State
  const [employeeId, setEmployeeId] = useState<string>(initialData?.employee_id || '');
  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );
  const [hours, setHours] = useState<string>(initialData?.hours?.toString() || '');
  const [status, setStatus] = useState<TimeEntryStatus>(initialData?.status || 'work');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Hooks
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();

  // =====================================================
  // Handlers
// =====================================================

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const formData: TimeEntryInsert = {
      employee_id: employeeId,
      date: format(date, 'yyyy-MM-dd'),
      hours: parseFloat(hours),
      status,
      notes: notes.trim() || null,
    };

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Błąd zapisywania wpisu:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!employeeId) {
      return false;
    }
    if (!date) {
      return false;
    }
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      return false;
    }
    return true;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // =====================================================
  // Render
// =====================================================

  const isValidHours = () => {
    const hoursNum = parseFloat(hours);
    return !isNaN(hoursNum) && hoursNum > 0 && hoursNum <= 24;
  };

  const isFormValid = employeeId && date && isValidHours();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.form}>
        {/* Wybór pracownika */}
        <View style={styles.section}>
          <Text style={styles.label}>Pracownik *</Text>
          {isLoadingEmployees ? (
            <ActivityIndicator style={styles.loading} />
          ) : (
            <View style={styles.radioGroup}>
              {employees
                .filter(emp => emp.active)
                .map(employee => (
                  <View key={employee.id} style={styles.radioRow}>
                    <RadioButton
                      value={employee.id}
                      status={employeeId === employee.id ? 'checked' : 'unchecked'}
                      onPress={() => setEmployeeId(employee.id)}
                    />
                    <Text>{employee.name} ({employee.position})</Text>
                  </View>
                ))}
            </View>
          )}
          <HelperText type="error" visible={!employeeId}>
            Wybierz pracownika
          </HelperText>
        </View>

        <Divider style={styles.divider} />

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.label}>Data *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(date, 'dd.MM.yyyy', { locale: pl })}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Godziny */}
        <View style={styles.section}>
          <Text style={styles.label}>Godziny *</Text>
          <TextInput
            value={hours}
            onChangeText={setHours}
            placeholder="0.0"
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
            error={!isValidHours() && hours !== ''}
            left={<TextInput.Icon icon="clock-outline" />}
          />
          <HelperText type="error" visible={!isValidHours() && hours !== ''}>
            Wprowadź poprawną liczbę godzin (0-24)
          </HelperText>
          <HelperText type="info">
            Użyj kropki jako separatora dziesiętnego (np. 7.5)
          </HelperText>
        </View>

        <Divider style={styles.divider} />

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.label}>Status *</Text>
          <View style={styles.radioGroup}>
            {(['work', 'sick', 'vacation', 'fza'] as TimeEntryStatus[]).map(stat => (
              <View key={stat} style={styles.radioRow}>
                <RadioButton
                  value={stat}
                  status={status === stat ? 'checked' : 'unchecked'}
                  onPress={() => setStatus(stat)}
                />
                <Text>{getStatusLabel(stat)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Notatki */}
        <View style={styles.section}>
          <Text style={styles.label}>Notatki (opcjonalnie)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Dodaj notatki do wpisu..."
            multiline
            numberOfLines={3}
            style={styles.textArea}
            mode="outlined"
          />
          <HelperText type="info">
            Notatki mogą zawierać szczegóły dotyczące pracy
          </HelperText>
        </View>

        <Divider style={styles.divider} />

        {/* Przyciski */}
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={onCancel}
            style={styles.cancelButton}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!isFormValid || isLoading}
            style={styles.submitButton}
          >
            {submitButtonText}
          </Button>
        </View>
      </View>
    </ScrollView>
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

// =====================================================
// Styles
// =====================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  radioGroup: {
    marginLeft: -8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  divider: {
    marginVertical: 12,
  },
  dateButton: {
    alignSelf: 'flex-start',
  },
  input: {
    backgroundColor: 'white',
  },
  textArea: {
    backgroundColor: 'white',
    minHeight: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
  loading: {
    marginVertical: 20,
  },
});