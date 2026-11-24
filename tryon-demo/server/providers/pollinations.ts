// Бесплатный запасной провайдер: Pollinations (FLUX.2 klein, редактирование по нескольким картинкам).
// Это не специальная модель примерки, а общий редактор: он получает фото человека и фото вещи
// и по текстовой инструкции «надевает» вещь. Качество ниже, чем у IDM-VTON и FASHN,
// зато лимит не связан с Hugging Face. Нужен бесплатный ключ: https://enter.pollinations.ai/keys
import { ProviderError, toBlob, urlToDataUri, type Provider, type TryOnInput } from "./types.js";

const ENDPOINT = "https://gen.pollinations.ai/v1/images/edits";
const MODEL = "black-forest-labs/flux.2-klein-4b";

const WHAT: Record<TryOnInput["category"], string> = {
  tops: "as the top (upper body clothing)",
  bottoms: "as the bottoms (trousers, jeans or skirt)",
  "one-pieces": "as a full dress or one-piece outfit",
};

function prompt(b: TryOnInput): string {
  return [
    "Image 1 is a photo of a person. Image 2 is a photo of a garment.",
    `Edit image 1: dress the person in the garment from image 2 ${WHAT[b.category]}${b.description ? ` (${b.description})` : ""}.`,
    "Keep the person's face, hair, skin, body shape, pose, other clothing and the plain background exactly the same.",
    "The garment must keep its exact color, pattern and cut, fit naturally with realistic folds and shadows. Photorealistic.",
  ].join(" ");
}

export const pollinations: Provider = async (b, env) => {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt(b));
  form.append("size", "768x1024");
  form.append("n", "1");
  form.append("image[]", toBlob(b.personImage), "person.jpg");
  form.append("image[]", toBlob(b.garmentImage), "garment.jpg");

  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.POLLINATIONS_KEY}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (r.status === 429 || r.status === 402) throw new ProviderError("Бесплатный лимит запасной нейросети закончился", 429);
  if (!r.ok) {
    console.error("[tryon] pollinations", r.status, (await r.text().catch(() => "")).slice(0, 300));
    throw new ProviderError("Запасная нейросеть не ответила");
  }
  const data = (await r.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return urlToDataUri(item.url);
  throw new ProviderError("Пустой ответ запасной нейросети");
};
