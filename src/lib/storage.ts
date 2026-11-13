import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * All app data lives as JSON files in the device's document folder
 * (<app documents>/thirailog/<name>.json). Nothing is kept in AsyncStorage.
 *
 * Every read and write goes through one queue, so two quick edits cannot
 * overwrite each other.
 */

export const DATA_FILES = {
  viewingEntries: 'viewingEntries',
  watchlistMovies: 'watchlistMovies',
  annualWatchlists: 'annualWatchlists',
  movies: 'movies',
  settings: 'settings',
  theme: 'theme',
} as const;

export type DataFile = (typeof DATA_FILES)[keyof typeof DATA_FILES];

// Older builds stored these keys in AsyncStorage. Copied once, then never read again.
const LEGACY_KEYS: Record<DataFile, string> = {
  viewingEntries: '@thirai-log:viewingEntries',
  watchlistMovies: '@thirai-log:watchlistMovies',
  annualWatchlists: '@thirai-log:annualWatchlists',
  movies: '@thirai-log:movies',
  settings: '@thirai-log:userSettings',
  theme: '@thirai-log:theme',
};

const MIGRATION_MARKER = '.migrated';

// Web preview has no file system. Data is kept in the browser's local storage instead
// (or in memory if that is blocked), so it survives reloads during development.
type WebStore = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const memory = new Map<string, string>();

function webStore(): WebStore | null {
  try {
    return (globalThis as unknown as { localStorage?: WebStore }).localStorage ?? null;
  } catch {
    return null;
  }
}

function webGet(name: string): string | null {
  const store = webStore();
  try {
    if (store) return store.getItem(`thirailog:${name}`);
  } catch {
    // Fall through to memory.
  }
  return memory.get(name) ?? null;
}

function webSet(name: string, text: string): void {
  const store = webStore();
  try {
    if (store) {
      store.setItem(`thirailog:${name}`, text);
      return;
    }
  } catch {
    // Fall through to memory.
  }
  memory.set(name, text);
}

function folder(): Directory | null {
  try {
    return new Directory(Paths.document, 'thirailog');
  } catch {
    return null;
  }
}

function fileFor(dir: Directory, name: string): File {
  return new File(dir, `${name}.json`);
}

let queue: Promise<unknown> = Promise.resolve();

function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function readText(name: string): Promise<string | null> {
  const dir = folder();
  if (!dir) return webGet(name);
  const file = fileFor(dir, name);
  return file.exists ? file.text() : null;
}

async function writeText(name: string, text: string): Promise<void> {
  const dir = folder();
  if (!dir) {
    webSet(name, text);
    return;
  }
  if (!dir.exists) dir.create({ intermediates: true });
  await fileFor(dir, name).write(text);
}

let migrated: Promise<void> | null = null;

/** Copies data from the old AsyncStorage keys into files, exactly once. */
function migrateLegacyOnce(): Promise<void> {
  if (migrated) return migrated;
  migrated = (async () => {
    const dir = folder();
    if (!dir) return; // Web: nothing to migrate into.
    if (!dir.exists) dir.create({ intermediates: true });
    const marker = new File(dir, MIGRATION_MARKER);
    if (marker.exists) return;

    for (const name of Object.values(DATA_FILES)) {
      const file = fileFor(dir, name);
      if (file.exists) continue;
      try {
        const legacy = await AsyncStorage.getItem(LEGACY_KEYS[name]);
        if (legacy !== null) await file.write(legacy);
      } catch {
        // Unreadable legacy value: start this file fresh rather than block the app.
      }
    }
    await marker.write(new Date().toISOString());
  })();
  return migrated;
}

function ready<T>(task: () => Promise<T>): Promise<T> {
  return serial(async () => {
    await migrateLegacyOnce();
    return task();
  });
}

/** Reads a data file. Returns `fallback` when the file is missing or unreadable. */
export function readJson<T>(name: DataFile, fallback: T): Promise<T> {
  return ready(async () => {
    try {
      const raw = await readText(name);
      if (raw === null || raw === '') return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  });
}

/** Replaces a data file with `value`. */
export function writeJson(name: DataFile, value: unknown): Promise<void> {
  return ready(() => writeText(name, JSON.stringify(value)));
}

/**
 * Atomic read-modify-write: `change` receives the current value and returns the next one.
 * Use this instead of separate read and write calls so concurrent edits don't clobber each other.
 */
export function updateJson<T>(
  name: DataFile,
  fallback: T,
  change: (current: T) => T
): Promise<T> {
  return ready(async () => {
    let current = fallback;
    try {
      const raw = await readText(name);
      if (raw) current = JSON.parse(raw) ?? fallback;
    } catch {
      current = fallback;
    }
    const next = change(current);
    await writeText(name, JSON.stringify(next));
    return next;
  });
}
