/**
 * Pure helpers for stitching translation rows onto entities in JS.
 *
 * We resolve localized names in JS rather than via PostgREST embedding because
 * `tournaments` has no direct foreign key to `location_translations` — they are
 * related only through `locations` (a two-hop relationship PostgREST cannot
 * embed, which returns HTTP 400).
 */

export interface TranslationRow {
  location_id: string;
  lang_code: string;
  name: string;
}

export function indexTranslations(rows: TranslationRow[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const r of rows) index.set(`${r.location_id}::${r.lang_code}`, r.name);
  return index;
}

/** Localized name, falling back to the raw id so a row is never hidden. */
export function localizedName(
  index: Map<string, string>,
  locationId: string | null,
  lang: string
): string | null {
  if (!locationId) return null;
  return index.get(`${locationId}::${lang}`) ?? locationId;
}
