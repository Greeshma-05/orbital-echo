import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  Compass,
  Fuel,
  HeartPulse,
  Orbit,
  Radio,
  Shield,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useGame } from "../state/GameContext";
import { chapters } from "../data/mission";
import { canAdvance, objectives, scienceScore } from "../simulation/rules";
import { orbitStats } from "../simulation/physics";
import type { View } from "../simulation/types";
import { SpaceScene } from "../components/SpaceScene";
import {
  ChapterStrip,
  Comms,
  EventPanel,
  formatTime,
  Meter,
  PageHead,
  Panel,
  Stat,
  Tag,
} from "../components/UI";
export function Overview() {
  const { mission: s, dispatch, setView } = useGame();
  const [zoom, setZoom] = useState(1);
  const chapter = chapters[s.chapter - 1],
    goals = objectives(s);
  const orbital = s.launch.phase === "orbit";
  return (
    <>
      <PageHead
        title="Mission overview"
        description="One mission. Three lives. A universe of possibilities."
        action={
          <Tag tone={s.life.fault ? "amber" : "green"}>
            {s.life.fault
              ? "CREW ATTENTION REQUIRED"
              : "MISSION SYSTEMS ONLINE"}
          </Tag>
        }
      />
      <ChapterStrip />
      <div className="overview-grid">
        <section className="orbital-hero">
          <SpaceScene zoom={zoom} />
          <div className="scene-top">
            <span className="eyebrow">
              <span className="live-dot" /> LIVE ORBITAL FEED
            </span>
            <span className="mono">ASTRA • OE-01</span>
          </div>
          <div className="scene-title">
            <span className="eyebrow">{chapter.location}</span>
            <h2>
              {orbital ? "A new perspective." : "Our journey starts here."}
            </h2>
            <p>
              {orbital
                ? `${(s.orbit.altitude / 1000).toFixed(0)} km above the familiar. One signal beyond it.`
                : "Earth is only the beginning."}
            </p>
          </div>
          <div className="earth-label">
            <i />
            <span>
              EARTH<small>HOME • SOL SYSTEM</small>
            </span>
          </div>
          <div className="ship-label">
            <span className="target-cross" />
            <span>
              ASTRA
              <small>
                {orbital ? "ORBITAL OPERATIONS" : "AWAITING LAUNCH"}
              </small>
            </span>
          </div>
          <div className="scene-controls">
            <button
              onClick={() => setZoom(Math.min(1.4, zoom + 0.1))}
              aria-label="Zoom in orbital view"
            >
              +
            </button>
            <button
              onClick={() => setZoom(Math.max(0.7, zoom - 0.1))}
              aria-label="Zoom out orbital view"
            >
              −
            </button>
            <button
              onClick={() => setZoom(1)}
              aria-label="Reset orbital camera"
            >
              <Compass size={15} />
            </button>
          </div>
          <div className="scene-bottom">
            <div>
              <span>ALTITUDE</span>
              <b>
                {orbital ? (s.orbit.altitude / 1000).toFixed(1) : "0.0"}{" "}
                <small>km</small>
              </b>
            </div>
            <div>
              <span>VELOCITY</span>
              <b>
                {orbital
                  ? (orbitStats(s.orbit.altitude).velocity / 1000).toFixed(2)
                  : "0.00"}{" "}
                <small>km/s</small>
              </b>
            </div>
            <div>
              <span>ORBITAL PERIOD</span>
              <b>
                {orbital
                  ? (orbitStats(s.orbit.altitude).period / 60).toFixed(1)
                  : "—"}{" "}
                <small>min</small>
              </b>
            </div>
            <span className="simulated-label">SIMULATED VIEW</span>
          </div>
        </section>
        <Panel
          className="objective-panel"
          eyebrow={`CHAPTER ${String(s.chapter).padStart(2, "0")} / 05`}
          title={chapter.name}
          action={<Orbit size={20} />}
        >
          <p className="objective-intro">{chapter.briefing}</p>
          <div className="objective-list">
            {goals.map((g, i) => (
              <button
                key={g.text}
                className={g.done ? "done" : ""}
                onClick={() => setView(g.view as View)}
              >
                <span>
                  {g.done ? (
                    <Check size={13} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  {g.text}
                  <small>{g.done ? "COMPLETE" : "OPEN OPERATIONS"}</small>
                </div>
                {!g.done && <ArrowUpRight size={15} />}
              </button>
            ))}
          </div>
          <div className="objective-bottom">
            <div>
              <span>Chapter progress</span>
              <b>
                {goals.filter((g) => g.done).length}/{goals.length}
              </b>
            </div>
            <Meter
              value={(goals.filter((g) => g.done).length / goals.length) * 100}
            />
            {canAdvance(s) ? (
              <button
                className="button primary full"
                onClick={() => dispatch({ type: "ADVANCE" })}
              >
                Begin chapter {s.chapter + 1}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="button primary full"
                onClick={() =>
                  setView(
                    (goals.find((g) => !g.done)?.view ??
                      "Investigation") as View,
                  )
                }
              >
                {s.chapter === 1
                  ? "Open launch control"
                  : s.chapter === 5
                    ? "Review final strategy"
                    : "Continue mission"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </Panel>
      </div>
      <div className="resource-strip">
        <Stat
          icon={<Fuel />}
          label="MANEUVER RESERVE"
          value={s.resources.fuel.toFixed(0)}
          unit="m/s"
          detail="160 m/s return reserve"
        />
        <Stat
          icon={<Circle />}
          label="OXYGEN RESERVES"
          value={s.resources.oxygen.toFixed(1)}
          unit="%"
          detail={
            s.life.fault ? "Environmental fault active" : "Cabin supply nominal"
          }
        />
        <Stat
          icon={<Zap />}
          label="ELECTRICAL POWER"
          value={s.resources.power.toFixed(1)}
          unit="%"
          detail={
            s.telescope.active
              ? "Observation in progress"
              : "Primary bus operational"
          }
        />
        <Stat
          icon={<Shield />}
          label="VEHICLE INTEGRITY"
          value={s.integrity.toFixed(0)}
          unit="%"
          detail={
            s.integrity > 85
              ? "Structure within limits"
              : "Inspection recommended"
          }
        />
      </div>
      <div className="overview-bottom">
        <Panel
          title="The people behind the mission"
          eyebrow="CREW STATUS"
          action={
            <button
              className="text-button"
              onClick={() => setView("Crew & health")}
            >
              Manage crew
              <ArrowUpRight size={14} />
            </button>
          }
        >
          <div className="crew-mini-grid">
            {s.crew.map((c, i) => (
              <button
                className="crew-mini"
                key={c.id}
                onClick={() => setView("Crew & health")}
              >
                <div className={`avatar avatar-${i}`}>
                  {c.initials}
                  <span />
                </div>
                <div>
                  <h4>{c.name}</h4>
                  <small>{c.role}</small>
                  <span className={c.health < 55 ? "danger-text" : "muted"}>
                    <HeartPulse size={12} />
                    {c.condition}
                  </span>
                </div>
                <b>
                  {c.health.toFixed(0)}
                  <small>%</small>
                </b>
              </button>
            ))}
          </div>
        </Panel>
        <Panel
          title="From the flight deck"
          eyebrow="LATEST TRANSMISSION"
          action={<Radio size={16} />}
        >
          <div className="latest-log">
            <span className="mono">T+ {formatTime(s.log[0]?.time ?? 0)}</span>
            <p>{s.log[0]?.text}</p>
            <button
              className="text-button"
              onClick={() => setView("Mission log")}
            >
              Open mission log <ArrowRight size={14} />
            </button>
          </div>
        </Panel>
      </div>
      {s.events.length > 0 && <EventPanel />}
      <div className="page-footer">
        <Comms />
        <span>
          SCIENCE EVIDENCE {scienceScore(s).toFixed(0)}% <span>/</span> ASTRA
          FLIGHT SYSTEMS v1.0
        </span>
      </div>
    </>
  );
}
