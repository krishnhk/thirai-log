import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DATA_FILES, readJson, updateJson, writeJson } from './storage';
import { isLocalPoster } from './posters';
import { confirmAction, notify } from './ui';

interface PosterHolder {
  posterPath?: string;
  movies?: PosterHolder[];
}

/** Poster paths found in the saved data. */
function posterPaths(...groups: unknown[]): string[] {
  const found = new Set<string>();
  const visit = (item: PosterHolder) => {
    if (item?.posterPath) found.add(item.posterPath);
    if (Array.isArray(item?.movies)) item.movies.forEach(visit);
  };
  groups.forEach((group) => {
    if (Array.isArray(group)) group.forEach(visit);
  });
  return [...found];
}

/**
 * Reads the poster images stored on this device and returns them as base64, keyed by the path
 * saved in the data. Posters that are web links are not copied, only their links stay.
 */
async function collectImages(paths: string[]): Promise<Record<string, { mime: string; base64: string }>> {
  const images: Record<string, { mime: string; base64: string }> = {};
  if (Platform.OS === 'web') return images;
  for (const path of paths) {
    if (!isLocalPoster(path)) continue;
    try {
      const file = new File(path);
      if (!file.exists) continue;
      const extension = path.split('.').pop()?.toLowerCase();
      const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
      images[path] = { mime, base64: await file.base64() };
    } catch {
      // A missing or unreadable image is skipped; the rest of the backup still works.
    }
  }
  return images;
}

/** Exports all diary data as one JSON file (download on web, share sheet on Android). */
export async function exportBackup(): Promise<void> {
  try {
    const read = (name: (typeof DATA_FILES)[keyof typeof DATA_FILES]) => readJson<unknown>(name, []);
    const viewingEntries = await read(DATA_FILES.viewingEntries);
    const watchlistMovies = await read(DATA_FILES.watchlistMovies);
    const annualWatchlists = await read(DATA_FILES.annualWatchlists);
    const movies = await read(DATA_FILES.movies);
    const theatres = await read(DATA_FILES.theatres);
    const images = await collectImages(posterPaths(movies, watchlistMovies, annualWatchlists));
    const data = {
      viewingEntries,
      watchlistMovies,
      annualWatchlists,
      movies,
      theatres,
      // Poster images stored on this device, as base64 (keyed by the path used in the data above).
      images,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);

    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'thirai-log-backup.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify('Backup ready', 'Your ThiraiLog data has been downloaded.');
      return;
    }

    // Mobile: write to the cache folder and hand it to the system share sheet.
    const file = new File(Paths.cache, 'thirai-log-backup.json');
    if (file.exists) file.delete();
    await file.write(json);

    if (!(await Sharing.isAvailableAsync())) {
      notify('Backup saved', `Saved to ${file.uri}`);
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export ThiraiLog backup',
      UTI: 'public.json',
    });
  } catch {
    notify('Export failed', 'Could not export your data.');
  }
}

// ---------------------------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------------------------

type AnyRecord = Record<string, any>;

interface BackupImages {
  [path: string]: { mime?: string; base64?: string };
}

interface BackupFile {
  viewingEntries?: unknown;
  watchlistMovies?: unknown;
  annualWatchlists?: unknown;
  movies?: unknown;
  theatres?: unknown;
  images?: BackupImages;
}

const asArray = (value: unknown): AnyRecord[] =>
  Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];

const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** Lets the user pick a .json file and returns its text, or null when nothing was picked. */
async function pickBackupText(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        resolve(file ? await file.text() : null);
      };
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }
  // Loaded on demand, like the image picker, so the web preview does not need the native module.
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return new File(result.assets[0].uri).text();
}

