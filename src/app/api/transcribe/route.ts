import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = "gpt-4o-mini-transcribe";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Brak OPENAI_API_KEY na serwerze." },
      { status: 500 }
    );
  }

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  }

  const file = inForm.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Brak pliku audio." }, { status: 400 });
  }

  const language = (inForm.get("language") as string | null) || "pl";

  const outForm = new FormData();
  const filename =
    file instanceof File && file.name ? file.name : "audio.webm";
  outForm.append("file", file, filename);
  outForm.append("model", MODEL);
  outForm.append("language", language);
  outForm.append("response_format", "json");

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outForm,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenAI transcription error:", res.status, detail);
      return NextResponse.json(
        { error: "Transkrypcja nie powiodła się." },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: data.text ?? "" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Błąd połączenia z OpenAI." },
      { status: 502 }
    );
  }
}
