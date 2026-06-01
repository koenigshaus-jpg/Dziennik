export interface UploadedMedia {
  id: string;
  path: string; // data: URI
  mime: string;
  size: number;
  kind: "image" | "audio";
}
