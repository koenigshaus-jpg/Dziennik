import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session-server";
import { db, schema, ensureSchema } from "@/db";
import { newId } from "@/lib/ids";
import { saveMedia } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_AUDIO = 50 * 1024 * 1024;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
const ALLOWED_AUDIO = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-m4a",
];

function extFor(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/x-m4a": "m4a",
  };
  return map[mime] ?? "bin";
}

export async function POST(req: Request) {
  try {
    await requireSession();
  } catch (r) {
    return r as Response;
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Brak pliku." }, { status: 400 });
  }
  if (kind !== "image" && kind !== "audio") {
    return NextResponse.json({ error: "Nieprawidłowy typ." }, { status: 400 });
  }

  const rawMime = file.type || "application/octet-stream";
  const mime = rawMime.split(";")[0].trim().toLowerCase();
  const allowed = kind === "image" ? ALLOWED_IMAGE : ALLOWED_AUDIO;
  const maxSize = kind === "image" ? MAX_IMAGE : MAX_AUDIO;

  if (!allowed.includes(mime)) {
    return NextResponse.json(
      { error: `Niedozwolony typ pliku: ${rawMime}` },
      { status: 400 }
    );
  }
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `Plik za duży (max ${Math.round(maxSize / 1024 / 1024)} MB).` },
      { status: 400 }
    );
  }

  await ensureSchema();

  const id = newId();
  const ext = extFor(mime);
  const filename = `${id}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const saved = await saveMedia({ kind, filename, buffer: buf, mime });

  await db.insert(schema.media).values({
    id,
    entryId: null,
    kind,
    path: saved.path,
    mime,
    size: saved.size,
    createdAt: new Date(),
  });

  return NextResponse.json({
    id,
    path: saved.path,
    mime,
    size: saved.size,
    kind,
  });
}
