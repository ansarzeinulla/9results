/**
 * Grouping rules for the long reference dropdowns (locations, participant
 * types). Both lists are flat id lists in the database and unusable as a
 * single 200-row `<select>`; these helpers turn them into `<optgroup>`s.
 *
 * Group keys map to messages under `optionGroup.*`; the age groups are
 * labelled through `optionGroup.age` with an `{n}` parameter.
 */
import { LOCATION_GROUPS } from "./location-groups";

export interface Opt {
  id: string;
  name: string;
}

export interface OptGroup {
  /** Message key suffix, or `age:<n>` for a youth bracket. */
  key: string;
  items: Opt[];
}

/** Adults/general categories, in the order they should be offered. */
const GENERAL = ["All", "Men", "Women", "Seniors", "Veterans", "V50", "V60", "V65"];

const isTeam = (id: string) => id.startsWith("Team_");
/** "B12" / "G12" / "U12" → 12; anything else → null. */
const ageOf = (id: string) => {
  const m = /^[BGU](\d{1,2})$/.exec(id);
  return m ? Number(m[1]) : null;
};

export function groupParticipantTypes(opts: Opt[]): OptGroup[] {
  const byId = new Map(opts.map((o) => [o.id, o]));
  const groups: OptGroup[] = [];

  const general = GENERAL.map((id) => byId.get(id)).filter((o): o is Opt => !!o);
  if (general.length) groups.push({ key: "general", items: general });

  const teams = opts.filter((o) => isTeam(o.id));
  if (teams.length) groups.push({ key: "teams", items: teams });

  const ages = new Map<number, Opt[]>();
  for (const o of opts) {
    const age = ageOf(o.id);
    if (age == null) continue;
    if (!ages.has(age)) ages.set(age, []);
    ages.get(age)!.push(o);
  }
  for (const age of [...ages.keys()].sort((a, b) => a - b)) {
    // B (boys) → G (girls) → U (open), the order federations print them in.
    const items = ages
      .get(age)!
      .sort((a, b) => "BGU".indexOf(a.id[0]) - "BGU".indexOf(b.id[0]));
    groups.push({ key: `age:${age}`, items });
  }

  const grouped = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
  const rest = opts.filter((o) => !grouped.has(o.id));
  if (rest.length) groups.push({ key: "other", items: rest });
  return groups;
}

export function groupLocations(opts: Opt[]): OptGroup[] {
  const byId = new Map(opts.map((o) => [o.id, o]));
  const groups: OptGroup[] = [];
  const used = new Set<string>();
  for (const g of LOCATION_GROUPS) {
    const items = g.ids
      .map((id) => byId.get(id))
      .filter((o): o is Opt => !!o)
      .sort((a, b) => a.name.localeCompare(b.name));
    items.forEach((i) => used.add(i.id));
    if (items.length) groups.push({ key: `loc_${g.key}`, items });
  }
  // Locations seeded after this table was generated still have to show up.
  const rest = opts.filter((o) => !used.has(o.id));
  if (rest.length) groups.push({ key: "other", items: rest });
  return groups;
}
