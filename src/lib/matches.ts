import type { Match, Score } from '../types';

export type MatchFilter = 'all' | 'upcoming' | 'finished';

export const FILTERS: MatchFilter[] = ['all', 'upcoming', 'finished'];

export const FILTER_LABELS: Record<MatchFilter, string> = {
  all: 'Все',
  upcoming: 'Предстоящие',
  finished: 'Завершённые',
};

// «Завершённые» — только finished. Всё остальное (scheduled, live, postponed и неизвестные
// статусы) — «Предстоящие»: матч ещё не сыгран до конца. Так каждый матч попадает ровно
// в одну из двух вкладок и ни один не теряется.
const isFinished = (match: Match) => match.status === 'finished';

export function filterMatches(matches: Match[], filter: MatchFilter): Match[] {
  switch (filter) {
    case 'finished':
      return matches.filter(isFinished);
    case 'upcoming':
      return matches.filter((m) => !isFinished(m));
    default:
      return matches;
  }
}

const startTime = (match: Match) => {
  const time = match.startsAt ? Date.parse(match.startsAt) : NaN;
  return Number.isNaN(time) ? Infinity : time;
};

// По времени начала; матчи без даты — в конце. sort стабилен, при равенстве порядок сохраняется.
export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const ta = startTime(a);
    const tb = startTime(b);
    return ta === tb ? 0 : ta < tb ? -1 : 1;
  });
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Запланирован',
  live: 'Идёт',
  finished: 'Завершён',
  postponed: 'Перенесён',
};

export function statusLabel(match: Match): string {
  const label = STATUS_LABELS[match.status] ?? match.status;
  if (match.status === 'live' && typeof match.minute === 'number') {
    return `${label} · ${match.minute}'`;
  }
  return label;
}

export function formatScore(score: Score | null): string | null {
  return score ? `${score.home} : ${score.away}` : null;
}

export const NO_DATE_LABEL = 'Дата уточняется';

// Без timeZone Intl использует часовой пояс устройства; параметр нужен для детерминированных тестов.
export function formatStartsAt(iso: string | null, timeZone?: string): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return NO_DATE_LABEL;
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}
