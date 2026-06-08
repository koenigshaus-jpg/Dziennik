"use client";

import * as React from "react";
import { BookOpen, Copy, Check, Trash2, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { SettingsShell } from "@/components/settings/SettingsShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyRecord {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = React.useState<KeyRecord[] | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newToken, setNewToken] = React.useState<string | null>(null);
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/internal/api-keys", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Nie udało się załadować kluczy.");
      setKeys([]);
      return;
    }
    const data = await res.json();
    setKeys(data.keys ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/internal/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        toast.error("Nie udało się wygenerować klucza.");
        return;
      }
      const data = await res.json();
      setNewToken(data.token);
      setNewName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Unieważnić ten klucz? Aplikacje używające go przestaną działać.")) return;
    setRevokingId(id);
    try {
      const res = await fetch(`/api/internal/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Nie udało się unieważnić klucza.");
        return;
      }
      toast.success("Klucz unieważniony.");
      await load();
    } finally {
      setRevokingId(null);
    }
  }

  async function copyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 1800);
  }

  const active = (keys ?? []).filter((k) => !k.revoked_at);
  const revoked = (keys ?? []).filter((k) => k.revoked_at);

  return (
    <SettingsShell title="API">
      <div className="space-y-8">
        <section>
          <p className="text-sm text-muted mb-4">
            Klucze pozwalają zewnętrznym aplikacjom i agentom (np. Claude, ChatGPT, skrypty)
            korzystać z Twojego dziennika. Pełna dokumentacja dostępna jest pod{" "}
            <Link href="/docs" className="underline hover:no-underline">
              /docs
            </Link>
            .
          </p>
          <Link href="/docs" className="inline-flex items-center gap-2 text-sm underline hover:no-underline">
            <BookOpen className="h-4 w-4" /> Dokumentacja API
          </Link>
        </section>

        {/* Generator */}
        <section className="rounded-xl border border-border p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Wygeneruj nowy klucz
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={'Nazwa (np. „CI bot", „telefon")'}
              maxLength={80}
              className="flex-1"
            />
            <Button type="submit" disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {creating ? "Generuję…" : "Wygeneruj"}
            </Button>
          </form>

          {newToken ? (
            <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3">
              <p className="text-sm font-medium mb-2">
                Skopiuj klucz teraz — nie zobaczysz go ponownie:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-foreground/5 px-3 py-2 font-mono text-xs break-all">
                  {newToken}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyToken()}
                >
                  {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedToken ? "Skopiowane" : "Kopiuj"}
                </Button>
              </div>
              <button
                type="button"
                className="mt-3 text-xs text-muted underline hover:no-underline"
                onClick={() => {
                  setNewToken(null);
                  setCopiedToken(false);
                }}
              >
                Ukryj
              </button>
            </div>
          ) : null}
        </section>

        {/* Lista aktywnych */}
        <section>
          <h3 className="font-medium mb-3">Aktywne klucze</h3>
          {keys === null ? (
            <p className="text-sm text-muted">Ładowanie…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted">Brak aktywnych kluczy.</p>
          ) : (
            <ul className="space-y-2">
              {active.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{k.name}</p>
                    <p className="text-xs text-muted font-mono mt-1">{k.prefix}…</p>
                    <p className="text-xs text-muted mt-1">
                      Utworzony {fmtDate(k.created_at)} ·{" "}
                      {k.last_used_at ? `Ostatnio użyty ${fmtDate(k.last_used_at)}` : "Jeszcze nieużywany"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRevoke(k.id)}
                    disabled={revokingId === k.id}
                  >
                    {revokingId === k.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Unieważnij
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {revoked.length > 0 ? (
          <section>
            <h3 className="font-medium mb-3 text-muted">Unieważnione</h3>
            <ul className="space-y-2 opacity-60">
              {revoked.map((k) => (
                <li
                  key={k.id}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <p className="font-medium truncate">{k.name}</p>
                  <p className="text-xs font-mono mt-1">{k.prefix}…</p>
                  <p className="text-xs mt-1">
                    Unieważniony {fmtDate(k.revoked_at!)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SettingsShell>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
