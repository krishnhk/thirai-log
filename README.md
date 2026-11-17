# ThiraiLog

A private diary for the films you watch in theatres. Log each viewing with the date, theatre and who you watched with, plan a bucket list for the year, and see your year in numbers. Everything is stored on your device. There are no accounts, no social feeds and no tracking.

Built with Expo SDK 58, React Native 0.88 and Expo Router. The app targets Android, and the web build is used only as a local preview.

## Features

- **Home:** the current year at a glance. Visits, Solo and Group counts, films this year, bucket list progress and a monthly activity chart.
- **Diary:** every viewing, grouped by year and month. Tap a row to open it, or the pencil to edit. The top card shows the number of different movies you have logged.
- **Log:** add a viewing. Search your saved films, pick the date from a calendar, choose a saved theatre, and say whether you watched solo or in a group (required). Editing an existing viewing hides the tab bar and lets you delete it after a confirmation.
- **Viewing detail:** poster, film name, date, theatre and who you watched with. After logging a film it shows a Done button that returns to the Diary.
- **Watchlist:** a bucket list for each year with a status for every film (planned, watched, skipped, postponed).
- **Library:** one place for Theatres, the Film database, Statistics and Backup.
  - **Theatres:** the theatres you have visited, grouped by district, with search, add, edit and delete. Older viewings that only have a typed theatre name can be imported once.
  - **Film database:** the films you have saved. Add a film with a title and a required release year, and an optional poster from your photo library.
  - **Statistics:** films logged, theatre visits, average rating, bucket list completion, Solo and Group viewings per year, monthly activity, year by year and highest rated.
  - **Backup:** exports everything as a JSON file, including poster images stored on the device. Import is not built yet.

## Theme

One light theme, Ivory and Denim: a warm ivory background, white cards, and denim blue for actions and highlights. The colours live in `src/theme/index.tsx`.

## Running it

```bash
npm install
npx expo start            # development server (use Expo Go or a development build)
npx expo start --web -c   # web preview in the browser, with the cache cleared
```

Expo Go only includes its bundled native modules. If a screen needs a module that Expo Go does not have, build a development client:

```bash
eas build -p android --profile development
npx expo start --dev-client
```

## Checks

```bash
npx tsc --noEmit    # typecheck
npx expo lint       # lint
npx expo-doctor     # project health
```

## Building

Builds run on EAS (`eas.json`):

| Profile | Output | Use |
|---|---|---|
| `development` | development client | local testing with `expo start --dev-client` |
| `preview` | APK (internal) | install on a phone to test |
| `production` | AAB | Google Play (submit track: internal) |

```bash
eas build -p android --profile preview
```

The release build is limited to the `arm64-v8a` architecture with minification and resource shrinking enabled, to keep the APK small.

## Project layout

```
src/
  app/          Expo Router routes: (tabs)/ for the five tabs, plus stack screens
  screens/      One file per screen
  components/   Shared UI (cards, buttons, pickers, tab bar pieces, charts)
  navigation/   The floating tab bar
  lib/          Data and helpers
    storage.ts    JSON files on the device (one queue for every read and write)
    library.ts    Viewings, watchlists and the film database
    theatres.ts   Theatres, search and old-data import
    stats.ts      Solo and Group counting, shared by Home and Statistics
    backup.ts     Backup export
    posters.ts    Poster images picked from the photo library
    format.ts     Date helpers
  api/          The saved film catalog
  hooks/        useLibrary, useMovieSearch
  theme/        Colours, type scale, spacing
docs/           Earlier analysis and redesign notes
```

## Data

All data is saved as JSON files in the app's document folder (`thirailog/`): viewings, watchlists, the film catalog, theatres and a one-time import flag. On the web preview the same data is kept in the browser's local storage. Poster images you pick are copied into a `posters/` folder, so they survive cache clears.

Each viewing is its own entry, so the same film can be logged any number of times. Viewings keep the theatre name as text, and also a theatre id when the theatre was chosen from the Theatres list. Statistics count viewings, not films, and viewings logged before the Solo / Group question existed are left out of those two counts.

## Conventions

- Routes live in `src/app/`. Keep components, hooks and helpers outside it.
- Use `npx expo install` to add packages, so versions stay compatible with SDK 58.
- Do not create or edit `android/` or `ios/` by hand. Native settings go in `app.json` and config plugins.

See `AGENTS.md` for the rules used when working on this repository.
