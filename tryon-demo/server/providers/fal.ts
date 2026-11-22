// Платный провайдер: FASHN Virtual Try-On v1.6 на fal.ai. ≈$0,075 за картинку, 6–15 сек.
import { ProviderError, urlToDataUri, type Provider } from "./types";

const ENDPOINT = "https://fal.run/fal-ai/fashn/tryon/v1.6";

export const fal: Provider = async (b, env) => {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Key ${env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model_image: b.personImage,
      garment_image: b.garmentImage,
      category: b.category,
      mode: "balanced",
      garment_photo_type: "auto",
      moderation_level: "permissive",
      num_samples: 1,
      output_format: "jpeg",
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) {
    console.error("[tryon] fal", r.status, (await r.text().catch(() => "")).slice(0, 300));
    throw new ProviderError(`Сервис примерки ответил ${r.status}`);
  }
  const data = (await r.json()) as { images?: { url: string }[] };
  const url = data.images?.[0]?.url;
  if (!url) throw new ProviderError("Пустой ответ сервиса");
  return urlToDataUri(url);
};
