# 🎬 Przykładowy Workflow Development z Cline

Ten dokument pokazuje jak pracować z Cline AI Assistant krok po kroku, budując funkcjonalności TimeTracker.

## 📋 Scenariusz: Dodanie Funkcji "Bulk Time Entry"

Chcemy dodać możliwość dodawania godzin pracy dla całej ekipy na raz w jednym formularzu.

---

## Krok 1: Rozpoczęcie Sesji z Cline

**Otwórz Cline w VSCode** (ikona w lewym panelu)

**Twoja pierwsza komenda:**
```
Cześć! Chcę dodać funkcję do masowego dodawania godzin pracy. 
Użytkownik powinien móc:
1. Wybrać datę
2. Wybrać ile godzin (np. 8h)
3. Wybrać status (praca/urlop/chorobowe/fza)
4. Automatycznie dodać te godziny dla wszystkich aktywnych pracowników

Zacznijmy od utworzenia komponentu formularza.
```

### Cline odpowie:

*Cline używa skilla `timetracker-rn-dev` i widzi że:*
- Projekt używa React Native + TypeScript
- Komponenty są w `/components`
- Używamy React Native Paper dla UI
- Wszystkie operacje DB idą przez service layer

**Cline zapyta:**
```
Rozumiem. Zanim zacznę, kilka pytań:

1. Czy ten formularz ma być modalem czy osobnym ekranem?
2. Czy użytkownik powinien móc zaznaczyć konkretnych pracowników czy zawsze dla wszystkich?
3. Czy ma być możliwość dodania notatki?
4. Jak obsłużyć przypadek gdy pracownik już ma wpis na dany dzień - nadpisać czy pominąć?
```

---

## Krok 2: Odpowiedź na Pytania Cline

**Twoja odpowiedź:**
```
1. Modal - wyświetlany z dashboardu
2. Zawsze dla wszystkich aktywnych pracowników
3. Nie potrzeba notatek na razie
4. Nadpisuj istniejące wpisy

Dodatkowo:
- Pokaż potwierdzenie przed zapisem (ile pracowników, data, godziny)
- Po zapisie pokaż toast z potwierdzeniem
- Loading state podczas zapisywania
```

---

## Krok 3: Cline Generuje Kod

**Cline odpowie:**
```
Świetnie! Utworzę:

1. Komponent BulkTimeEntryModal w /components/time/
2. Hook useBulkTimeEntry w /hooks/
3. Funkcję w service layer /services/timeEntries.ts
4. PostgreSQL function dla bulk insert (jeśli nie istnieje)

Zacznę od utworzenia struktury...
```

### Cline wygeneruje:

#### 1. `/components/time/BulkTimeEntryModal.tsx`

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Modal, Portal, Button, Text, TextInput } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useBulkTimeEntry } from '@/hooks/useBulkTimeEntry';
import { useEmployees } from '@/hooks/useEmployees';

interface BulkTimeEntryModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const statusOptions = [
  { value: 'work', label: 'Praca', icon: '💼' },
  { value: 'sick', label: 'Chorobowe', icon: '🏥' },
  { value: 'vacation', label: 'Urlop', icon: '🏖️' },
  { value: 'fza', label: 'FZA', icon: '📋' },
];

