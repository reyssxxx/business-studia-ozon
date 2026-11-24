// Стилист: подбор образов к вещи.
//
// Жёсткие правила (образ не показываем, если нарушено):
//   1. Сезон: у всех вещей должен быть общий сезон. Пуховик (зима) и шорты (лето) не встретятся.
//   2. Фигура: женские вещи не предлагаем к мужской фигуре и наоборот.
//   3. Цвет: не больше одного яркого акцента на образ. Нейтральные цвета сочетаются со всем.
//   4. Стиль: все вещи образа поддерживают его стиль (деловой, смарт-кэжуал, на каждый день, уличный, спорт).
//      Деловое не сочетается с совсем расслабленным (пиджак и шорты, оксфорды и джоггеры).
//   5. Слоты: в образе по одной вещи на место (верх, низ, обувь...), платье заменяет верх и низ.
//
// Мягкая оценка (чем выше, тем раньше предложим):
//   часто покупают вместе, вещь уже есть в гардеробе, нейтральная база, рейтинг и отзывы,
//   цена не сильно выше основной вещи, сезон совпадает с текущим, разнообразие между образами.
//
// Персонализация (если у покупателя есть профиль стиля, см. profile.ts). Правила выше не меняются,
// профиль только переставляет приоритеты внутри разрешённого:
//   «Для вас»        вещи в стиле человека, его цвета и привычная цена идут первыми;
//   «Что-то новое»   стиль на 2 шага по шкале формальности от главного. Последнее обязательное место
//                    (обычно обувь) остаётся знакомым якорем, остальные места берут непривычное.
import { BOUGHT_TOGETHER, ITEMS, SEASON_LABEL, STYLE_LABEL, byId, type Item, type Season, type Slot, type Style } from "../data/catalog";
import { STYLE_NAME, closeness, distance, type Profile } from "./profile";

export type LookMode = "for-you" | "new";

export interface LookItem {
  slot: Slot;
  item: Item;
  /** вещь уже есть у покупателя (из гардероба) */
  owned: boolean;
}

export interface Look {
  id: string;
  style: Style;
  title: string;
  items: LookItem[];
  /** короткие объяснения «почему так»: сезон, цвет, гардероб */
  reasons: string[];
  score: number;
  mode: LookMode;
  /** знакомая вещь режима «Что-то новое»: остаётся из привычного, чтобы образ не казался чужим */
  anchor?: string;
}

export interface StylistCtx {
  gender: "m" | "f";
  /** id вещей из гардероба покупателя */
  owned: Set<string>;
  /** текущий сезон: образы под него поднимаем выше */
  now: Season;
  /** профиль стиля покупателя; без него подбор нейтральный */
  profile?: Profile;
  mode?: LookMode;
}

const MAX_LOOKS = 3;

export function currentSeason(d = new Date()): Season {
  const m = d.getMonth();
  if (m === 11 || m <= 1) return "winter";
  if (m >= 5 && m <= 7) return "summer";
  return "mid";
}

// ---------- правила ----------

function seasonsOf(items: Item[]): Season[] {
  return (["summer", "mid", "winter"] as Season[]).filter((s) => items.every((i) => i.seasons.includes(s)));
}

export function compatible(items: Item[], ctx: StylistCtx, style?: Style): boolean {
  if (items.some((i) => i.gender && i.gender !== ctx.gender)) return false;
  if (seasonsOf(items).length === 0) return false;
  if (items.filter((i) => i.tone === "accent").length > 1) return false;
  if (style && items.some((i) => !i.styles.includes(style))) return false;
  // Деловая вещь (пиджак, оксфорды, брюки) не сочетается с совсем расслабленной: шорты, джоггеры, леггинсы, кепка.
  // Расслабленная вещь = ни «делового», ни «смарт» стиля у неё нет.
  if (items.some((i) => i.styles.includes("formal")) && items.some((i) => !i.styles.includes("formal") && !i.styles.includes("smart"))) return false;
  const slots = items.map((i) => i.slot);
  if (new Set(slots).size !== slots.length) return false;
  if (slots.includes("dress") && (slots.includes("top") || slots.includes("bottom"))) return false;
  return true;
}

