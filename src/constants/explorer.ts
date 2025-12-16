/**
 * Константы для Explorer
 */

// Статусы ingestion
export const DEFAULT_INGESTION_STATUSES = [
  'pending',
  'parsing',
  'extracting',
  'chunking',
  'embedding',
  'augmenting',
  'storing',
  'enriching',
  'failed',
  'success',
] as const;

// Статусы extraction
export const DEFAULT_EXTRACTION_STATUSES = [
  'success',
  'failed',
  'pending',
  'processing',
] as const;

// Качество загрузки
export const UPLOAD_QUALITY_OPTIONS = [
  { value: 'hi-res', label: 'High Resolution' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'fast', label: 'Fast' },
] as const;

// Пресеты метаданных
export const METADATA_PRESETS: Record<string, string[]> = {
  category: ['Technical', 'Business', 'Legal', 'Marketing', 'Research'],
  priority: ['High', 'Medium', 'Low'],
  status: ['Draft', 'Review', 'Final', 'Archived'],
  department: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'],
};

// Лимиты
export const DEFAULT_FETCH_LIMIT = 100;
export const DEFAULT_POLLING_INTERVAL = 5000; // 5 seconds
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_UPLOAD_FILES = 10;
