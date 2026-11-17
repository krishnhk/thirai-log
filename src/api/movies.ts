import { DATA_FILES, readJson, updateJson } from '../lib/storage';

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  runtime?: number;
  genres?: string[];
  languages?: string[];
  voteAverage?: number;
  voteCount?: number;
  tagline?: string;
  status?: string;
  video?: boolean;
  adult?: boolean;
}

// Drops undefined fields so a partial update never erases stored data.
function definedFields(movie: Movie): Partial<Movie> {
  return Object.fromEntries(
    Object.entries(movie).filter(([, value]) => value !== undefined)
  ) as Partial<Movie>;
}

async function readCache(): Promise<Movie[]> {
  const parsed = await readJson<Movie[]>(DATA_FILES.movies, []);
  return Array.isArray(parsed) ? parsed : [];
}

async function upsertCache(incoming: Movie[]): Promise<void> {
  // Atomic: concurrent upserts merge instead of overwriting each other.
  await updateJson<Movie[]>(DATA_FILES.movies, [], (current) => {
    const byId = new Map((Array.isArray(current) ? current : []).map((movie) => [movie.id, movie]));
    incoming.forEach((movie) => {
      byId.set(movie.id, { ...byId.get(movie.id), ...definedFields(movie) } as Movie);
    });
    return [...byId.values()];
  });
}

/** Creates or updates a catalog film. Undefined fields never overwrite stored values. */
export async function upsertMovie(movie: { id: string; title: string } & Partial<Movie>): Promise<void> {
  await upsertCache([movie as Movie]);
}

/** Changes a catalog film. `releaseDate: null` removes the year. */
export async function updateMovie(
  id: string,
  changes: { title?: string; releaseDate?: string | null }
): Promise<void> {
  await updateJson<Movie[]>(DATA_FILES.movies, [], (current) =>
    (Array.isArray(current) ? current : []).map((movie) => {
      if (movie.id !== id) return movie;
      const next: Movie = { ...movie };
      if (changes.title !== undefined) next.title = changes.title;
      if (changes.releaseDate === null) delete next.releaseDate;
      else if (changes.releaseDate !== undefined) next.releaseDate = changes.releaseDate;
      return next;
    })
  );
}

export const Movies = {
  getCachedMovies: readCache,
};
