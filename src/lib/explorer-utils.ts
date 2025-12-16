/**
 * Форматирует размер файла в человекочитаемый формат
 */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Форматирует дату в локализованный формат
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Извлекает имя файла из пути
 */
export function getFileNameOnly(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}

/**
 * Определяет иконку по типу документа
 */
export function getDocumentIcon(documentType: string | undefined): string {
  const typeMap: Record<string, string> = {
    pdf: 'file-text',
    txt: 'file-text',
    md: 'file-text',
    doc: 'file-text',
    docx: 'file-text',
    csv: 'table',
    xlsx: 'table',
    json: 'braces',
    html: 'code',
  };
  return typeMap[documentType?.toLowerCase() || ''] || 'file';
}
