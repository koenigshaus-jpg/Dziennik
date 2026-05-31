// Kompresja obrazu po stronie klienta — żeby zmieścić się w limicie
// Vercela na request body (~4.5 MB) i ograniczyć rozmiar data: URI.

const MAX_DIM = 1600;
const QUALITY = 0.85;
const SKIP_IF_SMALLER_THAN = 800 * 1024; // 800 KB — nie kompresuj jeśli już małe

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // gify pozostawić w spokoju (animacja)

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));

    if (scale === 1 && file.size < SKIP_IF_SMALLER_THAN) {
      bitmap.close();
      return file;
    }

    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (e) {
    console.warn("Image compression failed, sending original:", e);
    return file;
  }
}
