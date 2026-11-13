import { Movies, updateMovie, upsertMovie } from '../api/movies';
import type { Movie } from '../api/movies';
import { DATA_FILES, readJson, updateJson } from './storage';

// Kept under the same names so existing call sites keep working.
export const STORAGE_KEYS = {
  viewingEntries: DATA_FILES.viewingEntries,
  watchlistMovies: DATA_FILES.watchlistMovies,
  annualWatchlists: DATA_FILES.annualWatchlists,
} as const;

export type EntryStatus = 'planned' | 'watched' | 'skipped' | 'postponed';

export interface ViewingEntry {
  id: string;
  movieId: string;
  title: string;
  watchedAt: string;
  theatre?: string;
  rating?: number;
  notes?: string;
  status?: EntryStatus;
  createdAt?: string;
}

export interface WatchItem {
  id: string;
  movieId: string;
  title: string;
  posterPath?: string;
  year: number;
  status: EntryStatus;
  addedAt?: string;
  notes?: string;
}

export interface AnnualList {
  id: string;
  year: number;
  title: string;
  movies: WatchItem[];
}

export interface Library {
  entries: ViewingEntry[];
  watchlist: WatchItem[];
  annual: AnnualList[];
  movies: Movie[];
  posters: Record<string, string>;
  titlePosters: Record<string, string>;
}

function normalizeStatus(value: unknown): EntryStatus {
  return value === 'watched' || value === 'skipped' || value === 'postponed' ? value : 'planned';
}

function normalizeEntry(raw: any): ViewingEntry {
  return {
    id: String(raw?.id ?? `${raw?.movieId ?? 'entry'}-${Date.now()}`),
    movieId: String(raw?.movieId ?? ''),
    title: String(raw?.title ?? 'Untitled'),
    watchedAt: raw?.watchedAt ?? new Date().toISOString(),
    theatre: raw?.theatre || undefined,
    rating:
      typeof raw?.rating === 'number' && Number.isFinite(raw.rating) ? raw.rating : undefined,
    notes: raw?.notes || undefined,
    status: raw?.status ? normalizeStatus(raw.status) : undefined,
    createdAt: raw?.createdAt || undefined,
  };
}

function normalizeWatchItem(raw: any): WatchItem {
  return {
    id: String(raw?.id ?? `${raw?.movieId ?? 'item'}-${Date.now()}`),
    movieId: String(raw?.movieId ?? raw?.id ?? ''),
    title: String(raw?.title ?? 'Untitled'),
    posterPath: raw?.posterPath || undefined,
    year: Number(raw?.year) || new Date().getFullYear(),
    status: normalizeStatus(raw?.status),
    addedAt: raw?.addedAt || undefined,
    notes: raw?.notes || undefined,
  };
}

function normalizeAnnual(raw: any): AnnualList {
  const year = Number(raw?.year) || new Date().getFullYear();
  return {
    id: String(raw?.id ?? `year-${year}`),
    year,
    title: String(raw?.title ?? `${year} Watchlist`),
    movies: Array.isArray(raw?.movies) ? raw.movies.map(normalizeWatchItem) : [],
  };
}

export async function loadLibrary(): Promise<Library> {
  const [entriesRaw, watchlistRaw, annualRaw, movies] = await Promise.all([
    readJson<any[]>(STORAGE_KEYS.viewingEntries, []),
    readJson<any[]>(STORAGE_KEYS.watchlistMovies, []),
    readJson<any[]>(STORAGE_KEYS.annualWatchlists, []),
    Movies.getCachedMovies().catch(() => [] as Movie[]),
  ]);

  const entries = Array.isArray(entriesRaw) ? entriesRaw.map(normalizeEntry) : [];
  const watchlist = Array.isArray(watchlistRaw) ? watchlistRaw.map(normalizeWatchItem) : [];
  const annual = Array.isArray(annualRaw) ? annualRaw.map(normalizeAnnual) : [];

  const posters: Record<string, string> = {};
  const titlePosters: Record<string, string> = {};

  const register = (item: { id?: string; movieId?: string; title?: string; posterPath?: string }) => {
    if (!item.posterPath) return;
    if (item.id) posters[item.id] = item.posterPath;
    if (item.movieId) posters[item.movieId] = item.posterPath;
    if (item.title) titlePosters[item.title.toLowerCase()] = item.posterPath;
  };

  movies.forEach(register);
  watchlist.forEach(register);
  annual.forEach((list) => list.movies.forEach(register));

  return { entries, watchlist, annual, movies, posters, titlePosters };
}

