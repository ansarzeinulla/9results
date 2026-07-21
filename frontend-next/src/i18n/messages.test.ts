import { describe, expect, it } from "vitest";
import { routing } from "./routing";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import kk from "../../messages/kk.json";
import es from "../../messages/es.json";
import tr from "../../messages/tr.json";
import ko from "../../messages/ko.json";
import cs from "../../messages/cs.json";

const locales: Record<string, Record<string, unknown>> = {
  en,
  ru,
  kk,
  es,
  tr,
  ko,
  cs,
};

/** Every locale except the reference one (en). */
const translated = Object.keys(locales).filter((l) => l !== "en");

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? flatKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

function flatEntries(obj: Record<string, unknown>, prefix = ""): [string, unknown][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? flatEntries(v as Record<string, unknown>, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v] as [string, unknown]]
  );
}

describe("i18n completeness", () => {
  it("routing declares every language the database is seeded with", () => {
    expect([...routing.locales].sort()).toEqual(
      ["en", "ru", "kk", "es", "tr", "ko", "cs"].sort()
    );
  });

  it("the default locale is one of the declared locales", () => {
    expect(routing.locales).toContain(routing.defaultLocale);
  });

  it("every locale has a message file", () => {
    for (const locale of routing.locales) {
      expect(locales[locale], `messages for ${locale}`).toBeDefined();
    }
  });

  it("every locale has exactly the same keys as en", () => {
    const enKeys = flatKeys(en).sort();
    for (const locale of translated) {
      expect(flatKeys(locales[locale]).sort(), `keys of ${locale}`).toEqual(enKeys);
    }
  });

  it("no empty translation values", () => {
    for (const [locale, messages] of Object.entries(locales)) {
      for (const [key, value] of flatEntries(messages)) {
        expect(
          typeof value === "string" && value.trim().length > 0,
          `${locale}:${key} is empty or not a string`
        ).toBe(true);
      }
    }
  });

  it("no leftover i18next {{placeholders}} (next-intl uses single braces)", () => {
    for (const [locale, messages] of Object.entries(locales)) {
      for (const [key, value] of flatEntries(messages)) {
        expect(
          String(value).includes("{{"),
          `${locale}:${key} still uses i18next syntax: ${value}`
        ).toBe(false);
      }
    }
  });

  it("interpolation params match across locales", () => {
    const params = (v: unknown) =>
      [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const enMap = new Map(flatEntries(en));
    for (const locale of translated) {
      for (const [key, value] of flatEntries(locales[locale])) {
        expect(params(value), `${locale}:${key} params`).toEqual(
          params(enMap.get(key))
        );
      }
    }
  });
});
