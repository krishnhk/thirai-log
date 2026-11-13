# ThiraiLog: Analysis and Redesign

ThiraiLog is a private diary for theatre visits: log a film, record the theatre and a rating, plan a yearly bucket list, and see statistics. It is an Expo / React Native app with five tabs (Home, Diary, Log, Watchlist, Statistics), all data stored on-device in AsyncStorage.

## 1. Findings

Ranked by user impact.

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | Critical | **The film catalog is never populated.** Log search and the Watchlist picker only search `library.movies`, which only fills from a cache that nothing writes to. On a fresh install, "Search your saved films" finds nothing, and the only path is manual title entry. | Fixed |
| 2 | Critical | **TMDB requests are unauthenticated.** `src/api/tmdb.ts` sent no API key and never checked the response status, so every call fails with 401 and the error is silently swallowed. | Fixed (key via env var) |
| 3 | High | **Genres and runtime are never fetched.** Search results lack genres, so the Statistics genre and language breakdowns are always empty. `getTrending` also made 20 detail requests whose results were thrown away. | Fixed |
| 4 | High | **Settings and Movie Details were unreachable.** Neither screen was registered in any navigator, so the JSON backup export was unreachable. Date and time format settings are still saved but unused. | Fixed: `/settings` and `/movie/[movieId]` are now routes; Settings is opened from a gear on Home. Movie Details still has no entry point (it was never linked). Date/time settings still open. |
| 5 | High | **AGENTS.md requires Expo Router, but the app used React Navigation** with a single `App.tsx` root. | Fixed: migrated to Expo Router (`src/app/`), five bottom tabs in `(tabs)/`, Settings and Movie Details as stack routes. |
| 6 | High | **All app source was untracked in git.** The source had no history or backup. | Fixed: committed to the repository. |
| 7 | Medium | **Three overlapping data models.** `src/types/index.ts` uses `Date` fields, `src/lib/library.ts` uses ISO strings (what's actually stored), and `src/api/movies.ts` redeclared them. `MovieDetailsScreen` and `SettingsScreen` write storage directly, bypassing the helpers in `lib/library.ts`. | Partly fixed (api duplicates removed) |
| 8 | Medium | **Non-atomic read-modify-write.** Every mutation reads the whole AsyncStorage array, edits it, and writes it back. Two quick actions can overwrite each other. | Open |
| 9 | Medium | **Theme code is half-finished.** Two palettes, legacy stub exports (`getColorScheme`, `toggleTheme`), and the theme toggle exists only on Home. An unused `src/types/theme.ts` had a typo'd colour (`#2S2B3E`) and was deleted. | Partly fixed |
| 10 | Medium | **Screens are too large.** `LogScreen` (~790 lines) and `WatchlistScreen` (~770 lines) mix data access, business rules and layout. The IDE flags their complexity as above the limit of 15. | Open |
| 11 | Low | **Tiny tab labels.** Tab labels are 9.5pt, below comfortable reading size on phones. | Open |
| 12 | Low | **No lint setup.** `npx expo lint` cannot run because ESLint is not installed and no config exists. | Open |

## 2. What changed in this pass

- `src/api/tmdb.ts`: reads `EXPO_PUBLIC_TMDB_API_KEY`, adds `isTmdbConfigured()`, throws on non-2xx responses, and removes the unused `getMovieDetails`-per-trending loop from the call path.
- `src/api/movies.ts`: rewritten around one mapper (`toMovie`). The old file had three copies of it. Adds `Movies.search()` (not cached) and `Movies.remember()` (caches a chosen film and fetches genres and runtime once). Removes unused `getTrending`, `searchAndSave`, and the duplicate type declarations. The storage key is unchanged, so existing caches still work.
- `src/hooks/useMovieSearch.ts` (new): debounced (350 ms) TMDB search, local matches first, with explicit `loading`, `error`, and `unconfigured` states.
- `src/screens/LogScreen.tsx`: uses the hook. Selecting a film saves it in the background. Shows clear hints for each search state.
- `src/screens/WatchlistScreen.tsx`: same search behaviour in the add picker. Only TMDB films are persisted to the catalog (manual titles are not).
- `src/types/theme.ts`: deleted (unused).
- `.gitignore`: added `.env`, so the API key is not committed.

**To enable search:** create a `.env` file in the project root containing `EXPO_PUBLIC_TMDB_API_KEY=<your TMDB v3 API key>`, then restart `npx expo start` (Expo reads `EXPO_PUBLIC_` variables at bundle time). For EAS builds, set the same variable as an EAS secret or in `eas.json`.

## 3. Redesign direction

These are proposals. Each needs a decision before implementation.

### 3.1 Information architecture
- **Home** is the dashboard: the year's progress (watched vs bucket list), this month's visits, and the next planned films. Move the theatre-visit stat cards below the progress card, since "what's next" matters more than a count.
- **Log** stays the centre action, but it becomes a sheet or modal, not a tab screen, so it reads as "add" rather than "destination".
- **Settings** (backup, date and time format, theme) gets a gear icon in the Home header. This requires a stack navigator (Expo Router `Stack`, or `@react-navigation/native-stack`).
- Remove the duplicate theme toggle, and keep one in Settings.

### 3.2 Data layer
- Introduce one repository module (`src/lib/library.ts` is the seed) that owns all reads and writes. Screens stop touching AsyncStorage directly.
- Serialize writes through a single promise queue, so concurrent updates cannot overwrite each other.
- Store dates as ISO strings everywhere, and convert with `toDate()` at the edges only.
- Make the date and time format settings real, or remove them.

### 3.3 Visual system
- Keep the warm-black dark theme and the vermilion accent. They suit the brand.
- Reduce the palette to tokens with one meaning each (`surface`, `surfaceRaised`, `textPrimary`, `textSecondary`, `accent`, `success`, `warning`). Delete the legacy exports.
- Raise tab labels to 11pt and make tap targets at least 44pt.
- Split `LogScreen` and `WatchlistScreen` into small components (film picker, viewing form, year selector, list card). Target: each file under 300 lines.

### 3.4 Platform
- AGENTS.md specifies Expo Router with routes under `src/app/`. Migrating now also solves 4 (Settings reachable via a `Stack` layout) and makes deep links possible.
- Add a TMDB attribution line (their terms of use require it) on the Log and Watchlist search results.

## 4. Decisions and outcome

1. **Navigation:** migrated to Expo Router, as AGENTS.md requires.
2. **Visual redesign scope:** every screen was redesigned.
3. **Data storage:** all app data now lives as JSON files in the device document folder. Old AsyncStorage data is copied across once on first run.
4. **Film database:** search shows only films already in the database. Films are added, listed and edited from one "Film database" screen, and a film is a duplicate only when both title and year match.

Still open: lint is not set up, date and time format settings are saved but not applied, and Movie Details has no entry point.
