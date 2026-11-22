// Каталог демо. Средняя цена около 3 500 ₽, как в финмодели.
// У каждой вещи есть атрибуты для подбора образа: слот, сезоны, стили, цвет.
// В проде эти атрибуты берутся из карточки продавца и дополняются моделью по фото.

export type TryOnCategory = "tops" | "bottoms" | "one-pieces";
/** Место вещи в образе */
export type Slot = "outer" | "top" | "bottom" | "dress" | "shoes" | "bag" | "hat";
/** summer: лето, mid: демисезон (весна, осень), winter: зима */
export type Season = "summer" | "mid" | "winter";
export type Style = "casual" | "street" | "smart" | "sport";
/** neutral: база, сочетается со всем; earth: природные оттенки, спокойно сочетаются между собой; accent: яркий акцент, в образе не больше одного */
export type Tone = "neutral" | "earth" | "accent";

export interface Item {
  id: string;
  title: string;
  brand: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  /** отдельное фото вещи для нейросети (ровная раскладка на белом). Если нет, берём image */
  garment?: string;
  /** короткое описание по-английски для модели примерки */
  en: string;
  /** "f"/"m": вещь для одной фигуры. Нет: унисекс */
  gender?: "f" | "m";
  /** null: вещь нельзя примерить (обувь, аксессуары) */
  tryOn: TryOnCategory | null;
  slot: Slot;
  seasons: Season[];
  styles: Style[];
  tone: Tone;
  /** цвет для кружка в интерфейсе */
  hex: string;
  sizes: string[];
  fit: "regular" | "oversize" | "slim";
  color: string;
  material: string;
}

import { garmentImage } from "./assets";
const img = (id: string) => garmentImage(id).url;
const CLOTHES = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOES = ["37", "38", "39", "40", "41", "42", "43", "44"];
const ONE = ["One size"];
const ALL: Season[] = ["summer", "mid", "winter"];

