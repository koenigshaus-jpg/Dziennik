"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

type EmailMode = "signin" | "signup";

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

    // Izolowana sesja anonimowa — każdy „gość" dostaje własne, prywatne konto
    // (osobny user_id), zaczyna z pustym dziennikiem i nie widzi cudzych wpisów.
    // Piaskownica do testów; można ją później „awansować" na konto e-mail.
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError(
        "Tryb gościa jest niedostępny. Załóż konto e-mailem lub zaloguj przez Google."
      );
      setGuestLoading(false);
      return;
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
