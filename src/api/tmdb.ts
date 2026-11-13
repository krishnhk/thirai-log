const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Set EXPO_PUBLIC_TMDB_API_KEY in a .env file (or EAS secrets) to enable search.
const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';

export const isTmdbConfigured = (): boolean => API_KEY.length > 0;

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  runtime?: number;
  genres?: TMDBGenre[];
  original_language?: string;
  vote_average?: number;
  vote_count?: number;
  tagline?: string;
  status?: string;
  video?: boolean;
  adult?: boolean;
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

async function tmdbGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  if (!API_KEY) {
    throw new Error('TMDB is not configured. Set EXPO_PUBLIC_TMDB_API_KEY.');
  }
  const query = Object.entries({ api_key: API_KEY, ...params })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  const response = await fetch(`${TMDB_BASE_URL}${path}?${query}`);
  if (!response.ok) {
    throw new Error(`TMDB request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export const fetchTrending = async (): Promise<TMDBMovie[]> => {
  const data = await tmdbGet<{ results: TMDBMovie[] }>('/trending/movie/week');
  return data.results;
};

export const searchMovies = (query: string, page = 1): Promise<TMDBSearchResponse> =>
  tmdbGet<TMDBSearchResponse>('/search/movie', {
    query,
    page,
    include_adult: 'false',
  });

export const getMovieDetails = (movieId: number): Promise<TMDBMovie> =>
  tmdbGet<TMDBMovie>(`/movie/${movieId}`);

export const getMoviePoster = (path?: string | null, size: 'original' | 'w500' = 'w500'): string => {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

export const getMovieBackdrop = (path?: string | null, size: 'original' | 'w780' = 'w780'): string => {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};
