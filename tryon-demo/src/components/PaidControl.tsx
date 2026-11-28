// Платные генерации: включаются паролем. Без него все получают бесплатную модель.
import { useEffect, useState } from "react";
import { lock, setPaidOn, unlock, usePaid } from "../lib/paid";

export default function PaidControl() {
  const p = usePaid();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null); // настроен ли платный режим на сервере

  useEffect(() => {
    fetch("/api/unlock")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(null));
  }, []);

  const submit = async () => {
    if (!pw || busy) return;
    setBusy(true);
    setErr("");
    const r = await unlock(pw);
    setBusy(false);
    if (r.ok) setPw("");
    else setErr(r.error);
  };

  const until = p.expiresAt ? new Date(p.expiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";
  const loggedIn = !!p.token && p.expiresAt > Date.now();

  return (
    <div className="mb-4 rounded-xl bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">Платные генерации</span>
        <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${p.active ? "bg-[#fff1d6] text-[#8a5a00]" : "bg-bg2 text-mute"}`}>{p.active ? "Gemini включён" : "Бесплатный режим"}</span>
      </div>
      {enabled === false && <div className="mt-2 text-[12px] text-mute">На сервере платный режим выключен или не настроен.</div>}
      {enabled !== false && !loggedIn && (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Пароль"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-[14px]"
            />
            <button onClick={submit} disabled={!pw || busy} className="rounded-lg bg-blue px-3 py-2 font-semibold text-white disabled:opacity-50">
              {busy ? "…" : "Включить"}
            </button>
          </div>
          {err && <div className="mt-1 text-[12px] text-[#c0392b]">{err}</div>}
          <div className="mt-1 text-[12px] text-mute">Пароль включает Gemini: образ целиком одним фото, лучшее качество. Без него работает бесплатная нейросеть.</div>
        </div>
      )}
      {loggedIn && (
        <div className="mt-2">
          <div className="flex gap-1 rounded-xl bg-bg2 p-1 text-[13px] font-semibold">
            {[false, true].map((on) => (
              <button key={String(on)} onClick={() => setPaidOn(on)} className={`flex-1 rounded-lg py-2 ${p.on === on ? "bg-blue text-white" : "text-ink2"}`}>
                {on ? "Платный (Gemini)" : "Бесплатный"}
              </button>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between text-[12px] text-mute">
            <span>Доступ открыт до {until}</span>
            <button onClick={lock} className="font-semibold text-blue">
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
