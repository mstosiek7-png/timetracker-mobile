// =====================================================
// TimeTracker - Modele danych
// =====================================================

export interface Employee {
  id: string;
  name: string;
  position: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
export type EmployeeUpdate = Partial<EmployeeInsert>;

// =====================================================
// Time Entries
// =====================================================

export type TimeEntryStatus = 'work' | 'sick' | 'vacation' | 'fza';

export interface TimeEntry {
  id: string;
  employee_id: string;
  date: string;
  hours: number;
  status: TimeEntryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type TimeEntryInsert = Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
export type TimeEntryUpdate = Partial<TimeEntryInsert>;

// =====================================================
// Change History (Audit Log)
// =====================================================

export type ChangeAction =
  | 'add_hours'
  | 'edit_hours'
  | 'delete_hours'
  | 'add_employee'
  | 'delete_employee';

export interface ChangeHistory {
  id: string;
  action: ChangeAction;
  entity_type: 'employee' | 'time_entry' | 'document';
  entity_id: string | null;
  employee_id: string | null;
  description: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
  user_email: string | null;
}

// =====================================================
// Documents (OCR)
// =====================================================

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  ocr_text: string | null;
  ocr_data: Record<string, unknown> | null;
  status: DocumentStatus;
  project_id: string | null;
  date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

// =====================================================
// Sync Queue
// =====================================================

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  table_name: string;
  record_id: string;
  data: Record<string, unknown>;
  status: SyncStatus;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  synced_at: string | null;
  created_by: string | null;
}

// =====================================================
// Views / Aggregated Types
// =====================================================

export interface MonthlySummary {
  employee_id: string;
  employee_name: string;
  position: string;
  month: string;
  status: TimeEntryStatus;
  total_hours: number;
  days_count: number;
}

export interface DailySummary {
  date: string;
  employees_count: number;
  work_hours: number;
  sick_hours: number;
  vacation_hours: number;
  fza_hours: number;
  total_hours: number;
}

// =====================================================
// Employee with relations
// =====================================================

export interface EmployeeWithEntries extends Employee {
  time_entries: TimeEntry[];
}
