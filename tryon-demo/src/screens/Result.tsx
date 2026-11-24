// Результат примерки: два слайда. «Только вещь» всегда первый, «В образе» собирается сам и ждёт рядом.
// В корзину без явного нажатия ничего не попадает.
import { useCallback, useEffect, useRef, useState } from "react";
import { byId } from "../data/catalog";
import { LOOK_SKIP_LIMIT, useStore } from "../store";
import { BottomBar, Button, cardPrice, Header, Icon, rub, Sparkle } from "../components/ui";
import { BeforeAfter, Generating } from "../components/TryOnView";
import TryOnSheet from "../components/TryOnSheet";
import { LookItems, LookReasons, LookSwitcher, lookPrice, sizeOf, useLooks } from "../components/LookEditor";
import { visualItem } from "../lib/stylist";
import { recommendSize } from "../lib/size";
import { fallback, tryOn, TryOnError } from "../lib/tryon";
import { track } from "../lib/analytics";

type State = { k: "loading" } | { k: "done"; source: string } | { k: "error"; err: TryOnError };
type LookState = { k: "idle" } | { k: "loading" } | { k: "ready"; image: string; preview: boolean } | { k: "error" };

/** Через сколько секунд на экране результата считаем, что покупателю интересно (политика «по интересу») */
const INTENT_DWELL_MS = 4000;

