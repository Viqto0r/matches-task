# «Матчи тура»: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Экран «Матчи тура». Загружает матчи с сервера, показывает их карточками и фильтрует. В нём есть состояния загрузки, ошибки и пустого списка, обновление и избранное. Баги в чужом коде исправлены, а их причины объяснены в `SOLUTION.md`.

**Architecture:** Чистая логика вынесена в `src/lib/` и `src/api/` и покрыта unit-тестами: разбор ответа, фильтр, сортировка, форматирование. Хук `useMatches` управляет жизненным циклом загрузки. Экран собирается из небольших презентационных компонентов. Части 2 (`useFavorites`, `UpdatedAgo`) исправляются точечно, без переписывания API.

**Tech Stack:** Expo SDK 57, React Native 0.86 + react-native-web, React 19, TypeScript strict. Тесты на jest-expo и @testing-library/react-native. Для живого теста используется Playwright, но только как временный инструмент, без добавления в зависимости проекта.

**Spec:** `README.md` (ТЗ), `CLAUDE.md`, `AGENTS.md`.

## Global Constraints

- Приложение запускается командой `npm run web` после `npm install`, Node.js 20+.
- Зависимости ставятся только через `npx expo install <pkg>`. Нативных модулей, которым нужен development build, быть не должно: приложение работает в Expo Go.
- Перед API Expo/RN нужно сверяться с `https://docs.expo.dev/versions/v57.0.0/`, а не с памятью.
- Карточка: хозяева и гости, счёт (если он есть), дата и время начала **в часовом поясе устройства**, статус по-русски.
- Фильтр: **Все / Предстоящие / Завершённые**.
- Подпись «Обновлено N сек назад» делается через существующий `UpdatedAgo`. Кнопка «Повторить» при ошибке, кнопка «Обновить» (и pull-to-refresh на нативе).
- Минимум 3–5 осмысленных коммитов по ходу работы, по одному на задачу. Перед каждым коммитом проходят `npx tsc --noEmit` и `npm test`. Единственное исключение — коммит с красными тестами, воспроизводящими баги (Task 3, Step 5).
- Бюджет времени по ТЗ — 1–2 часа. Задача 6 опциональна.

## Решения, зафиксированные планом

- **Статусы в фильтре.** «Завершённые» — это только `finished`. «Предстоящие» — всё остальное: `scheduled`, `live`, `postponed` и неизвестные статусы. Так «Все» = «Предстоящие» ∪ «Завершённые», и ни один матч не теряется. Это нужно описать в `SOLUTION.md`.
- **Сортировка.** По `startsAt` по возрастанию, матчи с `startsAt: null` идут в конец. При равенстве порядок исходный.
- **Подписи статусов:** `scheduled` → «Запланирован», `live` → «Идёт · 67'» (без `minute` просто «Идёт»), `finished` → «Завершён», `postponed` → «Перенесён». Неизвестный статус показывается как есть, без падения.
- **Дата.** `null` или невалидная строка дают «Дата уточняется». Иначе применяется `Intl.DateTimeFormat('ru-RU', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })` без `timeZone`, то есть в поясе устройства.
- **`MATCHES_URL`.** Плейсхолдер `OWNER/REPO` заменяется на публичную копию пользователя. Пока копии нет, используется `Interlabs22/test-app` (там те же данные). У raw.githubusercontent.com есть CORS `*`, поэтому в вебе запрос работает.
- **Тексты UI:** заголовок «Матчи тура»; ошибка «Не удалось загрузить матчи» + кнопка «Повторить»; пусто без данных — «Матчей пока нет»; пусто в выбранном фильтре — «Нет матчей в этой категории»; кнопка «Обновить».

## Review Focus

1. **`postponed` с `startsAt: null`.** Не должно быть «Invalid Date» и падения. Матч виден в «Все» и «Предстоящие» с текстом «Дата уточняется». Тесты: задачи 2 и 5.
2. **`live`.** Показываются счёт и минута, матч попадает в «Предстоящие» и не теряется. Тесты: задачи 2 и 5.
3. **Ошибка при обновлении, когда данные уже есть.** Список остаётся на экране, показывается баннер ошибки, «Обновлено N сек» **не** сбрасывается. Тест: задача 4.
4. **HTTP не 2xx (404 из-за плейсхолдера) и битый JSON.** Должно появиться состояние ошибки с «Повторить», а не необработанное исключение. Тесты: задачи 1 и 4.
5. **Двойное нажатие «Обновить» или гонка запросов.** Устаревший ответ не перезаписывает свежий, после размонтирования setState не вызывается. Тест: задача 4.

