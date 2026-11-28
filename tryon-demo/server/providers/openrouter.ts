// Платный провайдер: Gemini через OpenRouter (оплата в USDC). Образ целиком за один запрос.
// Модели по порядку: OPENROUTER_MODELS (по умолчанию Nano Banana 2.1, затем 3.1 Flash Lite).
// Три правила запроса проверены тестами (scripts/test-gemini*.mjs):
//   1. полностью убрать оригинальную одежду в тех местах, которые закрывают новые вещи (иначе юбка и платье надеваются поверх);
//   2. под юбкой и платьем голые ноги;
//   3. не добавлять вещей и аксессуаров, которых нет в списке (иначе дорисовывается кепка).
import { withKeys } from "../keys.js";
import { ProviderError, urlToDataUri, type Env, type GenResult, type Garment, type OutfitInput, type Slot } from "./types.js";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODELS = ["google/gemini-nano-banana-2.1", "google/gemini-3.1-flash-lite-image"];
const MAX_GARMENTS = 8;

const slotOf = (g: Garment): Slot => g.slot ?? (g.category === "bottoms" ? "bottom" : g.category === "one-pieces" ? "dress" : "top");

/** Что именно надо убрать у человека, исходя из того, какие места закрывают новые вещи */
function replaced(slots: Slot[]): string[] {
  const out: string[] = [];
  if (slots.includes("dress")) out.push("t-shirt and trousers");
  else {
    if (slots.includes("top")) out.push("t-shirt or shirt");
    if (slots.includes("bottom")) out.push("trousers");
  }
  if (slots.includes("shoes")) out.push("shoes");
  return out;
}

export function buildPrompt(garments: Garment[]): string {
  const slots = garments.map(slotOf);
  const list = garments.map((g, i) => `image ${i + 2}: ${g.description || "garment"}`).join("; ");
  const parts: string[] = [];
  if (garments.length === 1) {
    parts.push("Image 1 is a photo of a person. Image 2 is a photo of a garment.", `Edit image 1: dress the person in the garment from image 2 (${garments[0].description || "garment"}).`);
  } else {
    parts.push(`Image 1 is a photo of a person. The other images are garments, in order: ${list}.`, "Edit image 1: dress the person in ALL of these garments together as one complete outfit, each in its natural place (outer jacket over the top, trousers or skirt, shoes).");
  }
  if (slots.includes("outer") && !slots.includes("top") && !slots.includes("dress")) parts.push("The jacket is worn over the person's existing top.");
  const rep = replaced(slots);
  if (rep.length) parts.push(`Completely REMOVE the person's original ${rep.join(" and ")}: no part of the original clothes may remain visible. Keep all other clothing the person wears.`);
  const skirtOrDress = slots.includes("dress") || garments.some((g) => slotOf(g) === "bottom" && /skirt|dress|shorts/i.test(g.description ?? ""));
  if (skirtOrDress) parts.push("If a garment is a skirt, shorts or dress, the legs below its hem must be bare skin" + (slots.includes("dress") ? ", and the arms not covered by the dress are bare too." : "."));
  const cap = slots.includes("hat");
  const bag = slots.includes("bag");
  parts.push((cap ? "The cap or hat is worn on the head. " : "") + (bag ? "The bag is carried naturally in the hand. " : "") + "Do not add any clothing or accessories that are not in the list: the person wears no hat and carries no bag unless one is listed.");
  parts.push("Each garment must keep its exact color, pattern and cut. Keep the person's face, hair, skin, body shape, pose and the plain background exactly the same. Full body visible from head to feet, photorealistic, same framing and aspect ratio as image 1.");
  return parts.join(" ");
}

async function call(model: string, key: string, input: OutfitInput): Promise<GenResult> {
  const content = [
    { type: "text", text: buildPrompt(input.garments) },
    { type: "image_url", image_url: { url: input.personImage } },
    ...input.garments.map((g) => ({ type: "image_url", image_url: { url: g.image } })),
  ];
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, modalities: ["image", "text"], usage: { include: true }, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (r.status === 402) throw new ProviderError("На счёте OpenRouter закончились кредиты", 402, 30 * 60_000);
  if (r.status === 401 || r.status === 403) throw new ProviderError("Ключ OpenRouter не принят", 401, 24 * 3_600_000);
  if (r.status === 429) throw new ProviderError("OpenRouter ограничил частоту запросов", 429, 60_000);
  const j = (await r.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string; images?: { image_url?: { url?: string } }[] } }[];
    usage?: { cost?: number };
    error?: { message?: string };
  };
  if (!r.ok) {
    console.error("[tryon] openrouter", model, r.status, String(j.error?.message ?? "").slice(0, 200));
    throw new ProviderError(`Gemini ответил ${r.status}`, 502);
  }
  const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) {
    // модель отказалась (политика безопасности) или вернула только текст
    console.warn("[tryon] openrouter без картинки", model, String(j.choices?.[0]?.message?.content ?? "").slice(0, 160));
    throw new ProviderError("Gemini не вернула картинку", 502);
  }
  return { image: url.startsWith("data:") ? url : await urlToDataUri(url), model, costUsd: j.usage?.cost };
}

export async function openrouter(input: OutfitInput, env: Env): Promise<GenResult> {
  if (input.garments.length === 0 || input.garments.length > MAX_GARMENTS) throw new ProviderError("Нужно от 1 до 8 вещей", 400);
  const models = (env.OPENROUTER_MODELS || DEFAULT_MODELS.join(",")).split(",").map((m) => m.trim()).filter(Boolean);
  let last: ProviderError | null = null;
  for (const model of models) {
    try {
      // ключи по порядку: основной счёт первым, запасные при нехватке кредитов
      return await withKeys("openrouter", env, (key) => call(model, key!, input), { strategy: "ordered" });
    } catch (e) {
      last = e instanceof ProviderError ? e : new ProviderError("Gemini не ответила", 502);
      console.warn(`[tryon] ${model}: ${last.message}, пробуем следующую модель`);
    }
  }
  throw last ?? new ProviderError("Gemini недоступна", 502);
}
