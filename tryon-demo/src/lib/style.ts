// Стиль одежды на фото покупателя. Запрос уходит на сервер, там его определяет нейросеть.
// Если сервис недоступен, возвращаем null: профиль тогда строится по покупкам и действиям.
import type { PhotoStyle } from "./profile";

/** Фото для определения стиля уменьшаем: модели хватает 512 px, а запрос идёт быстрее и дешевле */
async function small(dataUri: string): Promise<string> {
  const img = new Image();
  img.src = dataUri;
  await img.decode();
  const k = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export async function analyzeStyle(dataUri: string, accessCode?: string): Promise<PhotoStyle | null> {
  try {
    const r = await fetch("/api/style", {
      method: "POST",
      headers: { "content-type": "application/json", ...(accessCode ? { "x-demo-code": accessCode } : {}) },
      body: JSON.stringify({ image: await small(dataUri) }),
      signal: AbortSignal.timeout(30_000),
    });
    const d = await r.json();
    if (!d.ok) return null;
    return { styles: d.styles, items: d.items ?? [], palette: d.palette ?? "neutral" };
  } catch {
    return null;
  }
}
