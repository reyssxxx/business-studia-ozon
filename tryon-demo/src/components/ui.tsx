import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store";

// ---------- иконки (свои, простые линии) ----------
const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const Icon = {
  back: (s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M15 5l-7 7 7 7" /></svg>),
  close: (s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M6 6l12 12M18 6L6 18" /></svg>),
  heart: (s = 22, filled = false) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>),
  share: (s = 22) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>),
  search: (s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.2}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>),
  camera: (s = 22) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>),
  chevron: (s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M9 5l7 7-7 7" /></svg>),
  home: (s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>),
  cart: (s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M3 4h2l2.4 11.2a1 1 0 001 .8h9.2a1 1 0 001-.8L20 8H6.2" /><circle cx="9" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>),
  chart: (s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M4 20V11M10 20V5M16 20v-6M22 20H2" /></svg>),
  truck: (s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7" /><circle cx="6" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></svg>),
  shield: (s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>),
  ruler: (s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M3 17L17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></svg>),
  check: (s = 16) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>),
  trash: (s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>),
  pin: (s = 18) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>),
  grid: (s = 24) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><circle cx="17.5" cy="17.5" r="3.5" /></svg>),
  store: (s = 20) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" /></svg>),
  user: (s = 22) => (<svg width={s} height={s} viewBox="0 0 24 24" {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>),
};

export function Sparkle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </svg>
  );
}

// ---------- шапка ----------
export function Header({ title, right, transparent }: { title?: ReactNode; right?: ReactNode; transparent?: boolean }) {
  const { back, canBack } = useStore();
  return (
    <div className={`sticky top-0 z-20 flex h-13 items-center gap-1 px-2 ${transparent ? "" : "border-b border-line bg-white"}`}>
      {canBack && (
        <button onClick={back} aria-label="Назад" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-bg2">
          {Icon.back()}
        </button>
      )}
      <div className="flex-1 truncate px-1 text-[17px] font-semibold">{title}</div>
      {right}
    </div>
  );
}

// ---------- кнопки ----------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "blue" | "soft" | "ai" | "white" | "green"; size?: "sm" | "md" | "lg" };
export function Button({ variant = "blue", size = "lg", className = "", ...p }: BtnProps) {
  const v = {
    blue: "bg-blue text-white active:bg-blue-dark",
    soft: "bg-blue-soft text-blue active:bg-[#d4e3ff]",
    ai: "ai-grad text-white active:opacity-90",
    white: "bg-white text-ink border border-line active:bg-bg2",
    green: "bg-green text-white",
  }[variant];
  const s = { sm: "h-9 text-[14px] rounded-[10px] px-3", md: "h-11 text-[15px] rounded-xl px-4", lg: "h-[52px] text-[16px] rounded-[14px] px-5" }[size];
  return <button {...p} className={`${v} ${s} flex items-center justify-center gap-2 font-semibold transition disabled:opacity-40 ${className}`} />;
}

// ---------- цена ----------
export const rub = (n: number) => n.toLocaleString("ru-RU") + " ₽";
/** цена «с картой» ниже обычной на 7%, как принято у маркетплейсов */
export const cardPrice = (n: number) => Math.round((n * 0.93) / 10) * 10;

export function Price({ price, old, big }: { price: number; old?: number; big?: boolean }) {
  const disc = old ? Math.round((1 - price / old) * 100) : 0;
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`rounded-lg bg-green-soft font-bold text-green ${big ? "px-2 py-0.5 text-[26px]" : "px-1.5 text-[17px]"}`}>{rub(cardPrice(price))}</span>
        {big && <span className="text-[13px] leading-tight text-mute">c Ozon Картой</span>}
      </div>
      <div className={`mt-0.5 flex items-center gap-1.5 ${big ? "text-[15px]" : "text-[12px]"}`}>
        <span className="font-semibold text-ink2">{rub(price)}</span>
        {old && <span className="text-mute line-through">{rub(old)}</span>}
        {disc > 0 && <span className="font-semibold text-red">−{disc}%</span>}
      </div>
    </div>
  );
}

export function Rating({ rating, reviews, small }: { rating: number; reviews: number; small?: boolean }) {
  return (
    <div className={`flex items-center gap-1 ${small ? "text-[12px]" : "text-[14px]"} text-mute`}>
      <span className="text-star">★</span>
      <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
      <span>· {reviews.toLocaleString("ru-RU")} {small ? "" : "отзывов"}</span>
    </div>
  );
}

export function TryBadge({ small }: { small?: boolean }) {
  return (
    <span className={`ai-grad inline-flex items-center gap-1 rounded-full font-semibold text-white shadow-sm ${small ? "px-2 py-[3px] text-[11px]" : "px-3 py-1.5 text-[13px]"}`}>
      <Sparkle size={small ? 10 : 13} /> Примерить
    </span>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="rise rounded-2xl bg-ink px-4 py-3 text-[14px] font-medium text-white shadow-xl">{toast}</div>
    </div>
  );
}

/** Рисует детей в слоте рамки телефона (вне прокручиваемой области), чтобы панель и шторка не уезжали при прокрутке. */
function Slot({ id, children }: { id: string; children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.getElementById(id)), [id]);
  return el ? createPortal(children, el) : null;
}

/** Нижняя шторка поверх экрана */
export function Sheet({ children, onClose, title }: { children: ReactNode; onClose: () => void; title?: string }) {
  return (
    <Slot id="overlay-slot">
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="fade absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="sheet relative max-h-[92%] overflow-y-auto rounded-t-[24px] bg-white pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 bg-white pt-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <div className="text-[20px] font-bold">{title}</div>
            <button onClick={onClose} aria-label="Закрыть" className="grid h-9 w-9 place-items-center rounded-full bg-bg2 text-ink2">
              {Icon.close(18)}
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
    </Slot>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <Slot id="bar-slot">
      <div className="flex gap-2 border-t border-line bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]">{children}</div>
    </Slot>
  );
}
