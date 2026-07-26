"use client";

import { useTranslations } from "next-intl";
import type { OptGroup } from "@/lib/option-groups";

/**
 * A `<select>` whose options are split into `<optgroup>`s. Group labels come
 * from `optionGroup.*`; `age:<n>` renders through `optionGroup.age`.
 */
export default function GroupedSelect({
  groups,
  value,
  onChange,
  placeholder,
  className,
}: {
  groups: OptGroup[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const t = useTranslations();
  const label = (key: string) => {
    const age = key.startsWith("age:") ? key.slice(4) : null;
    return age ? t("optionGroup.age", { n: age }) : t(`optionGroup.${key}`);
  };
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {groups.map((g) => (
        <optgroup key={g.key} label={label(g.key)}>
          {g.items.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
