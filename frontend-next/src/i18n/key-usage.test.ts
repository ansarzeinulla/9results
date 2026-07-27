import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "../../messages/en.json";

/**
 * The key-parity test in messages.test.ts only catches drift *between*
 * locales — a key missing from every locale (including en) passes it
 * trivially, because there is nothing to diverge from. That is exactly how
 * `adminPanel.players`, `admin.addPlayerById` and friends went unnoticed:
 * the code called t("adminPanel.players") and next-intl silently rendered
 * the raw key, since it was absent everywhere, not just in translations
 * other than en.
 *
 * This test instead walks the source tree for `t("...")` calls and checks
 * each resolved key exists in en.json — the side messages.test.ts can't see.
 */

const SRC_DIR = path.join(__dirname, "..");

function flatKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const full = `${prefix}${k}`;
    if (v && typeof v === "object") {
      for (const child of flatKeys(v as Record<string, unknown>, `${full}.`)) keys.add(child);
    } else {
      keys.add(full);
    }
  }
  return keys;
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/** Maps translator variable names (t, te, ...) to their namespace within one file. */
function namespacesInFile(source: string): Map<string, string | null> {
  const ns = new Map<string, string | null>();
  const re = /\b(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\(\s*(?:["'`]([\w.]+)["'`])?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    ns.set(m[1], m[2] ?? null);
  }
  return ns;
}

describe("i18n key usage", () => {
  const enKeys = flatKeys(en);
  const files = walk(SRC_DIR);
  const missing: string[] = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const ns = namespacesInFile(source);
    if (ns.size === 0) continue;

    // Only literal-string calls to a tracked translator variable are checked;
    // template-interpolated keys (t(`admin.add${x}ById`)) are skipped — they
    // can't be resolved statically and are not what broke last time.
    const callRe = /\b(\w+)\(\s*["'`]([\w.]+)["'`]/g;
    let m: RegExpExecArray | null;
    while ((m = callRe.exec(source))) {
      const [, varName, key] = m;
      if (!ns.has(varName)) continue;
      const namespace = ns.get(varName);
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!enKeys.has(fullKey)) {
        const line = source.slice(0, m.index).split("\n").length;
        missing.push(`${path.relative(SRC_DIR, file)}:${line} — t("${key}") → "${fullKey}" not in en.json`);
      }
    }
  }

  it("every statically-resolvable t(...) call has a matching key in en.json", () => {
    expect(missing, missing.join("\n")).toEqual([]);
  });
});
