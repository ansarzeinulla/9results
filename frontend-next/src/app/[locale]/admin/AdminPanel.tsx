"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api, getUser } from "@/lib/api";

interface Lookup {
  id: string;
  name: string;
}

const TITLES = ["", "MSIC", "MS", "CMS", "R1", "R2", "R3"];
const GENDERS = ["", "M", "F"];

const EMPTY = {
  id: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  federation_id: "KAZ",
  gender_id: "",
  year_of_birth: "",
  title_id: "",
  club: "",
  rating_classic: 0,
  rating_rapid: 0,
  rating_blitz: 0,
  aliases: "",
};

type Form = typeof EMPTY;

interface PlayerRecord {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  federation_id: string | null;
  gender_id: string | null;
  year_of_birth: number | null;
  title_id: string | null;
  club: string | null;
  rating_classic: number;
  rating_rapid: number;
  rating_blitz: number;
  aliases?: string[];
}

const toForm = (p: PlayerRecord): Form => ({
  id: p.id,
  first_name: p.first_name,
  last_name: p.last_name,
  middle_name: p.middle_name ?? "",
  federation_id: p.federation_id ?? "KAZ",
  gender_id: p.gender_id ?? "",
  year_of_birth: p.year_of_birth ? String(p.year_of_birth) : "",
  title_id: p.title_id ?? "",
  club: p.club ?? "",
  rating_classic: p.rating_classic,
  rating_rapid: p.rating_rapid,
  rating_blitz: p.rating_blitz,
  aliases: (p.aliases ?? []).join(", "),
});