/** Какие места нужно заполнить к основной вещи, по порядку. required: без него образ не собран. */
function plan(main: Item): { slot: Slot; required: boolean }[] {
  switch (main.slot) {
    case "outer":
      return [{ slot: "bottom", required: true }, { slot: "top", required: true }, { slot: "shoes", required: true }];
    case "top":
      return [{ slot: "bottom", required: true }, { slot: "shoes", required: true }, { slot: "outer", required: false }];
    case "bottom":
      return [{ slot: "top", required: true }, { slot: "shoes", required: true }, { slot: "outer", required: false }];
    case "dress":
      return [{ slot: "shoes", required: true }, { slot: "outer", required: false }];
    default:
      return [{ slot: "top", required: true }, { slot: "bottom", required: true }, { slot: "shoes", required: true }];
  }
}

/** Места, которые можно добавить вручную, если их ещё нет в образе */
export const OPTIONAL_SLOTS: Slot[] = ["outer", "top", "shoes", "bag", "hat"];

// ---------- оценка ----------

const together = new Set(BOUGHT_TOGETHER.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));

type Role = "normal" | "novel";

/** Личная часть оценки. Для «Что-то новое» (role novel) смысл обратный: ценим непривычное. */
function personal(cand: Item, ctx: StylistCtx, role: Role, owned: boolean): number {
  const p = ctx.profile;
  if (!p) return 0;
  const near = closeness(cand.styles, p);
  let s = 0;
  if (role === "novel") {
    s += 3 * (1 - near); // чем дальше от привычного, тем интереснее
    const everBought = [...ctx.owned].some((id) => byId(id)?.slot === cand.slot);
    if (!everBought) s += 1.5; // категория, которую человек ещё не покупал
    if (owned) s -= 3; // вещь из гардероба не новая
  } else {
    s += 4 * near; // в стиле человека
    s += 1.0 * p.tones[cand.tone]; // в его цветах
  }
  if (p.price && !owned) {
    const ratio = cand.price / p.price;
    if (ratio > 1.5) s -= (ratio - 1.5) * 1.5; // сильно дороже привычного чека
  }
  return s;
}

function score(cand: Item, look: Item[], main: Item, ctx: StylistCtx, used: Map<Slot, Set<string>>, repeatPenalty = 1.5, role: Role = "normal"): number {
  let s = cand.rating * 0.4 + Math.log10(cand.reviews) * 0.3;
  if (look.some((i) => together.has(`${i.id}|${cand.id}`))) s += 2;
  const owned = ctx.owned.has(cand.id);
  if (owned) s += 3;
  s += personal(cand, ctx, role, owned);
  if (cand.tone === "neutral") s += 0.8;
  if (cand.tone === "earth" && look.some((i) => i.tone === "earth")) s += 0.3;
  if (!owned) {
    const ratio = cand.price / main.price;
    if (ratio > 1.5) s -= (ratio - 1.5) * 2; // не предлагаем к футболке пальто дороже в семь раз
  }
  if (cand.seasons.includes(ctx.now)) s += 0.6;
  if (used.get(cand.slot)?.has(cand.id)) s -= repeatPenalty; // разнообразие между образами
  return s;
}

// ---------- сборка ----------

function describe(items: LookItem[], ctx: StylistCtx, style?: Style, mode: LookMode = "for-you", anchor?: string): string[] {
  const its = items.map((x) => x.item);
  const seasons = seasonsOf(its);
  const reasons: string[] = [];
  const p = ctx.profile;
  if (p && style) {
    const known = p.sources.photo || p.sources.purchases > 0 || p.sources.session || p.sources.manual;
    if (mode === "new" && !known) {
      reasons.push("Пока мало данных о вас: показываем разные стили");
    } else if (mode === "new") {
      reasons.push(`Новое для вас: ${STYLE_NAME[style]}`);
      // «знакомое» пишем, только если вещь правда привычна: есть в гардеробе или близка к стилю человека
      const a = anchor ? items.find((x) => x.item.id === anchor) : undefined;
      if (a && (a.owned || closeness(a.item.styles, p) >= 0.25)) reasons.push(`Знакомое: ${a.item.title.split(" ")[0].toLowerCase()}`);
    } else if (style === p.main) {
      reasons.push(`Ваш стиль: ${STYLE_NAME[style]}`);
    } else {
      reasons.push(`Близко вам: ${STYLE_NAME[style]}`);
    }
  }
  reasons.push(seasons.length === 3 ? "Всесезонный" : seasons.map((s) => SEASON_LABEL[s]).join(" и "));
  if (seasons.includes(ctx.now)) reasons.push("По сезону сейчас");
  const accent = its.find((i) => i.tone === "accent");
  if (accent) reasons.push(`Акцент: ${accent.color.toLowerCase()}`);
  else if (its.some((i) => i.tone === "earth")) reasons.push("Природные оттенки");
  else reasons.push("Нейтральная база");
  const owned = items.filter((x) => x.owned);
  if (owned.length) reasons.push(`Ваши вещи: ${owned.map((x) => x.item.title.split(" ")[0].toLowerCase()).join(", ")}`);
  if (its.some((a) => its.some((b) => together.has(`${a.id}|${b.id}`)))) reasons.push("Часто покупают вместе");
  return reasons;
}