---

### Task 1: Тестовая инфраструктура, типы, загрузка данных

**Files:**
- Modify: `package.json` (скрипт `"test": "jest"`, `"jest": { "preset": "jest-expo" }`), `src/config.ts`
- Create: `src/types.ts`, `src/api/matches.ts`
- Test: `src/api/__tests__/matches.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/types.ts
  export type Team = { id: string; name: string; city: string };
  export type Score = { home: number; away: number };
  export type Match = {
    id: string; startsAt: string | null; status: string; // status: string — допускаем неизвестные
    minute?: number; home: Team; away: Team; score: Score | null;
  };
  // src/api/matches.ts
  export function parseMatchesResponse(json: unknown): Match[]; // throws Error при неверной форме
  export function fetchMatches(signal?: AbortSignal): Promise<Match[]>; // throws при !res.ok
  ```

- [ ] **Step 1: Установить тестовые зависимости.** Команда: `npx expo install jest-expo jest @types/jest @testing-library/react-native -- --save-dev`. Нужны также peer-зависимости, которые RNTL требует для React 19.2 (сверить с документацией Expo SDK 57 «Unit testing»). Добавить скрипт `test` и preset.
- [ ] **Step 2: Написать падающие тесты** в `matches.test.ts`:
  - `parseMatchesResponse(require('../../../data/matches.json'))` возвращает 8 матчей, у `m7` `startsAt === null`, у `m4` `minute === 67`;
  - `parseMatchesResponse({})`, `parseMatchesResponse(null)`, `parseMatchesResponse({ matches: 'x' })` → throw;
  - элементы без `id`/`home`/`away` отбрасываются, остальные сохраняются;
  - `fetchMatches` с `global.fetch`, замоканным на `{ ok:false, status:404 }`, → reject с сообщением, где есть `404`;
  - `fetchMatches` с ok-ответом → `fetch` вызван с `MATCHES_URL`, результат тот же, что у `parseMatchesResponse`.
- [ ] **Step 3: Запустить** `npm test -- src/api`. Ожидается FAIL: модуль не найден.
- [ ] **Step 4: Реализовать** `src/types.ts` и `src/api/matches.ts`. В `src/config.ts` заменить `OWNER/REPO` на `Interlabs22/test-app` и поправить комментарий.
- [ ] **Step 5: Проверить.** `npm test -- src/api` даёт PASS, `npx tsc --noEmit` проходит чисто.
- [ ] **Step 6: Commit** `feat: типы матчей, загрузка и разбор ответа, настройка jest`.

### Task 2: Доменная логика — фильтр, сортировка, форматирование

**Files:**
- Create: `src/lib/matches.ts`
- Test: `src/lib/__tests__/matches.test.ts`

**Interfaces:**
- Consumes: `Match`, `Score` из `src/types.ts`.
- Produces:
  ```ts
  export type MatchFilter = 'all' | 'upcoming' | 'finished';
  export const FILTER_LABELS: Record<MatchFilter, string>; // 'Все' | 'Предстоящие' | 'Завершённые'
  export function filterMatches(matches: Match[], filter: MatchFilter): Match[];
  export function sortMatches(matches: Match[]): Match[]; // не мутирует вход
  export function statusLabel(match: Match): string;
  export function formatScore(score: Score | null): string | null; // '2 : 1' | null
  export function formatStartsAt(iso: string | null, timeZone?: string): string; // timeZone — только для тестов
  ```

- [ ] **Step 1: Написать падающие тесты** на фикстуре `data/matches.json`, которую прогнать через `parseMatchesResponse`:
  - `filterMatches(all,'finished')` даёт ids `['m1','m2','m3']`;
  - `filterMatches(all,'upcoming')` даёт `['m4','m5','m6','m7','m8']` (live и postponed здесь);
  - матч со `status: 'cancelled'` (неизвестный) попадает в `upcoming` и `all`;
  - для любого `all` выполняется `upcoming.length + finished.length === all.length`;
  - `sortMatches` ставит `m7` последним и не мутирует вход (сравнить с копией);
  - `statusLabel`: `m4` → `"Идёт · 67'"`, `m7` → `'Перенесён'`, `{status:'cancelled'}` → `'cancelled'`;
  - `formatScore({home:0,away:0})` → `'0 : 0'`, `formatScore(null)` → `null`;
  - `formatStartsAt('2026-10-11T13:00:00Z','Europe/Moscow')` содержит `'16:00'` и `'11'`, а с `'Asia/Vladivostok'` содержит `'23:00'`;
  - `formatStartsAt(null)` и `formatStartsAt('garbage')` → `'Дата уточняется'`.
