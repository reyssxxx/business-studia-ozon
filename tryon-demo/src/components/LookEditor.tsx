// Редактор образа: несколько образов на выбор, замена, удаление и добавление вещей, учёт гардероба.
import { useCallback, useEffect, useMemo, useState } from "react";
import { SLOT_LABEL, type Item, type Slot } from "../data/catalog";
import { useStore } from "../store";
import { addableSlots, alternatives, buildLooks, currentSeason, editLook, type Look, type StylistCtx } from "../lib/stylist";
import { recommendSize } from "../lib/size";
import { cardPrice, Icon, rub, Sheet, Sparkle } from "./ui";
import { track } from "../lib/analytics";

export function useStylistCtx(): StylistCtx {
  const { body, wardrobe } = useStore();
  return useMemo(() => ({ gender: body.gender, owned: new Set(wardrobe.map((w) => w.id)), now: currentSeason() }), [body.gender, wardrobe]);
}

/** Образы к вещи и правки покупателя. Правки живут, пока открыт экран. */
export function useLooks(mainId: string) {
  const ctx = useStylistCtx();
  const base = useMemo(() => buildLooks(mainId, ctx), [mainId, ctx]);
  const [edited, setEdited] = useState<Record<number, Look>>({});
  const [idx, setIdxState] = useState(0);
  useEffect(() => {
    setEdited({});
    setIdxState(0);
  }, [base]);

  const looks = base.map((l, i) => edited[i] ?? l);
  const look: Look | undefined = looks[Math.min(idx, looks.length - 1)];

  const setIdx = useCallback(
    (i: number) => {
      setIdxState(i);
      track({ type: "look_switch", item: mainId });
    },
    [mainId],
  );
  const change = useCallback(
    (slot: Slot, item: Item | null) => {
      if (!look) return;
      setEdited((e) => ({ ...e, [idx]: editLook(look, slot, item, ctx) }));
      track({ type: "look_edit", item: mainId });
    },
    [look, idx, ctx, mainId],
  );
  const reset = useCallback(
    () =>
      setEdited((e) => {
        const n = { ...e };
        delete n[idx];
        return n;
      }),
    [idx],
  );
  return { ctx, looks, look, idx, setIdx, change, reset, isEdited: !!edited[idx] };
}

export const sizeOf = (it: Item, body: Parameters<typeof recommendSize>[1]) =>
  recommendSize(it, body)?.size ?? (it.sizes.length === 1 ? it.sizes[0] : it.sizes[Math.floor(it.sizes.length / 2)]);

/** Сумма к оплате: вещи из гардероба не считаем */
export const lookPrice = (look: Look) => look.items.filter((x) => !x.owned).reduce((a, x) => a + cardPrice(x.item.price), 0);

