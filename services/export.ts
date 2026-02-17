// =====================================================
// Export Service - Excel/PDF Report Generation
// =====================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TimeEntry } from '../types/models';

// Types for Supabase response
interface TimeEntryWithEmployee {
  hours: number;
  date: string;
  status: string;
  notes: string | null;
  employees: {
    name: string;
    position: string;
  } | null;
}

// Types
export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  includeNotes?: boolean;
  format: 'excel' | 'pdf';
}

export interface ReportData {
  employeeName: string;
  position: string;
  date: string;
  hours: number;
  status: string;
  notes?: string;
}

// =====================================================
// Excel Export Functions
// =====================================================

/**
 * Generuje raport Excel z danymi o czasie pracy
 * Używa biblioteki xlsx (SheetJS) - lżejszej i kompatybilnej z React Native
 */
export async function generateExcelReport(options: ExportOptions): Promise<string> {
  try {
    // Pobierz dane z bazy
    const data = await fetchReportData(options);

    // Przygotuj nagłówki
    const headers = [
      'Pracownik',
      'Stanowisko',
      'Data',
      'Godziny',
      'Status',
      ...(options.includeNotes ? ['Notatki'] : []),
    ];

    // Przygotuj wiersze danych
    const rows = data.map(row => [
      row.employeeName,
      row.position,
      row.date,
      row.hours,
      translateStatus(row.status),
      ...(options.includeNotes ? [row.notes || ''] : []),
    ]);

    // Dodaj podsumowanie
    const totalHours = data.reduce((sum, row) => sum + row.hours, 0);
    rows.push([]); // Pusty wiersz
    const summaryRow: (string | number)[] = ['Łączna liczba godzin:', '', '', totalHours, ''];
    if (options.includeNotes) summaryRow.push('');
    rows.push(summaryRow);

    // Utwórz arkusz z nagłówkami i danymi
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ustaw szerokości kolumn
    worksheet['!cols'] = [
      { wch: 25 }, // Pracownik
      { wch: 20 }, // Stanowisko
      { wch: 12 }, // Data
      { wch: 10 }, // Godziny
      { wch: 15 }, // Status
      ...(options.includeNotes ? [{ wch: 30 }] : []), // Notatki
    ];

    // Utwórz skoroszyt
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raport czasu pracy');

    // Generuj plik jako base64
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // Generuj datę w nazwie pliku
    const fileName = `raport_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Zapisz do pliku
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (error) {
    console.error('Błąd generowania raportu Excel:', error);
    throw new Error('Nie udało się wygenerować raportu Excel');
  }
}

// =====================================================
// PDF Export Functions
// =====================================================

/**
 * Generuje raport PDF z danymi o czasie pracy
 */
export async function generatePdfReport(options: ExportOptions): Promise<string> {
  try {
    // Pobierz dane z bazy
    const data = await fetchReportData(options);
    
    // Utwórz nowy dokument PDF
    const doc = new jsPDF('landscape');
    
    // Nagłówek raportu
    doc.setFontSize(16);
    doc.text('Raport czasu pracy', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Okres: ${format(options.startDate, 'dd.MM.yyyy', { locale: pl })} - ${format(options.endDate, 'dd.MM.yyyy', { locale: pl })}`, 14, 30);
    doc.text(`Wygenerowano: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: pl })}`, 14, 35);
    
    // Przygotuj dane dla tabeli
    const tableData = data.map(row => [
      row.employeeName,
      row.position,
      row.date,
      row.hours.toFixed(2),
      translateStatus(row.status),
      ...(options.includeNotes ? [row.notes || ''] : [])
    ]);
    
    // Nagłówki kolumn
    const headers = [
      'Pracownik',
      'Stanowisko',
      'Data',
      'Godziny',
      'Status',
      ...(options.includeNotes ? ['Notatki'] : [])
    ];
    
    // Dodaj tabelę
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [64, 64, 64],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        ...(options.includeNotes ? { 5: { cellWidth: 50 } } : {})
      }
    });
    
    // Dodaj podsumowanie
    const totalHours = data.reduce((sum, row) => sum + row.hours, 0);
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Łączna liczba godzin: ${totalHours.toFixed(2)}`, 14, finalY + 10);
    
    // Generuj datę w nazwie pliku
    const fileName = `raport_${format(options.startDate, 'yyyy-MM-dd')}_${format(options.endDate, 'yyyy-MM-dd')}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Zapisz do pliku
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    return fileUri;
  } catch (error) {
    console.error('Błąd generowania raportu PDF:', error);
    throw new Error('Nie udało się wygenerować raportu PDF');
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Pobiera dane do raportu z bazy danych
 */
async function fetchReportData(options: ExportOptions): Promise<ReportData[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      hours,
      date,
      status,
      notes,
      employees (
        name,
        position
      )
    `)
    .gte('date', format(options.startDate, 'yyyy-MM-dd'))
    .lte('date', format(options.endDate, 'yyyy-MM-dd'))
    .order('date', { ascending: false });
  
  if (error) {
    throw new Error(`Błąd pobierania danych: ${error.message}`);
  }
  
  // Transformuj dane
  return data.map(entry => {
    // Supabase może zwrócić relację jako obiekt lub tablicę
    const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
    return {
      employeeName: employee?.name || 'Nieznany',
      position: employee?.position || '',
      date: format(new Date(entry.date), 'dd.MM.yyyy'),
      hours: entry.hours,
      status: entry.status,
      notes: entry.notes
    };
  });
}

/**
 * Tłumaczy status na język polski
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'work': 'Praca',
    'sick': 'Chorobowe',
    'vacation': 'Urlop',
    'fza': 'FZA'
  };
  
  return translations[status] || status;
}

/**
 * Udostępnia plik użytkownikowi (do pobrania/wysłania)
 */
export async function shareReport(fileUri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Udostępnianie nie jest dostępne na tym urządzeniu');
  }
  
  await Sharing.shareAsync(fileUri, {
    mimeType: fileUri.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Udostępnij raport',
    UTI: fileUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet'
  });
}

/**
 * Drukuje raport PDF
 */
export async function printReport(fileUri: string): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64
  });
  
  await Print.printAsync({
    html: `<iframe src="data:application/pdf;base64,${base64}" width="100%" height="100%"></iframe>`,
    orientation: 'landscape'
  });
}

/**
 * Pobiera dostępne raporty z lokalnego systemu plików
 */
export async function getSavedReports(): Promise<Array<{ uri: string; name: string; size: number; modified: Date }>> {
  const reportsDir = `${FileSystem.documentDirectory}reports/`;
  
  // Utwórz katalog jeśli nie istnieje
  const dirInfo = await FileSystem.getInfoAsync(reportsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
    return [];
  }
  
  // Pobierz listę plików
  const files = await FileSystem.readDirectoryAsync(reportsDir);
  
  const reports = await Promise.all(
    files
      .filter(file => file.endsWith('.pdf') || file.endsWith('.xlsx'))
      .map(async file => {
        const fileUri = `${reportsDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        return {
          uri: fileUri,
          name: file,
          size: fileInfo.exists ? (fileInfo.size ?? 0) : 0,
          modified: new Date(fileInfo.exists ? (fileInfo.modificationTime ?? Date.now()) : Date.now())
        };
      })
  );
  
  return reports.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/**
 * Usuwa zapisany raport
 */
export async function deleteReport(fileUri: string): Promise<void> {
  await FileSystem.deleteAsync(fileUri);
}
