// Warstwa storage: Vercel Blob (produkcja) lub lokalny filesystem (dev).
// Wybór po obecności BLOB_READ_WRITE_TOKEN.

import path from "node:path";
import fs from "node:fs";
import { put, del } from "@vercel/blob";

export const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export interface SavedMedia {
  path: string; // URL absolutny (Blob) lub względny "/uploads/..." (dev)
  size: number;
}

export async function saveMedia(input: {
  kind: "image" | "audio";
  filename: string;
  buffer: Buffer;
  mime: string;
}): Promise<SavedMedia> {
  const { kind, filename, buffer, mime } = input;

  if (useBlob) {
    const blob = await put(`${kind}/${filename}`, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    return { path: blob.url, size: buffer.length };
  }

  const relDir = kind === "image" ? "uploads/images" : "uploads/audio";
  const absDir = path.join(process.cwd(), "public", relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const absPath = path.join(absDir, filename);
  fs.writeFileSync(absPath, buffer);
  return { path: `/${relDir}/${filename}`, size: buffer.length };
}

export async function deleteBlob(storedPath: string): Promise<void> {
  if (!storedPath) return;

  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    if (useBlob) {
      try {
        await del(storedPath);
      } catch {
        // Brak pliku w Blob to nie problem.
      }
    }
    return;
  }

  // Lokalny plik
  try {
    const full = path.join(process.cwd(), "public", storedPath.replace(/^\//, ""));
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    // ignore
  }
}