/** Saves the poster images from a backup on this device and returns old path -> new path. */
async function restoreImages(images: BackupImages | undefined): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (Platform.OS === 'web' || !images) return map;
  try {
    const dir = new Directory(Paths.document, 'posters');
    if (!dir.exists) dir.create({ intermediates: true });
    let index = 0;
    for (const [oldPath, image] of Object.entries(images)) {
      if (!image?.base64) continue;
      try {
        const extension = image.mime === 'image/png' ? 'png' : 'jpg';
        const file = new File(dir, `import-${Date.now()}-${index++}.${extension}`);
        // write() is asynchronous: wait for it, and only use the new path once the image is really saved.
        await file.write(image.base64, { encoding: 'base64' });
        if (file.exists) map[oldPath] = file.uri;
      } catch {
        // One unreadable image is skipped; the rest of the import continues.
      }
    }
  } catch {
    // Without a posters folder, films keep their old poster paths (and show the placeholder).
  }
  return map;
}

/** True for a poster stored on this device whose image file no longer exists. */
function posterFileGone(path?: string): boolean {
  if (Platform.OS === 'web' || !path || !isLocalPoster(path)) return false;
  try {
    return !new File(path).exists;
  } catch {
    return false;
  }
}

export interface ImportSummary {
  viewings: number;
  films: number;
  theatres: number;
  watchlistFilms: number;
}

/**
 * Adds the data from a backup to what is already on this device. Anything that is already here (same id,
 * or the same theatre, or a film already on a watchlist) is kept as it is and not duplicated.
 */
async function applyBackup(data: BackupFile): Promise<ImportSummary> {
  const summary: ImportSummary = { viewings: 0, films: 0, theatres: 0, watchlistFilms: 0 };
  const posterMap = await restoreImages(data.images);
  const remap = (path?: string) => (path && posterMap[path] ? posterMap[path] : path);

  // Theatres first, so viewings can point at the right ones.
  const theatreIds: Record<string, string> = {};
  await updateJson<AnyRecord[]>(DATA_FILES.theatres, [], (current) => {
    const list = Array.isArray(current) ? [...current] : [];
    asArray(data.theatres).forEach((incoming) => {
      if (!incoming.id || !incoming.name) return;
      const sameId = list.find((item) => item.id === incoming.id);
      const sameName = list.find(
        (item) => lower(item.name) === lower(incoming.name) && lower(item.district) === lower(incoming.district)
      );
      const existing = sameId ?? sameName;
      if (existing) {
        theatreIds[incoming.id] = existing.id;
        return;
      }
      theatreIds[incoming.id] = incoming.id;
      list.push(incoming);
      summary.theatres += 1;
    });
    return list;
  });

  await updateJson<AnyRecord[]>(DATA_FILES.movies, [], (current) => {
    const list = Array.isArray(current) ? [...current] : [];
    asArray(data.movies).forEach((incoming) => {
      if (!incoming.id) return;
      const posterPath = remap(incoming.posterPath);
      const index = list.findIndex((item) => item.id === incoming.id);
      if (index >= 0) {
        // Keep the film as it is; only fill in a missing poster (or one whose image file is gone).
        if ((!list[index].posterPath || posterFileGone(list[index].posterPath)) && posterPath) {
          list[index] = { ...list[index], posterPath };
        }
        return;
      }
      list.push({ ...incoming, posterPath });
      summary.films += 1;
    });
    return list;
  });

  await updateJson<AnyRecord[]>(DATA_FILES.viewingEntries, [], (current) => {
    const list = Array.isArray(current) ? [...current] : [];
    const ids = new Set(list.map((item) => item.id));
    asArray(data.viewingEntries).forEach((incoming) => {
      if (!incoming.id || ids.has(incoming.id)) return;
      ids.add(incoming.id);
      const theatreId = incoming.theatreId ? theatreIds[incoming.theatreId] ?? incoming.theatreId : undefined;
      list.push({ ...incoming, theatreId });
      summary.viewings += 1;
    });
    return list;
  });

  // One film can be on only one year's watchlist, so films already on any list are skipped.
  await updateJson<AnyRecord[]>(DATA_FILES.annualWatchlists, [], (current) => {
    const lists: AnyRecord[] = Array.isArray(current)
      ? current.map((list) => ({ ...list, movies: [...(list.movies ?? [])] }))
      : [];
    const onList = new Set(lists.flatMap((list) => list.movies.map((item: AnyRecord) => item.movieId)));
    asArray(data.annualWatchlists).forEach((incoming) => {
      const year = Number(incoming.year);
      if (!Number.isFinite(year)) return;
      let list: AnyRecord | undefined = lists.find((item) => Number(item.year) === year);
      if (!list) {
        list = { id: incoming.id ?? `year-${year}`, year, title: incoming.title ?? `${year} Watchlist`, movies: [] };
        lists.push(list);
      }
      const target = list;
      asArray(incoming.movies).forEach((item) => {
        if (!item.movieId || onList.has(item.movieId)) return;
        onList.add(item.movieId);
        target.movies.push({ ...item, posterPath: remap(item.posterPath) });
        summary.watchlistFilms += 1;
      });
    });
    return lists;
  });

  await updateJson<AnyRecord[]>(DATA_FILES.watchlistMovies, [], (current) => {
    const list = Array.isArray(current) ? [...current] : [];
    const ids = new Set(list.map((item) => item.id));
    asArray(data.watchlistMovies).forEach((incoming) => {
      if (!incoming.id || ids.has(incoming.id)) return;
      ids.add(incoming.id);
      list.push({ ...incoming, posterPath: remap(incoming.posterPath) });
    });
    return list;
  });

  return summary;
}

