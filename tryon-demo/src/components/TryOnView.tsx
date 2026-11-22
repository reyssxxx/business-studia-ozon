import { useEffect, useRef, useState } from "react";
import { Sparkle } from "./ui";

const STEPS = ["Находим фигуру на фото", "Определяем позу и пропорции", "Подбираем посадку по размеру", "Прорисовываем ткань и складки", "Добавляем свет и тени", "Почти готово"];

/** Экран ожидания: фото со сканирующей линией, шаги и прогресс. */
export function Generating({ image, expectedMs = 25000, label }: { image: string; expectedMs?: number; label?: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - t0), 100);
    return () => clearInterval(id);
  }, []);
  // асимптотический прогресс: быстро до ~80%, дальше медленно, 100% только с ответом
  const p = 1 - Math.exp(-elapsed / (expectedMs * 0.55));
  const step = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
  return (
    <div className="rise">
      <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-2xl bg-bg2">
        <img src={image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-white/25" />
        <div className="absolute inset-x-0 h-28 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#7b3dff]/30 to-transparent" style={{ animation: "scan 2.6s ease-in-out infinite" }} />
        <div className="absolute inset-x-0 h-[2px] bg-[#a34bff] shadow-[0_0_18px_#a34bff]" style={{ animation: "scan 2.6s ease-in-out infinite" }} />
        <div className="ai-grad absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white">
          <Sparkle size={12} /> {label ?? "Нейросеть примеряет"}
        </div>
      </div>
      <div className="mt-4 text-center text-[17px] font-semibold">{STEPS[step]}</div>
      <div className="mx-auto mt-3 h-1.5 w-2/3 overflow-hidden rounded-full bg-bg2">
        <div className="ai-grad h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
      <div className="mt-2 text-center text-[13px] text-mute">{(elapsed / 1000).toFixed(0)} сек</div>
    </div>
  );
}

/** Сравнение до/после: тянем ручку. */
export function BeforeAfter({ before, after, label = "На вас" }: { before: string; after: string; label?: string }) {
  const [pos, setPos] = useState(100);
  const [drag, setDrag] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // подсказка: шторка слегка приоткрывается, чтобы было понятно, что её можно тянуть
  useEffect(() => {
    const a = setTimeout(() => setPos(58), 600);
    const b = setTimeout(() => setPos(100), 1500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [after]);

  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const t = drag ? "none" : "all .5s ease-out";

  return (
    <div
      ref={box}
      className="relative aspect-[3/4] w-full touch-none overflow-hidden rounded-2xl bg-bg2 select-none"
      onPointerDown={(e) => {
        setDrag(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => drag && move(e.clientX)}
      onPointerUp={() => setDrag(false)}
    >
      <img src={before} alt="До" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <img src={after} alt="После" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, transition: t }} draggable={false} />
      <div className="absolute inset-y-0 w-[3px] bg-white shadow" style={{ left: `calc(${pos}% - 1.5px)`, transition: t }}>
        <div className="absolute top-1/2 left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
          </svg>
        </div>
      </div>
      <span className="ai-grad absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white">
        <Sparkle size={11} /> {label}
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-[12px] font-semibold text-ink">Было</span>
    </div>
  );
}
