"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api, getUser } from "@/lib/api";
import type { PlayerRow } from "@/lib/data";

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
};

type Form = typeof EMPTY;

export default function AdminPanel({
  players,
  federations,
}: {
  players: PlayerRow[];
  federations: Lookup[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
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

  const startEdit = (p: PlayerRow) => {
    setEditing(p.id);
    setForm({
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
    });
    setError(null);
    setNotice(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(EMPTY);
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
    };
    try {
      if (editing) {
        await api(`/players/${encodeURIComponent(editing)}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setNotice(t("adminPanel.saved"));
      } else {
        await api("/players", { method: "POST", body: JSON.stringify(body) });
        setNotice(`${t("adminPanel.created")} ${form.id}`);
      }
      cancelEdit();
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
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950";

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <h1 className="text-2xl font-bold">{t("adminPanel.title")}</h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {/* Player add / edit */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {editing
            ? t("adminPanel.editPlayer", { id: editing })
            : t("adminPanel.addPlayer")}
        </h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          <input
            className={cls}
            placeholder={t("fields.playerId")}
            value={form.id}
            onChange={(e) => set("id", e.target.value)}
            disabled={!!editing}
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
                {g === "" ? t("common.none") : g === "M" ? t("gender.male") : t("gender.female")}
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
          <div className="flex gap-2 sm:col-span-3">
            <button
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {editing ? t("common.save") : t("adminPanel.addPlayer")}
            </button>
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Player list */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {t("adminPanel.total", { count: players.length })}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-neutral-500 dark:border-neutral-700">
                <th className="py-2 pr-3">{t("fields.playerId")}</th>
                <th className="py-2 pr-3">{t("fields.player")}</th>
                <th className="py-2 pr-3">{t("fields.title")}</th>
                <th className="py-2 pr-3">{t("fields.rating")}</th>
                <th className="py-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2 pr-3 font-mono text-xs">{p.id}</td>
                  <td className="py-2 pr-3">
                    {p.last_name} {p.first_name}
                  </td>
                  <td className="py-2 pr-3 text-neutral-500">{p.title_id ?? ""}</td>
                  <td className="py-2 pr-3">{p.rating_classic}</td>
                  <td className="py-2">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-emerald-600 hover:underline"
                    >
                      {t("adminPanel.edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
    </div>
  );
}