function finish(style: Style, mainId: string, items: LookItem[], ctx: StylistCtx, s: number, mode: LookMode, anchor?: string): Look {
  return {
    id: `${mode}:${mainId}:${style}:${items.map((x) => x.item.id).join("+")}`,
    style,
    title: STYLE_LABEL[style],
    items,
    reasons: describe(items, ctx, style, mode, anchor),
    score: s,
    mode,
    anchor,
  };
}

/** Стили образа по приоритету. «Для вас»: от самого близкого человеку. «Что-то новое»: на 2 шага от главного, затем дальше, затем на 1 шаг. */
function styleOrder(main: Item, ctx: StylistCtx, mode: LookMode): Style[] {
  const p = ctx.profile;
  if (!p) return [...main.styles];
  if (mode === "for-you") return [...main.styles].sort((a, b) => p.styles[b] - p.styles[a]);
  // сначала на 2 шага, затем на 1, затем на 3. Совсем противоположные (4 шага, деловой ↔ спорт) не берём
  const rank = (s: Style) => {
    const d = distance(s, p.main);
    return d === 2 ? 0 : d === 1 ? 1 : d === 3 ? 2 : d === 0 ? 4 : 5;
  };
  const sorted = [...main.styles].sort((a, b) => rank(a) - rank(b) || p.styles[a] - p.styles[b]);
  const usable = sorted.filter((s) => rank(s) < 5);
  return usable.length ? usable : sorted;
}

/** Несколько образов к вещи: по одному на стиль, лучшие сначала. */
export function buildLooks(mainId: string, ctx: StylistCtx): Look[] {
  const mode: LookMode = ctx.mode ?? "for-you";
  const looks = buildOnce(mainId, ctx, mode);
  if (mode !== "new") return looks;
  // «Что-то новое» должно заметно отличаться от «Для вас»: минимум две другие вещи
  const base = buildOnce(mainId, { ...ctx, mode: "for-you" }, "for-you")[0];
  if (!base) return looks;
  const baseIds = new Set(base.items.map((x) => x.item.id));
  const different = looks.filter((l) => l.items.filter((x) => !baseIds.has(x.item.id)).length >= 2);
  return different.length ? different : looks.slice(0, 1);
}

