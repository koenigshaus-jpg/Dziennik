export interface UploadedMedia {
  id: string;
  path: string; // data: URI (świeżo dodane) lub signed URL z Supabase Storage
  mime: string;
  size: number;
  kind: "image" | "audio";
  storageKey?: string; // klucz w bucket 'media' jeśli plik już wgrany
}