- [ ] **Step 2: Запустить** `npm test -- src/lib`. Ожидается FAIL.
- [ ] **Step 3: Реализовать** `src/lib/matches.ts` по решениям из раздела выше.
- [ ] **Step 4: Проверить.** `npm test -- src/lib` даёт PASS, tsc проходит чисто.
- [ ] **Step 5: Commit** `feat: фильтр, сортировка и форматирование матчей`.

### Task 3: Часть 2 — починить `useFavorites` и `UpdatedAgo`

**Подход: баги ловятся тестами, которые ведут себя как пользователь.** Тест рендерит то же, что видит тестировщик: несколько карточек со звёздочками и подпись с кнопкой «Обновить». Затем он нажимает через `userEvent` из RNTL и проверяет то, что видно на экране (`accessibilityLabel`, текст), а не внутренности хука. Каждая жалоба тестировщика превращается в тест. Этот тест **обязан упасть на оригинальном коде** с симптомом из жалобы и только потом становится зелёным после фикса. Красный тест и фикс идут отдельными коммитами, чтобы в истории было видно «воспроизвёл → починил». Вывод красного прогона нужно сохранить: он пойдёт в `SOLUTION.md` как доказательство.

**Files:**
- Modify: `src/hooks/useFavorites.ts`, `src/components/UpdatedAgo.tsx`
- Create: `src/__tests__/harness.tsx`. Это тестовые обёртки, а не продакшн-код: `FavoritesHarness` рисует 3 матча (`m1`, `m2`, `m3`), у каждого `<Text>{id}</Text>` + `<FavoriteButton>` на `useFavorites`. `UpdatedAgoHarness` держит `since` в state и рисует `<UpdatedAgo since>` + кнопку «Обновить», которая делает `setSince(new Date())`.
- Test: `src/__tests__/favorites.bug.test.tsx`, `src/__tests__/updatedAgo.bug.test.tsx`

**Interfaces:**
- Produces (публичный API не меняется): `useFavorites(): { favorites: string[]; isFavorite(id: string): boolean; toggle(id: string): void }`, `<UpdatedAgo since={Date} />`.

Причины багов. Их нужно подтвердить падающими тестами до исправления.
- `isFavorite`: `Boolean(indexOf)` для отсутствующего элемента даёт `Boolean(-1) === true`, а для первого элемента `Boolean(0) === false`. Поэтому все звёзды горят, а первая добавленная гаснет. `toggle` мутирует массив состояния и передаёт в `setFavorites` ту же ссылку. React сравнивает через `Object.is`, видит то же значение и пропускает ререндер, поэтому нажатия «не срабатывают». Ещё есть замыкание на устаревший `favorites` при быстрых нажатиях.
- `UpdatedAgo`: эффект с `[]` захватывает `seconds = 0`, поэтому `setSeconds(0 + 1)` вызывается вечно и счётчик застывает на 1. Проп `since` игнорируется, поэтому после обновления число не сбрасывается. Интервал не очищается и после размонтирования продолжает тикать (утечка).

- [ ] **Step 1: Аудит всего чужого кода.** Прочитать `FavoriteButton.tsx`, `useFavorites.ts`, `UpdatedAgo.tsx` целиком и выписать **все** дефекты, а не только те, на которые жаловался тестировщик. Каждому дефекту нужен пункт в тестах ниже. Если найден дефект сверх перечисленных, добавить для него тест в том же стиле.
- [ ] **Step 2: Тесты жалобы №1 «звёздочки»** (`favorites.bug.test.tsx`, `const user = userEvent.setup()`, поиск звёзд через `getAllByRole('button')` / `getAllByLabelText`):
  - `«ни одна звезда не горит при старте»`: 0 кнопок с label «Убрать из избранного», 3 с «Добавить в избранное». *На оригинале падает: Boolean(-1) делает все звёзды активными.*
  - `«нажатие зажигает именно эту звезду»`: `user.press(звезда m2)` → у m2 «Убрать из избранного», у m1 и m3 «Добавить…».
  - `«первая добавленная звезда не гаснет»`: `press(m1)` → m1 активна. *На оригинале падает: индекс 0 → false.*
  - `«повторное нажатие гасит звезду»`: `press(m1)` ×2 → m1 неактивна.
  - `«несколько избранных одновременно»`: `press(m1)`, `press(m3)` → активны ровно m1 и m3.
  - `«каждое нажатие сразу видно на экране»`: после каждого из 4 последовательных нажатий количество активных звёзд соответствует ожидаемому (1, 2, 1, 0). *На оригинале падает: мутация массива + та же ссылка → нет ререндера.*
