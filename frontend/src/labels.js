// Helpers to translate enum-ish values via i18n keys.
export const statusLabel = (t, s) => t(`status.${s}`, s);
export const levelLabel = (t, l) => t(`level.${l}`, l);
export const ratingTypeLabel = (t, r) => t(`ratingType.${r}`, r);
export const genderLabel = (t, g) => t(`gender.${g}`, g);
// Age categories are stored as U6…U20 and shown as "<6"…"<20".
export const ageLabel = (t, a) => (a === 'all' || !a ? t('common.all') : `<${a.slice(1)}`);
