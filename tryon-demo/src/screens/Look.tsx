// «Собрать образ» из карточки товара: несколько образов, коллаж, правка вещей, гардероб.
// Здесь ничего не генерируем: примерить образ на себе можно кнопкой, она ведёт в примерку.
import { useEffect } from "react";
import { byId } from "../data/catalog";
import { useStore } from "../store";
import { BottomBar, Button, Header, rub, Sparkle } from "../components/ui";
import { LookItems, LookReasons, LookSwitcher, lookPrice, sizeOf, useLooks } from "../components/LookEditor";
import type { Look as LookT } from "../lib/stylist";
import { track } from "../lib/analytics";

/** Коллаж вещей образа как раскладка на полу: главная крупно, остальные вокруг */
function Collage({ look }: { look: LookT }) {
  const [main, ...rest] = look.items;
  return (
    <div className="grid aspect-[4/3] grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl bg-bg2 p-1.5">
      <div className="relative col-span-2 row-span-2 overflow-hidden rounded-xl bg-white">
        <img src={main.item.image} alt="" className="h-full w-full object-cover" />
      </div>
      {rest.slice(0, 2).map((x) => (
        <div key={x.item.id} className="relative overflow-hidden rounded-xl bg-white">
          <img src={x.item.image} alt="" className="h-full w-full object-cover" />
          {x.owned && <span className="absolute bottom-1 left-1 rounded bg-green px-1 text-[10px] font-semibold text-white">ваше</span>}
        </div>
      ))}
    </div>
  );
}

export default function Look({ id }: { id: string }) {
  const main = byId(id);
  const { results, body, addToCart, showToast, tab, go } = useStore();
  const { ctx, looks, look, idx, setIdx, change } = useLooks(id);

  useEffect(() => {
    track({ type: "look_open", item: id });
  }, [id]);

  if (!look) {
    return (
      <div>
        <Header title="Собрать образ" />
        <div className="p-6 text-center text-[14px] text-mute">К этой вещи пока не нашлось сочетаний под вашу фигуру и сезон.</div>
      </div>
    );
  }

  const buy = look.items.filter((x) => !x.owned);
  const total = lookPrice(look);

  return (
    <div className="pb-6">
      <Header title="Собрать образ" />
      <div className="px-4 pt-2">
        <LookSwitcher looks={looks} idx={idx} onSelect={setIdx} />
        {results[id] ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-bg2">
            <img src={results[id]} alt="" className="h-full w-full object-cover" />
            <span className="ai-grad absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white">
              <Sparkle size={11} /> {main.title} на вас
            </span>
          </div>
        ) : (
          <Collage look={look} />
        )}
        <LookReasons look={look} />
        {main.tryOn && (
          <Button variant="soft" className="mt-3 w-full !bg-ai-soft !text-ai" size="md" onClick={() => go({ name: "result", id })}>
            <Sparkle size={14} /> Примерить образ на себе
          </Button>
        )}
        <LookItems look={look} ctx={ctx} onChange={change} />
      </div>

      <BottomBar>
        <Button
          variant="ai"
          className="w-full"
          onClick={() => {
            buy.forEach((x) => addToCart({ id: x.item.id, size: sizeOf(x.item, body), source: x.item.id === id ? (results[id] ? "tryon" : "product") : "look" }));
            track({ type: "look_add", item: id, price: total });
            showToast(`Образ в корзине · ${rub(total)}`);
            tab({ name: "cart" });
          }}
        >
          <Sparkle size={15} /> {buy.length > 1 ? `Образ в корзину · ${buy.length} вещи` : "В корзину"} · {rub(total)}
        </Button>
      </BottomBar>
    </div>
  );
}
