import { useState } from "react";
import { byId } from "../data/catalog";
import { useLooks } from "../components/LookEditor";
import { useStore } from "../store";
import { BottomBar, Button, cardPrice, Icon, Price, Rating, rub, Sparkle } from "../components/ui";
import TryOnSheet from "../components/TryOnSheet";
import { recommendSize } from "../lib/size";
import { track } from "../lib/analytics";

export default function Product({ id }: { id: string }) {
  const item = byId(id);
  const { go, back, addToCart, showToast, body, person, results, favs, toggleFav } = useStore();
  const advice = person ? recommendSize(item, body) : null;
  const [size, setSize] = useState<string | null>(advice?.size ?? (item.sizes.length === 1 ? item.sizes[0] : null));
  const tried = results[id];
  const { looks, look: firstLook } = useLooks(id);
  const [slide, setSlide] = useState(tried ? 1 : 0);
  const [sheet, setSheet] = useState(false);
  const fav = favs.includes(id);
  const photos = tried ? [item.image, tried] : [item.image];

  // Фото или параметры уже есть: примеряем сразу, без повторных вопросов
  const startTryOn = () => (person || tried ? go({ name: "result", id }) : setSheet(true));
  const mismatch = advice && size && size !== advice.size ? advice.size : null;

  const add = () => {
    if (!size) {
      showToast("Выберите размер");
      return;
    }
    addToCart({ id, size, source: tried ? "tryon" : "product" });
    showToast(`Добавили в корзину · размер ${size}`);
  };

  return (
    <div className="pb-6">
      {/* галерея */}
      <div className="relative bg-bg2">
        <div
          className="no-scrollbar flex h-[clamp(240px,48dvh,410px)] snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          ref={(el) => {
            if (el && tried && el.dataset.init !== "1") {
              el.dataset.init = "1";
              requestAnimationFrame(() => el.scrollTo({ left: el.clientWidth }));
            }
          }}
        >
          {photos.map((src, i) => (
            <div key={i} className="relative h-full w-full shrink-0 snap-center">
              <img src={src} alt={item.title} className="h-full w-full object-cover" />
              {i === 1 && (
                <span className="ai-grad absolute bottom-10 left-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white">
                  <Sparkle size={12} /> Так это сидит на вас
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
          <button onClick={back} aria-label="Назад" className="grid h-10 w-10 place-items-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur">
            {Icon.back(22)}
          </button>
          <div className="flex gap-2">
            <button aria-label="Поделиться" className="grid h-10 w-10 place-items-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur">
              {Icon.share(20)}
            </button>
            <button onClick={() => toggleFav(id)} aria-label="В избранное" className={`grid h-10 w-10 place-items-center rounded-full bg-white/85 shadow-sm backdrop-blur ${fav ? "text-red" : "text-ink"}`}>
              {Icon.heart(20, fav)}
            </button>
          </div>
        </div>
        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${slide === i ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`} />
            ))}
          </div>
        )}
      </div>

      {item.tryOn && (
        <div className="px-4 pt-3 text-center">
          <Button variant="ai" className="w-full" onClick={startTryOn}>
            <Sparkle size={16} /> {tried ? "Смотреть примерку" : "Примерить на себе"}
          </Button>
          <p className="mt-1.5 text-[13px] text-mute">{tried ? "Сравнение до и после" : "По фото или на аватаре"}</p>
        </div>
      )}

      <div className="px-4 pt-3">
        <Price price={item.price} old={item.oldPrice} big />
        <div className="mt-3 text-[14px] font-semibold text-blue">{item.brand}</div>
        <h1 className="mt-0.5 text-[17px] leading-snug font-medium">{item.title}</h1>
        <div className="mt-1.5 flex items-center gap-3">
          <Rating rating={item.rating} reviews={item.reviews} />
          <span className="text-[13px] text-mute">· 2 тыс. купили</span>
        </div>

        {/* размеры */}
        {item.sizes.length > 1 && (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-semibold">
                Размер{size ? <span className="font-normal text-mute">: {size}</span> : null}
              </div>
              {advice ? (
                <div className="flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[13px] font-semibold text-green">
                  {Icon.check(12)} Ваш размер {advice.size}
                </div>
              ) : (
                item.tryOn && (
                  <button onClick={() => setSheet(true)} className="text-[14px] font-medium text-blue">
                    Подобрать размер
                  </button>
                )
              )}
            </div>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
              {item.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`relative h-12 min-w-[56px] shrink-0 rounded-xl border-2 px-3 text-[15px] font-semibold transition ${size === s ? "border-blue bg-blue-soft text-blue" : "border-line text-ink"}`}
                >
                  {s}
                  {advice?.size === s && <span className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-green text-white">{Icon.check(9)}</span>}
                </button>
              ))}
            </div>
            {mismatch ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#fff6e0] p-2.5 text-[13px] leading-snug text-[#7a5600]">
                <span className="flex-1">Вы выбрали {size}. По вашим параметрам лучше подойдёт {mismatch}.</span>
                <button onClick={() => setSize(mismatch)} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 font-semibold text-ink">
                  Взять {mismatch}
                </button>
              </div>
            ) : (
              advice && <div className="mt-1.5 text-[13px] text-ink2">{advice.note}</div>
            )}
          </div>
        )}

        {/* доставка и продавец */}
        <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
          <div className="flex items-center gap-3 p-3">
            <span className="text-blue">{Icon.truck()}</span>
            <div className="flex-1 text-[14px]">
              <div className="font-semibold">Доставка завтра</div>
              <div className="text-mute">В пункт выдачи, бесплатно</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3">
            <span className="text-green">{Icon.shield()}</span>
            <div className="flex-1 text-[14px]">
              <div className="font-semibold">Примерка в пункте выдачи</div>
              <div className="text-mute">Не подошло, вернём деньги</div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-bg2 p-4 text-[14px]">
          <div className="mb-2 text-[16px] font-semibold">О товаре</div>
          <Row k="Цвет" v={item.color} />
          <Row k="Состав" v={item.material} />
          <Row k="Посадка" v={{ regular: "Прямая", oversize: "Оверсайз", slim: "Приталенная" }[item.fit]} />
        </div>

        {/* продавец */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line p-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-soft text-blue">{Icon.store()}</div>
          <div className="flex-1 text-[14px]">
            <div className="font-semibold">{item.brand} Official</div>
            <div className="text-mute"><span className="text-star">★</span> 4,8 · продавец на Ozon 3 года</div>
          </div>
          <span className="text-mute">{Icon.chevron(16)}</span>
        </div>

        {/* отзывы */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <div className="text-[18px] font-bold">Отзывы <span className="text-[14px] font-normal text-mute">{item.reviews.toLocaleString("ru-RU")}</span></div>
            <div className="text-[15px] font-semibold"><span className="text-star">★</span> {item.rating.toFixed(1)}</div>
          </div>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            {REVIEWS.map((r) => (
              <div key={r.name} className="w-[260px] shrink-0 rounded-2xl bg-bg2 p-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-star">{"★".repeat(r.stars)}<span className="text-line">{"★".repeat(5 - r.stars)}</span></span>
                </div>
                <div className="mt-0.5 text-[12px] text-mute">{r.meta}</div>
                <div className="mt-1.5 leading-snug text-ink2">{r.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* собрать образ */}
        {firstLook && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[18px] font-bold">
              <span className="text-ai"><Sparkle size={16} /></span> Собрать образ
            </div>
            <button onClick={() => go({ name: "look", id })} className="text-[14px] font-medium text-blue">
              {looks.length > 1 ? `${looks.length} образа` : "Подробнее"}
            </button>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto">
            {(firstLook?.items.slice(1) ?? []).map(({ item: l, owned }) => (
              <button
                key={l.id}
                onClick={() => {
                  track({ type: "view_product", item: l.id });
                  go({ name: "product", id: l.id });
                }}
                className="w-[110px] shrink-0 text-left"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-bg2">
                  <img src={l.image} alt={l.title} className="h-full w-full object-cover" />
                  {owned && <span className="absolute bottom-1 left-1 rounded bg-green px-1.5 py-0.5 text-[10px] font-semibold text-white">уже есть у вас</span>}
                </div>
                <div className="mt-1 text-[14px] font-bold text-green">{owned ? "Есть у вас" : rub(cardPrice(l.price))}</div>
                <div className="line-clamp-1 text-[12px] text-ink2">{l.title}</div>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>

      <BottomBar>
        <div className="flex flex-col justify-center pr-1">
          <div className="text-[17px] leading-tight font-bold text-green">{rub(cardPrice(item.price))}</div>
          <div className="text-[12px] text-mute">с Ozon Картой</div>
        </div>
        <Button onClick={add} className="flex-1">
          {Icon.cart(20)} В корзину
        </Button>
      </BottomBar>

      {sheet && (
        <TryOnSheet
          item={item}
          onClose={() => setSheet(false)}
          onStart={() => {
            setSheet(false);
            go({ name: "result", id });
          }}
        />
      )}
    </div>
  );
}

const REVIEWS = [
  { name: "Анна К.", stars: 5, meta: "Рост 168, взяла M", text: "Села отлично, по размерной сетке попала с первого раза. Ткань плотная, швы ровные." },
  { name: "Дмитрий", stars: 4, meta: "Рост 182, взял L", text: "Качество хорошее. Сначала заказал M, оказался мал в плечах, пришлось менять на L." },
  { name: "Мария С.", stars: 5, meta: "Рост 160, взяла S", text: "Цвет как на фото, после стирки не села. Беру вторую в другом цвете." },
];

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-mute">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
