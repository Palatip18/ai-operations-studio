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
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-green-300/30 bg-green-300/10 font-mono text-sm text-green-300">AI</div>
          <div>
            <p className="text-sm font-semibold tracking-tight">AI Operations Studio</p>
            <p className="text-xs text-[#90a9a0]">{copy.loginSubtitle}</p>
          </div>
          </div>
          <LanguageSwitcher locale={locale} onChange={setLocale} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1917]/90 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{copy.loginTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-[#90a9a0]">{copy.loginIntro}</p>

          <form onSubmit={submit} className="mt-6 space-y-4" aria-live="polite">
            <div>
              <label htmlFor="demo-password" className="mb-1.5 block text-xs text-[#90a9a0]">{copy.password}</label>
              <input
                id="demo-password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm outline-none focus:border-green-300/40"
                placeholder={copy.passwordPlaceholder}
              />
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-lg bg-green-300 py-2.5 text-sm font-medium text-[#07100f] transition disabled:opacity-50"
            >
              {loading ? copy.checking : copy.unlock}
            </button>
          </form>
        </div>
        <p className="mt-5 text-center text-[11px] leading-5 text-[#60776f]">{copy.loginFooter}</p>
      </div>
    </div>
  );
}
