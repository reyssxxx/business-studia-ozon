import { useRef, useState } from "react";
import type { Item } from "../data/catalog";
import { useStore } from "../store";
import { Button, Icon, Sheet, Sparkle } from "./ui";
import { avatarFor, type Gender } from "../lib/size";
import { fileToDataUrl, urlToDataUrl } from "../lib/image";

type Mode = "photo" | "avatar";

/** Шторка запуска примерки: фото или рост/вес, согласие, параметры для размера. */
export default function TryOnSheet({ item, onClose, onStart }: { item: Item; onClose: () => void; onStart: () => void }) {
  const { body, setBody, person, setPerson, showToast } = useStore();
  const [mode, setMode] = useState<Mode>(person?.mode ?? "photo");
  const [photo, setPhoto] = useState<string | null>(person?.mode === "photo" ? person.image : null);
  const [consent, setConsent] = useState(person?.mode === "photo");
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await fileToDataUrl(f);
      setPhoto(r.image);
      setWarnings(r.warnings);
    } catch {
      showToast("Не получилось открыть фото");
    }
  };

  const ready = mode === "avatar" || (!!photo && consent);

  const start = async () => {
    setBusy(true);
    try {
      const image = mode === "photo" ? photo! : await urlToDataUrl(avatarFor(body));
      if (image !== person?.image) setPerson({ image, mode });
      onStart();
    } catch {
      showToast("Не получилось подготовить фото");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Примерка на себе" onClose={onClose}>
      <div className="px-4">
        <div className="mb-2 truncate text-[13px] text-mute">{item.title}</div>
        <div className="flex rounded-xl bg-bg2 p-1">
          {(["photo", "avatar"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-[10px] py-2.5 text-[15px] font-semibold transition ${mode === m ? "bg-white text-ink shadow-sm" : "text-mute"}`}>
              {m === "photo" ? "По моему фото" : "По росту и весу"}
            </button>
          ))}
        </div>

        {mode === "photo" ? (
          <div className="rise mt-4">
            {photo ? (
              <div className="relative mx-auto aspect-[3/4] w-[62%] overflow-hidden rounded-2xl bg-bg2">
                <img src={photo} alt="Ваше фото" className="h-full w-full object-cover" />
                <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-semibold text-ink shadow">
                  Заменить
                </button>
                {person?.mode === "photo" && person.image === photo && (
                  <button
                    onClick={() => {
                      setPerson(null);
                      setPhoto(null);
                      setConsent(false);
                      showToast("Фото и примерки удалены");
                    }}
                    className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-semibold text-red shadow"
                  >
                    {Icon.trash(14)} Удалить
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-line p-4">
                <div className="grid grid-cols-3 gap-2 text-center text-[12px] leading-tight text-ink2">
                  {[
                    ["🧍", "Полный рост или по пояс, лицом к камере"],
                    ["💡", "Светлый ровный фон"],
                    ["👕", "Облегающая одежда"],
                  ].map(([e, t]) => (
                    <div key={t} className="rounded-xl bg-bg2 px-1.5 py-2.5">
                      <div className="text-[22px]">{e}</div>
                      <div className="mt-1">{t}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button size="md" onClick={() => camRef.current?.click()}>
                    {Icon.camera(20)} Снять фото
                  </Button>
                  <Button variant="soft" size="md" onClick={() => galRef.current?.click()}>
                    Из галереи
                  </Button>
                </div>
                <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <input ref={galRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              </div>
            )}
            {photo && warnings.length > 0 && (
              <div className="mt-3 rounded-xl bg-[#fff6e0] p-3 text-[13px] leading-snug text-[#7a5600]">
                {warnings.map((w) => (
                  <div key={w}>⚠️ {w}</div>
                ))}
              </div>
            )}
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl bg-bg2 p-3 text-[13px] leading-snug text-ink2">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#005bff]" />
              <span>
                Согласен на обработку фото для примерки. <b className="text-ink">Фото не сохраняется</b> и удаляется сразу после генерации.
              </span>
            </label>
          </div>
        ) : (
          <div className="rise mt-4 flex items-center gap-4 rounded-2xl bg-bg2 p-3">
            <div className="h-36 w-27 shrink-0 overflow-hidden rounded-xl bg-white">
              <img src={avatarFor(body)} alt="Фигура" className="h-full w-full object-cover" />
            </div>
            <div className="text-[14px] leading-snug text-ink2">
              <div className="mb-1 flex items-center gap-1 font-semibold text-ai">
                <Sparkle size={13} /> Без фото
              </div>
              Подберём фигуру под ваш рост и вес и покажем вещь на ней.
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              <span className="text-blue">{Icon.ruler()}</span> Параметры для размера
            </div>
            <div className="flex rounded-full bg-bg2 p-0.5 text-[13px] font-semibold">
              {(["f", "m"] as Gender[]).map((g) => (
                <button key={g} onClick={() => setBody({ ...body, gender: g })} className={`rounded-full px-3 py-1 ${body.gender === g ? "bg-white text-ink shadow-sm" : "text-mute"}`}>
                  {g === "f" ? "Жен" : "Муж"}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Рост" unit="см" min={150} max={200} value={body.height} onChange={(height) => setBody({ ...body, height })} />
          <Slider label="Вес" unit="кг" min={40} max={130} value={body.weight} onChange={(weight) => setBody({ ...body, weight })} />
        </div>

        <Button variant="ai" className="mt-4 w-full" disabled={!ready || busy} onClick={start}>
          <Sparkle size={16} />
          {mode === "photo" && !photo ? "Добавьте фото" : mode === "photo" && !consent ? "Нужно согласие" : "Примерить"}
        </Button>
        <div className="mt-2 text-center text-[12px] text-mute">Генерация занимает 15–40 секунд</div>
      </div>
    </Sheet>
  );
}

function Slider({ label, unit, min, max, value, onChange }: { label: string; unit: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[14px]">
        <span className="text-mute">{label}</span>
        <span className="font-semibold">
          {value} {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#005bff]" />
    </div>
  );
}