export default function Result({ id }: { id: string }) {
  const item = byId(id);
  const { person, results, setResult, settings, body, addToCart, showToast, tab, lookOff, setLookOff, lookSkips, noteLook } = useStore();
  const [st, setSt] = useState<State>(results[id] ? { k: "done", source: "cache" } : { k: "loading" });
  const [sheet, setSheet] = useState(false);
  const advice = recommendSize(item, body);
  const base = results[id];

  // ---------- основная примерка ----------
  const run = useCallback(() => {
    if (!person) return;
    setSt({ k: "loading" });
    tryOn({ person: person.image, item, timeoutMs: settings.timeoutSec * 1000, accessCode: settings.accessCode, mode: person.mode, cacheable: person.mode === "avatar" && !settings.liveGen })
      .then((r) => {
        setResult(id, r.image);
        setSt({ k: "done", source: r.source });
      })
      .catch((e: TryOnError) => {
        track({ type: "tryon_fail", item: id });
        setSt({ k: "error", err: e });
      });
  }, [person, item, id, settings, setResult]);

  useEffect(() => {
    if (!results[id]) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, person]);

  // ---------- образ ----------
  // Несколько образов от стилиста; покупатель может переключать их и править вещи
  const { ctx, looks, look: current, idx: lookIdx, setIdx: setLookIdx, change: changeLook } = useLooks(id);
  const second = current ? visualItem(current) : undefined; // вещь, которую нейросеть надевает вторым слоем
  const [slide, setSlide] = useState<0 | 1>(0);
  const [look, setLook] = useState<LookState>({ k: "idle" });
  const [wanted, setWanted] = useState(false); // пора ли собирать образ
  const [attempt, setAttempt] = useState(0);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const viewed = useRef(false);
  const shown = useRef(false);

  // Собираем сами, только если покупатель не отказался и не игнорировал образы несколько раз подряд
  const auto = looks.length > 0 && !lookOff && lookSkips < LOOK_SKIP_LIMIT;
  const baseIsMock = st.k === "done" && st.source === "mock";

  useEffect(() => {
    if (!base || !auto || wanted) return;
    // Аватары: всегда сразу (в проде такие пары кэшируются). Фото: по настройке.
    if (person?.mode === "avatar" || settings.lookPolicy === "eager") {
      setWanted(true);
      return;
    }
    const t = setTimeout(() => setWanted(true), INTENT_DWELL_MS);
    return () => clearTimeout(t);
  }, [base, auto, wanted, person, settings.lookPolicy]);

  useEffect(() => {
    if (!base) {
      setLook({ k: "idle" });
      setWanted(false);
      setSlide(0);
      return;
    }
    if (!wanted || !current) return;
    if (!second) {
      // образ без второго слоя на фото (например, к платью только обувь): фото основной вещи и список
      setLook({ k: "ready", image: base, preview: baseIsMock });
      shown.current = true;
      return;
    }
    let alive = true;
    setLook({ k: "loading" });
    // Цепочка: результат основной примерки → поверх него вторая вещь. Основная вещь на обоих слайдах одна и та же.
    tryOn({ person: base, item: second, timeoutMs: settings.timeoutSec * 1000, accessCode: settings.accessCode, cacheable: person?.mode === "avatar" && !settings.liveGen })
      .then((r) => {
        if (!alive) return;
        setLook({ k: "ready", image: r.image, preview: baseIsMock || r.source === "mock" });
        if (r.source !== "cache") track({ type: "look_ready", item: id });
        shown.current = true;
      })
      .catch(async () => {
        // Если основная картинка сама пример без нейросети, образ тоже показываем примером
        if (baseIsMock) {
          const r = await fallback(base, second);
          if (alive) {
            setLook({ k: "ready", image: r.image, preview: baseIsMock || r.source === "mock" });
            shown.current = true;
          }
        } else if (alive) setLook({ k: "error" });
      });
    return () => {
      alive = false;
    };
  }, [base, wanted, second, !!current, attempt, settings.timeoutSec, settings.accessCode, settings.liveGen, id, baseIsMock, person?.mode]);

  // Уходя с экрана, запоминаем: предложенный образ открыли или проигнорировали
  useEffect(
    () => () => {
      if (shown.current) noteLook(viewed.current);
    },
    [noteLook],
  );

  const openLook = () => {
    setSlide(1);
    setWanted(true);
    if (!viewed.current) {
      viewed.current = true;
      track({ type: "look_view", item: id });
    }
  };

  if (!person) {
    return (
      <div>
        <Header title="Примерка" />
        <div className="p-6 text-center text-ink2">
          Сначала добавьте фото или параметры.
          <Button variant="ai" className="mt-4 w-full" onClick={() => setSheet(true)}>
            Начать примерку
          </Button>
        </div>
        {sheet && <TryOnSheet item={item} onClose={() => setSheet(false)} onStart={() => setSheet(false)} />}
      </div>
    );
  }

  const lookItems = current ? current.items.filter((x) => !x.owned).map((x) => x.item) : [item]; // вещи из гардероба не покупаем
  const lookTotal = current ? lookPrice(current) : cardPrice(item.price);
  const mainSize = advice?.size ?? item.sizes[0];
  const shortName = item.title.split(/[\s-]/)[0].toLowerCase();

  // «Показать другу»: системное меню «Поделиться», а где его нет, сохраняем картинку
  const share = async (image: string) => {
    track({ type: "share", item: id });
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], "primerka.jpg", { type: blob.type || "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.title, text: "Как тебе? Примерка на Ozon" });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "primerka.jpg";
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Картинка сохранена, можно отправить другу");
    } catch {
      /* покупатель закрыл меню «Поделиться» */
    }
  };

  const addMain = () => {
    addToCart({ id, size: mainSize, source: "tryon" });
    showToast(`В корзине · размер ${mainSize}`);
  };
  const addLook = () => {
    lookItems.forEach((it) => addToCart({ id: it.id, size: sizeOf(it, body), source: it.id === id ? "tryon" : "look" }));
    track({ type: "look_add", item: id, price: lookTotal });
    showToast(`Образ в корзине · ${rub(lookTotal)}`);
    tab({ name: "cart" });
  };

  return (
    <div className="pb-6">
      <Header title={st.k === "loading" ? "Примеряем…" : "Ваша примерка"} />
      <div className="px-4 pt-2">
        {st.k === "loading" && (
          <>
            <Generating image={person.image} />
            {/* пока ждём, уже даём пользу: размер известен без картинки */}
            {advice && (
              <div className="rise mt-4 flex items-center gap-3 rounded-2xl bg-green-soft p-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-green text-[18px] font-bold text-white">{advice.size}</div>
                <div>
                  <div className="text-[15px] font-semibold">Пока примеряем: ваш размер {advice.size}</div>
                  <div className="text-[13px] text-ink2">{advice.note}</div>
                </div>
              </div>
            )}
            <div className="mt-3 text-center text-[13px] text-mute">Можно вернуться к покупкам: примерка сохранится в вашей примерочной на главной</div>
          </>
        )}

        {st.k === "error" && (
          <div className="rise rounded-2xl bg-bg2 p-6 text-center">
            <div className="text-[40px]">⏳</div>
            <div className="mt-2 text-[17px] font-semibold">{st.err.message}</div>
            <div className="mt-1 text-[14px] text-mute">Можно повторить или посмотреть пример результата</div>
            <div className="mt-5 grid gap-2">
              <Button onClick={run}>Повторить</Button>
              <Button
                variant="white"
                onClick={async () => {
                  const r = await fallback(person.image, item);
                  setResult(id, r.image);
                  setSt({ k: "done", source: "mock" });
                }}
              >
                Показать пример
              </Button>
            </div>
          </div>
        )}

        {st.k === "done" && base && (
          <div className="rise">
            {/* вкладки слайдов */}
            {looks.length > 0 && (
              <div className="mb-2 flex rounded-xl bg-bg2 p-1 text-[14px] font-semibold">
                <button onClick={() => setSlide(0)} className={`flex-1 truncate rounded-[10px] px-2 py-2 transition ${slide === 0 ? "bg-white text-ink shadow-sm" : "text-mute"}`}>
                  Только {shortName}
                </button>
                <button onClick={openLook} className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 transition ${slide === 1 ? "bg-white shadow-sm" : ""}`}>
                  <span className="ai-text flex items-center gap-1">
                    <span className="text-ai">
                      <Sparkle size={13} />
                    </span>
                    В образе
                  </span>
                  {look.k === "loading" && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ai/30 border-t-ai" />}
                  {look.k === "ready" && slide === 0 && !viewed.current && <span className="h-2 w-2 rounded-full bg-green" />}
                </button>
              </div>
            )}

            {/* слайд 1: только вещь */}
            {slide === 0 && (
              <div className="relative">
                <BeforeAfter before={person.image} after={base} preview={baseIsMock} />
                {baseIsMock && <p className="mt-2 text-center text-[13px] text-ink2">Посадка одежды условная</p>}
                {look.k === "ready" && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={openLook}
                    className="rise ai-grad absolute right-3 bottom-3 flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[14px] font-semibold text-white shadow-lg"
                  >
                    <span className="h-9 w-9 overflow-hidden rounded-full border-2 border-white/70 bg-white">
                      <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                    </span>
                    Образ готов {Icon.chevron(14)}
                  </button>
                )}
                {look.k === "loading" && (
                  <div className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[13px] font-medium text-ink2 shadow backdrop-blur">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ai/30 border-t-ai" />
                    Собираем образ
                  </div>
                )}
              </div>
            )}

            {/* слайд 2: образ */}
            {slide === 1 && current && (
              <>
                <LookSwitcher looks={looks} idx={lookIdx} onSelect={setLookIdx} />
                {look.k === "ready" ? (
                  <div className="fade">
                  <BeforeAfter before={person.image} after={look.image} label="Образ на вас" preview={look.preview} />
                  {look.preview && <p className="mt-2 text-center text-[13px] text-ink2">Посадка одежды условная</p>}
                  <LookReasons look={current} />
                  </div>
                ) : look.k === "error" ? (
                  <div className="rounded-2xl bg-bg2 p-6 text-center">
                    <div className="text-[17px] font-semibold">Не получилось собрать образ</div>
                    <div className="mt-1 text-[14px] text-mute">Основная примерка готова, образ можно попробовать ещё раз</div>
                    <Button variant="white" className="mx-auto mt-4" size="md" onClick={() => setAttempt((a) => a + 1)}>
                      Повторить
                    </Button>
                  </div>
                ) : (
                  <Generating image={base} label="Собираем образ" />
                )}

                {look.k === "ready" && (
                  <>
                    <LookItems look={current} ctx={ctx} onChange={changeLook} visualId={second?.id} />
                    <div className="mt-3 flex items-center justify-end text-[13px]">
                      {!lookOff && (
                        <button
                          onClick={() => {
                            setLookOff(true);
                            track({ type: "look_off", item: id });
                            setSlide(0);
                            showToast("Больше не собираем образы сами");
                          }}
                          className="text-mute"
                        >
                          Не показывать образы
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* под первым слайдом: вещь, размер, действия */}
            {slide === 0 && (
              <>
                {advice && (
                  <div className="mt-2 flex items-center gap-3 rounded-2xl bg-green-soft p-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-green text-[18px] font-bold text-white">{advice.size}</div>
                    <div>
                      <div className="text-[15px] font-semibold">Рекомендуем {advice.size}</div>
                      <div className="text-[13px] text-ink2">По росту {body.height} см, весу {body.weight} кг и размерной сетке. {advice.note}</div>
                    </div>
                  </div>
                )}
                <Button className="mt-3 w-full" onClick={addMain}>В корзину{advice ? ` · ${advice.size}` : ""}</Button>
                {looks.length > 0 && <Button variant="soft" className="mt-2 w-full" onClick={openLook}><Sparkle size={15} /> Собрать образ</Button>}
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line p-3">
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-bg2">
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{item.title}</div>
                    <div className="text-[15px] font-bold text-green">{rub(cardPrice(item.price))}</div>
                  </div>
                </div>
                {/* оценка качества: сигнал для Ozon, насколько примерке можно верить */}
                {st.source !== "mock" && (
                  <div className="mt-2 flex items-center justify-between rounded-2xl border border-line px-3 py-2">
                    <span className="text-[14px] text-ink2">{vote ? "Спасибо, учтём" : "Похоже на правду?"}</span>
                    <span className="flex gap-1.5">
                      {(["up", "down"] as const).map((v) => (
                        <button
                          key={v}
                          disabled={!!vote}
                          onClick={() => {
                            setVote(v);
                            track({ type: v === "up" ? "vote_up" : "vote_down", item: id });
                          }}
                          className={`grid h-9 w-11 place-items-center rounded-xl text-[17px] transition ${vote === v ? "bg-blue-soft" : "bg-bg2"} ${vote && vote !== v ? "opacity-30" : ""}`}
                        >
                          {v === "up" ? "👍" : "👎"}
                        </button>
                      ))}
                    </span>
                  </div>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button variant="white" size="md" className="!px-2 !text-[13px]" onClick={() => setSheet(true)}>
                    Другое фото
                  </Button>
                  <Button variant="white" size="md" className="!px-2 !text-[13px]" onClick={() => tab({ name: "catalog" })}>
                    Другие вещи
                  </Button>
                  <Button variant="white" size="md" className="!px-2 !text-[13px]" onClick={() => share(base)}>
                    Поделиться
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {st.k === "done" && slide === 1 && current && look.k !== "error" && (
          <BottomBar>
            <div className="flex w-full flex-col gap-1">
              <Button variant="ai" className="w-full" disabled={look.k !== "ready"} onClick={addLook}>
                <Sparkle size={15} /> {look.k === "ready" ? `${lookItems.length > 1 ? `Образ в корзину · ${lookItems.length} вещи` : "В корзину"} · ${rub(lookTotal)}` : "Собираем образ…"}
              </Button>
              <button onClick={addMain} className="py-1.5 text-[14px] font-medium text-blue">
                Только эта вещь · {rub(cardPrice(item.price))}
              </button>
            </div>
          </BottomBar>
        )}

      {sheet && <TryOnSheet item={item} onClose={() => setSheet(false)} onStart={() => setSheet(false)} />}
    </div>
  );
}
