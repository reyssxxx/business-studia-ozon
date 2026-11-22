// Подготовка изображений в браузере: сжимаем до разумного размера и переводим в JPEG data URI.

const MAX_SIDE = 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    img.src = src;
  });
}

function toJpeg(source: CanvasImageSource, w: number, h: number, maxSide = MAX_SIDE): string {
  const k = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

const W = 768, H = 1024; // формат 3:4, с которым работают модели примерки

export interface PhotoCheck {
  image: string;
  /** мягкие предупреждения: фото принимаем, но подсказываем, как улучшить результат */
  warnings: string[];
}

/** Фото покупателя → JPEG 768×1024.
 *  Модели примерки ждут 3:4 и иначе растягивают человека, поэтому вписываем фото целиком
 *  и добавляем нейтральные поля по краям (ничего не обрезаем: голова и ноги остаются в кадре).
 *  Ориентацию EXIF браузер применяет сам. */
export async function fileToDataUrl(file: File): Promise<PhotoCheck> {
  const bmp = await createImageBitmap(file);
  const warnings: string[] = [];
  if (Math.min(bmp.width, bmp.height) < 480) warnings.push("Фото маленькое, результат может быть размытым");
  if (bmp.width > bmp.height * 1.1) warnings.push("Лучше вертикальное фото, где вас видно целиком");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const k = Math.min(W / bmp.width, H / bmp.height);
  const w = bmp.width * k, h = bmp.height * k;
  // поля: растянутая размытая копия того же фото, чтобы фон был естественным
  ctx.filter = "blur(24px) brightness(1.05)";
  const kc = Math.max(W / bmp.width, H / bmp.height);
  ctx.drawImage(bmp, (W - bmp.width * kc) / 2, (H - bmp.height * kc) / 2, bmp.width * kc, bmp.height * kc);
  ctx.filter = "none";
  ctx.drawImage(bmp, (W - w) / 2, (H - h) / 2, w, h);
  bmp.close();

  // очень тёмное фото: средняя яркость по уменьшенной копии
  const probe = document.createElement("canvas");
  probe.width = 24;
  probe.height = 32;
  const pc = probe.getContext("2d")!;
  pc.drawImage(canvas, 0, 0, 24, 32);
  const d = pc.getImageData(0, 0, 24, 32).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  if (sum / (d.length / 4) < 60) warnings.push("Фото тёмное, попробуйте при хорошем свете");

  return { image: canvas.toDataURL("image/jpeg", 0.9), warnings };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    r.readAsDataURL(blob);
  });
}

/** Картинка каталога или аватар → data URI.
 *  Фото (webp/jpg/png) отправляем байт в байт как есть: так у одной и той же пары «аватар × вещь»
 *  всегда один и тот же запрос, и серверный кэш срабатывает у всех покупателей.
 *  Рисунки-заглушки (svg) модели не понимают, их растрируем в JPEG. */
export async function urlToDataUrl(src: string): Promise<string> {
  if (/^data:image\/(jpeg|png|webp)/.test(src)) return src;
  // сборщик может встроить маленький svg прямо в адрес (data:image/svg+xml), его тоже растрируем
  if (!src.startsWith("data:") && !/\.svg(\?|$)/.test(src)) {
    const blob = await (await fetch(src)).blob();
    if (/^image\/(jpeg|png|webp)$/.test(blob.type)) return blobToDataUrl(blob);
  }
  const img = await loadImage(src);
  return toJpeg(img, img.naturalWidth || 600, img.naturalHeight || 800);
}

/** Заглушка результата без API: вещь поверх фото, чтобы проверить весь путь без ключа. */
export async function mockComposite(person: string, garment: string, category: string): Promise<string> {
  const [p, g] = await Promise.all([loadImage(person), loadImage(garment)]);
  const W = 768, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const k = Math.max(W / p.naturalWidth, H / p.naturalHeight);
  ctx.drawImage(p, (W - p.naturalWidth * k) / 2, (H - p.naturalHeight * k) / 2, p.naturalWidth * k, p.naturalHeight * k);
  const box = category === "bottoms" ? { x: 0.22, y: 0.5, w: 0.56, h: 0.5 } : category === "one-pieces" ? { x: 0.15, y: 0.17, w: 0.7, h: 0.75 } : { x: 0.12, y: 0.15, w: 0.76, h: 0.48 };
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.92;
  ctx.drawImage(g, W * box.x, H * box.y, W * box.w, H * box.h);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(20,20,20,.75)";
  ctx.fillRect(0, H - 44, W, 44);
  ctx.fillStyle = "#e3ff7c";
  ctx.font = "600 22px Inter, sans-serif";
  ctx.fillText("Демо-режим без API: примерная картинка", 20, H - 15);
  return canvas.toDataURL("image/jpeg", 0.9);
}
