# TimeTracker - Dokumentacja Techniczna

## 📋 Spis Treści

1. [Przegląd Projektu](#przegląd-projektu)
2. [Stack Technologiczny](#stack-technologiczny)
3. [Architektura Aplikacji](#architektura-aplikacji)
4. [Struktura Bazy Danych](#struktura-bazy-danych)
5. [Struktura Projektu](#struktura-projektu)
6. [Konfiguracja Środowiska](#konfiguracja-środowiska)
7. [Integracja z Cline/VSCode](#integracja-z-clinevscode)
8. [Implementacja Funkcji](#implementacja-funkcji)
9. [Roadmap Rozwoju](#roadmap-rozwoju)

---

## Przegląd Projektu

**TimeTracker** to mobilna aplikacja do zarządzania czasem pracy pracowników budowlanych z możliwością skanowania dokumentów dostaw przy użyciu OCR.

### Główne Funkcjonalności

- ✅ Zarządzanie listą pracowników (CRUD)
- ✅ Rejestracja czasu pracy (indywidualnie i grupowo)
- ✅ Widok miesięczny z podsumowaniem godzin
- ✅ Statusy: Praca, Chorobowe, Urlop, FZA
- ✅ Historia zmian (audit log)
- ✅ Export do Excel/PDF
- ✅ Skanowanie dokumentów OCR
- ✅ Praca offline (synchronizacja)

---

## Stack Technologiczny

### Frontend Mobile
```
- React Native z Expo (cross-platform iOS/Android)
- React Native Paper (Material Design)
- React Navigation 6
- Zustand (state management)
- React Query (cache + sync)
- Expo Camera (OCR)
- Expo FileSystem (offline storage)
```

### Backend & Database
```
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Edge Functions (serverless)
- PostgREST API (automatyczny REST)
```

### OCR & Przetwarzanie
```
- Tesseract.js (OCR engine)
- OpenAI Vision API (backup/advanced)
- Sharp (image preprocessing)
```

### Export & Reporting
```
- ExcelJS (generowanie XLSX)
- react-native-pdf (rendering PDF)
- jsPDF + jsPDF-AutoTable (PDF generation)
```

---

## Architektura Aplikacji

```
┌─────────────────────────────────────────────────┐
│           React Native App (Mobile)              │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐  ┌──────────────┐             │
│  │   Screens    │  │  Components  │             │
│  │              │  │              │             │
│  │ - Dashboard  │  │ - EmployeeCard           │
│  │ - Employee   │  │ - TimeEntry  │             │
│  │ - Scanner    │  │ - Calendar   │             │
│  │ - Reports    │  │ - ExportBtn  │             │
│  └──────────────┘  └──────────────┘             │
│         │                  │                      │
│         └──────────┬───────┘                      │
│                    │                              │
│  ┌────────────────▼──────────────────┐           │
│  │       State Management             │           │
│  │         (Zustand)                  │           │
│  │                                    │           │
│  │  - employeeStore                   │           │
│  │  - timeEntryStore                  │           │
│  │  - documentStore                   │           │
│  │  - syncStore                       │           │
│  └────────────────┬───────────────────┘           │
│                   │                               │
│  ┌────────────────▼───────────────────┐           │
│  │      Services Layer                │           │
│  │                                     │           │
│  │  - SupabaseService                 │           │
│  │  - OCRService                      │           │
│  │  - ExportService                   │           │
│  │  - SyncService                     │           │
│  └────────────────┬────────────────────┘           │
│                   │                               │
└───────────────────┼───────────────────────────────┘
                    │
                    │ API Calls
                    │
┌───────────────────▼───────────────────────────────┐
│              Supabase Backend                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  PostgreSQL  │  │  Auth        │              │
│  │   Database   │  │  (JWT)       │              │
│  └──────────────┘  └──────────────┘              │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Storage     │  │ Edge Funcs   │              │
│  │  (Documents) │  │  (OCR/Export)│              │
│  └──────────────┘  └──────────────┘              │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Realtime    │  │  Webhooks    │              │
│  │  (Sync)      │  │  (Events)    │              │
│  └──────────────┘  └──────────────┘              │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Struktura Bazy Danych

### Schema SQL (Supabase)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET timezone TO 'Europe/Warsaw';

-- =====================================================
-- TABLE: employees
-- Przechowuje dane pracowników
-- =====================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Indeksy
  CONSTRAINT employees_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_employees_active ON employees(active);
CREATE INDEX idx_employees_name ON employees(name);

-- =====================================================
-- TABLE: time_entries
-- Rejestr czasu pracy
-- =====================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  status VARCHAR(20) NOT NULL CHECK (status IN ('work', 'sick', 'vacation', 'fza')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Jeden wpis na pracownika na dzień
  CONSTRAINT unique_employee_date UNIQUE(employee_id, date)
);

CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_date_range ON time_entries(employee_id, date);

-- =====================================================
-- TABLE: change_history
-- Historia wszystkich zmian (audit log)
-- =====================================================
CREATE TABLE change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'employee', 'time_entry', 'document'
  entity_id UUID,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  user_email VARCHAR(255)
);

CREATE INDEX idx_change_history_created_at ON change_history(created_at DESC);
CREATE INDEX idx_change_history_employee ON change_history(employee_id);
CREATE INDEX idx_change_history_entity ON change_history(entity_type, entity_id);

-- =====================================================
-- TABLE: documents
-- Zeskanowane dokumenty dostaw
-- =====================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  ocr_text TEXT,
  ocr_data JSONB, -- Strukturyzowane dane z OCR
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  project_id UUID, -- Opcjonalne powiązanie z projektem
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_date ON documents(date);
CREATE INDEX idx_documents_project ON documents(project_id);

-- =====================================================
-- TABLE: sync_queue
-- Kolejka synchronizacji dla offline mode
-- =====================================================
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status, created_at);

-- =====================================================
-- TRIGGERS - Updated_at automation
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- TRIGGERS - Change History Automation
-- =====================================================
CREATE OR REPLACE FUNCTION log_time_entry_change()
RETURNS TRIGGER AS $$
DECLARE
  v_description TEXT;
  v_employee_name VARCHAR(255);
  v_user_email VARCHAR(255);
BEGIN
  -- Pobierz nazwę pracownika
  SELECT name INTO v_employee_name FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  -- Pobierz email użytkownika
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  IF (TG_OP = 'INSERT') THEN
    v_description := v_employee_name || ': dodano ' || NEW.hours || 'h (' || NEW.status || ')';
    
    INSERT INTO change_history (
      action, entity_type, entity_id, employee_id, description, 
      new_value, created_by, user_email
    ) VALUES (
      'add_hours', 'time_entry', NEW.id, NEW.employee_id, v_description,
      to_jsonb(NEW), auth.uid(), v_user_email
    );
    
  ELSIF (TG_OP = 'UPDATE') THEN
    v_description := v_employee_name || ': ' || OLD.hours || 'h (' || OLD.status || ') → ' || 
                     NEW.hours || 'h (' || NEW.status || ')';
    
    INSERT INTO change_history (
      action, entity_type, entity_id, employee_id, description,
      old_value, new_value, created_by, user_email
    ) VALUES (
      'edit_hours', 'time_entry', NEW.id, NEW.employee_id, v_description,
      to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email
    );
    
  ELSIF (TG_OP = 'DELETE') THEN
    v_description := v_employee_name || ': usunięto ' || OLD.hours || 'h (' || OLD.status || ')';
    
    INSERT INTO change_history (
      action, entity_type, entity_id, employee_id, description,
      old_value, created_by, user_email
    ) VALUES (
      'delete_hours', 'time_entry', OLD.id, OLD.employee_id, v_description,
      to_jsonb(OLD), auth.uid(), v_user_email
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER time_entries_history
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION log_time_entry_change();

-- Similar trigger dla employees
CREATE OR REPLACE FUNCTION log_employee_change()
RETURNS TRIGGER AS $$
DECLARE
  v_description TEXT;
  v_user_email VARCHAR(255);
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  IF (TG_OP = 'INSERT') THEN
    v_description := 'Dodano pracownika: ' || NEW.name;
    INSERT INTO change_history (
      action, entity_type, entity_id, employee_id, description,
      new_value, created_by, user_email
    ) VALUES (
      'add_employee', 'employee', NEW.id, NEW.id, v_description,
      to_jsonb(NEW), auth.uid(), v_user_email
    );
    
  ELSIF (TG_OP = 'DELETE') THEN
    v_description := 'Usunięto pracownika: ' || OLD.name;
    INSERT INTO change_history (
      action, entity_type, entity_id, employee_id, description,
      old_value, created_by, user_email
    ) VALUES (
      'delete_employee', 'employee', OLD.id, OLD.id, v_description,
      to_jsonb(OLD), auth.uid(), v_user_email
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER employees_history
  AFTER INSERT OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION log_employee_change();

-- =====================================================
-- VIEWS - Przydatne widoki
-- =====================================================

-- Miesięczne podsumowanie dla pracownika
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT 
  e.id as employee_id,
  e.name as employee_name,
  e.position,
  DATE_TRUNC('month', te.date) as month,
  te.status,
  SUM(te.hours) as total_hours,
  COUNT(*) as days_count
FROM employees e
LEFT JOIN time_entries te ON e.id = te.employee_id
WHERE e.active = true
GROUP BY e.id, e.name, e.position, DATE_TRUNC('month', te.date), te.status
ORDER BY month DESC, e.name;

-- Dzienne podsumowanie wszystkich pracowników
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT 
  te.date,
  COUNT(DISTINCT te.employee_id) as employees_count,
  SUM(CASE WHEN te.status = 'work' THEN te.hours ELSE 0 END) as work_hours,
  SUM(CASE WHEN te.status = 'sick' THEN te.hours ELSE 0 END) as sick_hours,
  SUM(CASE WHEN te.status = 'vacation' THEN te.hours ELSE 0 END) as vacation_hours,
  SUM(CASE WHEN te.status = 'fza' THEN te.hours ELSE 0 END) as fza_hours,
  SUM(te.hours) as total_hours
FROM time_entries te
GROUP BY te.date
ORDER BY te.date DESC;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Każdy zalogowany użytkownik ma pełny dostęp
CREATE POLICY "Enable all for authenticated users" ON employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON time_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON change_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable all for authenticated users" ON documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON sync_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- FUNCTIONS - Przydatne funkcje
-- =====================================================

-- Pobierz miesięczne podsumowanie dla pracownika
CREATE OR REPLACE FUNCTION get_employee_month_summary(
  p_employee_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  date DATE,
  hours DECIMAL,
  status VARCHAR,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.date,
    te.hours,
    te.status,
    te.notes
  FROM time_entries te
  WHERE te.employee_id = p_employee_id
    AND EXTRACT(YEAR FROM te.date) = p_year
    AND EXTRACT(MONTH FROM te.date) = p_month
  ORDER BY te.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk insert godzin dla wielu pracowników
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

-- Eksport danych do CSV (zwraca JSON do przetworzenia w app)
CREATE OR REPLACE FUNCTION export_time_entries(
  p_employee_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(t))
    FROM (
      SELECT 
        e.name as employee_name,
        e.position,
        te.date,
        te.hours,
        te.status,
        te.notes
      FROM time_entries te
      JOIN employees e ON e.id = te.employee_id
      WHERE (p_employee_id IS NULL OR te.employee_id = p_employee_id)
        AND (p_start_date IS NULL OR te.date >= p_start_date)
        AND (p_end_date IS NULL OR te.date <= p_end_date)
      ORDER BY e.name, te.date
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL DATA
-- =====================================================
-- Możesz dodać przykładowe dane do testowania
```

---

## Struktura Projektu

```
timetracker-mobile/
├── app/                          # Expo Router (nowy routing)
│   ├── (tabs)/
│   │   ├── index.tsx            # Dashboard
│   │   ├── employees.tsx        # Lista pracowników
│   │   ├── scanner.tsx          # Scanner OCR
│   │   └── reports.tsx          # Raporty
│   ├── employee/[id].tsx        # Szczegóły pracownika
│   ├── _layout.tsx              # Root layout
│   └── +not-found.tsx
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── employee/
│   │   ├── EmployeeCard.tsx
│   │   ├── EmployeeForm.tsx
│   │   └── EmployeeList.tsx
│   ├── time/
│   │   ├── TimeEntryCard.tsx
│   │   ├── TimeEntryForm.tsx
│   │   ├── BulkTimeForm.tsx
│   │   └── Calendar.tsx
│   └── shared/
│       ├── Header.tsx
│       └── LoadingSpinner.tsx
│
├── services/
│   ├── supabase.ts              # Supabase client
│   ├── database.ts              # Database operations
│   ├── ocr.ts                   # OCR service
│   ├── export.ts                # Export service (Excel/PDF)
│   └── sync.ts                  # Offline sync
│
├── stores/
│   ├── employeeStore.ts         # Zustand store
│   ├── timeEntryStore.ts
│   ├── documentStore.ts
│   └── syncStore.ts
│
├── hooks/
│   ├── useEmployees.ts          # React Query hooks
│   ├── useTimeEntries.ts
│   ├── useDocuments.ts
│   └── useOfflineSync.ts
│
├── utils/
│   ├── date.ts                  # Date helpers
│   ├── validation.ts
│   ├── formatting.ts
│   └── constants.ts
│
├── types/
│   ├── database.types.ts        # Generated from Supabase
│   ├── models.ts
│   └── api.ts
│
├── assets/
│   ├── images/
│   └── fonts/
│
├── supabase/
│   ├── functions/               # Edge Functions
│   │   ├── ocr-process/
│   │   └── export-pdf/
│   └── migrations/              # SQL migrations
│       └── 20260217000000_initial_schema.sql
│
├── .env.local
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Konfiguracja Środowiska

### 1. Instalacja dependencies

```bash
# Utwórz nowy projekt Expo
npx create-expo-app timetracker-mobile --template blank-typescript

cd timetracker-mobile

# Core dependencies
npm install @supabase/supabase-js
npm install @tanstack/react-query
npm install zustand
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-paper
npm install date-fns

# Expo modules
npx expo install expo-camera expo-file-system expo-document-picker
npx expo install expo-sharing expo-print

# Export libraries
npm install exceljs
npm install jspdf jspdf-autotable

# OCR (wybierz jedną)
npm install tesseract.js  # Dla prostych przypadków
# LUB użyj OpenAI Vision API dla lepszych rezultatów

# Dev dependencies
npm install -D @types/node
```

### 2. Konfiguracja Supabase

```bash
# Zainstaluj Supabase CLI
npm install -g supabase

# Zaloguj się
supabase login

# Inicjalizuj projekt
supabase init

# Linkuj z projektem w chmurze
supabase link --project-ref YOUR_PROJECT_REF

# Zastosuj migracje
supabase db push
```

### 3. Zmienne środowiskowe

Utwórz plik `.env.local`:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (opcjonalnie dla OCR)
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-key

# App Config
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENV=development
```

### 4. Konfiguracja TypeScript

`tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/services/*": ["./services/*"],
      "@/stores/*": ["./stores/*"],
      "@/utils/*": ["./utils/*"],
      "@/types/*": ["./types/*"]
    }
  }
}
```

---

## Integracja z Cline/VSCode

### Konfiguracja Cline dla TimeTracker

Utwórz plik `.cline/project-knowledge.md`:

```markdown
# TimeTracker Project Knowledge

## Project Overview
Mobile time tracking app for construction workers with OCR document scanning.

## Tech Stack
- React Native + Expo
- Supabase (PostgreSQL + Auth + Storage)
- TypeScript
- Zustand + React Query
- Expo Camera + OCR

## Key Patterns
1. All database operations through services layer
2. Zustand for local state, React Query for server state
3. Offline-first architecture with sync queue
4. Component-driven development with atomic design

## Database Schema
[Paste kluczowe tabele]

## Coding Conventions
- Use TypeScript strict mode
- Functional components with hooks
- Async/await for all async operations
- Error boundaries for critical sections
- Tailwind-style inline styles (via NativeWind if needed)

## Common Tasks
- Adding new screen: Create in app/(tabs)/ or app/[dynamic]/
- New database table: Add migration in supabase/migrations/
- New API call: Add to services/, wrap in React Query hook
- New component: Add to components/ with TypeScript types

## Environment
- Development: Expo Go app on phone
- Production: EAS Build for App Store/Play Store
```

### Skille dla Cline

Utworzę teraz dedykowane skille które przyspieszą Twoją pracę:

<function_calls>
<invoke name="bash_tool">
<parameter name="command">mkdir -p /home/claude/cline-skills/timetracker