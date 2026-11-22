import { useState } from "react";
import { byId, ITEMS, type Item } from "../data/catalog";
import { useStore } from "../store";
import { Button, cardPrice, Icon, Price, Rating, rub, Sparkle, TryBadge } from "../components/ui";
import { track } from "../lib/analytics";

const FILTERS = [
  { id: "all", label: "Все" },
  { id: "try", label: "Можно примерить", ai: true },
  { id: "tops", label: "Верхняя одежда и кофты" },
  { id: "bottoms", label: "Брюки и юбки" },
  { id: "acc", label: "Обувь и аксессуары" },
];

const CIRCLES = [
  { label: "Примерка", f: "try", item: "bomber", ai: true },
  { label: "Куртки и худи", f: "tops", item: "hoodie" },
  { label: "Брюки и юбки", f: "bottoms", item: "jeans" },
  { label: "Платья", f: "tops", item: "dress" },
  { label: "Обувь", f: "acc", item: "sneakers" },
  { label: "Аксессуары", f: "acc", item: "backpack" },
];

function match(i: Item, f: string) {
  if (f === "all") return true;
  if (f === "try") return !!i.tryOn;
  if (f === "tops") return i.tryOn === "tops" || i.tryOn === "one-pieces";
  if (f === "bottoms") return i.tryOn === "bottoms";
  return !i.tryOn;
}

export function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const { favs, toggleFav, addToCart, showToast, person, results, go } = useStore();
  const fav = favs.includes(item.id);
  const tried = results[item.id];
  return (
    <div className="rise flex flex-col">
      <div className="relative">
        <button onClick={onClick} className="block aspect-[3/4] w-full overflow-hidden rounded-xl bg-bg2 text-left">
          <img src={tried ?? item.image} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        </button>
        {item.tryOn && (
          // Фото уже есть: примерка в одно касание. Нет: ведём в карточку, где спросим фото и согласие.
          <button
            onClick={() => {
              onClick();
              if (person || tried) go({ name: "result", id: item.id });
            }}
            className="absolute bottom-2 left-2"
          >
            {tried ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green px-2 py-[3px] text-[11px] font-semibold text-white shadow-sm">{Icon.check(10)} На вас</span>
            ) : (
              <TryBadge small />
            )}
          </button>
        )}
        <button
          onClick={() => toggleFav(item.id)}
          aria-label="В избранное"
          className={`absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/70 backdrop-blur ${fav ? "text-red" : "text-ink2"}`}
        >
          {Icon.heart(20, fav)}
        </button>
      </div>
      <button onClick={onClick} className="mt-2 text-left">
        <Price price={item.price} old={item.oldPrice} />
        <div className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink">
          <span className="font-semibold">{item.brand}</span> / {item.title}
        </div>
        <div className="mt-1">
          <Rating rating={item.rating} reviews={item.reviews} small />
        </div>
      </button>
      <Button
        size="sm"
        className="mt-2 w-full"
        onClick={() => {
          if (item.sizes.length > 1) {
            onClick();
            return;
          }
          addToCart({ id: item.id, size: item.sizes[0], source: "product" });
          showToast("Товар в корзине");
        }}
      >
        {item.sizes.length > 1 ? "Завтра" : "В корзину"}
      </Button>
    </div>
  );
}

