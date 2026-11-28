// Пул ключей: несколько ключей на провайдера, при исчерпании лимита берём следующий.
// Ключи задаются в окружении списком через запятую: OPENROUTER_KEYS, HF_TOKENS, POLLINATIONS_KEYS.
// Одиночные OPENROUTER_KEY, HF_TOKEN, POLLINATIONS_KEY тоже работают (это список из одного ключа).
// Ключи должны быть ваши законные: свои платные счета, токены участников команды со своих аккаунтов.
// Состояние (кто на паузе) хранится в памяти копии сервера: между копиями на Vercel не делится,
// лишняя неудачная попытка стоит секунд, но не денег.
import { ProviderError, type Env } from "./providers/types.js";

export type Pool = "openrouter" | "hf" | "pollinations";

const ENV_NAMES: Record<Pool, [string, string]> = {
  openrouter: ["OPENROUTER_KEYS", "OPENROUTER_KEY"],
  hf: ["HF_TOKENS", "HF_TOKEN"],
  pollinations: ["POLLINATIONS_KEYS", "POLLINATIONS_KEY"],
};

export function keysOf(pool: Pool, env: Env): string[] {
  const [many, one] = ENV_NAMES[pool];
  const raw = `${env[many] ?? ""},${env[one] ?? ""}`;
  return [...new Set(raw.split(/[,\s]+/).map((k) => k.trim()).filter(Boolean))];
}

const pausedUntil = new Map<string, number>(); // `${pool}:${индекс}` → время, до которого ключ не трогаем
const cursor = new Map<Pool, number>();

const slotId = (pool: Pool, key: string, env: Env) => `${pool}:${keysOf(pool, env).indexOf(key)}`;

export function pauseKey(pool: Pool, key: string, env: Env, ms: number, reason: string): void {
  const keys = keysOf(pool, env);
  const i = keys.indexOf(key);
  pausedUntil.set(`${pool}:${i}`, Date.now() + ms);
  // в лог идёт только номер ключа, не сам ключ
  console.warn(`[keys] ${pool}: ключ ${i + 1} из ${keys.length} на паузе ${Math.round(ms / 60000)} мин (${reason})`);
}

/** Сколько ключей провайдера сейчас не на паузе */
export function activeKeys(pool: Pool, env: Env): number {
  const now = Date.now();
  return keysOf(pool, env).filter((k) => (pausedUntil.get(slotId(pool, k, env)) ?? 0) <= now).length;
}

export interface PoolOptions {
  /** ordered: по порядку списка (дорогой или основной счёт первым); round-robin: по кругу, расходуем поровну */
  strategy?: "ordered" | "round-robin";
  /** Без ключей работать анонимно (бесплатные квоты Hugging Face) */
  allowAnonymous?: boolean;
}

/**
 * Выполняет fn с ключом из пула. Если ключ упёрся в лимит (ProviderError с retryAfterMs или статус 429/402),
 * ставит его на паузу и пробует следующий. Прочие ошибки отдаёт сразу: смена ключа их не лечит.
 */
export async function withKeys<T>(pool: Pool, env: Env, fn: (key: string | undefined, index: number) => Promise<T>, opts: PoolOptions = {}): Promise<T> {
  const keys = keysOf(pool, env);
  if (keys.length === 0) {
    if (opts.allowAnonymous) return fn(undefined, 0);
    throw new ProviderError(`Не настроены ключи для ${pool}`, 503);
  }
  let order = keys.map((_, i) => i);
  if (opts.strategy === "round-robin") {
    const start = (cursor.get(pool) ?? 0) % keys.length;
    cursor.set(pool, start + 1);
    order = order.map((_, i) => (start + i) % keys.length);
  }
  const now = Date.now();
  let last: ProviderError | null = null;
  for (const i of order) {
    if ((pausedUntil.get(`${pool}:${i}`) ?? 0) > now) continue;
    try {
      return await fn(keys[i], i);
    } catch (e) {
      if (e instanceof ProviderError && (e.retryAfterMs !== undefined || e.status === 429 || e.status === 402)) {
        pauseKey(pool, keys[i], env, e.retryAfterMs ?? 10 * 60_000, e.message);
        last = e;
        continue;
      }
      throw e;
    }
  }
  throw last ?? new ProviderError(`Все ключи ${pool} сейчас на паузе: лимиты исчерпаны`, 429);
}
