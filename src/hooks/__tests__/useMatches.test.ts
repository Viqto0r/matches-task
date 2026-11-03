import { act, renderHook, waitFor } from '@testing-library/react-native';
import fixture from '../../../data/matches.json';
import { parseMatchesResponse } from '../../api/matches';
import type { Match } from '../../types';
import { useMatches } from '../useMatches';

const ALL = parseMatchesResponse(fixture);

// Управляемый fetcher: каждый вызов возвращает промис, который тест резолвит сам.
function controlledFetcher() {
  const calls: { signal: AbortSignal; resolve: (m: Match[]) => void; reject: (e: Error) => void }[] = [];
  const fetcher = jest.fn(
    (signal: AbortSignal) =>
      new Promise<Match[]>((resolve, reject) => {
        calls.push({ signal, resolve, reject });
      }),
  );
  return { fetcher, calls };
}

describe('useMatches', () => {
  it('загружает матчи: loading → ready', async () => {
    const { fetcher, calls } = controlledFetcher();
    const { result } = await renderHook(() => useMatches(fetcher));
    expect(result.current.status).toBe('loading');
    expect(result.current.lastUpdated).toBeNull();

    await act(async () => calls[0].resolve(ALL));
    expect(result.current.status).toBe('ready');
    expect(result.current.matches).toHaveLength(8);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(result.current.error).toBeNull();
  });

  it('ошибка без данных → error, «Повторить» → loading → ready', async () => {
    const { fetcher, calls } = controlledFetcher();
    const { result } = await renderHook(() => useMatches(fetcher));
    await act(async () => calls[0].reject(new Error('boom')));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();

    await act(async () => result.current.reload());
    expect(result.current.status).toBe('loading');
    await act(async () => calls[1].resolve(ALL));
    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  it('ошибка обновления при наличии данных: список остаётся, время обновления не меняется', async () => {
    const { fetcher, calls } = controlledFetcher();
    const { result } = await renderHook(() => useMatches(fetcher));
    await act(async () => calls[0].resolve(ALL));
    const updated = result.current.lastUpdated;

    await act(async () => result.current.reload());
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.status).toBe('ready');
    await act(async () => calls[1].reject(new Error('boom')));

    expect(result.current.status).toBe('ready');
    expect(result.current.matches).toHaveLength(8);
    expect(result.current.error).toBeTruthy();
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.lastUpdated).toBe(updated);
  });

  it('гонка: поздний ответ старого запроса не перезаписывает свежий', async () => {
    const { fetcher, calls } = controlledFetcher();
    const { result } = await renderHook(() => useMatches(fetcher));
    await act(async () => calls[0].resolve(ALL));

    await act(async () => result.current.reload());
    await act(async () => result.current.reload());
    expect(calls[1].signal.aborted).toBe(true);

    await act(async () => calls[2].resolve(ALL.slice(0, 2)));
    await act(async () => calls[1].resolve(ALL.slice(0, 5)));
    expect(result.current.matches).toHaveLength(2);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('размонтирование во время загрузки отменяет запрос', async () => {
    const { fetcher, calls } = controlledFetcher();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = await renderHook(() => useMatches(fetcher));
    await unmount();
    expect(calls[0].signal.aborted).toBe(true);
    await act(async () => calls[0].resolve(ALL));
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('по умолчанию использует fetchMatches', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fixture });
    const { result } = await renderHook(() => useMatches());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.matches).toHaveLength(8);
    globalThis.fetch = original;
  });
});