export default function Catalog() {
  const { go, results, wardrobe } = useStore();
  const [f, setF] = useState("all");
  const triedIds = Object.keys(results);
  return (
    <div className="pb-6">
      <div className="sticky top-0 z-20 bg-white px-3 pt-3 pb-2">
        <div className="flex h-11 items-center gap-2 rounded-xl border-2 border-blue px-3 text-[15px] text-mute">
          {Icon.search()}
          <span className="flex-1">Искать на Ozon</span>
          <span className="text-blue">{Icon.camera()}</span>
        </div>
      </div>

      <button className="flex w-full items-center gap-1.5 px-3 pb-2 text-left text-[13px] text-ink2">
        <span className="text-blue">{Icon.pin(16)}</span>
        <span className="truncate">Пункт выдачи · Москва, ул. Льва Толстого, 16</span>
        <span className="text-mute">{Icon.chevron(14)}</span>
      </button>

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-3 pb-3">
        {CIRCLES.map((c) => (
          <button key={c.label} onClick={() => setF(c.f)} className="flex w-[64px] shrink-0 flex-col items-center gap-1">
            <div className={`h-[60px] w-[60px] overflow-hidden rounded-full p-[2px] ${c.ai ? "ai-grad" : "bg-line"}`}>
              <div className="h-full w-full overflow-hidden rounded-full border-2 border-white bg-bg2">
                <img src={byId(c.item).image} alt="" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className={`text-center text-[11px] leading-tight ${c.ai ? "font-semibold text-ai" : "text-ink2"}`}>{c.label}</div>
          </button>
        ))}
      </div>

      {triedIds.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 px-3 text-[17px] font-bold">
            <span className="text-ai"><Sparkle size={15} /></span> Ваша примерочная
          </div>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-3">
            {triedIds.map((tid) => (
              <button
                key={tid}
                onClick={() => {
                  go({ name: "product", id: tid });
                  go({ name: "result", id: tid });
                }}
                className="w-[92px] shrink-0 text-left"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-xl bg-bg2 ring-2 ring-ai/30">
                  <img src={results[tid]} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="mt-1 truncate text-[12px] text-ink2">{byId(tid).title}</div>
                <div className="text-[13px] font-bold text-green">{rub(cardPrice(byId(tid).price))}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => go({ name: "wardrobe" })} className="mx-3 mb-3 flex w-[calc(100%-24px)] items-center gap-3 rounded-2xl border border-line p-2.5 text-left">
        <span className="flex -space-x-2">
          {wardrobe.slice(0, 3).map((w) => (
            <span key={w.id} className="h-10 w-8 overflow-hidden rounded-md border-2 border-white bg-bg2">
              <img src={byId(w.id).image} alt="" className="h-full w-full object-cover" />
            </span>
          ))}
        </span>
        <span className="flex-1 text-[14px] leading-tight">
          <span className="block font-semibold">Мой гардероб · {wardrobe.length}</span>
          <span className="text-[12px] text-mute">Подбираем образы с вашими вещами</span>
        </span>
        <span className="text-mute">{Icon.chevron(16)}</span>
      </button>

      {/* баннер знакомит с функцией; после первой примерки его место занимает «Ваша примерочная» */}
      {triedIds.length === 0 && (
        <div className="px-3">
          <div className="ai-grad relative overflow-hidden rounded-2xl p-4 text-white">
            <div className="shine absolute inset-0" />
            <div className="absolute -right-6 -bottom-10 h-36 w-36 rounded-full bg-white/15" />
            <div className="absolute right-6 -top-8 h-20 w-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold backdrop-blur">
                <Sparkle size={12} /> Новое в приложении
              </div>
              <div className="mt-2.5 text-[22px] leading-tight font-bold">Примерьте одежду на себе до покупки</div>
              <div className="mt-1.5 text-[14px] text-white/85">По фото или по росту и весу. Подскажем размер и соберём образ.</div>
            </div>
          </div>
        </div>
      )}

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-3">
        {FILTERS.map((x) => (
          <button
            key={x.id}
            onClick={() => setF(x.id)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium transition ${
              f === x.id ? (x.ai ? "ai-grad text-white" : "bg-ink text-white") : x.ai ? "bg-ai-soft text-ai" : "bg-bg2 text-ink"
            }`}
          >
            {x.ai && <Sparkle size={12} />}
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-4 px-3 text-[20px] font-bold">{f === "try" ? "Можно примерить на себе" : "Рекомендуем вам"}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-5 px-3">
        {ITEMS.filter((i) => match(i, f)).map((i) => (
          <ItemCard
            key={i.id}
            item={i}
            onClick={() => {
              track({ type: "view_product", item: i.id });
              go({ name: "product", id: i.id });
            }}
          />
        ))}
      </div>
    </div>
  );
}
