// Готовые покупатели для демо. Меняют историю покупок, а с ней профиль стиля и образы.
export interface Owned {
  id: string;
  /** order: из истории заказов; manual: покупатель отметил сам */
  source: "order" | "manual";
  /** сколько дней назад куплено: свежие покупки весят больше при расчёте профиля */
  daysAgo: number;
}

export type PersonaId = "casual" | "office" | "sport" | "new";

export interface Persona {
  id: PersonaId;
  label: string;
  hint: string;
  wardrobe: Owned[];
}

const o = (id: string, daysAgo: number): Owned => ({ id, source: "order", daysAgo });

export const PERSONAS: Persona[] = [
  { id: "casual", label: "Обычный", hint: "джинсы и кеды", wardrobe: [o("jeans", 40), o("sneakers", 80)] },
  { id: "office", label: "Офисный", hint: "рубашка, брюки, оксфорды", wardrobe: [o("dress-shirt", 12), o("trousers", 30), o("oxfords", 30), o("blazer", 75)] },
  { id: "sport", label: "Спортивный", hint: "джоггеры, худи, кроссовки", wardrobe: [o("joggers", 8), o("hoodie", 21), o("runners", 21), o("windbreaker", 50)] },
  { id: "new", label: "Новый", hint: "истории покупок нет", wardrobe: [] },
];

export const personaById = (id: PersonaId) => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];

export function dateLabel(daysAgo: number): string {
  if (daysAgo < 1) return "сегодня";
  if (daysAgo < 14) return `${Math.round(daysAgo)} дн. назад`;
  if (daysAgo < 60) return `${Math.round(daysAgo / 7)} нед. назад`;
  return `${Math.round(daysAgo / 30)} мес. назад`;
}
