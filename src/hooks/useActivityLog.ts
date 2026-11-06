import { useState, useCallback, useEffect } from 'react';
import { ActivityLogItem, LogLevel } from '../types/system';
import { StorageService } from '../services/storageService';

export function useActivityLog() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);

  useEffect(() => {
    setLogs(StorageService.getLogs());
  }, []);

  const addLog = useCallback(
    (
      category: ActivityLogItem['category'],
      title: string,
      detail: string,
      level: LogLevel = 'info'
    ) => {
      const updated = StorageService.addLog({
        category,
        title,
        detail,
        level,
      });
      setLogs(updated);
    },
    []
  );

  const clearLogs = useCallback(() => {
    StorageService.clearLogs();
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}
