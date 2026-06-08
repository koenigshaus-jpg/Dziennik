"use client";

import * as React from "react";
import { Check, Copy, Loader2, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InlineKeyGenerator({ userEmail }: { userEmail: string | null }) {
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/internal/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        setError("Nie udało się wygenerować klucza.");
        return;
      }
      const data = await res.json();
      setToken(data.token);
      setName("");
    } catch {
      setError("Błąd sieci.");
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="my-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p className="font-medium mb-1 flex items-center gap-2">
        <KeyRound className="h-4 w-4" /> Twoje klucze API
      </p>
      <p className="text-xs text-muted mb-3">
        Zalogowany jako {userEmail ?? "anonimowy"}. Wygeneruj klucz tutaj lub w{" "}
        <a href="/ustawienia/api" className="underline">
          ustawieniach
        </a>{" "}
        (tam zobaczysz też pełną listę).
      </p>

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={'Nazwa klucza (np. "Claude.ai")'}
          maxLength={80}
          className="flex-1 h-10"
        />
        <Button type="submit" disabled={!name.trim() || creating} size="sm" className="h-10">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {creating ? "Generuję…" : "Wygeneruj"}
        </Button>
      </form>

      {error ? (
        <p className="mt-2 text-xs text-rose-300">{error}</p>
      ) : null}

      {token ? (
        <div className="mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3">
          <p className="text-xs font-medium mb-2">
            Skopiuj klucz teraz — nie zobaczysz go ponownie:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-foreground/5 px-3 py-2 font-mono text-xs break-all">
              {token}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "OK" : "Kopiuj"}
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-muted underline hover:no-underline"
            onClick={() => {
              setToken(null);
              setCopied(false);
            }}
          >
            Ukryj
          </button>
        </div>
      ) : null}
    </div>
  );
}
