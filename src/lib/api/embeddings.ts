// Serwerowe liczenie embeddingów zapytań (OpenAI text-embedding-3-small).
// Parytet z Edge Function embed-entry. Server-only — używa OPENAI_API_KEY.

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;

/** Zwraca wektor (1536D) dla pojedynczego tekstu. Pusty tekst → null (pomijamy wektor). */
export async function embedText(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Brak OPENAI_API_KEY na serwerze.");

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: trimmed }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const vec = json.data?.[0]?.embedding;
  if (!vec || vec.length !== EMBED_DIM) {
    throw new Error("Nieoczekiwany wymiar embeddingu zapytania.");
  }
  return vec;
}
