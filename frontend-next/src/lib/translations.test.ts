import { describe, expect, it } from "vitest";
import { indexTranslations, localizedName } from "./translations";

describe("location translation stitching", () => {
  const rows = [
    { location_id: "Astana", lang_code: "RUS", name: "Астана" },
    { location_id: "Astana", lang_code: "ENG", name: "Astana" },
    { location_id: "Almaty", lang_code: "KAZ", name: "Алматы" },
  ];

  it("indexes by location_id + lang", () => {
    const idx = indexTranslations(rows);
    expect(idx.get("Astana::RUS")).toBe("Астана");
    expect(idx.get("Astana::ENG")).toBe("Astana");
  });

  it("resolves the name for a location in the requested language", () => {
    const idx = indexTranslations(rows);
    expect(localizedName(idx, "Astana", "ENG")).toBe("Astana");
    expect(localizedName(idx, "Almaty", "KAZ")).toBe("Алматы");
  });

  it("falls back to the raw id when no translation exists (never hides the row)", () => {
    const idx = indexTranslations(rows);
    expect(localizedName(idx, "Astana", "KAZ")).toBe("Astana");
    expect(localizedName(idx, "Shymkent", "RUS")).toBe("Shymkent");
  });

  it("returns null for a null location", () => {
    const idx = indexTranslations(rows);
    expect(localizedName(idx, null, "RUS")).toBeNull();
  });
});
