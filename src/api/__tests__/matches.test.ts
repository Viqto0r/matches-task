import { MATCHES_URL } from '../../config';
import { fetchMatches, parseMatchesResponse } from '../matches';

import fixture from '../../../data/matches.json';

describe('parseMatchesResponse', () => {
  it('разбирает пример ответа со всеми матчами', () => {
    const matches = parseMatchesResponse(fixture);
    expect(matches).toHaveLength(8);
    expect(matches.find((m) => m.id === 'm7')?.startsAt).toBeNull();
    expect(matches.find((m) => m.id === 'm4')?.minute).toBe(67);
  });

  it.each([[{}], [null], [{ matches: 'x' }], ['oops']])('бросает ошибку на неверной форме %p', (input) => {
    expect(() => parseMatchesResponse(input)).toThrow();
  });

  it('отбрасывает элементы без id/home/away, остальные сохраняет', () => {
    const good = fixture.matches[0];
    const matches = parseMatchesResponse({
      matches: [good, { ...good, id: undefined }, { ...good, id: 'x', home: null }, null, { ...good, id: 'y', away: undefined }],
    });
    expect(matches.map((m) => m.id)).toEqual([good.id]);
  });
});

describe('fetchMatches', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('при HTTP-ошибке отклоняется с кодом статуса', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetchMatches()).rejects.toThrow(/404/);
  });

  it('загружает MATCHES_URL и возвращает разобранные матчи', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => fixture });
    const matches = await fetchMatches();
    expect(globalThis.fetch).toHaveBeenCalledWith(MATCHES_URL, expect.anything());
    expect(matches).toEqual(parseMatchesResponse(fixture));
  });
});
