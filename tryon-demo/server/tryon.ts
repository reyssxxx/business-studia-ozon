// HTTP-обработчик примерки. Используется и в dev-сервере Vite, и в функции Vercel (api/tryon.ts).
//   GET  /api/tryon → какой провайдер активен и настроен ли платный режим
//   POST /api/tryon → { personImage, garments: [{ image, category, description?, slot? }], mode?, cacheable? } → { ok, image, ... }
//   (старый формат { garmentImage, category, description } тоже принимается)
//
// Режимы. Выбирает сервер, клиент только просит:
//   free  (по умолчанию, для всех): Hugging Face → Pollinations. Из списка вещей берутся верх и низ, остальное пропускается.
//   paid  (только с токеном из /api/unlock): Gemini через OpenRouter, образ целиком за один запрос; если не вышло, бесплатный режим.
// Фото покупателя нигде не сохраняется: приходит в теле запроса и сразу уходит в модель.
import { cacheGet, cacheKey, cachePut } from "./cache.js";
import { clientIp, paidEnabled, ttlHours, verifyToken } from "./auth.js";
import { fal } from "./providers/fal.js";
import { hf } from "./providers/hf.js";
import { openrouter } from "./providers/openrouter.js";
import { pollinations } from "./providers/pollinations.js";
import { ProviderError, type Category, type Env, type Garment, type OutfitInput, type Provider, type ProviderId, type Slot, type TryOnInput } from "./providers/types.js";

export type Mode = "free" | "paid";
/** Почему платный режим не сработал, хотя клиент его просил */
export type Downgrade = "paid_disabled" | "no_token" | "budget" | "rate" | "paid_failed";

export interface TryOnResponse {
  ok: boolean;
  image?: string;
  mock?: boolean;
  /** результат взят из кэша, генерация не тратилась */
  cached?: boolean;
  provider?: ProviderId;
  model?: string;
  mode?: Mode;
  costUsd?: number;
  downgraded?: Downgrade;
  ms?: number;
  error?: string;
  paid?: { enabled: boolean; ttlHours: number };
}

const FREE: Record<Exclude<ProviderId, "mock" | "openrouter">, Provider> = { fal, hf, pollinations };
const MAX_BODY_CHARS = 4_000_000; // лимит тела функции Vercel 4,5 МБ
const MAX_GARMENTS = 8;
const DATA_URI = /^data:image\/(jpeg|png|webp);base64,/;
const SLOTS: Slot[] = ["outer", "top", "bottom", "dress", "shoes", "bag", "hat"];
const CATEGORIES: Category[] = ["tops", "bottoms", "one-pieces"];

/** TRYON_PROVIDER задаёт бесплатного провайдера явно. Иначе: есть FAL_KEY → fal, нет → hf. */
export function pickProvider(env: Env): ProviderId {
  const forced = env.TRYON_PROVIDER;
  if (forced === "fal" || forced === "hf" || forced === "pollinations" || forced === "mock") return forced;
  return env.FAL_KEY ? "fal" : "hf";
}

// ---------- лимиты ----------
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

// не больше N запросов в час с одного адреса (кэш не считается)
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

// Расход на платные генерации за сутки (по usage.cost из ответов OpenRouter) и частота платных запросов по токену.
// Счётчики в памяти копии функции: это мягкий предохранитель, жёсткий лимит ставится на самом ключе OpenRouter.
let paidSpent = 0;
let paidDay = new Date().toDateString();
function paidBudgetLeft(env: Env): boolean {
  const today = new Date().toDateString();
  if (today !== paidDay) {
    paidDay = today;
    paidSpent = 0;
  }
  return paidSpent < Number(env.PAID_DAILY_BUDGET_USD || 3);
}
const paidHits = new Map<string, number[]>();
function paidRateOk(token: string, env: Env): boolean {
  const limit = Number(env.PAID_MAX_PER_HOUR || 30);
  const now = Date.now();
  const id = token.slice(-16);
  const hits = (paidHits.get(id) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= limit) {
    paidHits.set(id, hits);
    return false;
  }
  hits.push(now);
  paidHits.set(id, hits);
  return true;
}

