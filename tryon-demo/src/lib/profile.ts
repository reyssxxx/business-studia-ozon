// Профиль стиля покупателя: пять долей стилей, любимые тона и привычный чек.
// Собирается из трёх источников: фото (в чём пришёл), покупки (что берёт), сессия (что делает сейчас).
//   профиль = 0,4 · фото + 0,4 · покупки + 0,2 · сессия.
// Если источника нет, его вес делится между остальными. Без данных профиль равномерный.
import { byId, type Style, type Tone } from "../data/catalog";
import type { Owned } from "../data/personas";
import type { Ev } from "./analytics";

export const STYLES: Style[] = ["formal", "smart", "casual", "street", "sport"];
export type StyleShares = Record<Style, number>;
export type ToneShares = Record<Tone, number>;

export interface PhotoStyle {
  styles: StyleShares;
  items: string[];
  palette: "neutral" | "earth" | "bright";
}

export interface Profile {
  styles: StyleShares;
  tones: ToneShares;
  /** привычный чек: медиана цен прошлых покупок */
  price: number | null;
  main: Style;
  sources: { photo: boolean; purchases: number; session: boolean; manual: boolean };
}

const WEIGHTS = { photo: 0.4, purchases: 0.4, session: 0.2 };
/** Через сколько дней вес покупки уменьшается вдвое */
const HALF_LIFE_DAYS = 90;

export const STYLE_NAME: Record<Style, string> = { formal: "деловой", smart: "смарт-кэжуал", casual: "кэжуал", street: "уличный", sport: "спортивный" };

const zeroStyles = (): StyleShares => ({ formal: 0, smart: 0, casual: 0, street: 0, sport: 0 });
const zeroTones = (): ToneShares => ({ neutral: 0, earth: 0, accent: 0 });

function norm<T extends string>(o: Record<T, number>): Record<T, number> {
  const keys = Object.keys(o) as T[];
  const sum = keys.reduce((a, k) => a + o[k], 0);
  return Object.fromEntries(keys.map((k) => [k, sum > 0 ? o[k] / sum : 1 / keys.length])) as Record<T, number>;
}

interface Part {
  styles: StyleShares;
  tones: ToneShares;
}

function fromPhoto(p: PhotoStyle): Part {
  const tones: ToneShares = p.palette === "earth" ? { neutral: 0.2, earth: 0.7, accent: 0.1 } : p.palette === "bright" ? { neutral: 0.2, earth: 0.1, accent: 0.7 } : { neutral: 0.7, earth: 0.2, accent: 0.1 };
  return { styles: norm({ ...p.styles }), tones };
}

/** Каждая вещь делит свой вес поровну между своими стилями; свежие покупки весят больше */
function accumulate(items: { id: string; w: number }[]): Part | null {
  const styles = zeroStyles();
  const tones = zeroTones();
  let total = 0;
  for (const { id, w } of items) {
    const it = byId(id);
    if (!it) continue;
    for (const s of it.styles) styles[s] += w / it.styles.length;
    tones[it.tone] += w;
    total += w;
  }
  return total > 0 ? { styles: norm(styles), tones: norm(tones) } : null;
}

function fromPurchases(wardrobe: Owned[]): Part | null {
  return accumulate(wardrobe.map((w) => ({ id: w.id, w: Math.pow(0.5, w.daysAgo / HALF_LIFE_DAYS) })));
}

/** Что покупатель делает в этой сессии: примерка 0,5, оценка 👍 1, корзина 2 */
function fromSession(events: Ev[]): Part | null {
  const weight: Partial<Record<Ev["type"], number>> = { tryon_done: 0.5, vote_up: 1, add_cart: 2 };
  return accumulate(events.filter((e) => e.item && weight[e.type]).map((e) => ({ id: e.item!, w: weight[e.type]! })));
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export interface ProfileInput {
  photo?: PhotoStyle | null;
  wardrobe: Owned[];
  events: Ev[];
  /** покупатель сам выставил доли стилей */
  override?: StyleShares | null;
}

export function buildProfile({ photo, wardrobe, events, override }: ProfileInput): Profile {
  const parts: { part: Part; w: number }[] = [];
  if (photo) parts.push({ part: fromPhoto(photo), w: WEIGHTS.photo });
  const purchases = fromPurchases(wardrobe);
  if (purchases) parts.push({ part: purchases, w: WEIGHTS.purchases });
  const session = fromSession(events);
  if (session) parts.push({ part: session, w: WEIGHTS.session });

  let styles = zeroStyles();
  let tones: ToneShares = { neutral: 1 / 3, earth: 1 / 3, accent: 1 / 3 };
  if (parts.length) {
    const total = parts.reduce((a, p) => a + p.w, 0);
    styles = zeroStyles();
    tones = zeroTones();
    for (const { part, w } of parts) {
      for (const s of STYLES) styles[s] += (part.styles[s] * w) / total;
      for (const t of Object.keys(tones) as Tone[]) tones[t] += (part.tones[t] * w) / total;
    }
  } else {
    styles = norm(styles);
  }
  const manual = !!override;
  if (override) styles = norm({ ...override });

  const main = STYLES.reduce((best, s) => (styles[s] > styles[best] ? s : best), STYLES[2]);
  return {
    styles,
    tones,
    price: median(wardrobe.map((w) => byId(w.id)?.price).filter((x): x is number => typeof x === "number")),
    main,
    sources: { photo: !!photo, purchases: wardrobe.length, session: !!session, manual },
  };
}

/** «деловой 45% · смарт-кэжуал 30%» */
export function topStyles(p: Profile, n = 2): string {
  return STYLES.map((s) => ({ s, v: p.styles[s] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .filter((x) => x.v >= 0.05)
    .map((x) => `${STYLE_NAME[x.s]} ${Math.round(x.v * 100)}%`)
    .join(" · ");
}

/** «по фото и 3 покупкам» */
export function sourcesText(p: Profile): string {
  const src = p.sources;
  if (src.manual) return "настроено вами";
  const parts: string[] = [];
  if (src.photo) parts.push("по фото");
  if (src.purchases) parts.push(`${src.purchases} ${plural(src.purchases)} из гардероба`);
  if (src.session) parts.push("по вашим действиям");
  return parts.length ? parts.join(", ") : "данных пока нет, подбираем нейтрально";
}
const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "вещь" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "вещи" : "вещей");

/** Шкала формальности: деловой ... спорт. Для «Что-то новое» ищем стиль на расстоянии. */
export const FORMALITY: Style[] = ["formal", "smart", "casual", "street", "sport"];
export const distance = (a: Style, b: Style) => Math.abs(FORMALITY.indexOf(a) - FORMALITY.indexOf(b));

/** Насколько вещь в стиле человека: максимум доли профиля по стилям вещи, 0..1 */
export function closeness(styles: Style[], p: Profile): number {
  return Math.max(...styles.map((s) => p.styles[s]));
}
