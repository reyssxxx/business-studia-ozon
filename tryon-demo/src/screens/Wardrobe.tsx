// Мой гардероб: вещи, которые у покупателя уже есть. Стилист собирает образы с ними,
// а в корзину кладёт только недостающее. В проде гардероб наполняется из истории заказов сам.
import { ITEMS, SLOT_LABEL, byId, type Slot } from "../data/catalog";
import { dateLabel } from "../data/personas";
import { useStore } from "../store";
import { Header, Icon, Sparkle } from "../components/ui";

const ORDER: Slot[] = ["outer", "top", "dress", "bottom", "shoes", "bag", "hat"];

export default function Wardrobe() {
  const { wardrobe, toggleOwned, go } = useStore();
  const ownedIds = new Set(wardrobe.map((w) => w.id));
  const rest = ITEMS.filter((i) => !ownedIds.has(i.id));

  return (
    <div className="pb-8">
      <Header title="Мой гардероб" />
      <div className="px-4 pt-3">
        <div className="flex items-start gap-3 rounded-2xl bg-ai-soft p-3">
          <div className="ai-grad grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white">
            <Sparkle size={18} />
          </div>
          <div className="text-[13px] leading-snug text-ink2">
            <b className="text-ink">Стилист учитывает ваши вещи.</b> Образы собираются с тем, что у вас уже есть, а в корзину попадает только недостающее.
          </div>
        </div>

        <div className="mt-5 text-[17px] font-bold">У вас есть · {wardrobe.length}</div>
        {wardrobe.length === 0 && <div className="mt-2 text-[14px] text-mute">Пока пусто. Отметьте вещи ниже.</div>}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[...wardrobe]
            .sort((a, b) => ORDER.indexOf(byId(a.id).slot) - ORDER.indexOf(byId(b.id).slot))
            .map((w) => {
              const it = byId(w.id);
              return (
                <div key={w.id} className="relative">
                  <button onClick={() => go({ name: "look", id: w.id })} className="block w-full text-left">
                    <div className="aspect-[3/4] overflow-hidden rounded-xl bg-bg2">
                      <img src={it.image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-1 truncate text-[12px] font-medium">{it.title}</div>
                    <div className="text-[11px] text-mute">{w.source === "order" ? `Заказ: ${dateLabel(w.daysAgo)}` : "Добавлено вами"}</div>
                  </button>
                  <button onClick={() => toggleOwned(w.id)} aria-label="Убрать из гардероба" className="absolute top-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-ink2 shadow">
                    {Icon.close(12)}
                  </button>
                </div>
              );
            })}
        </div>

        <div className="mt-6 text-[17px] font-bold">Добавить вещь</div>
        <div className="mt-1 text-[13px] text-mute">Отметьте, что у вас уже есть похожее</div>
        <div className="mt-2 space-y-1.5">
          {ORDER.flatMap((slot) => rest.filter((i) => i.slot === slot)).map((it) => (
            <button key={it.id} onClick={() => toggleOwned(it.id)} className="flex w-full items-center gap-3 rounded-xl border border-line p-1.5 text-left">
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-bg2">
                <img src={it.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{it.title}</div>
                <div className="text-[11px] text-mute">{SLOT_LABEL[it.slot]} · {it.color}</div>
              </div>
              <span className="rounded-lg bg-blue-soft px-2.5 py-1 text-[12px] font-semibold text-blue">+ Есть у меня</span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-line p-4 text-[13px] leading-snug text-mute">
          📷 <b className="text-ink2">Сфотографировать свою вещь</b>: в полной версии нейросеть распознаёт тип, цвет и сезон по фото и добавляет вещь в гардероб. В MVP вещи добавляются из каталога.
        </div>
      </div>
    </div>
  );
}
