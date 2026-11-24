// Оценка сгенерированной картинки: 👍 / 👎, а при 👎 причина одним касанием.
// Оценка относится к конкретной картинке (примерка вещи или образ целиком) и запоминается на сессию.
import { useStore } from "../store";
import { track, type Reason } from "../lib/analytics";

const REASONS: { id: Reason; label: string }[] = [
  { id: "not_me", label: "Не похоже на меня" },
  { id: "garment", label: "Вещь выглядит иначе" },
  { id: "artifacts", label: "Странности на фото" },
  { id: "fit", label: "Не так сидит" },
];

export default function RateGeneration({ target, item, imageKey, className = "" }: { target: "tryon" | "look"; item: string; imageKey: string; className?: string }) {
  const { ratings, rate } = useStore();
  const key = `${target}:${item}:${imageKey}`;
  const r = ratings[key];
  const title = target === "tryon" ? "Похоже на правду?" : "Нравится образ?";

  const send = (vote: "up" | "down", reason?: Reason) => {
    rate(key, { vote, reason });
    // дизлайк считается один раз; причина приходит отдельным событием, чтобы не удваивать счётчик
    if (reason) track({ type: "vote_reason", item, target, reason });
    else track({ type: vote === "up" ? "vote_up" : "vote_down", item, target });
  };

  return (
    <div className={`rounded-2xl border border-line px-3 py-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-ink2">{!r ? title : r.vote === "up" ? "Спасибо, рады, что получилось" : r.reason ? "Спасибо, учтём" : "Что не так?"}</span>
        <span className="flex gap-1.5">
          {(["up", "down"] as const).map((v) => (
            <button
              key={v}
              aria-label={v === "up" ? "Нравится" : "Не нравится"}
              aria-pressed={r?.vote === v}
              disabled={!!r?.reason || r?.vote === "up"}
              onClick={() => (r?.vote === v ? undefined : send(v))}
              className={`grid h-9 w-11 place-items-center rounded-xl text-[17px] transition ${r?.vote === v ? "bg-blue-soft" : "bg-bg2"} ${r && r.vote !== v ? "opacity-30" : ""}`}
            >
              {v === "up" ? "👍" : "👎"}
            </button>
          ))}
        </span>
      </div>
      {r?.vote === "down" && !r.reason && (
        <div className="rise mt-2 flex flex-wrap gap-1.5">
          {REASONS.map((x) => (
            <button key={x.id} onClick={() => send("down", x.id)} className="rounded-full bg-bg2 px-3 py-1.5 text-[13px] font-medium text-ink active:bg-blue-soft">
              {x.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
