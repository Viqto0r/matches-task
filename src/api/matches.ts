import { MATCHES_URL } from '../config';
import type { Match } from '../types';

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

const isTeam = (value: unknown) => isObject(value) && typeof value.name === 'string';

// Проверяет форму ответа. Битый ответ целиком — ошибка; отдельный битый матч — пропускаем,
// чтобы один кривой элемент не ломал весь экран.
export function parseMatchesResponse(json: unknown): Match[] {
  if (!isObject(json) || !Array.isArray(json.matches)) {
    throw new Error('Неожиданный формат ответа сервера');
  }
  return json.matches.filter(
    (m: unknown): m is Match =>
      isObject(m) && typeof m.id === 'string' && isTeam(m.home) && isTeam(m.away),
  );
}

export async function fetchMatches(signal?: AbortSignal): Promise<Match[]> {
  const response = await fetch(MATCHES_URL, { signal });
  if (!response.ok) {
    throw new Error(`Ошибка сервера: ${response.status}`);
  }
  return parseMatchesResponse(await response.json());
}
