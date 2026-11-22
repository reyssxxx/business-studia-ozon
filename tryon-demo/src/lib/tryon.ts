// Клиент примерки: кэш вкладки, защита от дублей, таймаут, учёт генераций.
import type { Item } from "../data/catalog";
import { mockComposite, urlToDataUrl } from "./image";
import { track } from "./analytics";

export interface TryOnResult {
  image: string;
  /** live: сгенерировано сейчас; server-cache: готовый результат с сервера; cache: уже было в этой вкладке; mock: пример без нейросети */
  source: "live" | "server-cache" | "cache" | "mock";
  ms: number;
}

export class TryOnError extends Error {
  constructor(
    message: string,
    public kind: "timeout" | "server" | "auth" | "network" | "limit",
  ) {
    super(message);
  }
}

export interface TryOnOptions {
  person: string; // data URI: фото, аватар или результат прошлой примерки (для образа)
  item: Item;
  timeoutMs: number;
  accessCode?: string;
  /** режим основной примерки, для аналитики; не задаём для второй вещи образа */
  mode?: "photo" | "avatar";
  /** в запросе нет фото покупателя (аватар): сервер может отдать и сохранить готовый результат */
  cacheable?: boolean;
}

/** Потолок генераций на одну сессию: защита бюджета от случайного «закликивания» */
const SESSION_LIMIT = 40;
let sessionGens = 0;

const cache = new Map<string, TryOnResult>();
const inflight = new Map<string, Promise<TryOnResult>>();

function personKey(person: string): string {
  let h = 0;
  for (let i = 0; i < person.length; i += 97) h = (h * 31 + person.charCodeAt(i)) | 0;
  return `${person.length}:${h}`;
}

/** Один и тот же запрос не уходит дважды: повторный вызов ждёт первый или берёт из кэша вкладки. */
export function tryOn(opts: TryOnOptions): Promise<TryOnResult> {
  const key = personKey(opts.person) + "|" + opts.item.id;
  const hit = cache.get(key);
  if (hit) return Promise.resolve({ ...hit, source: hit.source === "mock" ? "mock" : "cache", ms: 0 });
  let p = inflight.get(key);
  if (!p) {
    p = run(opts, key).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

async function run({ person, item, timeoutMs, accessCode, mode, cacheable }: TryOnOptions, key: string): Promise<TryOnResult> {
  if (sessionGens >= SESSION_LIMIT) throw new TryOnError("Вы примерили очень много вещей. Продолжим чуть позже", "limit");
  if (mode) track({ type: "tryon_start", item: item.id, mode });

  const started = performance.now();
  const garment = await urlToDataUrl(item.garment ?? item.image);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let data: { ok: boolean; image?: string; mock?: boolean; cached?: boolean; error?: string };
  try {
    const r = await fetch("/api/tryon", {
      method: "POST",
      headers: { "content-type": "application/json", ...(accessCode ? { "x-demo-code": accessCode } : {}) },
      body: JSON.stringify({ personImage: person, garmentImage: garment, category: item.tryOn ?? "tops", description: item.en, cacheable: !!cacheable }),
      signal: ctrl.signal,
    });
    data = await r.json().catch(() => ({ ok: false, error: `Ошибка ${r.status}` }));
    if (r.status === 401) throw new TryOnError(data.error ?? "Нужен код доступа", "auth");
    if (r.status === 429) throw new TryOnError(data.error ?? "Лимит примерок исчерпан", "limit");
    if (!data.ok) throw new TryOnError(data.error ?? "Ошибка сервиса", "server");
  } catch (e) {
    if (e instanceof TryOnError) throw e;
    if ((e as Error).name === "AbortError") throw new TryOnError("Примерка заняла слишком много времени", "timeout");
    throw new TryOnError("Нет связи с сервером", "network");
  } finally {
    clearTimeout(timer);
  }

  let result: TryOnResult;
  if (data.mock) {
    await new Promise((r) => setTimeout(r, 1800));
    result = { image: await mockComposite(person, garment, item.tryOn ?? "tops"), source: "mock", ms: performance.now() - started };
  } else {
    result = { image: data.image!, source: data.cached ? "server-cache" : "live", ms: performance.now() - started };
    if (!data.cached) sessionGens++;
    // учёт для вкладки «Пилот»: каждая картинка, включая вторую вещь образа; из кэша бесплатно
    track({ type: "gen", item: item.id, cached: !!data.cached, ms: Math.round(result.ms) });
  }
  cache.set(key, result);
  // примерка считается ровно один раз на реальный запрос, а не на каждый показ экрана
  if (mode) track({ type: "tryon_done", item: item.id, ms: Math.round(result.ms), mode });
  return result;
}

/** Пример результата без нейросети на случай сбоя генерации */
export async function fallback(person: string, item: Item): Promise<TryOnResult> {
  const garment = await urlToDataUrl(item.garment ?? item.image);
  return { image: await mockComposite(person, garment, item.tryOn ?? "tops"), source: "mock", ms: 0 };
}
