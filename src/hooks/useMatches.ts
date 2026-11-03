import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMatches } from '../api/matches';
import type { Match } from '../types';

export type MatchesState = {
  status: 'loading' | 'error' | 'ready'; // 'error' — только когда показать нечего
  matches: Match[]; // последние успешно загруженные
  error: string | null; // в т.ч. ошибка обновления, когда список уже есть
  isRefreshing: boolean;
  lastUpdated: Date | null; // меняется только при успешной загрузке
  reload: () => void; // и «Повторить», и «Обновить»
};

type Fetcher = (signal: AbortSignal) => Promise<Match[]>;

const ERROR_TEXT = 'Не удалось загрузить матчи';

export function useMatches(fetcher: Fetcher = fetchMatches): MatchesState {
  const [matches, setMatches] = useState<Match[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    // Новый запрос отменяет предыдущий: устаревший ответ не перезапишет свежий.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    fetcher(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setMatches(data);
        setLastUpdated(new Date());
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(ERROR_TEXT);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
  }, [fetcher]);

  useEffect(() => {
    reload();
    return () => controllerRef.current?.abort();
  }, [reload]);

  const hasData = lastUpdated !== null;
  const status = hasData ? 'ready' : error ? 'error' : 'loading';

  return {
    status,
    matches,
    error,
    isRefreshing: hasData && isLoading,
    lastUpdated,
    reload,
  };
}