function buildOnce(mainId: string, ctx: StylistCtx, mode: LookMode): Look[] {
  const main = byId(mainId);
  if (main.gender && main.gender !== ctx.gender) return [];
  const used = new Map<Slot, Set<string>>();
  const looks: Look[] = [];

  // Первый проход: лучший образ в каждом стиле. Второй (если образов мало): другие вещи в тех же стилях.
  const styles = styleOrder(main, ctx, mode);
  const passes: { style: Style; penalty: number }[] = [
    ...styles.map((style) => ({ style, penalty: 1.5 })),
    ...styles.map((style) => ({ style, penalty: 8 })),
  ];
  for (const { style, penalty } of passes) {
    if (looks.length >= MAX_LOOKS) break;
    const items: Item[] = [main];
    let total = 0;
    let ok = true;
    const steps = plan(main);
    // якорь: последнее обязательное место (обычно обувь) остаётся привычным
    const anchorSlot = mode === "new" && ctx.profile ? [...steps].reverse().find((x) => x.required)?.slot : undefined;
    let anchor: string | undefined;
    for (const { slot, required } of steps) {
      // необязательную верхнюю одежду добавляем, только когда без неё холодно
      // в деловом образе пиджак обязателен по смыслу, поэтому добавляем его и летом
      if (!required && slot === "outer" && seasonsOf(items).includes("summer") && style !== "formal") continue;
      const best = ITEMS.filter((c) => c.slot === slot && c.id !== mainId && compatible([...items, c], ctx, style))
        .map((c) => ({ c, s: score(c, items, main, ctx, used, penalty, mode === "new" && slot !== anchorSlot ? "novel" : "normal") }))
        .sort((a, b) => b.s - a.s)[0];
      if (!best) {
        if (required) ok = false;
        continue;
      }
      items.push(best.c);
      total += best.s;
      if (slot === anchorSlot) anchor = best.c.id;
    }
    if (!ok) continue;
    const look = finish(
      style,
      mainId,
      items.map((i) => ({ slot: i.slot, item: i, owned: i.id !== mainId && ctx.owned.has(i.id) })),
      ctx,
      total + (seasonsOf(items).includes(ctx.now) ? 1 : 0),
      mode,
      anchor,
    );
    if (looks.some((l) => l.items.map((x) => x.item.id).sort().join() === look.items.map((x) => x.item.id).sort().join())) continue;
    looks.push(look);
    for (const i of items) {
      if (!used.has(i.slot)) used.set(i.slot, new Set());
      used.get(i.slot)!.add(i.id);
    }
  }
  // «Для вас»: лучшие по оценке первыми. «Что-то новое»: сохраняем порядок стилей (ближе к 2 шагам первыми)
  const top = (mode === "new" && ctx.profile ? looks : looks.sort((a, b) => b.score - a.score)).slice(0, MAX_LOOKS);
  // одинаковые стили различаем номером: «На каждый день», «На каждый день · 2»
  const seen = new Map<string, number>();
  for (const l of top) {
    const n = (seen.get(l.title) ?? 0) + 1;
    seen.set(l.title, n);
    if (n > 1) l.title = `${l.title} · ${n}`;
  }
  return top;
}

/** Чем заменить вещь в образе: сначала по стилю образа, затем всё, что не ломает жёсткие правила. */
export function alternatives(look: Look, slot: Slot, ctx: StylistCtx): Item[] {
  const main = look.items[0].item;
  const rest = look.items.filter((x) => x.slot !== slot).map((x) => x.item);
  const current = look.items.find((x) => x.slot === slot)?.item.id;
  const pool = ITEMS.filter((c) => c.slot === slot && c.id !== main.id && c.id !== current);
  const used = new Map<Slot, Set<string>>();
  const rank = (list: Item[]) => list.map((c) => ({ c, s: score(c, rest, main, ctx, used) })).sort((a, b) => b.s - a.s).map((x) => x.c);
  const strict = rank(pool.filter((c) => compatible([...rest, c], ctx, look.style)));
  const loose = rank(pool.filter((c) => !strict.includes(c) && compatible([...rest, c], ctx)));
  return [...strict, ...loose];
}

/** Применить правку к образу и пересчитать объяснения */
export function editLook(look: Look, slot: Slot, item: Item | null, ctx: StylistCtx): Look {
  const items = look.items.filter((x) => x.slot !== slot);
  if (item) items.push({ slot, item, owned: ctx.owned.has(item.id) });
  const order: Slot[] = [look.items[0].slot, "outer", "top", "dress", "bottom", "shoes", "bag", "hat"];
  items.sort((a, b) => (a.item.id === look.items[0].item.id ? -1 : b.item.id === look.items[0].item.id ? 1 : order.indexOf(a.slot) - order.indexOf(b.slot)));
  return { ...look, items, reasons: describe(items, ctx, look.style, look.mode, look.anchor) };
}

/** Какие места можно добавить в образ (и есть чем их заполнить) */
export function addableSlots(look: Look, ctx: StylistCtx): Slot[] {
  const have = new Set(look.items.map((x) => x.slot));
  if (have.has("dress")) have.add("top");
  return OPTIONAL_SLOTS.filter((s) => !have.has(s) && alternatives(look, s, ctx).length > 0);
}

/** Вещь, которую нейросеть надевает вторым слоем на фото: дополняющая основную по телу (верх ↔ низ). */
export function visualItem(look: Look): Item | undefined {
  const main = look.items[0].item;
  if (main.slot === "dress") return undefined;
  const want: Slot[] = main.slot === "bottom" ? ["top", "outer"] : ["bottom"];
  for (const w of want) {
    const x = look.items.find((i) => i.slot === w && i.item.tryOn);
    if (x) return x.item;
  }
  return undefined;
}
