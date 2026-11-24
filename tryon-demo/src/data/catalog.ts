// Каталог демо. Средняя цена около 3 500 ₽, как в финмодели.
// У каждой вещи есть атрибуты для подбора образа: слот, сезоны, стили, цвет.
// В проде эти атрибуты берутся из карточки продавца и дополняются моделью по фото.

export type TryOnCategory = "tops" | "bottoms" | "one-pieces";
/** Место вещи в образе */
export type Slot = "outer" | "top" | "bottom" | "dress" | "shoes" | "bag" | "hat";
/** summer: лето, mid: демисезон (весна, осень), winter: зима */
export type Season = "summer" | "mid" | "winter";
export type Style = "formal" | "smart" | "casual" | "street" | "sport";
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
  { id: "blazer", en: "navy single-breasted wool blazer", title: "Пиджак классический", brand: "Mellow", price: 7990, oldPrice: 9990, rating: 4.7, reviews: 912, tryOn: "tops", slot: "outer", seasons: ALL, styles: ["formal", "smart"], tone: "neutral", hex: "#25304d", sizes: CLOTHES, fit: "slim", color: "Тёмно-синий", material: "Шерсть 70%, полиэстер 30%" },
  { id: "trench", en: "beige double-breasted trench coat", title: "Тренч классический", brand: "Mellow", price: 8490, rating: 4.8, reviews: 744, tryOn: "tops", slot: "outer", seasons: ["mid"], styles: ["formal", "smart", "casual"], tone: "earth", hex: "#c9ad85", sizes: CLOTHES, fit: "regular", color: "Бежевый", material: "Хлопок 65%, полиэстер 35%" },
  { id: "windbreaker", en: "cobalt blue lightweight windbreaker jacket", title: "Ветровка спортивная", brand: "Urban Fox", price: 3990, rating: 4.6, reviews: 1388, tryOn: "tops", slot: "outer", seasons: ["summer", "mid"], styles: ["sport", "street"], tone: "accent", hex: "#2456d6", sizes: CLOTHES, fit: "regular", color: "Синий кобальт", material: "Полиэстер 100%" },
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
  { id: "dress-shirt", en: "white classic cotton dress shirt with long sleeves", title: "Рубашка классическая белая", brand: "Nordline", price: 2790, rating: 4.8, reviews: 3640, tryOn: "tops", slot: "top", seasons: ALL, styles: ["formal", "smart"], tone: "neutral", hex: "#fafafa", sizes: CLOTHES, fit: "slim", color: "Белый", material: "Хлопок 100%" },
  { id: "oxford-shirt", en: "light blue oxford button-down shirt", title: "Рубашка оксфорд", brand: "Nordline", price: 2990, rating: 4.7, reviews: 1205, tryOn: "tops", slot: "top", seasons: ALL, styles: ["smart", "casual"], tone: "neutral", hex: "#b9cde6", sizes: CLOTHES, fit: "regular", color: "Голубой", material: "Хлопок 100%" },
  { id: "blouse", gender: "f", en: "cream silk blouse with long sleeves", title: "Блузка шёлковая", brand: "Mellow", price: 3490, rating: 4.7, reviews: 830, tryOn: "tops", slot: "top", seasons: ["summer", "mid"], styles: ["formal", "smart"], tone: "neutral", hex: "#efe5d2", sizes: CLOTHES.slice(0, 5), fit: "regular", color: "Кремовый", material: "Вискоза 100%" },
  { id: "linen-shirt", en: "white relaxed linen shirt with short sleeves", title: "Рубашка льняная", brand: "Mellow", price: 2590, rating: 4.6, reviews: 642, tryOn: "tops", slot: "top", seasons: ["summer"], styles: ["casual", "smart"], tone: "neutral", hex: "#f2efe6", sizes: CLOTHES, fit: "oversize", color: "Белый", material: "Лён 100%" },
  { id: "sport-top", gender: "f", en: "black fitted sports crop top", title: "Топ спортивный", brand: "Urban Fox", price: 1790, rating: 4.7, reviews: 2210, tryOn: "tops", slot: "top", seasons: ["summer", "mid"], styles: ["sport"], tone: "neutral", hex: "#1b1b1d", sizes: CLOTHES.slice(0, 5), fit: "slim", color: "Чёрный", material: "Полиамид 80%, эластан 20%" },
  // платье
  { id: "dress", gender: "f", en: "navy midi shirt dress", title: "Платье-рубашка миди", brand: "Mellow", price: 4290, rating: 4.7, reviews: 615, tryOn: "one-pieces", slot: "dress", seasons: ["summer", "mid"], styles: ["casual", "smart"], tone: "neutral", hex: "#26345a", sizes: CLOTHES.slice(0, 5), fit: "regular", color: "Тёмно-синий", material: "Вискоза" },
  { id: "sheath-dress", gender: "f", en: "black knee-length sheath dress", title: "Платье-футляр", brand: "Mellow", price: 4990, rating: 4.8, reviews: 1094, tryOn: "one-pieces", slot: "dress", seasons: ALL, styles: ["formal", "smart"], tone: "neutral", hex: "#18181a", sizes: CLOTHES.slice(0, 5), fit: "slim", color: "Чёрный", material: "Полиэстер 70%, вискоза 25%, эластан 5%" },
  // низ
  { id: "jeans", en: "blue straight jeans", title: "Джинсы прямые", brand: "Urban Fox", price: 3990, rating: 4.6, reviews: 4012, tryOn: "bottoms", slot: "bottom", seasons: ALL, styles: ["casual", "street", "smart"], tone: "neutral", hex: "#3f5f8c", sizes: CLOTHES, fit: "regular", color: "Синий деним", material: "Хлопок 98%, эластан 2%" },
  { id: "chinos", en: "navy slim chino trousers", title: "Брюки чинос", brand: "Mellow", price: 3290, rating: 4.7, reviews: 1477, tryOn: "bottoms", slot: "bottom", seasons: ALL, styles: ["smart", "casual"], tone: "neutral", hex: "#28324a", sizes: CLOTHES, fit: "slim", color: "Тёмно-синий", material: "Хлопок 97%, эластан 3%" },
  { id: "cargo", en: "beige cargo pants", title: "Брюки карго свободные", brand: "Nordline", price: 3490, rating: 4.5, reviews: 932, tryOn: "bottoms", slot: "bottom", seasons: ["summer", "mid"], styles: ["street", "casual"], tone: "earth", hex: "#c7b391", sizes: CLOTHES, fit: "oversize", color: "Бежевый", material: "Хлопок 100%" },
  { id: "shorts", en: "sand linen shorts", title: "Шорты льняные", brand: "Mellow", price: 2290, rating: 4.6, reviews: 803, tryOn: "bottoms", slot: "bottom", seasons: ["summer"], styles: ["casual", "street"], tone: "earth", hex: "#d6c4a2", sizes: CLOTHES, fit: "regular", color: "Песочный", material: "Лён 55%, хлопок 45%" },
  { id: "skirt", gender: "f", en: "pink pleated midi skirt", title: "Юбка плиссе миди", brand: "Mellow", price: 2990, rating: 4.8, reviews: 507, tryOn: "bottoms", slot: "bottom", seasons: ["summer", "mid"], styles: ["casual", "smart"], tone: "accent", hex: "#d9a7b7", sizes: CLOTHES.slice(0, 5), fit: "regular", color: "Пудровый", material: "Полиэстер" },
  { id: "trousers", en: "grey wool classic straight trousers", title: "Брюки классические", brand: "Nordline", price: 4290, rating: 4.7, reviews: 1563, tryOn: "bottoms", slot: "bottom", seasons: ALL, styles: ["formal", "smart"], tone: "neutral", hex: "#6f7377", sizes: CLOTHES, fit: "regular", color: "Серый", material: "Шерсть 50%, полиэстер 50%" },
  { id: "pencil-skirt", gender: "f", en: "grey knee-length pencil skirt", title: "Юбка-карандаш", brand: "Mellow", price: 2990, rating: 4.7, reviews: 688, tryOn: "bottoms", slot: "bottom", seasons: ALL, styles: ["formal", "smart"], tone: "neutral", hex: "#77797d", sizes: CLOTHES.slice(0, 5), fit: "slim", color: "Серый", material: "Полиэстер 65%, вискоза 30%, эластан 5%" },
  { id: "joggers", en: "heather grey cotton jogger sweatpants", title: "Брюки джоггеры", brand: "Urban Fox", price: 2790, rating: 4.7, reviews: 2970, tryOn: "bottoms", slot: "bottom", seasons: ["mid", "winter"], styles: ["sport", "street", "casual"], tone: "neutral", hex: "#9fa2a6", sizes: CLOTHES, fit: "regular", color: "Серый меланж", material: "Хлопок 80%, полиэстер 20%" },
  { id: "leggings", gender: "f", en: "black high-waist sport leggings", title: "Леггинсы спортивные", brand: "Urban Fox", price: 2290, rating: 4.8, reviews: 4120, tryOn: "bottoms", slot: "bottom", seasons: ALL, styles: ["sport"], tone: "neutral", hex: "#151517", sizes: CLOTHES.slice(0, 5), fit: "slim", color: "Чёрный", material: "Полиамид 75%, эластан 25%" },
  // обувь
  { id: "sneakers", en: "white leather sneakers", title: "Кеды кожаные", brand: "Urban Fox", price: 4490, rating: 4.7, reviews: 1890, tryOn: null, slot: "shoes", seasons: ["summer", "mid"], styles: ["casual", "street", "sport", "smart"], tone: "neutral", hex: "#f5f5f5", sizes: SHOES, fit: "regular", color: "Белый", material: "Натуральная кожа" },
  { id: "boots", en: "black leather chelsea boots", title: "Ботинки челси", brand: "Nordline", price: 6490, rating: 4.8, reviews: 1325, tryOn: null, slot: "shoes", seasons: ["mid", "winter"], styles: ["casual", "smart", "street"], tone: "neutral", hex: "#1c1a19", sizes: SHOES, fit: "regular", color: "Чёрный", material: "Натуральная кожа" },
  { id: "oxfords", en: "black polished leather oxford shoes", title: "Туфли оксфорды", brand: "Nordline", price: 7490, rating: 4.8, reviews: 806, tryOn: null, slot: "shoes", seasons: ALL, styles: ["formal", "smart"], tone: "neutral", hex: "#151312", sizes: SHOES, fit: "regular", color: "Чёрный", material: "Натуральная кожа" },
  { id: "loafers", en: "brown suede penny loafers", title: "Лоферы замшевые", brand: "Nordline", price: 5990, rating: 4.7, reviews: 597, tryOn: null, slot: "shoes", seasons: ["summer", "mid"], styles: ["smart", "casual"], tone: "earth", hex: "#7b5434", sizes: SHOES, fit: "regular", color: "Коричневый", material: "Натуральная замша" },
  { id: "pumps", gender: "f", en: "black leather pointed-toe pumps", title: "Туфли-лодочки", brand: "Mellow", price: 5490, rating: 4.6, reviews: 932, tryOn: null, slot: "shoes", seasons: ["summer", "mid"], styles: ["formal", "smart"], tone: "neutral", hex: "#141414", sizes: SHOES.slice(0, 6), fit: "regular", color: "Чёрный", material: "Натуральная кожа" },
  { id: "runners", en: "grey and white mesh running shoes", title: "Кроссовки беговые", brand: "Urban Fox", price: 6990, rating: 4.8, reviews: 3410, tryOn: null, slot: "shoes", seasons: ["summer", "mid"], styles: ["sport", "street"], tone: "neutral", hex: "#c9ccd0", sizes: SHOES, fit: "regular", color: "Серый", material: "Текстиль, синтетика" },
  { id: "sandals", en: "tan leather flat sandals", title: "Сандалии кожаные", brand: "Mellow", price: 3290, rating: 4.6, reviews: 712, tryOn: null, slot: "shoes", seasons: ["summer"], styles: ["casual", "street"], tone: "earth", hex: "#b07a4c", sizes: SHOES, fit: "regular", color: "Коньячный", material: "Натуральная кожа" },
  // аксессуары
  { id: "backpack", en: "black backpack", title: "Рюкзак городской 20 л", brand: "Nordline", price: 2490, rating: 4.8, reviews: 1402, tryOn: null, slot: "bag", seasons: ALL, styles: ["casual", "street", "sport"], tone: "neutral", hex: "#202020", sizes: ONE, fit: "regular", color: "Чёрный", material: "Полиэстер" },
  { id: "cap", en: "orange baseball cap", title: "Кепка бейсбольная", brand: "Urban Fox", price: 1290, rating: 4.6, reviews: 388, tryOn: null, slot: "hat", seasons: ["summer", "mid"], styles: ["street", "sport"], tone: "accent", hex: "#ff6a2b", sizes: ONE, fit: "regular", color: "Оранжевый", material: "Хлопок" },
  { id: "tote", en: "black structured leather tote bag", title: "Сумка-тоут кожаная", brand: "Mellow", price: 5490, rating: 4.8, reviews: 1022, tryOn: null, slot: "bag", seasons: ALL, styles: ["formal", "smart", "casual"], tone: "neutral", hex: "#1a1a1a", sizes: ONE, fit: "regular", color: "Чёрный", material: "Натуральная кожа" },
  { id: "beanie", en: "charcoal ribbed knit beanie hat", title: "Шапка вязаная", brand: "Urban Fox", price: 1190, rating: 4.7, reviews: 1650, tryOn: null, slot: "hat", seasons: ["mid", "winter"], styles: ["street", "casual", "sport"], tone: "neutral", hex: "#3b3d40", sizes: ONE, fit: "regular", color: "Графитовый", material: "Акрил 70%, шерсть 30%" },
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
  ["blazer", "dress-shirt"],
  ["blazer", "trousers"],
  ["dress-shirt", "trousers"],
  ["trousers", "oxfords"],
  ["sheath-dress", "pumps"],
  ["blouse", "pencil-skirt"],
  ["pencil-skirt", "pumps"],
  ["trench", "trousers"],
  ["oxford-shirt", "chinos"],
  ["chinos", "loafers"],
  ["joggers", "hoodie"],
  ["joggers", "runners"],
  ["leggings", "sport-top"],
  ["leggings", "runners"],
  ["windbreaker", "joggers"],
  ["linen-shirt", "shorts"],
  ["shorts", "sandals"],
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
export const STYLE_LABEL: Record<Style, string> = { formal: "Деловой", smart: "Смарт-кэжуал", casual: "На каждый день", street: "Уличный", sport: "Спортивный" };
