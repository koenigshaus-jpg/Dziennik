"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGoogle() {
    setOauthLoading(true);
    setError(null);
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

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
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
            Zaloguj się, żeby otworzyć swój dziennik.
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

        <button
          type="button"
          onClick={() => setShowEmail((v) => !v)}
          className="text-sm text-muted hover:text-foreground underline-offset-4 hover:underline self-start"
        >
          {showEmail ? "Ukryj logowanie e-mailem" : "Zaloguj e-mailem i hasłem"}
        </button>

        {showEmail && (
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
              autoComplete="current-password"
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={loading || !email || !password}
              variant="outline"
            >
              {loading ? "Loguję…" : "Zaloguj"}
            </Button>
          </form>
        )}

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