export const BulkTimeEntryModal: React.FC<BulkTimeEntryModalProps> = ({
  visible,
  onDismiss,
}) => {
  const [date, setDate] = useState(new Date());
  const [hours, setHours] = useState('8');
  const [status, setStatus] = useState('work');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: employees } = useEmployees();
  const bulkMutation = useBulkTimeEntry();

  const activeEmployees = employees?.filter(emp => emp.active) || [];

  const handleSubmit = () => {
    Alert.alert(
      'Potwierdź dodanie godzin',
      `Czy na pewno chcesz dodać ${hours}h (${statusOptions.find(s => s.value === status)?.label}) dla ${activeEmployees.length} pracowników na dzień ${date.toLocaleDateString('pl-PL')}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Dodaj',
          onPress: async () => {
            try {
              await bulkMutation.mutateAsync({
                employeeIds: activeEmployees.map(emp => emp.id),
                date,
                hours: parseFloat(hours),
                status,
              });
              Alert.alert('Sukces', 'Godziny zostały dodane');
              onDismiss();
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się dodać godzin');
            }
          },
        },
      ]
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.title}>Dodaj godziny dla ekipy</Text>

        {/* Date Picker */}
        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={styles.input}
        >
          {date.toLocaleDateString('pl-PL')}
        </Button>

        <DatePickerModal
          locale="pl"
          mode="single"
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          date={date}
          onConfirm={(params) => {
            setDate(params.date);
            setShowDatePicker(false);
          }}
        />

        {/* Hours Input */}
        <TextInput
          label="Liczba godzin"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
        />

        {/* Status Selection */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusGrid}>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              mode={status === option.value ? 'contained' : 'outlined'}
              onPress={() => setStatus(option.value)}
              style={styles.statusButton}
            >
              {option.icon} {option.label}
            </Button>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            📊 {activeEmployees.length} pracowników
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button mode="outlined" onPress={onDismiss} style={styles.button}>
            Anuluj
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={bulkMutation.isPending}
            disabled={!hours || bulkMutation.isPending}
            style={styles.button}
          >
            Dodaj godziny
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    minWidth: '45%',
  },
  summary: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
```

#### 2. `/hooks/useBulkTimeEntry.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntryService } from '@/services/timeEntries';

interface BulkTimeEntryInput {
  employeeIds: string[];
  date: Date;
  hours: number;
  status: 'work' | 'sick' | 'vacation' | 'fza';
}

export const useBulkTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkTimeEntryInput) =>
      timeEntryService.bulkAdd(input),
    onSuccess: () => {
      // Invalidate all time entry queries
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};
```

#### 3. `/services/timeEntries.ts` (dodanie funkcji)

```typescript
import { supabase } from './supabase';

export const timeEntryService = {
  // ... existing methods ...

  async bulkAdd({
    employeeIds,
    date,
    hours,
    status,
  }: {
    employeeIds: string[];
    date: Date;
    hours: number;
    status: string;
  }): Promise<number> {
    const { data, error } = await supabase.rpc('bulk_add_hours', {
      p_employee_ids: employeeIds,
      p_date: date.toISOString().split('T')[0],
      p_hours: hours,
      p_status: status,
    });

    if (error) throw error;
    return data;
  },
};
```

#### 4. Migration SQL (jeśli funkcja nie istnieje)

```sql
-- supabase/migrations/TIMESTAMP_add_bulk_hours_function.sql

CREATE OR REPLACE FUNCTION bulk_add_hours(
  p_employee_ids UUID[],
  p_date DATE,
  p_hours DECIMAL,
  p_status VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  v_emp_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_emp_id IN ARRAY p_employee_ids
  LOOP
    INSERT INTO time_entries (employee_id, date, hours, status, created_by)
    VALUES (v_emp_id, p_date, p_hours, p_status, auth.uid())
    ON CONFLICT (employee_id, date) 
    DO UPDATE SET 
      hours = EXCLUDED.hours,
      status = EXCLUDED.status,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION bulk_add_hours TO authenticated;
```

**Cline powie:**
```
✅ Utworzyłem wszystkie potrzebne pliki!

Teraz musisz:
1. Zastosować migrację: `supabase db push`
2. Dodać modal do dashboardu - czy chcesz żebym to zrobił?
```

---

## Krok 4: Integracja z Dashboard

**Twoja komenda:**
```
Tak, dodaj ten modal do dashboardu. 
Dodaj przycisk "Dodaj godziny dla ekipy" na górze listy pracowników.
```

**Cline zmodyfikuje** `/app/(tabs)/index.tsx`:

```typescript
// Dodanie importu
import { BulkTimeEntryModal } from '@/components/time/BulkTimeEntryModal';

// W komponencie
export default function DashboardScreen() {
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // ... existing code ...

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        onPress={() => setShowBulkModal(true)}
        style={styles.bulkButton}
        icon="clock-plus"
      >
        Dodaj godziny dla ekipy
      </Button>

      {/* Existing employee list */}
      
      <BulkTimeEntryModal
        visible={showBulkModal}
        onDismiss={() => setShowBulkModal(false)}
      />
    </View>
  );
}
```

---

## Krok 5: Testowanie

**Twoja komenda:**
```
Świetnie! Teraz:
1. Dodaj prostą walidację - godziny muszą być między 0 a 24
2. Sprawdź czy TypeScript przechodzi
3. Przetestuj komponent
```

**Cline:**
```
1. Dodam walidację do komponentu
2. Uruchomię: npx tsc --noEmit
3. Utworzę prosty test dla hooka
```

### Cline doda walidację:

```typescript
// W komponencie
const isValidHours = () => {
  const h = parseFloat(hours);
  return !isNaN(h) && h >= 0 && h <= 24;
};

// W handleSubmit
if (!isValidHours()) {
  Alert.alert('Błąd', 'Godziny muszą być między 0 a 24');
  return;
}
```

### Cline utworzy test:

```typescript
// __tests__/useBulkTimeEntry.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useBulkTimeEntry } from '@/hooks/useBulkTimeEntry';

describe('useBulkTimeEntry', () => {
  it('should add hours for multiple employees', async () => {
    const { result } = renderHook(() => useBulkTimeEntry());

    await act(async () => {
      await result.current.mutateAsync({
        employeeIds: ['uuid-1', 'uuid-2'],
        date: new Date('2026-02-17'),
        hours: 8,
        status: 'work',
      });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
```

---

## Krok 6: Iteracja i Poprawki

**Gdybyś zauważył problem:**
```
Cline, przycisk "Dodaj godziny" jest za mały. 
Zwiększ jego wysokość do 56px i dodaj ikonę po lewej stronie.
```

**Cline natychmiast wprowadzi zmiany:**
```typescript
<Button
  mode="contained"
  onPress={() => setShowBulkModal(true)}
  style={[styles.bulkButton, { height: 56 }]}
  icon="account-multiple-plus"
  contentStyle={{ height: 56 }}
>
  Dodaj godziny dla ekipy
</Button>
```

---

## Krok 7: Commit

**Twoja komenda:**
```
Świetnie! Commituj te zmiany z sensownym message.
```

**Cline:**
```bash
git add .
git commit -m "feat: add bulk time entry modal

- Add BulkTimeEntryModal component
- Add useBulkTimeEntry hook
- Add bulk_add_hours PostgreSQL function
- Integrate modal with dashboard
- Add input validation and loading states
- Add tests for bulk entry hook"
```

---

## 🎯 Podsumowanie Workflow

### Co Cline zrobił automatycznie:

1. ✅ Zrozumiał kontekst projektu z skillów
2. ✅ Zadał sensowne pytania o szczegóły
3. ✅ Użył właściwych wzorców (service layer, React Query, TypeScript)
4. ✅ Utworzył wszystkie potrzebne pliki w odpowiednich lokalizacjach
5. ✅ Dodał walidację i error handling
6. ✅ Napisał testy
7. ✅ Zintegrował z istniejącym kodem
8. ✅ Stworzył migrację bazy danych
9. ✅ Sprawdził TypeScript
10. ✅ Zrobił sensowny commit

### Twój wkład:

- 🎯 Jasno określiłeś wymagania
- 🎯 Odpowiedziałeś na pytania Cline
- 🎯 Zweryfikowałeś rezultat
- 🎯 Zgłosiłeś poprawki

### Oszczędność czasu:

**Bez Cline:** ~3-4 godziny
- 30 min: Projektowanie komponentu
- 45 min: Implementacja UI
- 30 min: Hook i service layer
- 45 min: Migracja bazy danych
- 30 min: Integracja z dashboard
- 30 min: Testy
- 20 min: Debugging i poprawki

**Z Cline:** ~30-45 minut
- 10 min: Wyjaśnienie wymagań
- 15 min: Review kodu wygenerowanego przez Cline
- 10 min: Poprawki i iteracje
- 5 min: Finalne testy

**Oszczędność: ~2.5-3 godziny** ⚡

---

## 💡 Pro Tips dla Pracy z Cline

### 1. Bądź konkretny
❌ "Dodaj formularz"
✅ "Dodaj modal z formularzem do masowego dodawania godzin, z datepickerem, input dla godzin i 4 przyciskami do wyboru statusu"

### 2. Podaj kontekst
❌ "Napraw bug"
✅ "W komponencie BulkTimeEntryModal, gdy użytkownik wybiera datę z przeszłości, pokaż warning ale pozwól na zapis"

### 3. Iteruj małymi krokami
✅ Najpierw komponent UI
✅ Potem logika biznesowa
✅ Na końcu integracja

### 4. Pytaj o wyjaśnienia
```
"Dlaczego użyłeś useMutation zamiast prostego useState?"
"Czy mogę użyć innego wzorca dla tego przypadku?"
```

### 5. Przetestuj od razu
```
"Uruchom testy dla tego komponentu"
"Sprawdź czy TypeScript przechodzi"
"Zrób build żeby upewnić się że nic się nie zepsuło"
```

---

## 🔥 Kolejne Przykładowe Zadania

Gdy skończysz z bulk entry, spróbuj:

```
"Dodaj możliwość filtrowania pracowników po statusie (aktywny/nieaktywny)"

"Stwórz komponent Calendar który pokazuje dni miesiąca i highlightuje te, które mają wpisy"

"Zaimplementuj export do Excel z miesięcznym zestawieniem godzin dla wszystkich pracowników"

"Dodaj offline sync - operacje mają być queueowane gdy nie ma netu i synchronizowane gdy net wraca"

"Stwórz OCR scanner który rozpoznaje tekst z dokumentu dostawy"
```

---

**Happy Coding z Cline! 🚀**

*Pamiętaj: Cline to bardzo mocne narzędzie, ale to Ty jesteś architektem. Cline wykonuje Twoje polecenia - im lepiej je zdefiniujesz, tym lepsze rezultaty otrzymasz.*
