// Кэш результатов примерки на диске.
// Кэшируем только примерки на аватарах (режим «по росту и весу»): там нет фото покупателя,
// а пара «аватар × вещь» у всех одинаковая. В проде это главный рычаг снижения стоимости генераций.
// Фото покупателей сюда не попадают никогда: сервер пишет в кэш только запросы с пометкой cacheable.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "cache", "tryon");

export function cacheKey(person: string, garment: string, category: string): string {
  return createHash("sha256").update(person).update("|").update(garment).update("|").update(category).digest("hex").slice(0, 32);
}

export function cacheGet(key: string): string | null {
  try {
    const f = join(DIR, key + ".txt");
    return existsSync(f) ? readFileSync(f, "utf8") : null;
  } catch {
    return null;
  }
}

export function cachePut(key: string, dataUri: string): void {
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(join(DIR, key + ".txt"), dataUri);
  } catch {
    /* на бессерверном хостинге диск только для чтения: работаем без кэша */
  }
}