export default function AdminPanel({ federations }: { federations: Lookup[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  // "edit" is reached by typing an ID; "create" is a separate deliberate action.
  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [lookupId, setLookupId] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [organizer, setOrganizer] = useState({
    first_name: "",
    last_name: "",
    title: "NA",
    username: "",
    password: "",
  });

  useEffect(() => setRole(getUser()?.role ?? null), []);

  const set = (k: keyof Form, v: string | number) => setForm({ ...form, [k]: v });

  const reset = () => {
    setMode("idle");
    setForm(EMPTY);
    setLookupId("");
  };

  /** Type an ID, press Find — loads exactly that player, nothing else. */
  const find = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = lookupId.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const player = await api<PlayerRecord>(`/players/${encodeURIComponent(id)}`);
      setForm(toForm(player));
      setMode("edit");
      setNotice(t("admin.playerFound"));
    } catch (err) {
      const msg = (err as Error).message;
      if (/not found/i.test(msg)) {
        setError(t("admin.notFound"));
        // offer to create it with the id they typed
        setForm({ ...EMPTY, id });
        setMode("create");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const body = {
      ...form,
      year_of_birth: form.year_of_birth ? Number(form.year_of_birth) : null,
      middle_name: form.middle_name || null,
      gender_id: form.gender_id || null,
      title_id: form.title_id || null,
      club: form.club || null,
      rating_classic: Number(form.rating_classic),
      rating_rapid: Number(form.rating_rapid),
      rating_blitz: Number(form.rating_blitz),
      // other-alphabet spellings, comma or newline separated
      aliases: form.aliases
        .split(/[,\n]+/)
        .map((a) => a.trim())
        .filter(Boolean),
    };
    try {
      if (mode === "edit") {
        await api(`/players/${encodeURIComponent(form.id)}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setNotice(t("adminPanel.saved"));
      } else {
        await api("/players", { method: "POST", body: JSON.stringify(body) });
        setNotice(`${t("adminPanel.created")} ${form.id}`);
        reset();
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Deletion is refused server-side once the player has any history. */
  const remove = async () => {
    if (!window.confirm(t("adminPanel.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/players/${encodeURIComponent(form.id)}`, { method: "DELETE" });
      setNotice(t("adminPanel.deleted"));
      reset();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const createOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/officials", { method: "POST", body: JSON.stringify(organizer) });
      setNotice(t("adminPanel.organizerCreated"));
      setOrganizer({ ...organizer, username: "", password: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (role !== "ADMIN") {
    return (
      <p className="mt-12 text-center text-neutral-500">
        {t("adminPanel.title")} — {t("login.title")}
      </p>
    );
  }

  const cls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">{t("adminPanel.title")}</h1>

      {/* Find by ID — the primary way in */}
      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("admin.addById")}</h2>
        <form onSubmit={find} className="flex flex-wrap gap-2">
          <input
            className={`${cls} flex-1`}
            placeholder={t("admin.enterId")}
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            autoFocus
          />
          <button
            disabled={busy || !lookupId.trim()}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("admin.find")}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY);
              setMode("create");
              setError(null);
              setNotice(null);
            }}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
          >
            {t("adminPanel.addPlayer")}
          </button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">{t("admin.enterId")}</p>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {/* The form only appears once a player is loaded or a create is started */}
      {mode !== "idle" && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            {mode === "edit"
              ? t("adminPanel.editPlayer", { id: form.id })
              : t("adminPanel.addPlayer")}
          </h2>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
            <input
              className={cls}
              placeholder={t("fields.playerId")}
              value={form.id}
              onChange={(e) => set("id", e.target.value)}
              disabled={mode === "edit"}
              required
            />
            <input
              className={cls}
              placeholder={t("fields.lastName")}
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              required
            />
            <input
              className={cls}
              placeholder={t("fields.firstName")}
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              required
            />
            <input
              className={cls}
              placeholder={t("fields.middleName")}
              value={form.middle_name}
              onChange={(e) => set("middle_name", e.target.value)}
            />
            <select
              className={cls}
              value={form.federation_id}
              onChange={(e) => set("federation_id", e.target.value)}
            >
              {federations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              className={cls}
              value={form.gender_id}
              onChange={(e) => set("gender_id", e.target.value)}
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g === ""
                    ? t("common.none")
                    : g === "M"
                      ? t("gender.male")
                      : t("gender.female")}
                </option>
              ))}
            </select>
            <input
              className={cls}
              type="number"
              placeholder={t("fields.birthYear")}
              value={form.year_of_birth}
              onChange={(e) => set("year_of_birth", e.target.value)}
            />
            <select
              className={cls}
              value={form.title_id}
              onChange={(e) => set("title_id", e.target.value)}
            >
              {TITLES.map((ti) => (
                <option key={ti} value={ti}>
                  {ti === "" ? t("common.none") : ti}
                </option>
              ))}
            </select>
            <input
              className={cls}
              placeholder={t("fields.club")}
              value={form.club}
              onChange={(e) => set("club", e.target.value)}
            />
            <input
              className={cls}
              type="number"
              placeholder={t("fields.ratingClassic")}
              value={form.rating_classic}
              onChange={(e) => set("rating_classic", e.target.value)}
            />
            <input
              className={cls}
              type="number"
              placeholder={t("fields.ratingRapid")}
              value={form.rating_rapid}
              onChange={(e) => set("rating_rapid", e.target.value)}
            />
            <input
              className={cls}
              type="number"
              placeholder={t("fields.ratingBlitz")}
              value={form.rating_blitz}
              onChange={(e) => set("rating_blitz", e.target.value)}
            />
            <textarea
              className={`${cls} sm:col-span-3`}
              rows={2}
              placeholder={t("adminPanel.aliases")}
              value={form.aliases}
              onChange={(e) => set("aliases", e.target.value)}
            />
            <div className="flex gap-2 sm:col-span-3">
              <button
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {mode === "edit" ? t("common.save") : t("adminPanel.addPlayer")}
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
              >
                {t("common.cancel")}
              </button>
              {mode === "edit" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={remove}
                  className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {t("adminPanel.deletePlayer")}
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* Organizer accounts */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("adminPanel.addOrganizer")}</h2>
        <form onSubmit={createOrganizer} className="grid gap-3 sm:grid-cols-2">
          <input
            className={cls}
            placeholder={t("fields.lastName")}
            value={organizer.last_name}
            onChange={(e) => setOrganizer({ ...organizer, last_name: e.target.value })}
            required
          />
          <input
            className={cls}
            placeholder={t("fields.firstName")}
            value={organizer.first_name}
            onChange={(e) => setOrganizer({ ...organizer, first_name: e.target.value })}
            required
          />
          <input
            className={cls}
            placeholder={t("login.username")}
            value={organizer.username}
            onChange={(e) => setOrganizer({ ...organizer, username: e.target.value })}
            required
          />
          <input
            className={cls}
            type="password"
            placeholder={t("login.password")}
            value={organizer.password}
            onChange={(e) => setOrganizer({ ...organizer, password: e.target.value })}
            required
          />
          <button
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 sm:col-span-2"
          >
            {t("adminPanel.addOrganizer")}
          </button>
        </form>
      </section>

      <p className="text-xs text-neutral-500">
        {t("players.title")}:{" "}
        <a href="/en/players" className="text-emerald-600 hover:underline">
          {t("common.search")}
        </a>
      </p>
    </div>
  );
}
