import { byId } from "../data/catalog";
import { useStore } from "../store";
import { Button, cardPrice, Icon, rub, Sparkle } from "../components/ui";

const plural = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "товар" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "товара" : "товаров");

export default function Cart() {
  const { cart, removeFromCart, tab, showToast } = useStore();
  const full = cart.reduce((a, l) => a + byId(l.id).price, 0);
  const total = cart.reduce((a, l) => a + cardPrice(byId(l.id).price), 0);
  return (
    <div className="min-h-full bg-bg2 pb-6">
      <div className="bg-white px-4 pt-4 pb-3">
        <h1 className="text-[26px] font-bold">Корзина</h1>
        {cart.length > 0 && <div className="text-[14px] text-mute">{cart.length} {plural(cart.length)}</div>}
      </div>
      {cart.length === 0 ? (
        <div className="mx-3 mt-3 rounded-2xl bg-white p-8 text-center">
          <div className="text-[44px]">🛍️</div>
          <div className="mt-2 text-[17px] font-semibold">В корзине пока пусто</div>
          <div className="mt-1 text-[14px] text-mute">Примерьте что-нибудь на себе</div>
          <Button className="mx-auto mt-5" size="md" onClick={() => tab({ name: "catalog" })}>
            На главную
          </Button>
        </div>
      ) : (
        <>
          <div className="mx-3 mt-3 rounded-2xl bg-white p-3">
            <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
              <span className="text-blue">{Icon.truck()}</span> Доставка завтра
            </div>
            <div className="divide-y divide-line">
              {cart.map((l, i) => {
                const it = byId(l.id);
                return (
                  <div key={i} className="rise flex gap-3 py-3">
                    <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-lg bg-bg2">
                      <img src={it.image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[17px] font-bold text-green">{rub(cardPrice(it.price))}</span>
                        <span className="text-[12px] text-mute line-through">{rub(it.oldPrice ?? it.price)}</span>
                      </div>
                      <div className="line-clamp-2 text-[13px] leading-snug">{it.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-mute">
                        Размер {l.size}
                        {l.source !== "product" && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${l.source === "look" ? "bg-ai-soft text-ai" : "bg-green-soft text-green"}`}>
                            <Sparkle size={9} /> {l.source === "look" ? "из образа" : "после примерки"}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(i)} aria-label="Удалить" className="grid h-9 w-9 place-items-center self-start rounded-full text-mute hover:bg-bg2">
                      {Icon.trash(18)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mx-3 mt-3 rounded-2xl bg-white p-4 text-[14px]">
            <div className="flex justify-between py-0.5">
              <span className="text-mute">Товары ({cart.length})</span>
              <span>{rub(full)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-mute">Скидка по Ozon Карте</span>
              <span className="text-red">−{rub(full - total)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[17px] font-bold">Итого</span>
              <span className="text-[24px] font-bold text-green">{rub(total)}</span>
            </div>
            <Button className="mt-3 w-full" onClick={() => showToast("Это MVP: оформление заказа не подключено")}>
              Перейти к оформлению
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