function json(body: TryOnResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// ---------- разбор запроса ----------
interface RawBody {
  personImage?: unknown;
  garments?: unknown;
  garmentImage?: unknown;
  category?: unknown;
  description?: unknown;
  slot?: unknown;
  mode?: unknown;
  cacheable?: unknown;
}

function toGarment(g: { image?: unknown; category?: unknown; description?: unknown; slot?: unknown }): Garment | null {
  if (typeof g.image !== "string" || !DATA_URI.test(g.image)) return null;
  const slot = SLOTS.includes(g.slot as Slot) ? (g.slot as Slot) : undefined;
  const category: Category = CATEGORIES.includes(g.category as Category) ? (g.category as Category) : slot === "bottom" ? "bottoms" : slot === "dress" ? "one-pieces" : "tops";
  return { image: g.image, category, slot, description: g.description ? String(g.description).slice(0, 80) : undefined };
}

function parseGarments(b: RawBody): Garment[] | null {
  const list = Array.isArray(b.garments) ? (b.garments as Parameters<typeof toGarment>[0][]) : [{ image: b.garmentImage, category: b.category, description: b.description, slot: b.slot }];
  if (list.length < 1 || list.length > MAX_GARMENTS) return null;
  const out = list.map(toGarment);
  return out.every(Boolean) ? (out as Garment[]) : null;
}

// ---------- бесплатная цепочка ----------
const isTop = (g: Garment) => (g.slot ? g.slot === "top" || g.slot === "outer" : g.category === "tops");
const isLow = (g: Garment) => (g.slot ? g.slot === "bottom" || g.slot === "dress" : g.category !== "tops");

/** Одна вещь через бесплатного провайдера; при лимите запасной Pollinations */
async function genOne(input: TryOnInput, env: Env, provider: ProviderId): Promise<{ image: string; provider: ProviderId }> {
  const p = provider === "mock" || provider === "openrouter" ? "hf" : provider;
  try {
    return { image: await FREE[p](input, env), provider: p };
  } catch (e) {
    const limited = e instanceof ProviderError && (e.status === 429 || e.status === 503);
    if (!limited || p === "pollinations") throw e;
    console.warn("[tryon] основной провайдер недоступен, переключаемся на pollinations");
    return { image: await FREE.pollinations(input, env), provider: "pollinations" };
  }
}

/** Образ в бесплатном режиме: верх, затем низ поверх результата. Обувь и аксессуары на фото не показываем. */
async function runFree(o: OutfitInput, env: Env): Promise<{ image: string; provider: ProviderId }> {
  const provider = pickProvider(env);
  const steps = [o.garments.find(isTop), o.garments.find(isLow)].filter((g): g is Garment => !!g);
  if (steps.length === 0) throw new ProviderError("В бесплатном режиме можно примерять одежду: верх, низ и платья", 400);
  let person = o.personImage;
  let used: ProviderId = provider;
  for (const g of steps) {
    const r = await genOne({ personImage: person, garmentImage: g.image, category: g.category, description: g.description }, env, provider);
    person = r.image;
    used = r.provider;
  }
  return { image: person, provider: used };
}

// ---------- обработчик ----------
export async function handleTryOn(req: Request, env: Env): Promise<Response> {
  const free = pickProvider(env);
  if (req.method === "GET") return json({ ok: true, provider: free, paid: { enabled: paidEnabled(env), ttlHours: ttlHours(env) } });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  if (env.DEMO_ACCESS_CODE && req.headers.get("x-demo-code") !== env.DEMO_ACCESS_CODE) {
    return json({ ok: false, error: "Нужен код доступа демо" }, 401);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return json({ ok: false, error: "Фото слишком большое" }, 413);
  let body: RawBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad json" }, 400);
  }
  const garments = parseGarments(body);
  if (typeof body.personImage !== "string" || !DATA_URI.test(body.personImage) || !garments) {
    return json({ ok: false, error: "Неверный формат изображений" }, 400);
  }
  const outfit: OutfitInput = { personImage: body.personImage, garments, cacheable: body.cacheable === true };

  // Режим: платный только если сервер сам убедился в токене. Остальное молча идёт в бесплатный режим.
  const token = req.headers.get("x-paid-token");
  let mode: Mode = "free";
  let downgraded: Downgrade | undefined;
  if (body.mode === "paid") {
    if (!paidEnabled(env)) downgraded = "paid_disabled";
    else if (!verifyToken(token, env)) downgraded = "no_token";
    else if (!paidBudgetLeft(env)) downgraded = "budget";
    else if (!paidRateOk(token!, env)) downgraded = "rate";
    else mode = "paid";
  }

  // Кэш аватаров: отвечаем мгновенно и бесплатно, лимиты не тратим. Платные и бесплатные результаты не смешиваем.
  const key = outfit.cacheable ? cacheKey(outfit.personImage, [...garments.map((g) => g.image)].sort().join("|"), mode) : null;
  if (key) {
    const hit = cacheGet(key);
    if (hit) return json({ ok: true, image: hit, cached: true, provider: mode === "paid" ? "openrouter" : free, mode, downgraded, ms: 0 });
  }

  if (mode === "free" && free === "mock") return json({ ok: true, mock: true, provider: free, mode, downgraded });
  if (!underIpLimit(clientIp(req), env)) return json({ ok: false, error: "Слишком много примерок за час, попробуйте позже" }, 429);

  const started = Date.now();
  let result: { image: string; provider: ProviderId; model?: string; costUsd?: number } | null = null;

  if (mode === "paid") {
    try {
      const r = await openrouter(outfit, env);
      paidSpent += r.costUsd ?? 0;
      result = { image: r.image, provider: "openrouter", model: r.model, costUsd: r.costUsd };
    } catch (e) {
      // платный путь не вышел (кредиты, отказ модели): не оставляем покупателя без картинки, идём в бесплатный
      console.warn("[tryon] платный режим не сработал, переходим на бесплатный:", e instanceof Error ? e.message : e);
      mode = "free";
      downgraded = "paid_failed";
    }
  }
  if (!result) {
    if (!underDailyCap(env)) return json({ ok: false, error: "Дневной лимит генераций исчерпан" }, 429);
    try {
      result = await runFree(outfit, env);
    } catch (e) {
      const pe = e instanceof ProviderError ? e : new ProviderError("Сервис примерки не ответил вовремя", 504);
      return json({ ok: false, error: pe.message, provider: free, mode, downgraded }, pe.status);
    }
  }
  if (key && mode === "free") cachePut(key, result.image); // платные результаты кэшируем под своим ключом ниже
  if (outfit.cacheable && mode === "paid") cachePut(cacheKey(outfit.personImage, [...garments.map((g) => g.image)].sort().join("|"), "paid"), result.image);
  return json({ ok: true, image: result.image, provider: result.provider, model: result.model, mode, costUsd: result.costUsd, downgraded, ms: Date.now() - started });
}