- [ ] **Step 3: Тесты жалобы №2 «Обновлено N сек»** (`updatedAgo.bug.test.tsx`, `jest.useFakeTimers()`, `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`):
  - `«счётчик растёт со временем»`: сразу «Обновлено 0 сек назад»; `act(() => jest.advanceTimersByTime(5000))` → «Обновлено 5 сек назад». *На оригинале застывает на «1».*
  - `«сбрасывается после обновления»`: прошло 7 с → `press('Обновить')` → «Обновлено 0 сек назад» → ещё 2 с → «2 сек». *На оригинале не сбрасывается.*
  - `«показывает реальный возраст данных»`: `since = now − 30 с` → сразу «30 сек» (подпись считается от `since`, а не от момента монтирования).
  - `«нет утечки таймера»`: `unmount()` → `jest.getTimerCount() === 0`.
- [ ] **Step 4: Красный прогон на оригинальном коде.** `npm test -- bug`. Ожидается FAIL, и каждое падение совпадает с симптомом из жалобы (см. пометки *«на оригинале…»*). Если тест неожиданно зелёный, значит он не воспроизводит баг: переписать. Сохранить вывод.
- [ ] **Step 5: Commit** `test: воспроизведение жалоб тестировщика на звёздочки и «Обновлено N сек»`. Это **единственный** коммит, где `npm test` намеренно красный, это указать в сообщении.
- [ ] **Step 6: Исправить `useFavorites`.** Заменить на `includes`, сделать функциональный иммутабельный `setFavorites(prev => …)`. `npm test -- favorites` → PASS. Commit `fix: useFavorites — неверная проверка и мутация состояния`.
- [ ] **Step 7: Исправить `UpdatedAgo`.** Секунды вычисляются как `Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000))`; в state хранится только «тик» `now`; интервал 1 с с `clearInterval` в cleanup; эффект зависит от `since`. `npm test -- updatedAgo` → PASS. Commit `fix: UpdatedAgo — устаревшее замыкание, игнор since, утечка интервала`.
- [ ] **Step 8: Полный прогон.** `npm test`, `npx tsc --noEmit` — всё зелёное.

Ручная проверка этих же сценариев в живом браузере идёт в Task 8, шаг «Жалобы тестировщика». Зелёных тестов недостаточно, чтобы считать баг закрытым.

### Task 4: Хук `useMatches` — жизненный цикл загрузки

**Files:**
- Create: `src/hooks/useMatches.ts`
- Test: `src/hooks/__tests__/useMatches.test.ts`

**Interfaces:**
- Consumes: `fetchMatches(signal?)` из Task 1.
- Produces:
  ```ts
  export type MatchesState = {
    status: 'loading' | 'error' | 'ready'; // 'error' — только когда данных нет совсем
    matches: Match[];                       // последние успешно загруженные
    error: string | null;                   // текст ошибки (в т.ч. неудачного refresh при наличии данных)
    isRefreshing: boolean;
    lastUpdated: Date | null;               // меняется только при успехе
    reload: () => void;                     // и «Повторить», и «Обновить»
  };
  export function useMatches(fetcher?: (signal: AbortSignal) => Promise<Match[]>): MatchesState;
  ```
  Каждый вызов `reload` отменяет предыдущий запрос через `AbortController`. Результат применяется, только если это последний запрос. Cleanup абортит запрос при размонтировании.

- [ ] **Step 1: Написать падающие тесты** (`renderHook`, фейковый `fetcher` на управляемых промисах):
  - старт: `status 'loading'`, затем `'ready'`, `matches.length === 8`, `lastUpdated` не null;
  - ошибка без данных: `status 'error'`, есть `error`, `reload()` → `'loading'` → `'ready'`;
  - ошибка refresh при наличии данных: `status` остаётся `'ready'`, `matches` прежние, `error` не null, `lastUpdated` **не изменился**;
  - гонка: два `reload()`, первый промис резолвится позже второго, в `matches` остаётся результат второго;
  - `unmount` во время загрузки: signal абортнут, предупреждений нет.
