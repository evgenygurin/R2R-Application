import { useEffect, useRef, useCallback } from 'react';
import { DocumentResponse } from 'r2r-js';

import { useUserContext } from '@/context/UserContext';
import logger from '@/lib/logger';
import { IngestionStatus, KGExtractionStatus } from '@/types';

interface UseDocumentPollingOptions {
  /**
   * Интервал polling в миллисекундах
   * @default 5000 (5 секунд)
   */
  interval?: number;

  /**
   * Включить polling только для документов с незавершенным статусом
   * @default true
   */
  onlyPending?: boolean;

  /**
   * Callback при успешном обновлении документов
   */
  onUpdate?: (documents: DocumentResponse[]) => void;

  /**
   * Максимальное количество попыток при ошибке
   * @default 3
   */
  maxRetries?: number;
}

/**
 * Custom hook для автоматического обновления статусов документов
 * через периодический polling R2R API
 */
export function useDocumentPolling(
  documentIds: string[],
  options: UseDocumentPollingOptions = {}
) {
  const {
    interval = 5000,
    onlyPending = true,
    onUpdate,
    maxRetries = 3,
  } = options;

  const { getClient } = useUserContext();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isPollingRef = useRef(false);

  /**
   * Проверяет нужен ли polling для документа
   */
  const needsPolling = useCallback(
    (doc: DocumentResponse): boolean => {
      if (!onlyPending) return true;

      const ingestionPending =
        doc.ingestionStatus !== IngestionStatus.SUCCESS &&
        doc.ingestionStatus !== IngestionStatus.FAILED;

      const extractionPending =
        doc.extractionStatus !== KGExtractionStatus.SUCCESS &&
        doc.extractionStatus !== KGExtractionStatus.FAILED;

      return ingestionPending || extractionPending;
    },
    [onlyPending]
  );

  /**
   * Получает обновленные данные документов
   */
  const fetchDocumentUpdates = useCallback(async () => {
    if (documentIds.length === 0 || isPollingRef.current) return;

    try {
      isPollingRef.current = true;
      const client = await getClient();
      if (!client) {
        throw new Error('Failed to get authenticated client');
      }

      // Получаем данные для каждого документа
      const promises = documentIds.map((id) =>
        client.documents.retrieve({ id }).catch((error) => {
          logger.warn('Failed to fetch document', { documentId: id, error });
          return null;
        })
      );

      const results = await Promise.all(promises);
      const documents = results
        .filter((result): result is { results: DocumentResponse } => result !== null)
        .map((result) => result.results);

      // Сбрасываем счетчик ошибок при успехе
      retryCountRef.current = 0;

      // Фильтруем только те, которые еще нужно обновлять
      const pendingDocuments = documents.filter(needsPolling);

      if (onUpdate) {
        onUpdate(documents);
      }

      // Останавливаем polling если все документы завершены
      if (pendingDocuments.length === 0 && onlyPending) {
        logger.info('All documents completed, stopping polling');
        stopPolling();
      }
    } catch (error) {
      logger.error('Error polling document updates', error as Error);
      retryCountRef.current += 1;

      if (retryCountRef.current >= maxRetries) {
        logger.error('Max retries reached, stopping polling');
        stopPolling();
      }
    } finally {
      isPollingRef.current = false;
    }
  }, [documentIds, getClient, needsPolling, onUpdate, onlyPending, maxRetries]);

  /**
   * Запускает polling
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Уже запущен

    logger.info('Starting document polling', {
      interval,
      documentCount: documentIds.length,
    });

    // Первый запрос сразу
    fetchDocumentUpdates();

    // Затем по интервалу
    intervalRef.current = setInterval(fetchDocumentUpdates, interval);
  }, [interval, documentIds.length, fetchDocumentUpdates]);

  /**
   * Останавливает polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      logger.info('Stopped document polling');
    }
  }, []);

  /**
   * Перезапускает polling (полезно при изменении списка документов)
   */
  const restartPolling = useCallback(() => {
    stopPolling();
    if (documentIds.length > 0) {
      startPolling();
    }
  }, [stopPolling, startPolling, documentIds.length]);

  /**
   * Effect для автоматического управления lifecycle
   */
  useEffect(() => {
    if (documentIds.length > 0) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [documentIds, startPolling, stopPolling]);

  return {
    startPolling,
    stopPolling,
    restartPolling,
    isPolling: intervalRef.current !== null,
  };
}
