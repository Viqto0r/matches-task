# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Test assignment «Матчи тура»: a single-screen Expo (SDK 57) / React Native 0.86 / React 19 / TypeScript (strict) app with no router. It runs in a browser via react-native-web and in Expo Go. The full task spec is in `README.md`. The deliverable write-up goes in `SOLUTION.md`, and its template sections must be filled.

## Commands

```bash
npm install
npm run web          # run in browser (the acceptance criterion: must work after a fresh npm install)
npm start            # Expo Go via QR code
npx tsc --noEmit     # typecheck (also: npm run typecheck); run before declaring a task done
npm run lint         # expo lint (eslint-config-expo)
npm test             # jest-expo + @testing-library/react-native
npx jest src/lib     # run a subset; npx jest -t 'name' for a single test
npx expo install <pkg>  # add dependencies this way, not npm install <pkg>, to get SDK-compatible versions
```

Testing notes: RNTL v14 is fully async (`await render`, `await renderHook`, `await unmount`; interactions via `userEvent.setup()`). TypeScript 6 doesn't auto-include `@types/*`, hence `"types": ["jest"]` in `tsconfig.json`. In jest, RN `Pressable` converts `aria-*` to `accessibilityState`, so web-only accessibility (react-native-web ignores `accessibilityState`; use `aria-*` props) can only be verified in a browser.

## Expo version caveat (from AGENTS.md)

Expo ships breaking changes every SDK release. Before using an Expo or React Native API, check the `expo` major version in `package.json` and consult `https://docs.expo.dev/versions/v<major>.0.0/` (or `https://docs.expo.dev/llms.txt`), not memory. Do not add native modules that require a development build. The app must keep working in Expo Go.

## Architecture

- `index.ts` → `registerRootComponent(App)`, then `App.tsx` renders `MatchesScreen` (`src/screens/`).
- `src/config.ts` holds `MATCHES_URL`, the raw GitHub URL of `data/matches.json`. The fetched data is the same JSON as the local file. The template had an `OWNER/REPO` placeholder; it now points at this repo (`Viqto0r/matches-task`).
- Data shape (`data/matches.json`): `{ round, matches: Match[] }`, where `Match = { id, startsAt: ISO-UTC | null, status, minute?, home, away, score: {home, away} | null }` and `home`/`away` are `{ id, name, city }`. Statuses include `finished`, `live` (with `minute`), `scheduled`, and `postponed` (with `startsAt: null`). Handle these edge cases explicitly.
- Times must be shown in the device's time zone. Status labels are in Russian.
- Layers: `src/api/matches.ts` (fetch + response validation) → `src/hooks/useMatches.ts` (loading/error/refresh lifecycle, AbortController against races) → `src/screens/MatchesScreen.tsx` (composes `MatchCard`, `FilterTabs`, `StateView`, `UpdatedAgo`, `useFavorites`). Pure logic (filter, sort, formatting, status labels) lives in `src/lib/matches.ts`.
- Filter rule: «Завершённые» = `finished` only; everything else (incl. `live`, `postponed`, unknown statuses) is «Предстоящие», so no match is ever lost.
- `FavoriteButton`, `useFavorites`, `UpdatedAgo` were the "colleague's code" with bugs (README part 2). The bugs are reproduced by user-behavior tests in `src/__tests__/*.bug.test.tsx` (harness in `src/test-utils/`) and fixed; root causes are in `SOLUTION.md`.