- [ ] **Step 2: Запустить** `npm test -- useMatches`. Ожидается FAIL.
- [ ] **Step 3: Реализовать** `src/hooks/useMatches.ts`. По умолчанию `fetcher = fetchMatches`.
- [ ] **Step 4: Проверить.** Тесты дают PASS, tsc проходит чисто.
- [ ] **Step 5: Commit** `feat: хук useMatches с обработкой ошибок, refresh и отменой запросов`.

### Task 5: UI экрана

**Files:**
- Create: `src/components/MatchCard.tsx`, `src/components/FilterTabs.tsx`, `src/components/StateView.tsx`
- Modify: `src/screens/MatchesScreen.tsx`
- Test: `src/screens/__tests__/MatchesScreen.test.tsx`

**Interfaces:**
- Consumes: `useMatches`, `useFavorites`, `FavoriteButton`, `UpdatedAgo`, всё из `src/lib/matches.ts`.
- Produces:
  ```ts
  <MatchCard match={Match} favorite={boolean} onToggleFavorite={() => void} />
  <FilterTabs value={MatchFilter} onChange={(f: MatchFilter) => void} />   // accessibilityRole="tab", accessibilityState.selected
  <StateView kind="loading" | "error" | "empty" message?={string} onRetry?={() => void} />
  ```
  Экран: заголовок; строка «Обновлено N сек назад» (только при `lastUpdated`) + кнопка «Обновить» (на время `isRefreshing` она disabled или показывает индикатор); `FilterTabs`; баннер ошибки refresh; `FlatList` с `RefreshControl` из `sortMatches(filterMatches(...))`. Пустой экран «Нет матчей в этой категории» показывается, когда фильтр дал 0, а «Матчей пока нет» — когда данных 0. Карточка — `accessibilityLabel` с командами и статусом, у live-матча визуальный акцент.

- [ ] **Step 1: Написать падающие интеграционные тесты** (`render(<MatchesScreen/>)`, замоканный `global.fetch` с `data/matches.json`):
  - сначала есть индикатор загрузки, затем видны «Зенит» и «Спартак», «2 : 1», «Идёт · 67'», «Дата уточняется»;
  - нажатие «Завершённые» скрывает «Динамо Махачкала», остаются 3 карточки; «Предстоящие» показывает «Балтика» (postponed) и «Рубин» (live);
  - fetch → 500: видно «Не удалось загрузить матчи», нажатие «Повторить» с успешным fetch показывает список;
  - `{ matches: [] }` → «Матчей пока нет»;
  - звёздочки: изначально все с label «Добавить в избранное»; нажатие на звезду `m1` даёт ровно одну «Убрать из избранного»; после переключения фильтра туда и обратно состояние сохраняется.
- [ ] **Step 2: Запустить** `npm test -- MatchesScreen`. Ожидается FAIL.
- [ ] **Step 3: Реализовать** компоненты и экран. Стили аккуратные, без библиотек UI.
- [ ] **Step 4: Проверить.** `npm test` (весь набор) даёт PASS, tsc проходит чисто, `npx expo lint` без ошибок.
- [ ] **Step 5: Commit** `feat: экран «Матчи тура» — список, фильтр, состояния, избранное`.

### Task 6 (опционально, только если укладываемся во время): сохранение избранного

- [ ] `npx expo install @react-native-async-storage/async-storage` (работает в Expo Go и в вебе). `useFavorites` загружает избранное при старте и сохраняет его при изменении, публичный API не меняется. Тест с jest-моком AsyncStorage: после ремаунта хука избранное восстанавливается. Commit `feat: избранное сохраняется между запусками`.

### Task 7: `SOLUTION.md` и проверка «чистого» запуска

**Files:**
- Modify: `SOLUTION.md`

- [ ] **Step 1: Заполнить разделы** «Что сделано», «Решения» (фильтр, сортировка, `null`-дата, неизвестные статусы, `MATCHES_URL`), «Баги из части 2» (причины из Task 3, по 1–3 предложения своими словами) и «Что улучшил бы». Разделы «Сколько заняло» и «Как я использовал ИИ» — черновик, который **пользователь правит сам**: это его личный опыт.
- [ ] **Step 2: Чистая установка.** `rm -rf node_modules && npm install && npx tsc --noEmit && npm test`, всё зелёное.
- [ ] **Step 3: Commit** `docs: заполнен SOLUTION.md`.