export function resolvePoster(library: Library, movieId?: string, title?: string): string | undefined {
  if (movieId && library.posters[movieId]) return library.posters[movieId];
  if (title && library.titlePosters[title.toLowerCase()]) {
    return library.titlePosters[title.toLowerCase()];
  }
  return undefined;
}

export function findMovie(library: Library, movieId?: string, title?: string): Movie | undefined {
  if (movieId) {
    const byId = library.movies.find((movie) => movie.id === movieId);
    if (byId) return byId;
  }
  if (title) {
    const lower = title.toLowerCase();
    return library.movies.find((movie) => movie.title.toLowerCase() === lower);
  }
  return undefined;
}

/** Inserts or updates a viewing entry by id. */
export async function saveViewingEntry(entry: ViewingEntry): Promise<void> {
  await updateJson<any[]>(STORAGE_KEYS.viewingEntries, [], (current) => {
    const list = Array.isArray(current) ? [...current] : [];
    const index = list.findIndex((item) => item?.id === entry.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...entry };
    } else {
      list.push({ ...entry, createdAt: entry.createdAt ?? new Date().toISOString() });
    }
    return list;
  });
}

export async function deleteViewingEntry(id: string): Promise<void> {
  await updateJson<any[]>(STORAGE_KEYS.viewingEntries, [], (current) =>
    (Array.isArray(current) ? current : []).filter((item) => item?.id !== id)
  );
}

export async function readAnnualLists(): Promise<AnnualList[]> {
  const raw = await readJson<any[]>(STORAGE_KEYS.annualWatchlists, []);
  return Array.isArray(raw) ? raw.map(normalizeAnnual) : [];
}

/**
 * Atomically edits the annual lists. `change` gets the current lists and returns the new ones.
 * Prefer this over reading and saving separately.
 */
export async function mutateAnnualLists(
  change: (lists: AnnualList[]) => AnnualList[]
): Promise<AnnualList[]> {
  const next = await updateJson<any[]>(STORAGE_KEYS.annualWatchlists, [], (current) => {
    const lists = Array.isArray(current) ? current.map(normalizeAnnual) : [];
    return change(lists);
  });
  return Array.isArray(next) ? next.map(normalizeAnnual) : [];
}

/**
 * Marks a film as watched in the annual lists and the legacy watchlist.
 * Matches by film id, or by title for films that were added by hand.
 */
export async function markWatchlistWatched(movieId: string, title: string): Promise<void> {
  const key = title.trim().toLowerCase();
  const matches = (item: { movieId?: string; title?: string }) =>
    item?.movieId === movieId || (key !== '' && item?.title?.trim().toLowerCase() === key);

  await mutateAnnualLists((lists) =>
    lists.map((list) => ({
      ...list,
      movies: list.movies.map((item) => (matches(item) ? { ...item, status: 'watched' as const } : item)),
    }))
  );

  await updateJson<any[]>(STORAGE_KEYS.watchlistMovies, [], (current) =>
    (Array.isArray(current) ? current : []).map((item) =>
      matches(item) ? { ...item, status: 'watched' } : item
    )
  );
}

/**
 * Sets a film's poster everywhere it is stored: the film catalog, the legacy
 * watchlist, and every annual list. Keeps the library's poster lookup consistent.
 */
