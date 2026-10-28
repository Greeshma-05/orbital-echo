import {
  Check,
  Flame,
  Play,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useGame } from "../state/GameContext";
import { engines, rocketStats } from "../simulation/physics";
import {
  EventPanel,
  Meter,
  PageHead,
  Panel,
  Science,
  Stat,
  Tag,
} from "../components/UI";
export function Rocket() {
  const { mission: s, dispatch } = useGame();
  const c = s.rocket,
    l = s.launch,
    st = rocketStats(c);
  const edit = l.phase === "preflight";
  const warning =
    st.twr < 1.15
      ? "Insufficient thrust. Reduce mass or use a stronger engine."
      : st.deltaV < 9300
        ? "Insufficient delta-v. Add staging or propellant, or reduce payload."
        : edit && st.cost > s.resources.budget
          ? "Vehicle exceeds the available mission budget."
          : null;
  return (
    <>
      <PageHead
        title="Rocket & launch"
        description="Engineer the journey. Earn your place in orbit."
        action={
          <Tag tone={l.phase === "orbit" ? "green" : "cyan"}>
            {l.phase.toUpperCase()}
          </Tag>
        }
      />
      <div className="resource-strip">
        <Stat
          label="LIFTOFF MASS"
          value={(st.mass / 1000).toFixed(1)}
          unit="t"
        />
        <Stat
          label="THRUST / WEIGHT"
          value={st.twr.toFixed(2)}
          detail="Minimum operational TWR 1.15"
        />
        <Stat label="IDEAL DELTA-V" value={st.deltaV.toFixed(0)} unit="m/s" />
        <Stat
          label="VEHICLE COST"
          value={`$${st.cost.toFixed(1)}`}
          unit="M"
          detail={`$${s.resources.budget.toFixed(1)}M available`}
        />
      </div>
      <div className="rocket-grid">
        <Panel title="Vehicle configuration" eyebrow="ASTRA LAUNCH SYSTEM">
          <fieldset disabled={!edit}>
            <label>
              Primary engine
              <select
                aria-label="Primary engine"
                value={c.engine}
                onChange={(e) =>
                  dispatch({
                    type: "CONFIG",
                    config: { engine: e.target.value as typeof c.engine },
                  })
                }
              >
                {Object.entries(engines).map(([key, e]) => (
                  <option value={key} key={key}>
                    {e.name} · {(e.thrust / 1e6).toFixed(1)} MN
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Stages
                <select
                  aria-label="Stages"
                  value={c.stages}
                  onChange={(e) =>
                    dispatch({
                      type: "CONFIG",
                      config: { stages: +e.target.value },
                    })
                  }
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} stage{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Boosters
                <select
                  aria-label="Boosters"
                  value={c.boosters}
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
              Propellant <b>{(c.fuel / 1000).toFixed(0)} t</b>
              <input
                aria-label="Propellant mass"
                type="range"
                min="80000"
                max="360000"
                step="10000"
                value={c.fuel}
                onChange={(e) =>
                  dispatch({
                    type: "CONFIG",
                    config: { fuel: +e.target.value },
                  })
                }
              />
            </label>
            <label>
              Payload mass <b>{(c.payload / 1000).toFixed(1)} t</b>
              <input
                aria-label="Payload mass"
                type="range"
                min="2000"
                max="30000"
                step="1000"
                value={c.payload}
                onChange={(e) =>
                  dispatch({
                    type: "CONFIG",
                    config: { payload: +e.target.value },
                  })
                }
              />
            </label>
            <label>
              Scientific payload
              <select
                aria-label="Scientific payload"
                value={c.instrument}
                onChange={(e) =>
                  dispatch({
                    type: "CONFIG",
                    config: {
                      instrument: e.target.value as typeof c.instrument,
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
          <div className="key-value">
            <span>Engine reliability</span>
            <b>{st.reliability}%</b>
          </div>
          <div className="key-value">
            <span>Weather / launch window</span>
            <b>{s.elapsed < 1800 ? "GO / OPEN" : "WINDOW MISSED"}</b>
          </div>
          <div className="key-value">
            <span>Fuel-pump inspection</span>
            <b>{l.vibration ?? "PENDING"}</b>
          </div>
        </Panel>
        <Panel
          className={`rocket-visual ${l.phase === "ascent" ? "flying" : ""}`}
        >
          <span className="eyebrow">VEHICLE ASSEMBLY / ASTRA LV</span>
          <svg
            viewBox="0 0 320 420"
            role="img"
            aria-label={`Astra rocket, ${c.stages} stages, ${c.boosters} boosters`}
          >
            <defs>
              <linearGradient id="rocket-body">
                <stop stopColor="#6a8795" />
                <stop offset=".4" stopColor="#ecf2ed" />
                <stop offset=".7" stopColor="#c4d4d7" />
                <stop offset="1" stopColor="#587483" />
              </linearGradient>
              <linearGradient id="flame" x2="0" y2="1">
                <stop stopColor="#eafcff" />
                <stop offset=".4" stopColor="#70dce9" />
                <stop offset="1" stopColor="#e3a259" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className="rocket-ship">
              <path
                d="M140 95 Q140 52 160 28 Q180 52 180 95Z"
                fill="url(#rocket-body)"
              />
              <path d="M140 95H180V195H140Z" fill="url(#rocket-body)" />
              <rect x="140" y="100" width="40" height="10" fill="#193945" />
              <rect x="140" y="185" width="40" height="9" fill="#193945" />
              <rect
                x="146"
                y="118"
                width="28"
                height="12"
                rx="2"
                fill="#1c4555"
              />
              <text
                x="160"
                y="158"
                textAnchor="middle"
                fill="#274651"
                fontSize="8"
                letterSpacing="2"
              >
                ASTRA
              </text>
              <g className={l.stage > 0 ? "separated" : ""}>
                <path d="M140 195H180V320H140Z" fill="url(#rocket-body)" />
                <rect x="140" y="204" width="40" height="10" fill="#183944" />
                <path
                  d="M140 270L124 310V327L140 315M180 270L196 310V327L180 315"
                  fill="#829ba5"
                />
                <path d="M145 320H175L182 340H138Z" fill="#526d78" />
                {c.boosters > 0 &&
                  [118, 190].map((x) => (
                    <g key={x}>
                      <path
                        d={`M${x} 300V160Q${x + 6} 140 ${x + 12} 160V300Z`}
                        fill="url(#rocket-body)"
                      />
                    </g>
                  ))}
              </g>
              {l.phase === "ascent" && !l.staging && (
                <path
                  className="engine-plume"
                  d={
                    l.stage > 0
                      ? "M144 195Q130 245 160 310Q190 245 176 195Z"
                      : "M140 340Q127 376 160 415Q193 376 180 340Z"
                  }
                  fill="url(#flame)"
                />
              )}
            </g>
            <g stroke="#3c5b6d" fill="none" strokeWidth=".6">
              <path d="M185 80H223L235 68H287M185 150H230M185 235H218L232 247H288" />
              <path d="M50 330H107" />
            </g>
            <g fill="#7997a7" fontSize="8" letterSpacing="1">
              <text x="224" y="60">
                CREW / PAYLOAD
              </text>
              <text x="210" y="142">
                UPPER STAGE
              </text>
              <text x="228" y="261">
                CORE STAGE
              </text>
              <text x="20" y="344">
                {(st.thrust / 1e6).toFixed(1)} MN
              </text>
            </g>
          </svg>
          <span className="rocket-caption">
            {l.phase === "countdown"
              ? `T−${Math.max(0, Math.ceil(l.countdown)).toString().padStart(2, "0")}`
              : l.phase === "orbit"
                ? "ORBIT ACHIEVED"
                : l.staging
                  ? "STAGE SEPARATION REQUIRED"
                  : l.phase === "ascent"
                    ? `STAGE ${l.stage + 1} • ASCENT`
                    : "READY TO GO BEYOND"}
          </span>
        </Panel>
        <Panel title="Flight telemetry" eyebrow="LIVE INSTRUMENTS">
          <div className="telemetry-stats">
            <Stat
              label="ALTITUDE"
              value={(l.altitude / 1000).toFixed(1)}
              unit="km"
            />
            <Stat label="VELOCITY" value={l.velocity.toFixed(0)} unit="m/s" />
            <Stat
              label="DYNAMIC PRESSURE"
              value={(l.pressure / 1000).toFixed(1)}
              unit="kPa"
            />
            <Stat
              label="ENGINE THRUST"
              value={(l.thrust / 1e6).toFixed(2)}
              unit="MN"
            />
          </div>
          <Meter label="Vehicle health" value={s.integrity} />
          <Meter
            label="Launch propellant"
            value={
              l.stageFuel.length
                ? (l.stageFuel.reduce((a, b) => a + b, 0) /
                    st.fuels.reduce((a, b) => a + b, 0)) *
                  100
                : 100
            }
          />
          <div className="mini-chart">
            <svg viewBox="0 0 250 80" aria-label="Ascent altitude history">
              <path d="M0 20H250M0 40H250M0 60H250" stroke="#20303e" />
              <polyline
                points={s.telemetry
                  .map(
                    (p, i) =>
                      `${(i / Math.max(1, s.telemetry.length - 1)) * 250},${75 - (p.altitude / 250000) * 65}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="#68d9dd"
                strokeWidth="2"
              />
            </svg>
            <span>ALTITUDE / ELAPSED FLIGHT TIME</span>
          </div>
          {warning && (
            <div className="inline-warning">
              <TriangleAlert size={16} />
              {warning}
            </div>
          )}
          {l.failure && <div className="inline-warning">{l.failure}</div>}
          <div className="launch-actions">
            {edit && (
              <>
                <button
                  className="button secondary full"
                  onClick={() => dispatch({ type: "PREFLIGHT" })}
                >
                  <ShieldCheck size={16} />
                  {l.checked ? "Preflight verified" : "Run preflight checks"}
                </button>
                <button
                  className="button primary full"
                  disabled={!l.checked}
                  onClick={() => dispatch({ type: "LAUNCH" })}
                >
                  <Flame size={17} />
                  Start countdown
                </button>
              </>
            )}
            {l.phase === "countdown" && (
              <>
                <button
                  className="button secondary full"
                  onClick={() => dispatch({ type: "PAUSE" })}
                >
                  {s.paused ? "Resume countdown" : "Hold countdown"}
                </button>
                <button
                  className="button danger full"
                  onClick={() => dispatch({ type: "ABORT" })}
                >
                  Abort launch
                </button>
              </>
            )}
            {l.phase === "ascent" && l.staging && (
              <button
                className="button primary full pulse"
                onClick={() => dispatch({ type: "STAGE" })}
              >
                Separate stage {l.stage + 1}
                <Play size={16} />
              </button>
            )}
            {l.phase === "failed" && (
              <button
                className="button primary full"
                onClick={() => dispatch({ type: "RETRY" })}
              >
                <RotateCcw size={16} />
                Recover & retry
              </button>
            )}
            {l.phase === "orbit" && (
              <div className="success-banner">
                <Check size={18} /> Stable orbit confirmed
              </div>
            )}
          </div>
          <p className="microcopy">
            Use 10× time for ascent. Separate each stage at burnout. Flight
            guidance controls the gravity turn.
          </p>
        </Panel>
      </div>
      <EventPanel id="vibration" />
      <Science>
        Thrust-to-weight = thrust / (mass × 9.80665 m/s²). Your{" "}
        {st.twr.toFixed(2)} TWR{" "}
        {st.twr > 1 ? "can overcome" : "cannot overcome"} Earth’s gravity. For
        each stage, Δv = Isp × g₀ × ln(m₀/mf); dropping empty tanks improves
        mass ratio. This guided ascent models thrust, fuel flow, gravity, and
        atmospheric drag. It is an educational approximation.
      </Science>
    </>
  );
}
