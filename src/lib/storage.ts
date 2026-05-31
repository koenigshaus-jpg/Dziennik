// Warstwa storage w trzech trybach (kolejność priorytetu):
// 1. Vercel Blob — gdy BLOB_READ_WRITE_TOKEN ustawiony
// 2. data: URI w bazie — gdy na Vercel bez Blob (tryb demo)
// 3. lokalny filesystem — dev poza Vercel

import path from "node:path";
import fs from "node:fs";
import { put, del } from "@vercel/blob";

const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const isVercel = !!process.env.VERCEL;

type Mode = "blob" | "data-uri" | "fs";
const mode: Mode = hasBlob ? "blob" : isVercel ? "data-uri" : "fs";

export const storageMode = mode;

export interface SavedMedia {
  path: string;
  size: number;
}

export async function saveMedia(input: {
  kind: "image" | "audio";
  filename: string;
  buffer: Buffer;
  mime: string;
}): Promise<SavedMedia> {
  const { kind, filename, buffer, mime } = input;

  if (mode === "blob") {
    const blob = await put(`${kind}/${filename}`, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    return { path: blob.url, size: buffer.length };
  }

  if (mode === "data-uri") {
    const b64 = buffer.toString("base64");
    return { path: `data:${mime};base64,${b64}`, size: buffer.length };
  }

  // fs (dev lokalny)
  const relDir = kind === "image" ? "uploads/images" : "uploads/audio";
  const absDir = path.join(process.cwd(), "public", relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const absPath = path.join(absDir, filename);
  fs.writeFileSync(absPath, buffer);
  return { path: `/${relDir}/${filename}`, size: buffer.length };
}

export async function deleteBlob(storedPath: string): Promise<void> {
  if (!storedPath) return;

  if (storedPath.startsWith("data:")) {
    // data: URI nie ma backing storage — DB usunie wpis i tyle.
    return;
  }

  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    if (mode === "blob") {
      try {
        await del(storedPath);
      } catch {
        // ignore
      }
    }
    return;
  }

  // Lokalny plik w public/
  try {
    const full = path.join(process.cwd(), "public", storedPath.replace(/^\//, ""));
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    // ignore
  }
}
