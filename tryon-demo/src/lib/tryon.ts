// Клиент примерки: кэш вкладки, защита от дублей, таймаут, учёт генераций.
import type { Item } from "../data/catalog";
import { mockComposite, urlToDataUrl } from "./image";
import { track } from "./analytics";
import { lock, paidToken } from "./paid";

export interface TryOnResult {
  image: string;
  /** live: сгенерировано сейчас; server-cache: готовый результат с сервера; cache: уже было в этой вкладке; mock: пример без нейросети */
  source: "live" | "server-cache" | "cache" | "mock";
  ms: number;
  /** чем сделана картинка */
  gmode?: "free" | "paid";
  model?: string;
  costUsd?: number;
  /** платный режим просили, но сервер дал бесплатный */
  downgraded?: "paid_disabled" | "no_token" | "budget" | "rate" | "paid_failed";
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
  /** весь образ за один запрос (платный режим): вещи вместе с основной */
  items?: Item[];
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
  const key = personKey(opts.person) + "|" + (opts.items ?? [opts.item]).map((i) => i.id).sort().join("+") + (paidToken() ? "|paid" : "");
  const hit = cache.get(key);
  if (hit) return Promise.resolve({ ...hit, source: hit.source === "mock" ? "mock" : "cache", ms: 0 });
  let p = inflight.get(key);
  if (!p) {
    p = run(opts, key).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

async function run({ person, item, items, timeoutMs, accessCode, mode, cacheable }: TryOnOptions, key: string): Promise<TryOnResult> {
  if (sessionGens >= SESSION_LIMIT) throw new TryOnError("Вы примерили очень много вещей. Продолжим чуть позже", "limit");
  if (mode) track({ type: "tryon_start", item: item.id, mode });

  const started = performance.now();
  const list = items ?? [item];
  const garments = await Promise.all(list.map(async (it) => ({ image: await urlToDataUrl(it.garment ?? it.image), category: it.tryOn ?? "tops", description: it.en, slot: it.slot })));
  const garment = garments[0].image;
  const token = paidToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let data: { ok: boolean; image?: string; mock?: boolean; cached?: boolean; error?: string; mode?: "free" | "paid"; model?: string; costUsd?: number; downgraded?: TryOnResult["downgraded"] };
  try {
    const r = await fetch("/api/tryon", {
      method: "POST",
      headers: { "content-type": "application/json", ...(accessCode ? { "x-demo-code": accessCode } : {}), ...(token ? { "x-paid-token": token } : {}) },
      body: JSON.stringify({ personImage: person, garments, mode: token ? "paid" : "free", cacheable: !!cacheable }),
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
    result = { image: data.image!, source: data.cached ? "server-cache" : "live", ms: performance.now() - started, gmode: data.mode ?? "free", model: data.model, costUsd: data.costUsd, downgraded: data.downgraded };
    if (!data.cached) sessionGens++;
    // токен не принят сервером (сменили секрет, выключили платный режим): сбрасываем, чтобы не просить его снова
    if (data.downgraded === "no_token" || data.downgraded === "paid_disabled") lock();
    // учёт для вкладки «Пилот»: каждая картинка, включая вторую вещь образа; из кэша бесплатно
    track({ type: "gen", item: item.id, cached: !!data.cached, ms: Math.round(result.ms), gmode: result.gmode, costUsd: data.costUsd });
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
