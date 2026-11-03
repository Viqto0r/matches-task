export type Team = { id: string; name: string; city: string };

export type Score = { home: number; away: number };

// Известные статусы: 'scheduled' | 'live' | 'finished' | 'postponed'.
// Тип — string, потому что сервер может прислать новый статус, и терять такой матч нельзя.
export type Match = {
  id: string;
  startsAt: string | null; // ISO в UTC; null — дата не определена (например, перенесённый матч)
  status: string;
  minute?: number; // только для live
  home: Team;
  away: Team;
  score: Score | null;
};