export async function updateFilmPoster(movieId: string, title: string, posterPath: string): Promise<void> {
  await upsertMovie({ id: movieId, title, posterPath });

  await mutateAnnualLists((lists) =>
    lists.map((list) => ({
      ...list,
      movies: list.movies.map((item) => (item.movieId === movieId ? { ...item, posterPath } : item)),
    }))
  );

  await updateJson<any[]>(STORAGE_KEYS.watchlistMovies, [], (current) =>
    (Array.isArray(current) ? current : []).map((item) =>
      item?.movieId === movieId ? { ...item, posterPath } : item
    )
  );
}


/** The film's release year as text, or empty when unknown. */
export function filmYear(movie: { releaseDate?: string }): string {
  return movie.releaseDate ? movie.releaseDate.slice(0, 4) : '';
}

/**
 * Every film in the app's database: the catalog plus films that only appear in logged
 * viewings or watchlists. Films with the same title but different years stay separate.
 */
export function searchableFilms(library: Library): Movie[] {
  const byId = new Map<string, Movie>();
  const catalogTitles = new Set<string>();
  const derivedTitles = new Set<string>();

  library.movies.forEach((m) => {
    byId.set(m.id, { id: m.id, title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate });
    catalogTitles.add(m.title.trim().toLowerCase());
  });

  // Films seen only in entries/watchlists have no year. Skip them when the catalog already
  // has that title, so a legacy entry does not appear as a duplicate.
  const addDerived = (id: string, title: string, posterPath?: string) => {
    const existing = byId.get(id);
    if (existing) {
      if (!existing.posterPath && posterPath) byId.set(id, { ...existing, posterPath });
      return;
    }
    const key = title.trim().toLowerCase();
    if (!key || catalogTitles.has(key) || derivedTitles.has(key)) return;
    derivedTitles.add(key);
    byId.set(id, { id, title, posterPath });
  };

  library.entries.forEach((e) => addDerived(e.movieId, e.title, resolvePoster(library, e.movieId, e.title)));
  library.watchlist.forEach((w) => addDerived(w.movieId, w.title, w.posterPath));
  library.annual.forEach((list) => list.movies.forEach((w) => addDerived(w.movieId, w.title, w.posterPath)));

  return [...byId.values()];
}

/**
 * Edits a film in the database. The title is also updated wherever the film is
 * copied: logged viewings, the watchlist and the annual lists.
 */
export async function editFilm(
  movieId: string,
  changes: { title: string; year?: number; posterPath?: string }
): Promise<void> {
  const releaseDate = changes.year ? `${changes.year}-06-15` : null;
  const catalog = await Movies.getCachedMovies();
  if (catalog.some((movie) => movie.id === movieId)) {
    await updateMovie(movieId, { title: changes.title, releaseDate });
  } else {
    // A film that only exists in a viewing or watchlist gets a catalog record now.
    await upsertMovie({ id: movieId, title: changes.title, releaseDate: releaseDate ?? undefined });
  }

  const retitle = <T extends { movieId?: string }>(item: T): T =>
    item?.movieId === movieId ? { ...item, title: changes.title } : item;

  await updateJson<any[]>(STORAGE_KEYS.viewingEntries, [], (current) =>
    (Array.isArray(current) ? current : []).map(retitle)
  );
  await updateJson<any[]>(STORAGE_KEYS.watchlistMovies, [], (current) =>
    (Array.isArray(current) ? current : []).map(retitle)
  );
  await mutateAnnualLists((lists) =>
    lists.map((list) => ({ ...list, movies: list.movies.map(retitle) }))
  );

  if (changes.posterPath) {
    await updateFilmPoster(movieId, changes.title, changes.posterPath);
  }
}

export function emptyLibrary(): Library {
  return {
    entries: [],
    watchlist: [],
    annual: [],
    movies: [],
    posters: {},
    titlePosters: {},
  };
}
