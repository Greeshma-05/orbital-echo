import { useState } from "react";
import {
  ArrowRight,
  Check,
  Navigation as NavigationIcon,
  Orbit,
  Radio,
} from "lucide-react";
import { useGame } from "../state/GameContext";
import { orbitStats, transferCost } from "../simulation/physics";
import { SpaceScene } from "../components/SpaceScene";
import { Meter, PageHead, Panel, Science, Stat, Tag } from "../components/UI";
export function Navigation() {
  const { mission: s, dispatch } = useGame();
  const [altitude, setAltitude] = useState(540),
    [probeAlt, setProbeAlt] = useState(900),
    [paths, setPaths] = useState(true);
  const from = orbitStats(s.orbit.altitude),
    to = orbitStats(altitude * 1000),
    cost = transferCost(s.orbit.altitude, altitude * 1000);
  const inOrbit = s.launch.phase === "orbit";
  return (
    <>
      <PageHead
        title="Orbit & navigation"
        description="A little velocity. An entirely different destination."
        action={
          <Tag tone={s.orbit.comms ? "green" : "amber"}>
            {s.orbit.comms ? "TELEMETRY CONNECTED" : "SIGNAL LOSS"}
          </Tag>
        }
      />
      {!inOrbit && (
        <div className="inline-warning">
          Orbital maneuvers unlock after a successful launch. You can preview a
          transfer now.
        </div>
      )}
      <div className="two-column">
        <Panel className="navigation-scene">
          <SpaceScene orbits={paths} />
          <div className="scene-top">
            <span className="eyebrow">EARTH-CENTERED / TWO-BODY MODEL</span>
            <button
              className="button compact secondary"
              onClick={() => setPaths(!paths)}
            >
              {paths ? "Hide" : "Show"} orbital paths
            </button>
          </div>
          <div className="transfer-preview">
            <div>
              <span>ASTRA ORBIT</span>
              <b>
                {(s.orbit.altitude / 1000).toFixed(1)} <small>km</small>
              </b>
            </div>
            <ArrowRight size={20} />
            <div>
              <span>PLANNED ORBIT</span>
              <b>
                {altitude} <small>km</small>
              </b>
            </div>
          </div>
          <div className="orbit-diagram">
            <svg viewBox="0 0 220 120" aria-label="Transfer trajectory preview">
              <circle cx="110" cy="60" r="23" fill="#163b51" />
              <ellipse
                cx="110"
                cy="60"
                rx="55"
                ry="27"
                fill="none"
                stroke="#6ddddd"
              />
              <ellipse
                cx="110"
                cy="60"
                rx={55 + altitude / 50}
                ry={27 + altitude / 100}
                fill="none"
                stroke="#d7af69"
                strokeDasharray="4 4"
              />
              <path
                d={`M55 60Q110 ${-altitude / 30} ${165 + altitude / 50} 60`}
                fill="none"
                stroke="#d7af69"
              />
            </svg>
            <small>CYAN: CURRENT · AMBER: PLANNED</small>
          </div>
        </Panel>
        <Panel title="Maneuver planner" eyebrow="FLIGHT DYNAMICS">
          <label>
            Navigation target
            <select
              aria-label="Navigation target"
              value={
                altitude === 540
                  ? "hubble"
                  : altitude === 800
                    ? "relay"
                    : "custom"
              }
              onChange={(e) =>
                setAltitude(
                  e.target.value === "hubble"
                    ? 540
                    : e.target.value === "relay"
                      ? 800
                      : 400,
                )
              }
            >
              <option value="hubble">Hubble Space Telescope · 540 km</option>
              <option value="relay">Relay parking orbit · 800 km</option>
              <option value="custom">Custom circular orbit</option>
            </select>
          </label>
          <label>
            Target altitude <b>{altitude} km</b>
            <input
              aria-label="Target altitude"
              type="range"
              min="160"
              max="2000"
              step="10"
              value={altitude}
              onChange={(e) => setAltitude(+e.target.value)}
            />
          </label>
          <div className="key-value">
            <span>Transfer delta-v</span>
            <b>{cost.toFixed(1)} m/s</b>
          </div>
          <div className="key-value">
            <span>Target orbital velocity</span>
            <b>{to.velocity.toFixed(0)} m/s</b>
          </div>
          <div className="key-value">
            <span>Target orbital period</span>
            <b>{(to.period / 60).toFixed(1)} min</b>
          </div>
          <div className="key-value">
            <span>Reserve after transfer</span>
            <b className={s.resources.fuel - cost < 160 ? "danger-text" : ""}>
              {(s.resources.fuel - cost).toFixed(0)} m/s
            </b>
          </div>
          <button
            className="button primary full"
            disabled={
              !inOrbit ||
              s.orbit.rendezvous ||
              cost > s.resources.fuel - 160 ||
              cost < 0.1
            }
            onClick={() =>
              dispatch({ type: "MANEUVER", altitude: altitude * 1000 })
            }
          >
            <NavigationIcon size={16} />
            Execute transfer
          </button>
          <p className="microcopy">
            Two idealized burns are resolved together. At least 160 m/s is
            protected for return. The navigation panel uses m/s of available
            spacecraft delta-v as its fuel budget.
          </p>
          <div className="divider" />
          <h3>Hubble rendezvous</h3>
          <div className="key-value">
            <span>Relative velocity</span>
            <b>{s.orbit.relative.toFixed(1)} m/s</b>
          </div>
          <div className="key-value">
            <span>Range to target</span>
            <b>
              {s.orbit.distance < 1
                ? `${(s.orbit.distance * 1000).toFixed(0)} m`
                : `${s.orbit.distance} km`}
            </b>
          </div>
          <div className="form-row">
            <button
              className="button secondary"
              disabled={
                !inOrbit ||
                s.orbit.matched ||
                Math.abs(s.orbit.altitude - 540000) > 5000 ||
                s.resources.fuel < 195
              }
              onClick={() => dispatch({ type: "MATCH" })}
            >
              {s.orbit.matched ? <Check size={14} /> : <Orbit size={14} />}Match
              velocity
            </button>
            <button
              className="button secondary"
              disabled={
                !s.orbit.matched || s.orbit.rendezvous || s.resources.fuel < 175
              }
              onClick={() => dispatch({ type: "DOCK" })}
            >
              {s.orbit.rendezvous ? (
                <Check size={14} />
              ) : (
                <ArrowRight size={14} />
              )}
              Approach Hubble
            </button>
          </div>
          {s.orbit.rendezvous && (
            <p className="success-text">
              Soft capture confirmed. Crew servicing is available.
            </p>
          )}
        </Panel>
      </div>
      <div className="resource-strip">
        <Stat
          label="CURRENT ORBITAL VELOCITY"
          value={from.velocity.toFixed(0)}
          unit="m/s"
        />
        <Stat
          label="ORBITAL PERIOD"
          value={(from.period / 60).toFixed(1)}
          unit="min"
        />
        <Stat
          label="MANEUVER RESERVE"
          value={s.resources.fuel.toFixed(0)}
          unit="m/s"
        />
        <Stat label="RETURN BURN" value="160" unit="m/s" />
      </div>
      {s.chapter === 5 && (
        <Panel title="A second vantage point" eyebrow="OPTIONAL RELAY PROBE">
          <p className="muted">
            Deploy a small local probe to collect an independent measurement of
            the distant source. A spacecraft cannot travel to this star within
            the mission.
          </p>
          <label>
            Probe orbit <b>{probeAlt} km</b>
            <input
              aria-label="Probe altitude"
              type="range"
              min="600"
              max="2000"
              step="50"
              value={probeAlt}
              onChange={(e) => setProbeAlt(+e.target.value)}
            />
          </label>
          <div className="key-value">
            <span>Injection + deployment cost</span>
            <b>
              {(80 + transferCost(s.orbit.altitude, probeAlt * 1000)).toFixed(
                0,
              )}{" "}
              m/s · 8 power
            </b>
          </div>
          <button
            className="button primary"
            disabled={
              s.probe ||
              s.resources.fuel <
                240 + transferCost(s.orbit.altitude, probeAlt * 1000) ||
              s.resources.power < 8
            }
            onClick={() => dispatch({ type: "PROBE", target: probeAlt * 1000 })}
          >
            <Radio size={15} />
            {s.probe ? "Probe transmitting" : "Deploy relay probe"}
          </button>
        </Panel>
      )}
      <Science>
        For a circular orbit, v = √(μ/r) and T = 2π√(r³/μ), where μ = 3.986 ×
        10¹⁴ m³/s² and r is Earth’s radius plus altitude in meters. At 540 km,
        velocity is {(orbitStats(540000).velocity / 1000).toFixed(2)} km/s and a
        full orbit takes {(orbitStats(540000).period / 60).toFixed(1)} minutes.
        Rendezvous also requires matching velocity, not just altitude.
      </Science>
    </>
  );
}
