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

const EMPTY_PLAYER = {
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

const EMPTY_OFFICIAL = {
  id: "",
  first_name: "",
  last_name: "",
  title: "NA",
  username: "",
  password: "",
};

type PlayerForm = typeof EMPTY_PLAYER;
type OfficialForm = typeof EMPTY_OFFICIAL;

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

interface OfficialRecord {
  id: number;
  first_name: string;
  last_name: string;
  title: string | null;
}

const toPlayerForm = (p: PlayerRecord): PlayerForm => ({
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
  const [tab, setTab] = useState<"player" | "organizer" | "arbiter">("player");

  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [lookupId, setLookupId] = useState("");
  const [playerForm, setPlayerForm] = useState<PlayerForm>(EMPTY_PLAYER);
  const [officialForm, setOfficialForm] = useState<OfficialForm>(EMPTY_OFFICIAL);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setRole(getUser()?.role ?? null), []);

  const reset = () => {
    setMode("idle");
    setPlayerForm(EMPTY_PLAYER);
    setOfficialForm(EMPTY_OFFICIAL);
    setLookupId("");
  };

  const find = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = lookupId.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (tab === "player") {
        const player = await api<PlayerRecord>(`/players/${encodeURIComponent(id)}`);
        setPlayerForm(toPlayerForm(player));
        setMode("edit");
        setNotice(t("admin.playerFound"));
      } else {
        const official = await api<OfficialRecord>(`/officials/${encodeURIComponent(id)}`);
        setOfficialForm({
          id: String(official.id),
          first_name: official.first_name,
          last_name: official.last_name,
          title: official.title ?? "NA",
          username: "",
          password: "",
        });
        setMode("edit");
        setNotice(t("admin.officialFound"));
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (/not found/i.test(msg)) {
        setError(t("admin.notFound"));
        if (tab === "player") {
          setPlayerForm({ ...EMPTY_PLAYER, id });
        } else {
          setOfficialForm({ ...EMPTY_OFFICIAL, id });
        }
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
    try {
      if (tab === "player") {
        const body = {
          ...playerForm,
          year_of_birth: playerForm.year_of_birth ? Number(playerForm.year_of_birth) : null,
          middle_name: playerForm.middle_name || null,
          gender_id: playerForm.gender_id || null,
          title_id: playerForm.title_id || null,
          club: playerForm.club || null,
          rating_classic: Number(playerForm.rating_classic),
          rating_rapid: Number(playerForm.rating_rapid),
          rating_blitz: Number(playerForm.rating_blitz),
          aliases: playerForm.aliases
            .split(/[,\n]+/)
            .map((a) => a.trim())
            .filter(Boolean),
        };
        if (mode === "edit") {
          await api(`/players/${encodeURIComponent(playerForm.id)}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
          setNotice(t("adminPanel.saved"));
        } else {
          await api("/players", { method: "POST", body: JSON.stringify(body) });
          setNotice(`${t("adminPanel.created")} ${playerForm.id}`);
          reset();
        }
      } else {
        const body = {
          ...officialForm,
          role: tab === "organizer" ? "ORGANIZER" : "ARBITER",
        };
        if (mode === "edit") {
          await api(`/officials/${encodeURIComponent(officialForm.id)}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
          setNotice(t("adminPanel.saved"));
        } else {
          await api("/officials", { method: "POST", body: JSON.stringify(body) });
          setNotice(t("adminPanel.created"));
          reset();
        }
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("adminPanel.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const endpoint = tab === "player" ? `/players/${encodeURIComponent(playerForm.id)}` : `/officials/${encodeURIComponent(officialForm.id)}`;
      await api(endpoint, { method: "DELETE" });
      setNotice(t("adminPanel.deleted"));
      reset();
      router.refresh();
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

      <div className="flex gap-2 border-b border-neutral-200">
        {(["player", "organizer", "arbiter"] as const).map((tName) => (
          <button
            key={tName}
            onClick={() => { setTab(tName); reset(); }}
            className={`px-4 py-2 text-sm font-medium ${tab === tName ? "border-b-2 border-emerald-600 text-emerald-600" : "text-neutral-500"}`}
          >
            {t(`adminPanel.${tName}s`)}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 p-4">
        <h2 className="mb-3 text-lg font-semibold">{t(`admin.add${tab.charAt(0).toUpperCase() + tab.slice(1)}ById`)}</h2>
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
              reset();
              setMode("create");
            }}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
          >
            {t(`adminPanel.add${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
          </button>
        </form>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

      {mode !== "idle" && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            {mode === "edit" ? t("adminPanel.edit") : t(`adminPanel.add${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
          </h2>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
            {tab === "player" ? (
              <>
                <input className={cls} placeholder={t("fields.playerId")} value={playerForm.id} onChange={(e) => setPlayerForm({...playerForm, id: e.target.value})} disabled={mode === "edit"} required />
                <input className={cls} placeholder={t("fields.lastName")} value={playerForm.last_name} onChange={(e) => setPlayerForm({...playerForm, last_name: e.target.value})} required />
                <input className={cls} placeholder={t("fields.firstName")} value={playerForm.first_name} onChange={(e) => setPlayerForm({...playerForm, first_name: e.target.value})} required />
                <input className={cls} placeholder={t("fields.middleName")} value={playerForm.middle_name} onChange={(e) => setPlayerForm({...playerForm, middle_name: e.target.value})} />
                <select className={cls} value={playerForm.federation_id} onChange={(e) => setPlayerForm({...playerForm, federation_id: e.target.value})}>
                  {federations.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select className={cls} value={playerForm.gender_id} onChange={(e) => setPlayerForm({...playerForm, gender_id: e.target.value})}>
                  {GENDERS.map((g) => <option key={g} value={g}>{g === "" ? t("common.none") : g}</option>)}
                </select>
                <input className={cls} type="number" placeholder={t("fields.birthYear")} value={playerForm.year_of_birth} onChange={(e) => setPlayerForm({...playerForm, year_of_birth: e.target.value})} />
                <select className={cls} value={playerForm.title_id} onChange={(e) => setPlayerForm({...playerForm, title_id: e.target.value})}>
                  {TITLES.map((ti) => <option key={ti} value={ti}>{ti === "" ? t("common.none") : ti}</option>)}
                </select>
                <input className={cls} placeholder={t("fields.club")} value={playerForm.club} onChange={(e) => setPlayerForm({...playerForm, club: e.target.value})} />
                <input className={cls} type="number" placeholder={t("fields.ratingClassic")} value={playerForm.rating_classic} onChange={(e) => setPlayerForm({...playerForm, rating_classic: Number(e.target.value)})} />
                <input className={cls} type="number" placeholder={t("fields.ratingRapid")} value={playerForm.rating_rapid} onChange={(e) => setPlayerForm({...playerForm, rating_rapid: Number(e.target.value)})} />
                <input className={cls} type="number" placeholder={t("fields.ratingBlitz")} value={playerForm.rating_blitz} onChange={(e) => setPlayerForm({...playerForm, rating_blitz: Number(e.target.value)})} />
                <textarea className={`${cls} sm:col-span-3`} rows={2} placeholder={t("adminPanel.aliases")} value={playerForm.aliases} onChange={(e) => setPlayerForm({...playerForm, aliases: e.target.value})} />
              </>
            ) : (
              <>
                <input className={cls} placeholder={t("fields.lastName")} value={officialForm.last_name} onChange={(e) => setOfficialForm({...officialForm, last_name: e.target.value})} required />
                <input className={cls} placeholder={t("fields.firstName")} value={officialForm.first_name} onChange={(e) => setOfficialForm({...officialForm, first_name: e.target.value})} required />
                <input className={cls} placeholder={t("fields.title")} value={officialForm.title} onChange={(e) => setOfficialForm({...officialForm, title: e.target.value})} />
                {mode === "create" && (
                  <>
                    <input className={cls} placeholder={t("login.username")} value={officialForm.username} onChange={(e) => setOfficialForm({...officialForm, username: e.target.value})} required />
                    <input className={cls} type="password" placeholder={t("login.password")} value={officialForm.password} onChange={(e) => setOfficialForm({...officialForm, password: e.target.value})} required />
                  </>
                )}
              </>
            )}
            <div className="flex gap-2 sm:col-span-3">
              <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {mode === "edit" ? t("common.save") : t("common.create")}
              </button>
              <button type="button" onClick={reset} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
                {t("common.cancel")}
              </button>
              {mode === "edit" && (
                <button type="button" disabled={busy} onClick={remove} className="ml-auto rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                  {t("adminPanel.delete")}
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
