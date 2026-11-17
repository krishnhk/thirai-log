import { DATA_FILES, readJson, updateJson, writeJson } from './storage';

/**
 * Theatres the user has visited. Stored as one JSON file with the same helpers as the rest of
 * the data layer. Viewings link to a theatre through `ViewingEntry.theatreId`.
 */

export const THEATRE_NAME_MAX = 100;
export const THEATRE_DISTRICT_MAX = 60;

export interface Theatre {
  id: string;
  name: string;
  district: string;
  createdAt: string;
}

export interface TheatreInput {
  /** Present when editing an existing theatre. */
  id?: string;
  name: string;
  district: string;
}

export type TheatreResult = { ok: true; theatre: Theatre } | { ok: false; error: string };

export interface TheatreSection {
  district: string;
  data: Theatre[];
}

function newId(): string {
  return `theatre-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const lower = (value: string) => value.trim().toLowerCase();
const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** Turns one stored record into a Theatre, or null when it has no usable name and district. */
function normalizeTheatre(raw: any): Theatre | null {
  const name = String(raw?.name ?? '').trim().slice(0, THEATRE_NAME_MAX);
  const district = String(raw?.district ?? '').trim().slice(0, THEATRE_DISTRICT_MAX);
  if (!name || !district) return null;
  return {
    id: raw?.id ? String(raw.id) : newId(),
    name,
    district,
    createdAt: raw?.createdAt ? String(raw.createdAt) : new Date().toISOString(),
  };
}

/** Parses stored data defensively, so a missing or damaged file just gives an empty list. */
export function parseTheatres(raw: unknown): Theatre[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeTheatre).filter((item): item is Theatre => item !== null);
}

async function listTheatres(): Promise<Theatre[]> {
  return parseTheatres(await readJson<unknown>(DATA_FILES.theatres, []));
}

/** Returns a message the UI can show, or null when the input is valid. */
export function validateTheatre(name: string, district: string): string | null {
  const n = name.trim();
  const d = district.trim();
  if (!n) return 'Enter the theatre name.';
  if (n.length > THEATRE_NAME_MAX) return `Theatre name can be at most ${THEATRE_NAME_MAX} characters.`;
  if (!d) return 'Enter the district.';
  if (d.length > THEATRE_DISTRICT_MAX) return `District can be at most ${THEATRE_DISTRICT_MAX} characters.`;
  return null;
}

/** Creates a theatre, or updates it when `input.id` is set. Rejects a duplicate name + district. */
export async function saveTheatre(input: TheatreInput): Promise<TheatreResult> {
  const name = input.name.trim();
  const district = input.district.trim();
  const invalid = validateTheatre(name, district);
  if (invalid) return { ok: false, error: invalid };

  let result = { ok: false, error: 'Could not save this theatre.' } as TheatreResult;
  await updateJson<unknown>(DATA_FILES.theatres, [], (current) => {
    const list = parseTheatres(current);
    const duplicate = list.find(
      (item) =>
        item.id !== input.id && lower(item.name) === lower(name) && lower(item.district) === lower(district)
    );
    if (duplicate) {
      result = {
        ok: false,
        error: `“${duplicate.name}” in ${duplicate.district} is already in your theatres.`,
      };
      return list;
    }

    const existing = input.id ? list.find((item) => item.id === input.id) : undefined;
    const theatre: Theatre = {
      id: existing?.id ?? newId(),
      name,
      district,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    result = { ok: true, theatre };
    return existing ? list.map((item) => (item.id === existing.id ? theatre : item)) : [...list, theatre];
  });
  return result;
}

/** Removes only the theatre record. Viewings that used it keep their saved theatre name. */
export async function deleteTheatre(id: string): Promise<void> {
  await updateJson<unknown>(DATA_FILES.theatres, [], (current) =>
    parseTheatres(current).filter((item) => item.id !== id)
  );
}

export function sortTheatres(theatres: Theatre[]): Theatre[] {
  return [...theatres].sort((a, b) => compare(a.district, b.district) || compare(a.name, b.name));
}

/** Groups theatres by district, sorted by district and then name. */
export function groupByDistrict(theatres: Theatre[]): TheatreSection[] {
  const sections: TheatreSection[] = [];
  sortTheatres(theatres).forEach((theatre) => {
    const last = sections[sections.length - 1];
    if (last && lower(last.district) === lower(theatre.district)) last.data.push(theatre);
    else sections.push({ district: theatre.district, data: [theatre] });
  });
  return sections;
}

/** Shared matching rule: case-insensitive substring on name or district. */
export function matchesTheatre(theatre: Theatre, query: string): boolean {
  const needle = lower(query);
  if (!needle) return true;
  return lower(theatre.name).includes(needle) || lower(theatre.district).includes(needle);
}

export function searchTheatres(theatres: Theatre[], query: string, limit?: number): Theatre[] {
  const matches = sortTheatres(theatres).filter((item) => matchesTheatre(item, query));
  return limit ? matches.slice(0, limit) : matches;
}

export function districtCount(theatres: Theatre[]): number {
  return new Set(theatres.map((item) => lower(item.district))).size;
}

export interface TheatreDisplay {
  name: string;
  district?: string;
}

/**
 * What to show for a viewing: the saved theatre (name and district) when `theatreId` still
 * matches one, otherwise the plain text saved with the viewing.
 */
export function theatreDisplay(
  entry: { theatre?: string; theatreId?: string },
  theatres: Theatre[]
): TheatreDisplay | null {
  if (entry.theatreId) {
    const found = theatres.find((item) => item.id === entry.theatreId);
    if (found) return { name: found.name, district: found.district };
  }
  const text = entry.theatre?.trim();
  return text ? { name: text } : null;
}

// ---- Old free-text theatres -------------------------------------------------------------

export interface LegacyTheatreName {
  name: string;
  count: number;
}

/**
 * Unique theatre names typed into older viewings (no theatreId) that are not yet in the list.
 * Nothing is created from these automatically.
 */
export function legacyTheatreNames(
  entries: { theatre?: string; theatreId?: string }[],
  theatres: Theatre[]
): LegacyTheatreName[] {
  const known = new Set(theatres.map((item) => lower(item.name)));
  const found = new Map<string, LegacyTheatreName>();
  entries.forEach((entry) => {
    const name = entry.theatre?.trim();
    if (!name || entry.theatreId || known.has(lower(name))) return;
    const key = lower(name);
    const current = found.get(key);
    if (current) current.count += 1;
    else found.set(key, { name, count: 1 });
  });
  return [...found.values()].sort((a, b) => b.count - a.count || compare(a.name, b.name));
}

export async function isLegacyPromptDismissed(): Promise<boolean> {
  const saved = await readJson<{ dismissed?: boolean } | null>(DATA_FILES.theatreImport, null);
  return saved?.dismissed === true;
}

export async function dismissLegacyPrompt(): Promise<void> {
  await writeJson(DATA_FILES.theatreImport, { dismissed: true });
}

export interface LegacyImportItem {
  name: string;
  district: string;
}

export interface LegacyImportResult {
  imported: number;
  errors: { name: string; error: string }[];
}

/**
 * Saves the chosen old theatre names as theatres, then links viewings that used the same name
 * to them so their district shows up. The text saved with each viewing is left as it was.
 */
export async function importLegacyTheatres(items: LegacyImportItem[]): Promise<LegacyImportResult> {
  const result: LegacyImportResult = { imported: 0, errors: [] };
  const linked = new Map<string, string>(); // lower-case name -> theatre id

  for (const item of items) {
    const saved = await saveTheatre({ name: item.name, district: item.district });
    if (saved.ok) {
      result.imported += 1;
      linked.set(lower(item.name), saved.theatre.id);
      continue;
    }
    // An identical theatre already exists: link to it instead of reporting a failure.
    const existing = (await listTheatres()).find(
      (theatre) =>
        lower(theatre.name) === lower(item.name) && lower(theatre.district) === lower(item.district)
    );
    if (existing) linked.set(lower(item.name), existing.id);
    else result.errors.push({ name: item.name, error: saved.error });
  }

  if (linked.size > 0) {
    await updateJson<any[]>(DATA_FILES.viewingEntries, [], (current) =>
      (Array.isArray(current) ? current : []).map((entry) => {
        const id = entry?.theatre && !entry?.theatreId ? linked.get(lower(String(entry.theatre))) : undefined;
        return id ? { ...entry, theatreId: id } : entry;
      })
    );
  }
  return result;
}
