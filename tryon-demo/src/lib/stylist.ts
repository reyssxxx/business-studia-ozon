// Стилист: подбор образов к вещи.
//
// Жёсткие правила (образ не показываем, если нарушено):
//   1. Сезон: у всех вещей должен быть общий сезон. Пуховик (зима) и шорты (лето) не встретятся.
//   2. Фигура: женские вещи не предлагаем к мужской фигуре и наоборот.
//   3. Цвет: не больше одного яркого акцента на образ. Нейтральные цвета сочетаются со всем.
//   4. Стиль: все вещи образа поддерживают его стиль (на каждый день, уличный, смарт-кэжуал, спорт).
//   5. Слоты: в образе по одной вещи на место (верх, низ, обувь...), платье заменяет верх и низ.
//
// Мягкая оценка (чем выше, тем раньше предложим):
//   часто покупают вместе, вещь уже есть в гардеробе, нейтральная база, рейтинг и отзывы,
//   цена не сильно выше основной вещи, сезон совпадает с текущим, разнообразие между образами.
import { BOUGHT_TOGETHER, ITEMS, SEASON_LABEL, STYLE_LABEL, byId, type Item, type Season, type Slot, type Style } from "../data/catalog";

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
}

export interface StylistCtx {
  gender: "m" | "f";
  /** id вещей из гардероба покупателя */
  owned: Set<string>;
  /** текущий сезон: образы под него поднимаем выше */
  now: Season;
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

function score(cand: Item, look: Item[], main: Item, ctx: StylistCtx, used: Map<Slot, Set<string>>, repeatPenalty = 1.5): number {
  let s = cand.rating * 0.4 + Math.log10(cand.reviews) * 0.3;
  if (look.some((i) => together.has(`${i.id}|${cand.id}`))) s += 2;
  const owned = ctx.owned.has(cand.id);
  if (owned) s += 3;
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

function describe(items: LookItem[], ctx: StylistCtx): string[] {
  const its = items.map((x) => x.item);
  const seasons = seasonsOf(its);
  const reasons: string[] = [];
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

function finish(style: Style, mainId: string, items: LookItem[], ctx: StylistCtx, s: number): Look {
  return {
    id: `${mainId}:${style}:${items.map((x) => x.item.id).join("+")}`,
    style,
    title: STYLE_LABEL[style],
    items,
    reasons: describe(items, ctx),
    score: s,
  };
}

/** Несколько образов к вещи: по одному на стиль, лучшие сначала. */
export function buildLooks(mainId: string, ctx: StylistCtx): Look[] {
  const main = byId(mainId);
  if (main.gender && main.gender !== ctx.gender) return [];
  const used = new Map<Slot, Set<string>>();
  const looks: Look[] = [];

  // Первый проход: лучший образ в каждом стиле. Второй (если образов мало): другие вещи в тех же стилях.
  const passes: { style: Style; penalty: number }[] = [
    ...main.styles.map((style) => ({ style, penalty: 1.5 })),
    ...main.styles.map((style) => ({ style, penalty: 8 })),
  ];
  for (const { style, penalty } of passes) {
    if (looks.length >= MAX_LOOKS) break;
    const items: Item[] = [main];
    let total = 0;
    let ok = true;
    for (const { slot, required } of plan(main)) {
      // необязательную верхнюю одежду добавляем, только когда без неё холодно
      if (!required && slot === "outer" && seasonsOf(items).includes("summer")) continue;
      const best = ITEMS.filter((c) => c.slot === slot && c.id !== mainId && compatible([...items, c], ctx, style))
        .map((c) => ({ c, s: score(c, items, main, ctx, used, penalty) }))
        .sort((a, b) => b.s - a.s)[0];
      if (!best) {
        if (required) ok = false;
        continue;
      }
      items.push(best.c);
      total += best.s;
    }
    if (!ok) continue;
    const look = finish(
      style,
      mainId,
      items.map((i) => ({ slot: i.slot, item: i, owned: i.id !== mainId && ctx.owned.has(i.id) })),
      ctx,
      total + (seasonsOf(items).includes(ctx.now) ? 1 : 0),
    );
    if (looks.some((l) => l.items.map((x) => x.item.id).sort().join() === look.items.map((x) => x.item.id).sort().join())) continue;
    looks.push(look);
    for (const i of items) {
      if (!used.has(i.slot)) used.set(i.slot, new Set());
      used.get(i.slot)!.add(i.id);
    }
  }
  const top = looks.sort((a, b) => b.score - a.score).slice(0, MAX_LOOKS);
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
  return { ...look, items, reasons: describe(items, ctx) };
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
