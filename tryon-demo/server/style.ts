// Определение стиля одежды по фото покупателя: «в чём он пришёл».
//   POST /api/style → { image: data URI } → { ok, styles, items, palette, model }
// Фото не сохраняется. Используем бесплатные модели с поддержкой картинок через Pollinations,
// первая основная, вторая запасная. Ответ нормализуем: доли стилей в сумме дают 1.
import type { Env } from "./providers/types.js";

export type StyleKey = "formal" | "smart" | "casual" | "street" | "sport";
const KEYS: StyleKey[] = ["formal", "smart", "casual", "street", "sport"];

export interface StyleResponse {
  ok: boolean;
  styles?: Record<StyleKey, number>;
  items?: string[];
  palette?: "neutral" | "earth" | "bright";
  model?: string;
  ms?: number;
  error?: string;
}

const MODELS = ["openai/gpt-5.4-nano", "openai/gpt-6.1-terra"];
const ENDPOINT = "https://gen.pollinations.ai/v1/chat/completions";
const DATA_URI = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_CHARS = 2_500_000;

const PROMPT = `Look at the clothing the person is wearing. Reply with JSON only:
{"styles":{"formal":0-1,"smart":0-1,"casual":0-1,"street":0-1,"sport":0-1},"items":["short list of garments with colors"],"palette":"neutral|earth|bright"}
The styles values must sum to 1.
formal = suit, tailored jacket, dress shirt with trousers. smart = chinos, oxford shirt, knitwear, loafers, blazer with jeans.
casual = jeans, t-shirt, plain sweatshirt, sneakers. street = hoodie, cargo pants, bomber, oversized fit, chunky sneakers.
sport = athletic wear, leggings, joggers, running shoes.
If the clothing is not visible, spread the values evenly.`;

function json(body: StyleResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function normalize(raw: unknown): Record<StyleKey, number> | null {
  const o = (raw && typeof raw === "object" ? (raw as { styles?: Record<string, unknown> }).styles : null) ?? null;
  if (!o) return null;
  const vals = KEYS.map((k) => Math.max(0, Number(o[k]) || 0));
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  return Object.fromEntries(KEYS.map((k, i) => [k, vals[i] / sum])) as Record<StyleKey, number>;
}

async function ask(model: string, image: string, key: string): Promise<StyleResponse> {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: image } }] }],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!r.ok) throw new Error(`${model}: ${r.status}`);
  const content = ((await r.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content.replace(/^```json|```$/g, "").trim());
  const styles = normalize(parsed);
  if (!styles) throw new Error(`${model}: пустые доли стилей`);
  const palette = ["neutral", "earth", "bright"].includes(parsed.palette) ? parsed.palette : "neutral";
  const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 6).map((x: unknown) => String(x).slice(0, 60)) : [];
  return { ok: true, styles, items, palette, model };
}

export async function handleStyle(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  const key = env.POLLINATIONS_KEY;
  if (!key) return json({ ok: false, error: "Нет ключа POLLINATIONS_KEY: стиль по фото не определяется" }, 503);

  const raw = await req.text();
  if (raw.length > MAX_CHARS) return json({ ok: false, error: "Фото слишком большое" }, 413);
  let image = "";
  try {
    image = JSON.parse(raw).image;
  } catch {
    return json({ ok: false, error: "bad json" }, 400);
  }
  if (typeof image !== "string" || !DATA_URI.test(image)) return json({ ok: false, error: "Неверный формат изображения" }, 400);

  const started = Date.now();
  let last = "";
  for (const model of MODELS) {
    try {
      const res = await ask(model, image, key);
      return json({ ...res, ms: Date.now() - started });
    } catch (e) {
      last = (e as Error).message;
      console.warn("[style]", last);
    }
  }
  return json({ ok: false, error: "Не удалось определить стиль по фото" }, 502);
}
