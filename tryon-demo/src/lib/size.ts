// Рекомендация размера: простое правило по размерной сетке, без ML.
// Обхваты груди и бёдер оцениваем по росту и весу, дальше смотрим в сетку.
// Это грубая оценка для MVP: в проде её заменяют сетка продавца и история покупок и возвратов.
import type { Item } from "../data/catalog";
import { avatarImage } from "../data/assets";

export type Gender = "m" | "f";
export interface Body {
  height: number; // см
  weight: number; // кг
  gender: Gender;
}

const CHART: { size: string; max: number }[] = [
  { size: "XS", max: 86 },
  { size: "S", max: 92 },
  { size: "M", max: 98 },
  { size: "L", max: 104 },
  { size: "XL", max: 110 },
  { size: "XXL", max: 999 },
];

export function chestEstimate(b: Body): number {
  return b.gender === "m" ? 0.5 * b.weight + 0.2 * b.height + 28 : 0.5 * b.weight + 0.15 * b.height + 33;
}

const HIP_CHART: { size: string; max: number }[] = [
  { size: "XS", max: 90 },
  { size: "S", max: 96 },
  { size: "M", max: 102 },
  { size: "L", max: 108 },
  { size: "XL", max: 114 },
  { size: "XXL", max: 999 },
];

export function hipEstimate(b: Body): number {
  return b.gender === "m" ? 0.45 * b.weight + 0.2 * b.height + 31 : 0.5 * b.weight + 0.2 * b.height + 31;
}

export interface SizeAdvice {
  size: string;
  note: string;
}

export function recommendSize(item: Item, body: Body): SizeAdvice | null {
  if (item.sizes.length <= 1) return null;
  if (item.sizes[0] !== "XS") return null; // обувь: размер выбирает покупатель

  // Верх и платья подбираем по обхвату груди, низ по обхвату бёдер
  const bottoms = item.tryOn === "bottoms";
  const chart = bottoms ? HIP_CHART : CHART;
  const girth = bottoms ? hipEstimate(body) : chestEstimate(body);
  let idx = chart.findIndex((r) => girth <= r.max);
  const row = chart[idx];
  const prevMax = idx > 0 ? chart[idx - 1].max : chart[0].max - 6;
  const pos = (girth - prevMax) / (row.max - prevMax); // 0..1 внутри размера

  let note: string;
  if (item.fit === "oversize") {
    note = "Модель оверсайз: сядет свободно, так и задумано";
  } else if (pos > 0.8 && idx < chart.length - 1) {
    note = `Сядет по фигуре. Любите свободнее, берите ${chart[idx + 1].size}`;
  } else if (pos < 0.2) {
    note = bottoms ? "Сядет немного свободно в бёдрах" : "Сядет немного свободно в плечах";
  } else {
    note = "Сядет точно по размеру";
  }
  idx = Math.min(idx, item.sizes.length - 1);
  return { size: item.sizes[idx], note };
}

/** Аватар для режима «по росту и весу» */
export function avatarFor(b: Body): string {
  const h = b.height < 168 ? 0 : b.height <= 180 ? 1 : 2;
  const bmi = b.weight / (b.height / 100) ** 2;
  const k = bmi < 21 ? 0 : bmi <= 26 ? 1 : 2;
  return avatarImage(b.gender, h, k).url;
}