type Base = Omit<Item, "image">;
const RAW: Base[] = [
  // верхняя одежда
  { id: "bomber", en: "olive bomber jacket", title: "Куртка-бомбер утеплённая", brand: "Nordline", price: 5990, oldPrice: 7490, rating: 4.8, reviews: 1243, tryOn: "tops", slot: "outer", seasons: ["mid"], styles: ["casual", "street"], tone: "earth", hex: "#6b7040", sizes: CLOTHES, fit: "regular", color: "Оливковый", material: "Нейлон, синтепон" },
  { id: "puffer", en: "black short puffer jacket", title: "Пуховик короткий", brand: "Nordline", price: 8990, oldPrice: 11990, rating: 4.8, reviews: 2087, tryOn: "tops", slot: "outer", seasons: ["winter"], styles: ["casual", "street"], tone: "neutral", hex: "#1d1d1f", sizes: CLOTHES, fit: "regular", color: "Чёрный", material: "Полиэстер, пух 80%" },
  { id: "coat", en: "grey wool straight coat", title: "Пальто шерстяное прямое", brand: "Mellow", price: 9490, rating: 4.7, reviews: 689, tryOn: "tops", slot: "outer", seasons: ["mid", "winter"], styles: ["smart", "casual"], tone: "neutral", hex: "#8a8d91", sizes: CLOTHES, fit: "regular", color: "Серый", material: "Шерсть 60%, полиэстер 40%" },
  // верх
  { id: "tee", en: "plain white crew neck t-shirt", title: "Футболка базовая", brand: "Mellow", price: 1290, rating: 4.8, reviews: 5320, tryOn: "tops", slot: "top", seasons: ["summer", "mid"], styles: ["casual", "street", "sport", "smart"], tone: "neutral", hex: "#f4f4f2", sizes: CLOTHES, fit: "regular", color: "Белый", material: "Хлопок 100%" },
  { id: "hoodie", en: "grey oversized hoodie", title: "Худи оверсайз с капюшоном", brand: "Urban Fox", price: 3490, rating: 4.7, reviews: 3120, tryOn: "tops", slot: "top", seasons: ["mid", "winter"], styles: ["street", "sport", "casual"], tone: "neutral", hex: "#a4a7ab", sizes: CLOTHES, fit: "oversize", color: "Серый меланж", material: "Хлопок 80%, полиэстер 20%" },
  { id: "sweatshirt", en: "cream crewneck sweatshirt", title: "Свитшот базовый", brand: "Mellow", price: 2790, oldPrice: 3290, rating: 4.9, reviews: 2210, tryOn: "tops", slot: "top", seasons: ["mid", "winter"], styles: ["casual", "street", "sport"], tone: "neutral", hex: "#ece3d0", sizes: CLOTHES, fit: "regular", color: "Молочный", material: "Хлопок 100%, футер" },
  { id: "shirt", en: "red plaid flannel shirt", title: "Рубашка фланелевая в клетку", brand: "Nordline", price: 2990, rating: 4.6, reviews: 874, tryOn: "tops", slot: "top", seasons: ["mid", "winter"], styles: ["casual"], tone: "accent", hex: "#b23a32", sizes: CLOTHES, fit: "regular", color: "Красный", material: "Хлопок 100%" },
  { id: "knit", en: "brown chunky knit wool sweater", title: "Свитер вязаный", brand: "Mellow", price: 3990, rating: 4.8, reviews: 1156, tryOn: "tops", slot: "top", seasons: ["mid", "winter"], styles: ["casual", "smart"], tone: "earth", hex: "#7a5a43", sizes: CLOTHES, fit: "regular", color: "Кофейный", material: "Шерсть 30%, акрил 70%" },
  // платье
  { id: "dress", gender: "f", en: "navy midi shirt dress", title: "Платье-рубашка миди", brand: "Mellow", price: 4290, rating: 4.7, reviews: 615, tryOn: "one-pieces", slot: "dress", seasons: ["summer", "mid"], styles: ["casual", "smart"], tone: "neutral", hex: "#26345a", sizes: CLOTHES.slice(0, 5), fit: "regular", color: "Тёмно-синий", material: "Вискоза" },
  // низ
  { id: "jeans", en: "blue straight jeans", title: "Джинсы прямые", brand: "Urban Fox", price: 3990, rating: 4.6, reviews: 4012, tryOn: "bottoms", slot: "bottom", seasons: ALL, styles: ["casual", "street", "smart"], tone: "neutral", hex: "#3f5f8c", sizes: CLOTHES, fit: "regular", color: "Синий деним", material: "Хлопок 98%, эластан 2%" },
  { id: "chinos", en: "navy slim chino trousers", title: "Брюки чинос", brand: "Mellow", price: 3290, rating: 4.7, reviews: 1477, tryOn: "bottoms", slot: "bottom", seasons: ALL, styles: ["smart", "casual"], tone: "neutral", hex: "#28324a", sizes: CLOTHES, fit: "slim", color: "Тёмно-синий", material: "Хлопок 97%, эластан 3%" },
  { id: "cargo", en: "beige cargo pants", title: "Брюки карго свободные", brand: "Nordline", price: 3490, rating: 4.5, reviews: 932, tryOn: "bottoms", slot: "bottom", seasons: ["summer", "mid"], styles: ["street", "casual"], tone: "earth", hex: "#c7b391", sizes: CLOTHES, fit: "oversize", color: "Бежевый", material: "Хлопок 100%" },
  { id: "shorts", en: "sand linen shorts", title: "Шорты льняные", brand: "Mellow", price: 2290, rating: 4.6, reviews: 803, tryOn: "bottoms", slot: "bottom", seasons: ["summer"], styles: ["casual", "street"], tone: "earth", hex: "#d6c4a2", sizes: CLOTHES, fit: "regular", color: "Песочный", material: "Лён 55%, хлопок 45%" },
  { id: "skirt", gender: "f", en: "pink pleated midi skirt", title: "Юбка плиссе миди", brand: "Mellow", price: 2990, rating: 4.8, reviews: 507, tryOn: "bottoms", slot: "bottom", seasons: ["summer", "mid"], styles: ["casual", "smart"], tone: "accent", hex: "#d9a7b7", sizes: CLOTHES.slice(0, 5), fit: "regular", color: "Пудровый", material: "Полиэстер" },
  // обувь
  { id: "sneakers", en: "white leather sneakers", title: "Кеды кожаные", brand: "Urban Fox", price: 4490, rating: 4.7, reviews: 1890, tryOn: null, slot: "shoes", seasons: ["summer", "mid"], styles: ["casual", "street", "sport", "smart"], tone: "neutral", hex: "#f5f5f5", sizes: SHOES, fit: "regular", color: "Белый", material: "Натуральная кожа" },
  { id: "boots", en: "black leather chelsea boots", title: "Ботинки челси", brand: "Nordline", price: 6490, rating: 4.8, reviews: 1325, tryOn: null, slot: "shoes", seasons: ["mid", "winter"], styles: ["casual", "smart", "street"], tone: "neutral", hex: "#1c1a19", sizes: SHOES, fit: "regular", color: "Чёрный", material: "Натуральная кожа" },
  // аксессуары
  { id: "backpack", en: "black backpack", title: "Рюкзак городской 20 л", brand: "Nordline", price: 2490, rating: 4.8, reviews: 1402, tryOn: null, slot: "bag", seasons: ALL, styles: ["casual", "street", "sport"], tone: "neutral", hex: "#202020", sizes: ONE, fit: "regular", color: "Чёрный", material: "Полиэстер" },
  { id: "cap", en: "orange baseball cap", title: "Кепка бейсбольная", brand: "Urban Fox", price: 1290, rating: 4.6, reviews: 388, tryOn: null, slot: "hat", seasons: ["summer", "mid"], styles: ["street", "sport"], tone: "accent", hex: "#ff6a2b", sizes: ONE, fit: "regular", color: "Оранжевый", material: "Хлопок" },
];

export const ITEMS: Item[] = RAW.map((r) => ({ ...r, image: img(r.id) }));

export const byId = (id: string) => ITEMS.find((i) => i.id === id)!;

/** Вещи, которые часто покупают вместе. В проде это граф совместных покупок, здесь ручная выборка. */
export const BOUGHT_TOGETHER: [string, string][] = [
  ["bomber", "jeans"],
  ["bomber", "sneakers"],
  ["hoodie", "cargo"],
  ["hoodie", "sneakers"],
  ["sweatshirt", "jeans"],
  ["shirt", "jeans"],
  ["knit", "chinos"],
  ["coat", "chinos"],
  ["coat", "boots"],
  ["puffer", "jeans"],
  ["puffer", "boots"],
  ["tee", "shorts"],
  ["tee", "jeans"],
  ["dress", "sneakers"],
  ["skirt", "sweatshirt"],
];

export const SLOT_LABEL: Record<Slot, string> = {
  outer: "Верхняя одежда",
  top: "Верх",
  bottom: "Низ",
  dress: "Платье",
  shoes: "Обувь",
  bag: "Сумка",
  hat: "Головной убор",
};

export const SEASON_LABEL: Record<Season, string> = { summer: "Лето", mid: "Демисезон", winter: "Зима" };
export const STYLE_LABEL: Record<Style, string> = { casual: "На каждый день", street: "Уличный", smart: "Смарт-кэжуал", sport: "Спортивный" };