/** Переключатель образов: чипы со стилем и мини-коллажем */
export function LookSwitcher({ looks, idx, onSelect }: { looks: Look[]; idx: number; onSelect: (i: number) => void }) {
  if (looks.length < 2) return null;
  return (
    <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
      {looks.map((l, i) => (
        <button
          key={l.id}
          onClick={() => onSelect(i)}
          className={`flex shrink-0 items-center gap-2 rounded-xl border-2 py-1 pr-3 pl-1 text-left transition ${i === idx ? "border-ai bg-ai-soft" : "border-line bg-white"}`}
        >
          <span className="flex -space-x-2">
            {l.items.slice(1, 3).map((x) => (
              <span key={x.item.id} className="h-8 w-7 overflow-hidden rounded-md border border-white bg-bg2">
                <img src={x.item.image} alt="" className="h-full w-full object-cover" />
              </span>
            ))}
          </span>
          <span className="text-[13px] leading-tight">
            <span className={`block font-semibold ${i === idx ? "text-ai" : "text-ink"}`}>{l.title}</span>
            <span className="text-mute">{l.items.length} вещи</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Почему так подобрано */
export function LookReasons({ look }: { look: Look }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {look.reasons.map((r) => (
        <span key={r} className="rounded-full bg-bg2 px-2.5 py-1 text-[12px] text-ink2">
          {r}
        </span>
      ))}
    </div>
  );
}

/** Список вещей образа с заменой, удалением и добавлением */
export function LookItems({ look, ctx, onChange, visualId }: { look: Look; ctx: StylistCtx; onChange: (slot: Slot, item: Item | null) => void; visualId?: string }) {
  const { body, go } = useStore();
  const [picker, setPicker] = useState<{ slot: Slot; mode: "swap" | "add" } | null>(null);
  const mainId = look.items[0].item.id;
  const addable = addableSlots(look, ctx);
  const ownedCount = ctx.owned.size;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[16px] font-bold">В образе</div>
        <button onClick={() => go({ name: "wardrobe" })} className="text-[13px] font-medium text-blue">
          Мой гардероб · {ownedCount}
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {look.items.map((x) => {
          const isMain = x.item.id === mainId;
          const onPhoto = isMain || x.item.id === visualId;
          const required = isMain || x.slot === "bottom" || x.slot === "top" || x.slot === "dress";
          return (
            <div key={x.slot} className={`flex items-center gap-2.5 rounded-2xl border p-2 ${x.owned ? "border-green/40 bg-green-soft/50" : "border-line bg-white"}`}>
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-bg2">
                <img src={x.item.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] text-mute">
                  {SLOT_LABEL[x.slot]}
                  {isMain && <span className="rounded bg-blue-soft px-1 font-semibold text-blue">основная</span>}
                  {visualId !== undefined && !onPhoto && x.item.tryOn && <span>· не на фото</span>}
                </div>
                <div className="truncate text-[14px] font-medium">{x.item.title}</div>
                <div className="text-[13px]">
                  {x.owned ? (
                    <span className="font-semibold text-green">✓ Уже есть у вас</span>
                  ) : (
                    <>
                      <span className="font-bold text-green">{rub(cardPrice(x.item.price))}</span>
                      {x.item.sizes.length > 1 && <span className="text-mute"> · {sizeOf(x.item, body)}</span>}
                    </>
                  )}
                </div>
              </div>
              {!isMain && (
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setPicker({ slot: x.slot, mode: "swap" })} className="rounded-lg bg-bg2 px-2.5 py-1.5 text-[12px] font-semibold text-ink">
                    Заменить
                  </button>
                  {!required && (
                    <button onClick={() => onChange(x.slot, null)} aria-label="Убрать" className="grid h-8 w-8 place-items-center rounded-lg bg-bg2 text-ink2">
                      {Icon.close(13)}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addable.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {addable.map((s) => (
            <button key={s} onClick={() => setPicker({ slot: s, mode: "add" })} className="rounded-full border border-dashed border-ai/50 px-3 py-1.5 text-[13px] font-medium text-ai">
              + {SLOT_LABEL[s].toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {picker && (
        <PickerSheet
          title={picker.mode === "swap" ? `Заменить: ${SLOT_LABEL[picker.slot].toLowerCase()}` : `Добавить: ${SLOT_LABEL[picker.slot].toLowerCase()}`}
          items={alternatives(look, picker.slot, ctx)}
          ctx={ctx}
          look={look}
          onPick={(it) => {
            onChange(picker.slot, it);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function PickerSheet({ title, items, ctx, look, onPick, onClose }: { title: string; items: Item[]; ctx: StylistCtx; look: Look; onPick: (it: Item) => void; onClose: () => void }) {
  const owned = items.filter((i) => ctx.owned.has(i.id));
  const fresh = items.filter((i) => !ctx.owned.has(i.id));
  const styleOk = (i: Item) => i.styles.includes(look.style);
  const Row = ({ it }: { it: Item }) => (
    <button onClick={() => onPick(it)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-2 text-left active:bg-bg2">
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-bg2">
        <img src={it.image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{it.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-mute">
          <span className="inline-block h-3 w-3 rounded-full border border-line" style={{ background: it.hex }} />
          {it.color}
          {!styleOk(it) && <span className="rounded bg-[#fff6e0] px-1 text-[#7a5600]">другой стиль</span>}
        </div>
        <div className="text-[13px]">{ctx.owned.has(it.id) ? <span className="font-semibold text-green">✓ Есть у вас</span> : <span className="font-bold text-green">{rub(cardPrice(it.price))}</span>}</div>
      </div>
      <span className="text-mute">{Icon.chevron(16)}</span>
    </button>
  );
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="space-y-2 px-4 pb-2">
        {items.length === 0 && <div className="py-6 text-center text-[14px] text-mute">Подходящих вещей нет: остальные не сочетаются по сезону или цвету</div>}
        {owned.length > 0 && <div className="pt-1 text-[13px] font-semibold text-green">Из вашего гардероба</div>}
        {owned.map((it) => (
          <Row key={it.id} it={it} />
        ))}
        {owned.length > 0 && fresh.length > 0 && <div className="pt-2 text-[13px] font-semibold text-ink2">Можно купить</div>}
        {fresh.map((it) => (
          <Row key={it.id} it={it} />
        ))}
        <div className="flex items-start gap-1.5 pt-2 text-[12px] leading-snug text-mute">
          <span className="text-ai">
            <Sparkle size={12} />
          </span>
          Показываем только то, что подходит по сезону и цвету к остальным вещам образа.
        </div>
      </div>
    </Sheet>
  );
}
