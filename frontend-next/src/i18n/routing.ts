import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "en", "kk", "es", "tr", "ko", "cs"],
  defaultLocale: "en",
});
