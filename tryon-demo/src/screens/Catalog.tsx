import { useState } from "react";
import ozonLogo from "../assets/ozon.svg";
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
    <div className="rise flex min-w-0 flex-col">
      <div className="relative">
        <button onClick={onClick} className="block aspect-[3/4] w-full overflow-hidden rounded-xl bg-bg2 text-left">
          <img src={tried ?? item.image} alt={item.title} className={`h-full w-full ${tried ? "object-cover" : "object-contain object-center p-[7%] mix-blend-multiply"}`} loading="lazy" />
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
              <span className="inline-flex items-center gap-1 rounded-full bg-green px-2 py-[3px] text-[11px] font-semibold text-white shadow-sm">{<>{Icon.check(10)} На вас</>}</span>
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
      <button onClick={onClick} className="mt-2 mb-2 text-left">
        <Price price={item.price} old={item.oldPrice} />
        <div className="mt-1 line-clamp-2 h-[2.7em] text-[13px] leading-[1.35] text-ink">
          <span className="font-semibold">{item.brand}</span> / {item.title}
        </div>
        <div className="mt-1">
          <Rating rating={item.rating} reviews={item.reviews} small />
        </div>
      </button>
      <Button
        size="sm"
        className="mt-auto w-full shrink-0"
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
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const visibleItems = ITEMS.filter((item) => match(item, f) && `${item.brand} ${item.title}`.toLowerCase().includes(term));
  const triedIds = Object.keys(results);
  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 border-b border-blue-soft bg-white px-3 pt-3 pb-2">
        <img src={ozonLogo} alt="OZON" className="mb-2 ml-2 block h-5 w-auto" />
        <label className="flex h-10 items-center gap-2 rounded-xl bg-blue-soft px-3 text-blue focus-within:ring-2 focus-within:ring-blue">
          {Icon.search(18)}
          <input type="search" aria-label="Поиск по каталогу" placeholder="Искать в каталоге" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 text-[14px] text-ink outline-none placeholder:text-ink2" />
        </label>
      </header>

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-3 pt-3 pb-3">
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
          <div className="relative isolate overflow-hidden rounded-[20px] bg-blue px-4 py-4 text-white">
            <div aria-hidden="true" className="absolute top-0 right-0 -z-10 h-full w-1/3 bg-[#357dff] [clip-path:polygon(23%_0,100%_0,100%_100%,0_100%)]" />
            <img src={byId("bomber").image} alt="" className="absolute top-[17%] right-[5%] -z-10 h-[66%] w-[24%] rotate-6 rounded-xl border-2 border-white/65 object-cover shadow-md" />
            <div className="max-w-[67%]">
              <div className="text-[23px] leading-[1.05] font-extrabold tracking-tight">Примерьте одежду на себе</div>
              <div className="mt-1.5 text-[13px] leading-snug text-white/90">По фото или по росту и весу</div>
              <Button size="sm" variant="white" className="mt-3" onClick={() => {
                track({ type: "view_product", item: "bomber" });
                go({ name: "product", id: "bomber" });
              }}>Попробовать {Icon.chevron(13)}</Button>
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
              f === x.id ? (x.ai ? "ai-grad text-white" : "bg-blue text-white") : x.ai ? "bg-ai-soft text-ai" : "bg-bg2 text-ink"
            }`}
          >
            {x.ai && <Sparkle size={12} />}
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-4 px-3 text-[20px] font-bold">{term ? "Результаты поиска" : f === "try" ? "Можно примерить на себе" : "Рекомендуем вам"}</div>
      {visibleItems.length === 0 && <p className="px-3 py-4 text-[14px] text-ink2">Ничего не найдено. Попробуйте изменить запрос или категорию.</p>}
      <div className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-5 px-3">
        {visibleItems.map((i) => (
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