### Task 8: Живой тест в браузере

Агент своими глазами проверяет, что UI/UX соответствует ТЗ.

- [ ] **Step 1: Запустить** `CI=1 npx expo start --web --port 8081` в фоне и дождаться ответа `http://localhost:8081`.
- [ ] **Step 2: Написать скрипт Playwright** в scratchpad-директории (не в проекте; `npm i playwright` и `npx playwright install chromium` там же). Скрипт сохраняет скриншоты:
  1. desktop 1280×800, загруженный список;
  2. mobile 390×844, загруженный список;
  3. фильтр «Предстоящие» и «Завершённые»;
  4. после клика по двум звёздам горят ровно две;
  5. через 5 с подпись показывает ≈5 сек, после «Обновить» — ≈0;
  6. `page.route(MATCHES_URL, r => r.fulfill({status:500}))` → экран ошибки, затем снять route и нажать «Повторить» → список;
  7. `route` → `{ "round":12, "matches":[] }` → пустой экран;
  8. `route` с задержкой 3 с → видна загрузка.
- [ ] **Step 3: Посмотреть каждый скриншот** через Read и пройти чек-лист ТЗ: хозяева и гости, счёт только там, где он есть, дата в поясе устройства (сравнить с `TZ` браузера, запустить также с `timezoneId: 'Asia/Vladivostok'`), статусы по-русски, нет «Invalid Date» и `undefined`, ничего не обрезано на мобильной ширине, нет горизонтального скролла, кнопки нажимаются. Проверить консоль браузера на ошибки и warnings React (key, act).
- [ ] **Step 4: Жалобы тестировщика в живом браузере.** Те же сценарии, что в тестах Task 3, но на настоящем экране с реальными данными, на каждом шаге скриншот:
  - *Звёздочки:* при открытии не горит ни одна. Клик по первой карточке зажигает только её. Клик по третьей добавляет вторую активную. Повторный клик по первой гасит её. Переключение фильтров туда и обратно сохраняет состояние. Быстрые двойные клики не оставляют рассинхрона.
  - *«Обновлено N сек назад»:* за 10 с подпись проходит 0 → ~10. Клик «Обновить» сбрасывает её к 0, и она снова растёт. При ошибке обновления (через `page.route` → 500) подпись **не** сбрасывается.
  - *Утечка:* в консоли браузера нет warnings React.
  Если что-то расходится с тестами, значит тест неполон: сначала дописать в Task 3 тест, который ловит расхождение, потом исправить.
- [ ] **Step 5:** Найденные дефекты исправить с тестом, повторить проверку, сделать коммит `fix: …`. Остановить dev-сервер.

### Task 9: Независимое ревью (последний этап)

- [ ] **Step 1: Запустить свежего субагента** без контекста этой сессии через superpowers:requesting-code-review или Agent `general-purpose`. Он получает только `README.md` (ТЗ), `SOLUTION.md` и диапазон `833dddb..HEAD`. Задача субагента: пройти по «На что мы смотрим» из README. Работает ли экран (данные, состояния, фильтр, звёздочки)? Не теряются ли неочевидные случаи? Понятен ли код и типы? Верны ли объяснения в `SOLUTION.md`? Есть ли тесты на основную функциональность и проходят ли они (`npm test`, `npx tsc --noEmit`)? Есть ли ≥3–5 коммитов? Отдельная проверка багов: ревьюер делает `git stash`/`git checkout` фиксов из Task 3 (возвращает оригинальные `useFavorites.ts`/`UpdatedAgo.tsx`) и убеждается, что тесты `*.bug.test.tsx` **падают**, а с фиксами проходят. Кроме того, он сам ищет в чужом коде баги, которые остались незакрытыми. Каждая находка должна содержать файл, строку и сценарий воспроизведения.
- [ ] **Step 2: Разобрать находки** через superpowers:receiving-code-review: каждую проверить, а не принимать вслепую. Подтверждённые исправить с тестом, сделать коммит, прогнать `npm test` и tsc.
- [ ] **Step 3: Итоговая сводка** для пользователя: что сделано, что осталось и что запушить в свою публичную копию. Если у копии другой адрес, обновить `MATCHES_URL`.
