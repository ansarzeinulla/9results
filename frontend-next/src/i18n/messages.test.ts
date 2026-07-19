import { describe, expect, it } from "vitest";
import { routing } from "./routing";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import kk from "../../messages/kk.json";

const locales: Record<string, Record<string, unknown>> = { en, ru, kk };

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
  it("routing declares exactly ru, en, kk", () => {
    expect([...routing.locales].sort()).toEqual(["en", "kk", "ru"]);
  });

  it("the default locale is one of the declared locales", () => {
    expect(routing.locales).toContain(routing.defaultLocale);
  });

  it("every locale has a message file", () => {
    for (const locale of routing.locales) {
      expect(locales[locale], `messages for ${locale}`).toBeDefined();
    }
  });

  it("ru and kk have exactly the same keys as en", () => {
    const enKeys = flatKeys(en).sort();
    for (const locale of ["ru", "kk"]) {
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
    for (const locale of ["ru", "kk"]) {
      for (const [key, value] of flatEntries(locales[locale])) {
        expect(params(value), `${locale}:${key} params`).toEqual(
          params(enMap.get(key))
        );
      }
    }
  });
});
