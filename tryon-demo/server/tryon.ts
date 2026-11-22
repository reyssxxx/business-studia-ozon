// HTTP-обработчик примерки. Используется и в dev-сервере Vite, и в функции Vercel (api/tryon.ts).
//   GET  /api/tryon → какой провайдер активен
//   POST /api/tryon → { personImage, garmentImage, category, description? } → { ok, image }
// Фото покупателя нигде не сохраняется: приходит в теле запроса и сразу уходит в модель.
import { cacheGet, cacheKey, cachePut } from "./cache";
import { fal } from "./providers/fal";
import { hf } from "./providers/hf";
import { pollinations } from "./providers/pollinations";
import { ProviderError, type Env, type Provider, type ProviderId, type TryOnInput } from "./providers/types";

export interface TryOnResponse {
  ok: boolean;
  image?: string;
  mock?: boolean;
  /** результат взят из кэша, генерация не тратилась */
  cached?: boolean;
  provider?: ProviderId;
  ms?: number;
  error?: string;
}

const PROVIDERS: Record<Exclude<ProviderId, "mock">, Provider> = { fal, hf, pollinations };
const MAX_BODY_CHARS = 4_000_000; // лимит тела функции Vercel 4,5 МБ
const DATA_URI = /^data:image\/(jpeg|png|webp);base64,/;

/** TRYON_PROVIDER задаёт провайдера явно. Иначе: есть FAL_KEY → fal, нет → бесплатный hf. */
export function pickProvider(env: Env): ProviderId {
  const forced = env.TRYON_PROVIDER;
  if (forced === "fal" || forced === "hf" || forced === "pollinations" || forced === "mock") return forced;
  return env.FAL_KEY ? "fal" : "hf";
}

let usedToday = 0;
let usedDay = new Date().toDateString();
function underDailyCap(env: Env): boolean {
  const today = new Date().toDateString();
  if (today !== usedDay) {
    usedDay = today;
    usedToday = 0;
  }
  return usedToday++ < Number(env.MAX_GENERATIONS_PER_DAY || 300);
}

// Защита от перерасхода: не больше N генераций в час с одного адреса (кэш не считается).
const perIp = new Map<string, number[]>();
function underIpLimit(ip: string, env: Env): boolean {
  const limit = Number(env.MAX_GENERATIONS_PER_HOUR_PER_IP || 40);
  const now = Date.now();
  const hits = (perIp.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= limit) {
    perIp.set(ip, hits);
    return false;
  }
  hits.push(now);
  perIp.set(ip, hits);
  return true;
}

function json(body: TryOnResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function handleTryOn(req: Request, env: Env): Promise<Response> {
  const provider = pickProvider(env);
  if (req.method === "GET") return json({ ok: true, provider });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  if (env.DEMO_ACCESS_CODE && req.headers.get("x-demo-code") !== env.DEMO_ACCESS_CODE) {
    return json({ ok: false, error: "Нужен код доступа демо" }, 401);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return json({ ok: false, error: "Фото слишком большое" }, 413);
  let body: TryOnInput;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad json" }, 400);
  }
  if (typeof body?.personImage !== "string" || typeof body?.garmentImage !== "string" || !DATA_URI.test(body.personImage) || !DATA_URI.test(body.garmentImage)) {
    return json({ ok: false, error: "Неверный формат изображений" }, 400);
  }
  const input: TryOnInput = {
    personImage: body.personImage,
    garmentImage: body.garmentImage,
    category: ["tops", "bottoms", "one-pieces"].includes(body.category) ? body.category : "tops",
    description: body.description ? String(body.description).slice(0, 80) : undefined,
    cacheable: body.cacheable === true,
  };

  // Кэш аватаров: отвечаем мгновенно и бесплатно, лимиты не тратим
  const key = input.cacheable ? cacheKey(input.personImage, input.garmentImage, input.category) : null;
  if (key) {
    const hit = cacheGet(key);
    if (hit) return json({ ok: true, image: hit, cached: true, provider, ms: 0 });
  }

  if (provider === "mock") return json({ ok: true, mock: true, provider });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  if (!underIpLimit(ip, env)) return json({ ok: false, error: "Слишком много примерок за час, попробуйте позже" }, 429);
  if (!underDailyCap(env)) return json({ ok: false, error: "Дневной лимит генераций исчерпан" }, 429);

  const started = Date.now();
  try {
    let image: string;
    let used = provider;
    try {
      image = await PROVIDERS[provider](input, env);
    } catch (e) {
      // основной провайдер упёрся в лимит или недоступен: пробуем бесплатный запасной, если есть ключ
      const limited = e instanceof ProviderError && (e.status === 429 || e.status === 503);
      if (!limited || provider === "pollinations" || !env.POLLINATIONS_KEY) throw e;
      console.warn("[tryon] основной провайдер недоступен, переключаемся на pollinations");
      image = await PROVIDERS.pollinations(input, env);
      used = "pollinations";
    }
    if (key) cachePut(key, image);
    return json({ ok: true, image, provider: used, ms: Date.now() - started });
  } catch (e) {
    const pe = e instanceof ProviderError ? e : new ProviderError("Сервис примерки не ответил вовремя", 504);
    return json({ ok: false, error: pe.message, provider }, pe.status);
  }
}
