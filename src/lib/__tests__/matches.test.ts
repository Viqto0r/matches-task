import { parseMatchesResponse } from '../../api/matches';
import fixture from '../../../data/matches.json';
import type { Match } from '../../types';
import {
  filterMatches,
  formatScore,
  formatStartsAt,
  sortMatches,
  statusLabel,
  type MatchFilter,
} from '../matches';

const all = parseMatchesResponse(fixture);
const ids = (list: Match[]) => list.map((m) => m.id);
const withStatus = (status: string, extra: Partial<Match> = {}): Match => ({ ...all[0], id: `x-${status}`, status, ...extra });

describe('filterMatches', () => {
  it('«Завершённые» — только finished', () => {
    expect(ids(filterMatches(all, 'finished'))).toEqual(['m1', 'm2', 'm3']);
  });

  it('«Предстоящие» — всё незавершённое, включая live и postponed', () => {
    expect(ids(filterMatches(all, 'upcoming'))).toEqual(['m4', 'm5', 'm6', 'm7', 'm8']);
  });

  it('«Все» возвращает все матчи', () => {
    expect(filterMatches(all, 'all')).toHaveLength(all.length);
  });

  it('неизвестный статус не теряется: попадает в «Предстоящие» и «Все»', () => {
    const list = [...all, withStatus('cancelled')];
    expect(ids(filterMatches(list, 'upcoming'))).toContain('x-cancelled');
    expect(ids(filterMatches(list, 'all'))).toContain('x-cancelled');
    expect(ids(filterMatches(list, 'finished'))).not.toContain('x-cancelled');
  });

  it('«Предстоящие» + «Завершённые» = «Все»', () => {
    const list = [...all, withStatus('cancelled'), withStatus('weird')];
    const count = (f: MatchFilter) => filterMatches(list, f).length;
    expect(count('upcoming') + count('finished')).toBe(count('all'));
  });
});

describe('sortMatches', () => {
  it('сортирует по времени начала, матч без даты — в конце', () => {
    const shuffled = [...all].reverse();
    expect(ids(sortMatches(shuffled))).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm8', 'm7']);
  });

  it('не мутирует входной массив', () => {
    const input = [...all].reverse();
    const copy = [...input];
    sortMatches(input);
    expect(input).toEqual(copy);
  });
});

describe('statusLabel', () => {
  const byId = (id: string) => all.find((m) => m.id === id)!;

  it.each([
    ['m1', 'Завершён'],
    ['m4', "Идёт · 67'"],
    ['m5', 'Запланирован'],
    ['m7', 'Перенесён'],
  ])('%s → %s', (id, label) => {
    expect(statusLabel(byId(id))).toBe(label);
  });

  it('live без минуты — просто «Идёт»', () => {
    expect(statusLabel(withStatus('live', { minute: undefined }))).toBe('Идёт');
  });

  it('неизвестный статус показывается как есть', () => {
    expect(statusLabel(withStatus('cancelled'))).toBe('cancelled');
  });
});

describe('formatScore', () => {
  it('форматирует счёт, включая 0 : 0', () => {
    expect(formatScore({ home: 2, away: 1 })).toBe('2 : 1');
    expect(formatScore({ home: 0, away: 0 })).toBe('0 : 0');
  });

  it('нет счёта → null', () => {
    expect(formatScore(null)).toBeNull();
  });
});

describe('formatStartsAt', () => {
  it('показывает время в заданном часовом поясе', () => {
    const msk = formatStartsAt('2026-10-11T13:00:00Z', 'Europe/Moscow');
    expect(msk).toContain('16:00');
    expect(msk).toContain('11');
    expect(formatStartsAt('2026-10-11T13:00:00Z', 'Asia/Vladivostok')).toContain('23:00');
  });

  it('по умолчанию использует пояс устройства', () => {
    const iso = '2026-10-11T13:00:00Z';
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    expect(formatStartsAt(iso)).toContain(`${hh}:${mm}`);
  });

  it.each([[null], ['garbage'], ['']])('нет даты или битая дата (%p) → «Дата уточняется»', (iso) => {
    expect(formatStartsAt(iso)).toBe('Дата уточняется');
  });
});
