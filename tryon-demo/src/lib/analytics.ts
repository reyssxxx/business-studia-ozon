// События воронки для вкладки «Аналитика пилота». Хранятся в браузере.
import { useSyncExternalStore } from "react";
import { load, save } from "./storage";

export type EventType =
  | "view_product"
  | "tryon_start"
  | "tryon_done"
  | "tryon_fail"
  | "add_cart"
  | "look_open"
  | "look_ready" // образ сгенерирован и предложен вторым слайдом
  | "look_view" // покупатель открыл слайд с образом
  | "look_off" // покупатель отключил автоподбор образов
  | "look_switch" // переключил образ
  | "mode_new" // открыл «Что-то новое»
  | "look_edit" // заменил, убрал или добавил вещь в образе
  | "gen" // одна картинка от нейросети (cached: взята из кэша, бесплатно)
  | "vote_up" // «похоже на правду»
  | "vote_down"
  | "vote_reason" // причина дизлайка
  | "share"
  | "look_add";

export type Reason = "not_me" | "garment" | "artifacts" | "fit";

export interface Ev {
  t: number;
  type: EventType;
  item?: string;
  /** откуда добавили в корзину: после примерки, из карточки, из образа */
  source?: "tryon" | "product" | "look";
  price?: number;
  ms?: number;
  mode?: "photo" | "avatar";
  cached?: boolean;
  /** режим генерации: платный (Gemini) или бесплатный */
  gmode?: "free" | "paid";
  /** сколько стоила генерация, $ */
  costUsd?: number;
  /** из какого режима образ добавили в корзину */
  lookMode?: "for-you" | "new";
  /** что оценивали: примерку одной вещи или образ целиком */
  target?: "tryon" | "look";
  /** причина дизлайка */
  reason?: Reason;
}

const KEY = "tryon.events.v1";
let events: Ev[] = load<Ev[]>(KEY, []);
const subs = new Set<() => void>();

export function track(e: Omit<Ev, "t">): void {
  events = [...events, { ...e, t: Date.now() }];
  save(KEY, events);
  subs.forEach((f) => f());
}

export function resetEvents(): void {
  events = [];
  save(KEY, events);
  subs.forEach((f) => f());
}

export function useEvents(): Ev[] {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => events,
  );
}

export interface Metrics {
  views: number;
  tryons: number;
  tryonShare: number; // доля просмотров карточки с примеркой
  cartAfterTryon: number;
  convTryon: number; // из примерки в корзину
  convNoTryon: number; // из карточки без примерки в корзину
  gensPaid: number; // картинки, за которые заплатили
  gensCached: number; // картинки из кэша
  gensGemini: number; // платные картинки (Gemini)
  spendUsd: number; // расход на платные генерации, $
  votesUp: number;
  votesDown: number;
  votesByTarget: Record<"tryon" | "look", { up: number; down: number }>;
  reasons: Record<Reason, number>;
  newOpened: number; // сколько раз открыли «Что-то новое»
  newAdds: number; // сколько образов из него добавили
  lookShown: number; // сколько раз образ был предложен
  lookViews: number; // сколько раз его открыли
  lookAdds: number;
  lookRate: number; // добрали образ на 100 примеривших
  avgMs: number;
  cartSum: number;
}

export function computeMetrics(ev: Ev[]): Metrics {
  const count = (t: EventType, f: (e: Ev) => boolean = () => true) => ev.filter((e) => e.type === t && f(e)).length;
  const views = count("view_product");
  const tryons = count("tryon_done");
  const cartAfterTryon = count("add_cart", (e) => e.source === "tryon");
  const cartProduct = count("add_cart", (e) => e.source === "product");
  const lookAdds = count("look_add");
  const ms = ev.filter((e) => e.type === "gen" && !e.cached && e.ms).map((e) => e.ms!); // время живой генерации, без кэша
  const viewsNoTryon = Math.max(0, views - count("tryon_start"));
  return {
    views,
    tryons,
    tryonShare: views ? Math.min(1, tryons / views) : 0,
    cartAfterTryon,
    convTryon: tryons ? cartAfterTryon / tryons : 0,
    convNoTryon: viewsNoTryon ? cartProduct / viewsNoTryon : 0,
    gensPaid: count("gen", (e) => !e.cached),
    gensCached: count("gen", (e) => !!e.cached),
    gensGemini: count("gen", (e) => !e.cached && e.gmode === "paid"),
    spendUsd: ev.filter((e) => e.type === "gen").reduce((a, e) => a + (e.costUsd ?? 0), 0),
    votesUp: count("vote_up"),
    votesDown: count("vote_down"),
    votesByTarget: {
      tryon: { up: count("vote_up", (e) => e.target !== "look"), down: count("vote_down", (e) => e.target !== "look") },
      look: { up: count("vote_up", (e) => e.target === "look"), down: count("vote_down", (e) => e.target === "look") },
    },
    reasons: {
      not_me: count("vote_reason", (e) => e.reason === "not_me"),
      garment: count("vote_reason", (e) => e.reason === "garment"),
      artifacts: count("vote_reason", (e) => e.reason === "artifacts"),
      fit: count("vote_reason", (e) => e.reason === "fit"),
    },
    newOpened: count("mode_new"),
    newAdds: count("look_add", (e) => e.lookMode === "new"),
    lookShown: count("look_ready"),
    lookViews: count("look_view"),
    lookAdds,
    lookRate: tryons ? lookAdds / tryons : 0,
    avgMs: ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0,
    cartSum: ev.filter((e) => e.type === "add_cart").reduce((a, e) => a + (e.price ?? 0), 0),
  };
}
