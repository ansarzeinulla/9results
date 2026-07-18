"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      router.push("/organizer");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <input
        className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        placeholder={t("username")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />
      <input
        type="password"
        className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        placeholder={t("password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? t("signingIn") : t("signIn")}
      </button>
    </form>
  );
}
