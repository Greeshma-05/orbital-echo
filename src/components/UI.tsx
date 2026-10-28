import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Info,
  Radio,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useGame } from "../state/GameContext";
import { chapters } from "../data/mission";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "brand-small" : ""}`}>
      <span className="brand-mark">
        <span />
      </span>
      <div>
        ORBITAL<span>ECHO</span>
        <small>ASTRA INITIATIVE</small>
      </div>
    </div>
  );
}
export function Tag({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`tag ${tone}`}>
      <i />
      {children}
    </span>
  );
}
export function Panel({
  title,
  eyebrow,
  children,
  className = "",
  action,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h3>{title}</h3>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Meter({
  value,
  label,
  color = "cyan",
  suffix = "%",
}: {
  value: number;
  label?: string;
  color?: string;
  suffix?: string;
}) {
  return (
    <div className={`meter ${color}`}>
      {label && (
        <div>
          <span>{label}</span>
          <b>
            {value.toFixed(0)}
            {suffix}
          </b>
        </div>
      )}
      <div className="meter-track">
        <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}
export function Stat({
  label,
  value,
  unit,
  icon,
  detail,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  detail?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">
        {icon}
        {label}
      </span>
      <div className="stat-value">
        {value}
        <small>{unit}</small>
      </div>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  );
}
export function Science({ children }: { children: ReactNode }) {
  const { settings } = useGame();
  return settings.science ? (
    <div className="science-note">
      <Info size={16} />
      <div>
        <b>SCIENCE MODE</b>
        <p>{children}</p>
      </div>
    </div>
  ) : null;
}
export function PageHead({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { mission } = useGame();
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">
          MISSION OE-01 <span>/</span> CHAPTER{" "}
          {String(mission.chapter).padStart(2, "0")}
        </span>
        <h1>
          {title}
          <span className="title-dot">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function EventPanel({ id }: { id?: string }) {
  const { mission, dispatch } = useGame();
  const event = id
    ? mission.events.find((e) => e.id === id)
    : mission.events[0];
  if (!event) return null;
  return (
    <div className={`event-panel ${event.severity}`}>
      <div className="event-title">
        <TriangleAlert size={18} />
        <span>
          {event.severity === "critical" ? "PRIORITY ALERT" : "FLIGHT DIRECTOR"}{" "}
          <span>/</span> DECISION REQUIRED
        </span>
      </div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <div className="event-choices">
        {event.choices.map((c) => (
          <button
            key={c.effect}
            disabled={mission.resources.parts < (c.parts ?? 0)}
            onClick={() =>
              dispatch({ type: "DECIDE", id: event.id, effect: c.effect })
            }
          >
            <span>
              {c.label}
              <ArrowUpRight size={15} />
            </span>
            <small>{c.detail}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button,input,select")?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        const items = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled):not([hidden]),select:not(:disabled),a[href]",
          ) ?? [],
        ).filter((el) => el.offsetParent !== null);
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <div className="modal-head">
          <span className="eyebrow">ASTRA INITIATIVE</span>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function ChapterStrip() {
  const { mission } = useGame();
  return (
    <div className="chapter-strip">
      {chapters.map((c, i) => (
        <div
          key={c.name}
          className={`${mission.chapter === i + 1 ? "active" : ""} ${mission.chapter > i + 1 ? "complete" : ""}`}
        >
          <span>
            {mission.chapter > i + 1 ? (
              <Check size={12} />
            ) : (
              String(i + 1).padStart(2, "0")
            )}
          </span>
          <div>
            <small>CHAPTER {i + 1}</small>
            <b>{c.name}</b>
          </div>
          {i < 4 && <ChevronRight size={13} />}
        </div>
      ))}
    </div>
  );
}
export function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function Comms() {
  const { mission } = useGame();
  return (
    <div className={`comms ${!mission.orbit.comms ? "offline" : ""}`}>
      <Radio size={15} />
      <span>
        {mission.orbit.comms
          ? "GROUND LINK ESTABLISHED"
          : "COMMUNICATION BLACKOUT"}
      </span>
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
export function SafeTag() {
  return (
    <span className="safe-tag">
      <ShieldCheck size={14} /> ALL SYSTEMS MONITORED
    </span>
  );
}