/**
 * Lets the user choose a backup file made by Export, asks to confirm, and adds its data to this device.
 * `onDone` runs after the data has been added, so the screen can reload it.
 */
export async function importBackup(onDone?: () => void): Promise<void> {
  try {
    const text = await pickBackupText();
    if (text === null) return;

    let data: BackupFile;
    try {
      data = JSON.parse(text) as BackupFile;
    } catch {
      notify('Import failed', 'This file is not a ThiraiLog backup.');
      return;
    }
    const known = ['viewingEntries', 'watchlistMovies', 'annualWatchlists', 'movies', 'theatres'] as const;
    if (!data || typeof data !== 'object' || !known.some((key) => Array.isArray(data[key]))) {
      notify('Import failed', 'This file is not a ThiraiLog backup.');
      return;
    }

    const viewings = asArray(data.viewingEntries).length;
    const films = asArray(data.movies).length;
    const theatres = asArray(data.theatres).length;
    confirmAction(
      'Import backup',
      `The file has ${viewings} viewings, ${films} films and ${theatres} theatres. They are added to your diary. ` +
        'Anything you already have stays as it is.',
      async () => {
        try {
          const summary = await applyBackup(data);
          onDone?.();
          notify(
            'Import complete',
            `Added ${summary.viewings} viewings, ${summary.films} films, ${summary.theatres} theatres and ` +
              `${summary.watchlistFilms} watchlist films.`
          );
        } catch {
          notify('Import failed', 'Could not add the data from this file.');
        }
      },
      'Import',
      { danger: false }
    );
  } catch {
    notify('Import failed', 'Could not read this file.');
  }
}


/** Empties every data file and removes the poster images saved on this device. */
async function wipeEverything(): Promise<void> {
  await writeJson(DATA_FILES.viewingEntries, []);
  await writeJson(DATA_FILES.watchlistMovies, []);
  await writeJson(DATA_FILES.annualWatchlists, []);
  await writeJson(DATA_FILES.movies, []);
  await writeJson(DATA_FILES.theatres, []);
  await writeJson(DATA_FILES.theatreImport, null);
  if (Platform.OS === 'web') return;
  try {
    const dir = new Directory(Paths.document, 'posters');
    if (dir.exists) dir.delete();
  } catch {
    // Poster files that cannot be removed are harmless; the data is already gone.
  }
}

/**
 * Formats the app: deletes every viewing, film, theatre and watchlist. It asks once, saying it cannot be
 * undone and suggesting an export first. `onDone` runs after the data is gone so screens can refresh.
 */
export function eraseAllData(onDone?: () => void): void {
  confirmAction(
    'Erase all data?',
    'This deletes every viewing, film, theatre and watchlist on this device. It cannot be undone. ' +
      'Export a backup first if you might want anything back.',
    async () => {
      try {
        await wipeEverything();
        onDone?.();
        notify('All data erased', 'The app is now empty.');
      } catch {
        notify('Could not erase', 'Something went wrong, and some data may remain. Please try again.');
      }
    },
    'Erase everything'
  );
}
