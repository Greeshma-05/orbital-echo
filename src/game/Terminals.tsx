import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Crosshair,
  ShieldCheck,
  Telescope as TelescopeIcon,
} from "lucide-react";
import { useGame } from "../state/GameContext";
import {
  engines,
  orbitStats,
  rocketStats,
  transferCost,
} from "../simulation/physics";
import { canAdvance } from "../simulation/rules";
import { targets } from "../data/mission";
import { EventPanel, Meter, Science } from "../components/UI";
import { Telescope } from "../features/Telescope";
import { Crew } from "../features/Crew";
import { Investigation, MissionLog, Resources } from "../features/Mission";
import { SettingsContent } from "../features/Menu";
import type { Terminal } from "./world";

export function InspectionTerminal({ close }: { close: () => void }) {
  const { mission: s, dispatch } = useGame();
  const stats = rocketStats(s.rocket);
  return (
    <>
      <span className="terminal-kicker">PHYSICAL INSPECTION / ASTRA LV</span>
      <h2>Know your vehicle.</h2>
      <p className="terminal-copy">
        The pump sensor recorded a vibration. Inspect the assembly, configure
        the vehicle, and verify its flight envelope before rollout.
      </p>
      <div className="game-instruments">
        <div>
          <span>LIFTOFF MASS</span>
          <b>
            {(stats.mass / 1000).toFixed(1)}
            <small>t</small>
          </b>
        </div>
        <div>
          <span>THRUST / WEIGHT</span>
          <b>{stats.twr.toFixed(2)}</b>
        </div>
        <div>
          <span>IDEAL DELTA-V</span>
          <b>
            {stats.deltaV.toFixed(0)}
            <small>m/s</small>
          </b>
        </div>
      </div>
      <fieldset disabled={s.launch.phase !== "preflight"}>
        <label>
          Engine
          <select
            value={s.rocket.engine}
            aria-label="Rocket engine"
            onChange={(e) =>
              dispatch({
                type: "CONFIG",
                config: { engine: e.target.value as typeof s.rocket.engine },
              })
            }
          >
            {Object.entries(engines).map(([id, e]) => (
              <option key={id} value={id}>
                {e.name} · {(e.thrust / 1e6).toFixed(1)} MN
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Stages
            <select
              aria-label="Rocket stages"
              value={s.rocket.stages}
              onChange={(e) =>
                dispatch({
                  type: "CONFIG",
                  config: { stages: +e.target.value },
                })
              }
            >
              {[1, 2, 3].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Boosters
            <select
              aria-label="Rocket boosters"
              value={s.rocket.boosters}
              onChange={(e) =>
                dispatch({
                  type: "CONFIG",
                  config: { boosters: +e.target.value },
                })
              }
            >
              {[0, 2, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Propellant<b>{(s.rocket.fuel / 1000).toFixed(0)} t</b>
          <input
            type="range"
            aria-label="Rocket propellant"
            min="80000"
            max="360000"
            step="10000"
            value={s.rocket.fuel}
            onChange={(e) =>
              dispatch({ type: "CONFIG", config: { fuel: +e.target.value } })
            }
          />
        </label>
        <label>
          Payload<b>{(s.rocket.payload / 1000).toFixed(0)} t</b>
          <input
            type="range"
            aria-label="Rocket payload"
            min="2000"
            max="30000"
            step="1000"
            value={s.rocket.payload}
            onChange={(e) =>
              dispatch({ type: "CONFIG", config: { payload: +e.target.value } })
            }
          />
        </label>
        <label>
          Scientific instrument
          <select
            aria-label="Scientific instrument"
            value={s.rocket.instrument}
            onChange={(e) =>
              dispatch({
                type: "CONFIG",
                config: {
                  instrument: e.target.value as typeof s.rocket.instrument,
                },
              })
            }
          >
            <option>Spectrometer</option>
            <option>Wide-field camera</option>
            <option>Interferometer</option>
          </select>
        </label>
      </fieldset>
      <EventPanel id="vibration" />
      {s.launch.vibration && (
        <button
          className="button primary full"
          disabled={s.launch.phase !== "preflight"}
          onClick={() => dispatch({ type: "PREFLIGHT" })}
        >
          <ShieldCheck size={16} />
          {s.launch.checked
            ? "Vehicle verified — recheck"
            : "Complete preflight inspection"}
        </button>
      )}
      {s.launch.checked && (
        <div className="physical-success">
          <Check size={18} />
          <span>
            Inspection complete. Walk through the west hangar doorway to launch
            control.
          </span>
          <button className="text-button" onClick={close}>
            Return to hangar
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      <p className="terminal-feedback" role="status">
        {s.log[0]?.text}
      </p>
      <Science>
        Δv = Isp × g₀ × ln(m₀/mf). The vehicle must exceed 1.15 thrust-to-weight
        and 9,300 m/s ideal delta-v. The 3D ascent uses the same fuel, mass,
        thrust, gravity, and drag model.
      </Science>
    </>
  );
}
export function FlightTerminal() {
  const { mission: s, dispatch } = useGame();
  const stats = rocketStats(s.rocket);
  return (
    <>
      <span className="terminal-kicker">ASTRA / FLIGHT GUIDANCE</span>
      <h2>
        {s.launch.phase === "orbit"
          ? "Orbital insertion confirmed."
          : "The sky is behind us."}
      </h2>
      <div className="game-instruments">
        <div>
          <span>ALTITUDE</span>
          <b>
            {(s.launch.altitude / 1000).toFixed(1)}
            <small>km</small>
          </b>
        </div>
        <div>
          <span>VELOCITY</span>
          <b>
            {s.launch.velocity.toFixed(0)}
            <small>m/s</small>
          </b>
        </div>
        <div>
          <span>THRUST</span>
          <b>
            {(s.launch.thrust / 1e6).toFixed(2)}
            <small>MN</small>
          </b>
        </div>
        <div>
          <span>VEHICLE MASS</span>
          <b>
            {(s.launch.mass / 1000).toFixed(1)}
            <small>t</small>
          </b>
        </div>
        <div>
          <span>DYNAMIC PRESSURE</span>
          <b>
            {(s.launch.pressure / 1000).toFixed(1)}
            <small>kPa</small>
          </b>
        </div>
        <div>
          <span>ACTIVE STAGE</span>
          <b>
            {s.launch.stage + 1}
            <small>/ {s.rocket.stages}</small>
          </b>
        </div>
      </div>
      <Meter
        label="Launch propellant"
        value={
          (s.launch.stageFuel.reduce((a, b) => a + b, 0) /
            stats.fuels.reduce((a, b) => a + b, 0)) *
          100
        }
      />
      <Meter label="Vehicle integrity" value={s.integrity} />
      <p className="terminal-copy">
        At burnout, return to the flight deck and press E at the right-hand
        staging console. T cycles flight time acceleration.
      </p>
      {s.launch.failure && <p className="inline-warning">{s.launch.failure}</p>}
      <div className="speed-selector">
        <span>SIMULATION RATE</span>
        {[1, 2, 5, 10].map((n) => (
          <button
            key={n}
            className={s.speed === n ? "active" : ""}
            onClick={() => dispatch({ type: "SPEED", speed: n })}
          >
            {n}×
          </button>
        ))}
      </div>
    </>
  );
}
export function NavigationTerminal() {
  const { mission: s, dispatch } = useGame();
  const [altitude, setAltitude] = useState(540),
    [probe, setProbe] = useState(900);
  const cost = transferCost(s.orbit.altitude, altitude * 1000);
  const stats = orbitStats(altitude * 1000);
  return (
    <>
      <span className="terminal-kicker">FLIGHT DECK / NAVCON</span>
      <h2>
        A little velocity.
        <br />A different destination.
      </h2>
      <p className="terminal-copy">
        Hubble’s service orbit is at 540 km. Transfer, cancel the relative
        velocity, then approach. Your return burn requires 160 m/s.
      </p>
      <div className="navigation-radar">
        <div />
        <i />
        <span>EARTH / HST 540 KM</span>
        <b>
          {(s.orbit.altitude / 1000).toFixed(0)} → {altitude} km
        </b>
      </div>
      <label>
        Destination
        <select
          aria-label="Orbital destination"
          value={altitude}
          onChange={(e) => setAltitude(+e.target.value)}
        >
          <option value={540}>Hubble service orbit · 540 km</option>
          <option value={800}>Relay orbit · 800 km</option>
          <option value={1200}>High observation orbit · 1200 km</option>
        </select>
      </label>
      <div className="key-value">
        <span>Transfer cost</span>
        <b>{cost.toFixed(1)} m/s</b>
      </div>
      <div className="key-value">
        <span>Orbital velocity / period</span>
        <b>
          {(stats.velocity / 1000).toFixed(2)} km/s ·{" "}
          {(stats.period / 60).toFixed(1)} min
        </b>
      </div>
      <div className="key-value">
        <span>Remaining maneuver reserve</span>
        <b>{s.resources.fuel.toFixed(0)} m/s</b>
      </div>
      <button
        className="button primary full"
        disabled={
          s.launch.phase !== "orbit" ||
          s.orbit.rendezvous ||
          cost < 1 ||
          cost > s.resources.fuel - 160
        }
        onClick={() =>
          dispatch({ type: "MANEUVER", altitude: altitude * 1000 })
        }
      >
        Execute transfer
        <ArrowRight size={15} />
      </button>
      <div className="form-row">
        <button
          className="button secondary full"
          disabled={
            s.launch.phase !== "orbit" ||
            Math.abs(s.orbit.altitude - 540000) > 5000 ||
            s.orbit.matched ||
            s.resources.fuel < 195
          }
          onClick={() => dispatch({ type: "MATCH" })}
        >
          {s.orbit.matched ? <Check size={15} /> : null}Match relative velocity
        </button>
        <button
          className="button secondary full"
          disabled={
            !s.orbit.matched || s.orbit.rendezvous || s.resources.fuel < 175
          }
          onClick={() => dispatch({ type: "DOCK" })}
        >
          {s.orbit.rendezvous ? <Check size={15} /> : null}Approach Hubble
        </button>
      </div>
      {s.orbit.rendezvous && (
        <p className="success-text">
          Docking umbilical connected. Walk aft to the Hubble service rack.
        </p>
      )}
      <EventPanel id="blackout" />
      {s.chapter === 5 && (
        <>
          <div className="divider" />
          <h3>Optional relay probe</h3>
          <label>
            Probe orbit<b>{probe} km</b>
            <input
              type="range"
              min="600"
              max="2000"
              step="50"
              value={probe}
              onChange={(e) => setProbe(+e.target.value)}
              aria-label="Probe orbit"
            />
          </label>
          <button
            className="button secondary full"
            disabled={
              s.probe ||
              s.resources.power < 8 ||
              s.resources.fuel <
                240 + transferCost(s.orbit.altitude, probe * 1000)
            }
            onClick={() => dispatch({ type: "PROBE", target: probe * 1000 })}
          >
            {s.probe
              ? "Probe transmitting"
              : `Deploy probe · ${(80 + transferCost(s.orbit.altitude, probe * 1000)).toFixed(0)} m/s`}
          </button>
        </>
      )}
      <Science>
        Circular orbital speed is √(μ/r). These idealized two-body maneuvers
        apply both Hohmann transfer burns together. Matching altitude alone does
        not match relative velocity.
      </Science>
    </>
  );
}
function AimScope({
  aim,
  setAim,
  target,
  active,
}: {
  aim: { x: number; y: number };
  setAim: (v: { x: number; y: number }) => void;
  target: string;
  active: boolean;
}) {
  const stars = useMemo(
    () =>
      Array.from({ length: 75 }, (_, i) => ({
        x: (Math.sin(i * 127.1) * 0.5 + 0.5) * 100,
        y: (Math.cos(i * 77.3) * 0.5 + 0.5) * 100,
        size: i % 5 === 0 ? 2 : 1,
      })),
    [],
  );
  const tx = target === "anomaly" ? 57 : target === "galaxy" ? 42 : 63,
    ty = target === "anomaly" ? 43 : target === "galaxy" ? 58 : 53;
  return (
    <div
      className={`aim-scope ${active ? "acquiring" : ""}`}
      role="application"
      aria-label="Telescope aiming field. Click the bright star or use arrow keys to align the reticle."
      tabIndex={0}
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setAim({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
        e.currentTarget.focus();
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) {
          const r = e.currentTarget.getBoundingClientRect();
          setAim({
            x: Math.max(
              0,
              Math.min(100, ((e.clientX - r.left) / r.width) * 100),
            ),
            y: Math.max(
              0,
              Math.min(100, ((e.clientY - r.top) / r.height) * 100),
            ),
          });
        }
      }}
      onKeyDown={(e) => {
        const d = {
          ArrowLeft: [-2, 0],
          ArrowRight: [2, 0],
          ArrowUp: [0, -2],
          ArrowDown: [0, 2],
        }[e.key];
        if (d) {
          e.preventDefault();
          e.stopPropagation();
          setAim({
            x: Math.max(0, Math.min(100, aim.x + d[0])),
            y: Math.max(0, Math.min(100, aim.y + d[1])),
          });
        }
      }}
    >
      {stars.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
      <span className="scope-star" style={{ left: `${tx}%`, top: `${ty}%` }} />
      <span
        className="scope-cross"
        style={{ left: `${aim.x}%`, top: `${aim.y}%` }}
      />
      <span className="scope-meta">
        GUIDE STAR / {active ? "ACQUIRING" : "ALIGN RETICLE"}
      </span>
    </div>
  );
}
export function ScienceTerminal() {
  const { mission: s, dispatch } = useGame();
  const [target, setTarget] = useState("anomaly"),
    [filter, setFilter] = useState("Visible"),
    [exposure, setExposure] = useState(40),
    [aim, setAim] = useState({ x: 28, y: 67 }),
    [details, setDetails] = useState(false);
  const tx = target === "anomaly" ? 57 : target === "galaxy" ? 42 : 63,
    ty = target === "anomaly" ? 43 : target === "galaxy" ? 58 : 53;
  const accuracy = Math.max(0, 100 - Math.hypot(aim.x - tx, aim.y - ty) * 3);
  const active = s.telescope.active;
  function point(v: { x: number; y: number }) {
    setAim(v);
    dispatch({
      type: "POINT",
      accuracy: Math.max(0, 100 - Math.hypot(v.x - tx, v.y - ty) * 3),
    });
  }
  if (details)
    return (
      <div className="terminal-detailed">
        <button className="text-button" onClick={() => setDetails(false)}>
          <ChevronLeft size={15} />
          Return to optical controls
        </button>
        <Telescope />
      </div>
    );
  return (
    <>
      <span className="terminal-kicker">OPTICAL WORKSTATION / ECHO</span>
      <h2>Find the signal.</h2>
      <p className="terminal-copy">
        Aim the reticle at the bright guide star. An accurate pointing solution
        improves the photons captured by your instrument.
      </p>
      {!s.telescope.deployed && (
        <button
          className="button primary full"
          disabled={!s.telescope.repaired || s.resources.power < 6}
          onClick={() => dispatch({ type: "DEPLOY" })}
        >
          Deploy Echo observatory · 6 power
        </button>
      )}
      <div className="form-row">
        <label>
          Observation target
          <select
            aria-label="Observation target"
            disabled={!!active}
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setAim({ x: 28, y: 67 });
              dispatch({ type: "POINT", accuracy: 30 });
            }}
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter
          <select
            aria-label="Observation filter"
            disabled={!!active}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>Visible</option>
            <option>Infrared</option>
            <option>Ultraviolet</option>
          </select>
        </label>
      </div>
      <AimScope aim={aim} setAim={point} target={target} active={!!active} />
      <div className="scope-status">
        <span>
          <Crosshair size={14} />
          {accuracy >= 85 ? "TARGET LOCK" : "ALIGNMENT REQUIRED"}
        </span>
        <b>{accuracy.toFixed(0)}%</b>
      </div>
      <label>
        Exposure<b>{exposure} s</b>
        <input
          aria-label="Exposure time"
          type="range"
          min="10"
          max="120"
          step="10"
          disabled={!!active}
          value={exposure}
          onChange={(e) => setExposure(+e.target.value)}
        />
      </label>
      <button
        className="button primary full"
        disabled={
          accuracy < 85 ||
          !!active ||
          !s.telescope.deployed ||
          s.resources.power < 5 ||
          s.resources.observationTime < exposure / 60
        }
        onClick={() => {
          dispatch({ type: "POINT", accuracy });
          dispatch({
            type: "OBSERVE",
            target,
            filter,
            exposure,
            duration: exposure,
          });
        }}
      >
        <TelescopeIcon size={16} />
        {active ? "Acquiring photons…" : "Acquire observation"}
      </button>
      {active && (
        <Meter
          value={(active.progress / active.duration) * 100}
          label={`Acquisition · ${Math.ceil(active.duration - active.progress)}s remaining`}
        />
      )}
      <EventPanel id="power" />
      <EventPanel id="blackout" />
      <div className="terminal-datasets">
        {[...s.telescope.observations].reverse().map((o) => (
          <div key={o.id}>
            <span>
              <b>
                OE-{String(o.id).padStart(3, "0")} ·{" "}
                {targets.find((t) => t.id === o.target)?.name}
              </b>
              <small>
                {o.filter} / {o.quality.toFixed(0)}% quality / SNR{" "}
                {o.snr.toFixed(1)}
              </small>
            </span>
            <button
              className="button secondary compact"
              disabled={o.analyzed || s.resources.power < 1}
              onClick={() => dispatch({ type: "ANALYZE", id: o.id })}
            >
              {o.analyzed ? "Analyzed" : "Analyze"}
            </button>
          </div>
        ))}
      </div>
      <button className="text-button" onClick={() => setDetails(true)}>
        Open image viewer, spectra & light curves
        <ArrowRight size={14} />
      </button>
    </>
  );
}
export function LifeTerminal() {
  const { mission: s, dispatch } = useGame();
  const repair = s.crew.find((c) => c.task === "Life-support repair");
  return (
    <>
      <span className="terminal-kicker">PHYSICAL ACCESS / ECLSS RACK</span>
      <h2>
        {s.life.fault ? "Keep the air moving." : "A world inside a hull."}
      </h2>
      <div className="game-instruments">
        <div>
          <span>CABIN PRESSURE</span>
          <b>
            {s.life.pressure.toFixed(1)}
            <small>kPa</small>
          </b>
        </div>
        <div>
          <span>CARBON DIOXIDE</span>
          <b>
            {s.life.co2.toFixed(0)}
            <small>ppm</small>
          </b>
        </div>
        <div>
          <span>OXYGEN</span>
          <b>
            {s.resources.oxygen.toFixed(0)}
            <small>%</small>
          </b>
        </div>
      </div>
      <EventPanel id="life" />
      <EventPanel id="electrical" />
      <Meter label="Scrubber controller condition" value={s.life.condition} />
      {s.life.fault && (
        <button
          className="button primary full"
          disabled={
            !!repair ||
            s.events.some((e) => e.id === "life") ||
            s.resources.parts < 1
          }
          onClick={() =>
            dispatch({
              type: "ASSIGN",
              id: "okafor",
              task: "Life-support repair",
            })
          }
        >
          {repair
            ? "Replacing scrubber controller…"
            : "Replace scrubber controller · 1 spare part"}
        </button>
      )}
      {repair && (
        <Meter
          label="Eli Okafor / repair"
          value={(repair.progress / 45) * 100}
        />
      )}
      <p className="terminal-copy">
        Respond to the leak, then replace the controller. Maya can rest in the
        bunk at the aft end of the habitat while the engineer works.
      </p>
      <div className="key-value">
        <span>Water / food reserves</span>
        <b>
          {s.resources.water.toFixed(0)}% / {s.resources.food.toFixed(0)}%
        </b>
      </div>
      <div className="key-value">
        <span>Power / spare parts</span>
        <b>
          {s.resources.power.toFixed(0)}% / {s.resources.parts}
        </b>
      </div>
    </>
  );
}
export function EvidenceTerminal() {
  const { mission: s, dispatch } = useGame();
  return (
    <>
      <div className="terminal-detailed">
        <Investigation />
      </div>
      {canAdvance(s) && (
        <button
          className="button primary full"
          onClick={() => dispatch({ type: "ADVANCE" })}
        >
          Accept chapter debrief & begin chapter {s.chapter + 1}
          <ArrowRight size={16} />
        </button>
      )}
    </>
  );
}
export function Handbook() {
  return (
    <>
      <span className="terminal-kicker">ASTRA / FIELD HANDBOOK</span>
      <h2>You are the commander.</h2>
      <p className="terminal-copy">
        You begin at eye level inside the crew preparation facility. All primary
        operations are reached by walking to equipment and pressing E while
        looking at it.
      </p>
      <div className="field-instructions">
        {[
          ["W A S D", "Move through the facility and spacecraft"],
          ["MOUSE", "Look around · click the world to capture"],
          ["E", "Use the object under your crosshair"],
          ["SHIFT", "Sprint"],
          ["SPACE", "Jump; gravity brings you back to the floor"],
          ["T", "Cycle simulation speed (1×, 2×, 5×, 10×)"],
          ["ESC", "Release the mouse and pause"],
          ["ARROWS", "Keyboard look; drag-to-look is also available"],
        ].map(([key, value]) => (
          <div key={key}>
            <kbd>{key}</kbd>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <ol className="field-route">
        <li>Take your suit from the locker on the right.</li>
        <li>
          Open the access door, cross the corridor, and inspect the rocket at
          the near-left station.
        </li>
        <li>
          Enter launch control through the west hangar doorway. Use rollout,
          then the launch switch. You can hold or abort the countdown.
        </li>
        <li>
          Watch liftoff. The view switches onboard after the rocket clears the
          tower. Separate spent stages at the right flight console.
        </li>
        <li>
          Use the left navigation console to reach Hubble. Walk aft for
          servicing, telescope observations, crew rest, and life support.
        </li>
        <li>
          The evidence board records chapter completion and the final return
          decision.
        </li>
      </ol>
      <p className="microcopy">
        The existing engineering, orbital, resource, and scientific simulation
        runs behind this world. Only the viewpoint and controls have changed.
        The Earth surface uses locally stored NASA Blue Marble imagery; cloud
        layers and all scientific observations are simulated.
      </p>
    </>
  );
}
export function TerminalContent({
  terminal,
  close,
  onRestartChapter,
}: {
  terminal: Terminal;
  close: () => void;
  onRestartChapter?: () => void;
}) {
  switch (terminal) {
    case "inspection":
      return <InspectionTerminal close={close} />;
    case "flight":
      return <FlightTerminal />;
    case "navigation":
      return <NavigationTerminal />;
    case "science":
      return <ScienceTerminal />;
    case "evidence":
      return <EvidenceTerminal />;
    case "life":
      return <LifeTerminal />;
    case "crew":
      return (
        <div className="terminal-detailed">
          <Crew />
        </div>
      );
    case "log":
      return (
        <div className="terminal-detailed">
          <MissionLog />
        </div>
      );
    case "settings":
      return (
        <>
          <span className="terminal-kicker">FLIGHT PREFERENCES</span>
          <h2>Make yourself at home.</h2>
          <SettingsContent onRestartChapter={onRestartChapter} />
        </>
      );
    case "resources":
      return (
        <div className="terminal-detailed">
          <Resources />
        </div>
      );
    case "handbook":
      return <Handbook />;
    default:
      return null;
  }
}
