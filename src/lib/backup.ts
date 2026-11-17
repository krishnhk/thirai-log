import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DATA_FILES, readJson } from './storage';
import { isLocalPoster } from './posters';
import { notify } from './ui';

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
