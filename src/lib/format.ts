const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function toDate(value: string | Date | undefined | null): Date {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function formatDate(value: string | Date): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(value: string | Date): string {
  const date = toDate(value);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatMonthYear(value: string | Date): string {
  const date = toDate(value);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthShort(index: number): string {
  return MONTHS_SHORT[((index % 12) + 12) % 12];
}

export function monthInitial(index: number): string {
  return MONTH_NAMES[((index % 12) + 12) % 12].slice(0, 1);
}

export function todayInputValue(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function parseInputDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRating(rating?: number): string {
  if (rating === undefined || rating === null) return '—';
  return rating.toFixed(1);
}

export function yearOf(value: string | Date): number {
  return toDate(value).getFullYear();
}
