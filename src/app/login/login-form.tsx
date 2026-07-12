"use client";

import { FormEvent, useState } from "react";
import { LanguageSwitcher, useUiLocale } from "@/lib/ui-i18n";

export function LoginForm() {
  const { locale, setLocale, copy } = useUiLocale();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        window.location.href = "/";
        return;
      }
      await response.json().catch(() => ({}));
      setError(copy.loginError);
    } catch {
      setError(copy.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-accent/35 bg-accent/10 font-mono text-sm text-accent">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                AI Operations Studio
              </p>
              <p className="text-xs text-muted">{copy.loginSubtitle}</p>
            </div>
          </div>
          <LanguageSwitcher locale={locale} onChange={setLocale} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0B1426]/90 p-6 shadow-2xl shadow-black/35 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {copy.loginTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {copy.loginIntro}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" aria-live="polite">
            <div>
              <label
                htmlFor="demo-password"
                className="mb-1.5 block text-xs text-muted"
              >
                {copy.password}
              </label>
              <input
                id="demo-password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                disabled={loading}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="kb-focusable w-full rounded-lg border border-white/10 bg-[#07101F] px-3 py-2.5 text-sm outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent text-foreground min-h-[44px]"
                placeholder={copy.passwordPlaceholder}
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="kb-focusable w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-[#07101F] hover:bg-accent-strong transition disabled:opacity-50 min-h-[44px]"
            >
              {loading ? copy.checking : copy.unlock}
            </button>
          </form>
        </div>
        <p className="mt-5 text-center text-[11px] leading-5 text-muted/60">
          {copy.loginFooter}
        </p>
      </div>
    </div>
  );
}
