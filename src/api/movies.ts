import { DATA_FILES, readJson, updateJson } from '../lib/storage';
import {
  getMovieDetails,
  getMovieBackdrop,
  getMoviePoster,
  searchMovies,
  type TMDBMovie,
} from './tmdb';

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

function toMovie(tmdb: TMDBMovie): Movie {
  return {
    id: String(tmdb.id),
    title: tmdb.title,
    originalTitle: tmdb.original_title,
    overview: tmdb.overview,
    posterPath: tmdb.poster_path ? getMoviePoster(tmdb.poster_path) : undefined,
    backdropPath: tmdb.backdrop_path ? getMovieBackdrop(tmdb.backdrop_path) : undefined,
    releaseDate: tmdb.release_date || undefined,
    runtime: tmdb.runtime,
    genres: tmdb.genres?.map((genre) => genre.name),
    languages: tmdb.original_language ? [tmdb.original_language] : undefined,
    voteAverage: tmdb.vote_average,
    voteCount: tmdb.vote_count,
    tagline: tmdb.tagline,
    status: tmdb.status,
    video: tmdb.video,
    adult: tmdb.adult,
  };
}

// Drops undefined fields so a lighter search result never erases richer cached data.
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

  /** Live TMDB search. Results are NOT cached until the user picks one. */
  async search(query: string): Promise<Movie[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const response = await searchMovies(trimmed);
    return response.results.slice(0, 10).map(toMovie);
  },

  /**
   * Persists a chosen film. Search results lack genres and runtime, so we fetch
   * full details once here; the stats screen depends on those fields.
   */
  async remember(movie: Movie): Promise<Movie> {
    let enriched = movie;
    const isTmdbId = /^\d+$/.test(movie.id);
    const needsDetails = isTmdbId && (!movie.genres || movie.runtime === undefined);

    if (needsDetails) {
      try {
        enriched = { ...movie, ...definedFields(toMovie(await getMovieDetails(Number(movie.id)))) };
      } catch {
        // Offline or missing key: keep the lighter record rather than failing the save.
      }
    }

    await upsertCache([enriched]);
    return enriched;
  },
};
