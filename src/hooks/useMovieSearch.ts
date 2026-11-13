import { useMemo } from 'react';
import type { Movie } from '../api/movies';

const MAX_RESULTS = 10;

/**
 * Searches only the films already in the app's database (added by hand, logged, or on a watchlist).
 * Films that are not in the database never appear here.
 */
export function useMovieSearch(query: string, databaseFilms: Movie[]) {
  const trimmed = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!trimmed) return [];
    return databaseFilms
      .filter((movie) => movie.title.toLowerCase().includes(trimmed))
      .slice(0, MAX_RESULTS);
  }, [trimmed, databaseFilms]);

  return { results, hasQuery: trimmed.length > 0 };
}
