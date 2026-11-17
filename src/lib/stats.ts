import { yearOf } from './format';
import type { Companion } from './library';

/** The few viewing fields the counts need. */
export interface CountableViewing {
  movieId: string;
  title: string;
  watchedAt: string;
  companion?: Companion;
}

export interface CompanionGroup {
  /** Number of viewings. The same film logged twice counts twice. */
  viewings: number;
  /** Number of different films among those viewings. */
  films: number;
}

export interface CompanionStats {
  alone: CompanionGroup;
  company: CompanionGroup;
  /** Viewings this year that have no answer yet (logged before the question existed). */
  unanswered: number;
  /** All viewings this year, answered or not. */
  total: number;
}

/** Same film key the Home screen already uses for "unique titles". */
const filmKey = (entry: CountableViewing) => entry.movieId || entry.title.toLowerCase();

/**
 * Counts viewings, not films, for one calendar year and splits them into solo and
 * group viewings. Viewings without an answer are not counted in either group.
 */
export function companionStats(entries: CountableViewing[], year: number): CompanionStats {
  const films = { alone: new Set<string>(), company: new Set<string>() };
  const result: CompanionStats = {
    alone: { viewings: 0, films: 0 },
    company: { viewings: 0, films: 0 },
    unanswered: 0,
    total: 0,
  };

  entries.forEach((entry) => {
    if (yearOf(entry.watchedAt) !== year) return;
    result.total += 1;
    if (entry.companion === 'alone' || entry.companion === 'company') {
      result[entry.companion].viewings += 1;
      films[entry.companion].add(filmKey(entry));
    } else {
      result.unanswered += 1;
    }
  });

  result.alone.films = films.alone.size;
  result.company.films = films.company.size;
  return result;
}

/**
 * "5 viewings · 4 films", or null when the two numbers are equal and the line would only
 * repeat the count.
 */
export function viewingsFilmsNote(group: CompanionGroup): string | null {
  if (group.films === group.viewings) return null;
  const viewings = `${group.viewings} ${group.viewings === 1 ? 'viewing' : 'viewings'}`;
  const films = `${group.films} ${group.films === 1 ? 'film' : 'films'}`;
  return `${viewings} · ${films}`;
}

export const COMPANION_LABELS: Record<Companion, string> = {
  alone: 'Solo',
  company: 'Group',
};
