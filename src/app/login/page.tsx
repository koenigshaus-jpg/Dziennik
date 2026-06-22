"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";
import { seedGuestEntries } from "@/lib/seed-guest";

type EmailMode = "signin" | "signup";

// Jedno wspólne konto gościa — wszyscy „goście" logują się na te same dane,
// widzą te same wpisy i mogą dokładać własne. To zwykłe konto e-mail/hasło,
// nie anonimowa sesja. Konfigurowalne przez env, z domyślnymi wartościami.
const GUEST_EMAIL = process.env.NEXT_PUBLIC_GUEST_EMAIL || "gosc@dziennik.local";
const GUEST_PASSWORD = process.env.NEXT_PUBLIC_GUEST_PASSWORD || "dziennik-gosc";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onGoogle() {
    setOauthLoading(true);
    setError(null);
    setInfo(null);
    const supabase = getSupabaseClient();
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  }

  async function onGuest() {
    setGuestLoading(true);
    setError(null);
    setInfo(null);
    const supabase = getSupabaseClient();

    // Próba zalogowania na istniejące, wspólne konto gościa.
    const { error } = await supabase.auth.signInWithPassword({
      email: GUEST_EMAIL,
      password: GUEST_PASSWORD,
    });

    // Logowanie się udało → konto już istnieje, nic nie seedujemy.
    // Wpisy (demo + dodane przez innych gości) zostają na swoim miejscu.
    if (!error) {
      router.push(next);
      router.refresh();
      return;
    }

    // Pierwsze w historii wejście: konto gościa jeszcze nie istnieje → zakładamy
    // je raz i tylko wtedy seedujemy przykładowymi wpisami.
    const signUp = await supabase.auth.signUp({
      email: GUEST_EMAIL,
      password: GUEST_PASSWORD,
    });
    if (signUp.error) {
      setError(
        "Nie udało się otworzyć konta gościa. Spróbuj ponownie za chwilę."
      );
      setGuestLoading(false);
      return;
    }
    // Gdy weryfikacja e-mail jest włączona, signUp nie zwraca sesji —
    // próbujemy zalogować się od razu.
    if (!signUp.data.session) {
      const retry = await supabase.auth.signInWithPassword({
        email: GUEST_EMAIL,
        password: GUEST_PASSWORD,
      });
      if (retry.error) {
        setError(
          "Konto gościa wymaga potwierdzenia e-mail — wyłącz „Confirm email” w Supabase (Authentication → Sign In / Providers)."
        );
        setGuestLoading(false);
        return;
      }
    }
    // Świeżo założone wspólne konto — seedujemy raz przykładowymi wpisami.
    // Idempotentne: gdyby seed odpalił się ponownie, sam się pominie.
    try {
      await seedGuestEntries();
    } catch (e) {
      // Nie blokujemy wejścia w razie błędu seeda.
      console.error("seedGuestEntries failed:", e);
    }
    router.push(next);
    router.refresh();
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = getSupabaseClient();
    if (emailMode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Jeśli weryfikacja maila wyłączona, sesja od razu jest aktywna.
      if (data.session) {
        router.push(next);
        router.refresh();
        return;
      }
      setInfo("Konto utworzone. Zaloguj się tymi danymi.");
      setEmailMode("signin");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="font-display text-5xl font-bold tracking-tight">
            Dziennik
          </h1>
          <p className="text-muted mt-2 text-sm">
            Zaloguj się lub załóż konto, żeby otworzyć dziennik.
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onGoogle}
          disabled={oauthLoading}
        >
          {oauthLoading ? "Przekierowuję…" : "Zaloguj przez Google"}
        </Button>

        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onGuest}
          disabled={guestLoading}
        >
          {guestLoading ? "Otwieram…" : "Wejdź jako gość"}
        </Button>

        <button
          type="button"
          onClick={() => setShowEmail((v) => !v)}
          className="text-sm text-muted hover:text-foreground underline-offset-4 hover:underline self-start"
        >
          {showEmail ? "Ukryj logowanie e-mailem" : "Zaloguj e-mailem i hasłem"}
        </button>

        {showEmail && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setEmailMode("signin");
                  setError(null);
                  setInfo(null);
                }}
                className={
                  emailMode === "signin"
                    ? "px-3 py-1 rounded-full bg-foreground text-background"
                    : "px-3 py-1 rounded-full border border-border text-muted hover:text-foreground"
                }
              >
                Zaloguj
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode("signup");
                  setError(null);
                  setInfo(null);
                }}
                className={
                  emailMode === "signup"
                    ? "px-3 py-1 rounded-full bg-foreground text-background"
                    : "px-3 py-1 rounded-full border border-border text-muted hover:text-foreground"
                }
              >
                Załóż konto
              </button>
            </div>
            <form onSubmit={onEmail} className="flex flex-col gap-3">
              <Input
                type="email"
                autoComplete="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                autoComplete={
                  emailMode === "signup" ? "new-password" : "current-password"
                }
                placeholder={
                  emailMode === "signup" ? "Hasło (min. 6 znaków)" : "Hasło"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={emailMode === "signup" ? 6 : undefined}
              />
              <Button
                type="submit"
                disabled={loading || !email || !password}
                variant="outline"
              >
                {loading
                  ? emailMode === "signup"
                    ? "Zakładam…"
                    : "Loguję…"
                  : emailMode === "signup"
                  ? "Załóż konto"
                  : "Zaloguj"}
              </Button>
            </form>
          </div>
        )}

        {info && <p className="text-sm text-foreground">{info}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
