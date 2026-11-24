// «Аналитика пилота»: те же метрики и пороги, что на слайде пилота в презентации.
import { LOOK_SKIP_LIMIT, useStore } from "../store";
import { PERSONAS } from "../data/personas";
import { computeMetrics, resetEvents, useEvents } from "../lib/analytics";
import { rub } from "../components/ui";

const pct = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`;

export default function Analytics() {
  const ev = useEvents();
  const m = computeMetrics(ev);
  const { settings, setSettings, setPerson, showToast, lookOff, setLookOff, lookSkips, persona, setPersona } = useStore();
  const uplift = m.convNoTryon > 0 ? m.convTryon / m.convNoTryon - 1 : null;
  const cards = [
    { label: "Пользуются примеркой", sub: "доля просмотров карточки с примеркой", value: m.views ? pct(m.tryonShare) : "–", ok: m.tryonShare >= 0.05, threshold: "≥5%", base: "15%", color: "text-green" },
    {
      label: "Прирост конверсии",
      sub: m.tryons
        ? `из примерки в корзину ${pct(m.convTryon)}${uplift === null ? ", без примерки покупок пока нет" : ` против ${pct(m.convNoTryon)} без неё`}`
        : "из примерки в корзину против покупок без примерки",
      value: uplift === null ? "–" : `${uplift >= 0 ? "+" : ""}${pct(uplift)}`,
      ok: uplift !== null && uplift >= 0.1,
      threshold: "≥+10%",
      base: "+12%",
      color: "text-blue",
    },
    { label: "Открыли «Что-то новое»", sub: m.newAdds ? `из него добавили в корзину: ${m.newAdds}` : "режим непривычных образов", value: String(m.newOpened), ok: m.newOpened > 0, threshold: "нет, смотрим динамику", base: "–", color: "text-ai" },
    { label: "Собрали образ", sub: m.lookShown ? `образ предложен ${m.lookShown} раз, открыт ${m.lookViews}` : "на 100 примеривших", value: m.tryons ? pct(m.lookRate) : "–", ok: m.lookRate >= 0.04, threshold: "≥4%", base: "6%", color: "text-ai" },
  ];

  return (
    <div className="px-4 pt-5 pb-8">
      <div className="inline-flex rounded-full bg-white px-3 py-1 text-[12px] text-ink2">Для комиссии</div>
      <h1 className="mt-2 text-[28px] leading-tight font-extrabold">Аналитика пилота</h1>
      <p className="mt-1 text-[14px] text-mute">События этого демо в реальном времени. В пилоте те же метрики считаются на A/B-тесте.</p>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-ai-soft px-3 py-2 text-[13px] text-ink2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-blue" />
        <b className="text-ink">Hugging Face · IDM-VTON и Leffa</b>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat v={m.views} l="просмотров" />
        <Stat v={m.tryons} l="примерок" />
        <Stat v={m.cartAfterTryon} l="в корзину после" />
      </div>

      <div className="mt-3 space-y-2">
        {cards.map((c) => (
          <div key={c.label} className="rise rounded-2xl bg-bg2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold">{c.label}</div>
                <div className="text-[12px] text-mute">{c.sub}</div>
              </div>
              <div className={`text-[30px] leading-none font-extrabold ${c.color}`}>{c.value}</div>
            </div>
            <div className="mt-3 flex gap-2 text-[12px]">
              <span className={`rounded-full px-2.5 py-1 font-semibold ${c.ok ? "bg-green text-white" : "bg-white text-ink2"}`}>Порог пилота {c.threshold}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-ink2">Основной сценарий {c.base}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-bg2 p-4">
          <div className="text-[12px] text-mute">Время примерки</div>
          <div className="mt-1 text-[22px] font-bold">{m.avgMs ? `${(m.avgMs / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} сек` : m.gensCached ? "мгновенно" : "–"}</div>
        </div>
        <div className="rounded-2xl bg-bg2 p-4">
          <div className="text-[12px] text-mute">Генерации</div>
          <div className="mt-1 text-[22px] font-bold">{m.gensPaid}</div>
          <div className="text-[11px] text-mute">
            Из кэша вкладки: {m.gensCached}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-2xl bg-bg2 p-4">
        <div className="text-[12px] text-mute">Качество генерации по оценкам покупателей</div>
        <div className="mt-1 text-[22px] font-bold">
          {m.votesUp + m.votesDown ? `${Math.round((m.votesUp / (m.votesUp + m.votesDown)) * 100)}% 👍` : "–"}
        </div>
        <div className="text-[11px] text-mute">👍 {m.votesUp} · 👎 {m.votesDown}. Защитная метрика пилота: если доля падает, растут возвраты и жалобы.</div>
        {m.votesUp + m.votesDown > 0 && (
          <div className="mt-3 space-y-1.5 text-[13px]">
            {([["tryon", "Примерка вещи"], ["look", "Образ целиком"]] as const).map(([k, label]) => {
              const v = m.votesByTarget[k];
              const n = v.up + v.down;
              return (
                <div key={k} className="flex justify-between">
                  <span className="text-ink2">{label}</span>
                  <span className="font-semibold">{n ? `${Math.round((v.up / n) * 100)}% 👍 · ${n}` : "–"}</span>
                </div>
              );
            })}
            {m.votesDown > 0 && (
              <div className="border-t border-line pt-2">
                <div className="mb-1 text-[12px] text-mute">Почему 👎</div>
                {([["not_me", "Не похоже на меня"], ["garment", "Вещь выглядит иначе"], ["artifacts", "Странности на фото"], ["fit", "Не так сидит"]] as const).map(([k, label]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-ink2">{label}</span>
                    <span className="font-semibold">{m.reasons[k]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 rounded-2xl bg-bg2 p-4">
        <div className="text-[12px] text-mute">Сумма корзин</div>
        <div className="mt-1 text-[22px] font-bold">{rub(m.cartSum)}</div>
      </div>

      <details className="mt-6 rounded-2xl bg-bg2 p-4 text-[14px]">
        <summary className="cursor-pointer font-semibold text-ink2">Настройки демо</summary>
        <div className="mt-4">
          <span className="text-mute">Покупатель (история заказов)</span>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {PERSONAS.map((p) => (
              <button key={p.id} onClick={() => { setPersona(p.id); showToast(`Покупатель: ${p.label}`); }} className={`rounded-xl px-3 py-2 text-left text-[13px] ${persona === p.id ? "bg-blue text-white" : "bg-white text-ink2"}`}>
                <span className="block font-semibold">{p.label}</span>
                <span className={persona === p.id ? "text-white/80" : "text-mute"}>{p.hint}</span>
              </button>
            ))}
          </div>
          <div className="mt-1 text-[12px] text-mute">Меняет гардероб и профиль стиля, а с ними образы «Для вас» и «Что-то новое».</div>
        </div>
        <label className="mt-4 block">
          <span className="text-mute">Таймаут живой генерации, сек</span>
          <input
            type="number"
            min={5}
            max={180}
            value={settings.timeoutSec}
            onChange={(e) => setSettings({ ...settings, timeoutSec: Math.max(5, Math.min(180, Number(e.target.value) || 90)) })}
            className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-ink outline-none"
          />
        </label>
        <div className="mt-3">
          <span className="text-mute">Примерка по росту и весу</span>
          <div className="mt-1 flex rounded-xl bg-white p-1 text-[13px] font-semibold">
            {([true, false] as const).map((live) => (
              <button key={String(live)} onClick={() => setSettings({ ...settings, liveGen: live })} className={`flex-1 rounded-lg py-2 ${settings.liveGen === live ? "bg-blue text-white" : "text-ink2"}`}>
                {live ? "Генерировать вживую" : "Повторно из кэша"}
              </button>
            ))}
          </div>
          <div className="mt-1 text-[12px] text-mute">
            {settings.liveGen ? "Каждая новая примерка отправляется в Hugging Face." : "Повторная примерка того же аватара и вещи берётся из кэша этой вкладки."}
          </div>
        </div>
        <div className="mt-3">
          <span className="text-mute">Когда собирать образ при примерке по фото</span>
          <div className="mt-1 flex rounded-xl bg-white p-1 text-[13px] font-semibold">
            {(["eager", "intent"] as const).map((p) => (
              <button key={p} onClick={() => setSettings({ ...settings, lookPolicy: p })} className={`flex-1 rounded-lg py-2 ${settings.lookPolicy === p ? "bg-blue text-white" : "text-ink2"}`}>
                {p === "eager" ? "Сразу" : "По интересу (4 сек)"}
              </button>
            ))}
          </div>
          <div className="mt-1 text-[12px] text-mute">
            {lookOff ? "Покупатель отключил автоподбор образов." : lookSkips >= LOOK_SKIP_LIMIT ? `Образы проигнорированы ${lookSkips} раза подряд, автоподбор приостановлен.` : `Проигнорировано подряд: ${lookSkips} из ${LOOK_SKIP_LIMIT}.`}{" "}
            {(lookOff || lookSkips > 0) && (
              <button onClick={() => setLookOff(false)} className="font-semibold text-blue">
                Сбросить
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              resetEvents();
              showToast("Статистика сброшена");
            }}
            className="rounded-xl bg-white py-3 font-semibold"
          >
            Сбросить статистику
          </button>
          <button
            onClick={() => {
              setPerson(null);
              showToast("Фото и примерки удалены");
            }}
            className="rounded-xl bg-white py-3 font-semibold"
          >
            Удалить фото
          </button>
        </div>
      </details>
    </div>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div className="rounded-2xl bg-bg2 p-3 text-center">
      <div className="text-[24px] font-extrabold">{v}</div>
      <div className="text-[11px] leading-tight text-mute">{l}</div>
    </div>
  );
}
