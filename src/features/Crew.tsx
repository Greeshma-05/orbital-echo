import { Activity, HeartPulse, Shield, Users, Wind } from "lucide-react";
import { useGame } from "../state/GameContext";
import type { Task } from "../simulation/types";
import {
  EventPanel,
  Meter,
  PageHead,
  Panel,
  Science,
  Stat,
  Tag,
} from "../components/UI";
const tasks: Task[] = [
  "Standby",
  "Telescope repair",
  "Scientific analysis",
  "Equipment inspection",
  "Spacewalk",
  "Life-support repair",
  "Rest",
  "Exercise",
];
export function Crew() {
  const { mission: s, dispatch } = useGame();
  return (
    <>
      <PageHead
        title="Crew & health"
        description="The most important system on board is human."
        action={
          <Tag tone={s.crew.some((c) => c.fatigue > 70) ? "amber" : "green"}>
            3 CREW ON BOARD
          </Tag>
        }
      />
      <div className="crew-grid">
        {s.crew.map((c, i) => (
          <Panel key={c.id} className="crew-card">
            <div className="crew-card-top">
              <div className={`avatar large avatar-${i}`}>
                {c.initials}
                <span />
              </div>
              <div>
                <span className="eyebrow">{c.role}</span>
                <h2>{c.name}</h2>
                <Tag
                  tone={
                    c.health < 55 ? "red" : c.fatigue > 70 ? "amber" : "green"
                  }
                >
                  {c.condition.toUpperCase()}
                </Tag>
              </div>
            </div>
            <div className="crew-vitals">
              <div>
                <HeartPulse size={16} />
                <b>{Math.round(62 + c.stress * 0.35 + c.fatigue * 0.12)}</b>
                <small>BPM</small>
              </div>
              <div>
                <Shield size={16} />
                <b>{c.health.toFixed(0)}</b>
                <small>HEALTH %</small>
              </div>
              <div>
                <Activity size={16} />
                <b>{c.skill}</b>
                <small>SKILL</small>
              </div>
            </div>
            <Meter
              label="Fatigue"
              value={c.fatigue}
              color={c.fatigue > 60 ? "amber" : "cyan"}
            />
            <Meter
              label="Stress"
              value={c.stress}
              color={c.stress > 60 ? "amber" : "cyan"}
            />
            <div className="crew-details">
              <span>
                Hydration<b>{c.hydration.toFixed(0)}%</b>
              </span>
              <span>
                Nutrition<b>{c.nutrition.toFixed(0)}%</b>
              </span>
              <span>
                Sleep debt<b>{c.sleepDebt.toFixed(1)} h</b>
              </span>
              <span>
                Radiation<b>{c.radiation.toFixed(2)} mSv</b>
              </span>
              <span>
                Suit integrity<b>{c.suit.toFixed(0)}%</b>
              </span>
              <span>
                Experience
                <b>
                  {i === 0
                    ? "3 missions"
                    : i === 1
                      ? "2 missions"
                      : "4 missions"}
                </b>
              </span>
            </div>
            <label>
              Assign duty
              <select
                aria-label={`Assign ${c.name}`}
                value={c.task}
                onChange={(e) =>
                  dispatch({
                    type: "ASSIGN",
                    id: c.id,
                    task: e.target.value as Task,
                  })
                }
              >
                {tasks.map((task) => (
                  <option
                    key={task}
                    disabled={
                      (task === "Telescope repair" &&
                        (!s.orbit.rendezvous ||
                          s.telescope.repaired ||
                          s.resources.parts < 1)) ||
                      (task === "Life-support repair" &&
                        (!s.life.fault || s.resources.parts < 1)) ||
                      (task === "Spacewalk" && !s.orbit.rendezvous)
                    }
                    value={task}
                  >
                    {task}
                    {["Telescope repair", "Life-support repair"].includes(task)
                      ? " · 1 part"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            {!["Standby", "Rest", "Exercise"].includes(c.task) && (
              <Meter
                label={`${c.task} progress`}
                value={(c.progress / 45) * 100}
              />
            )}
            <p className="microcopy">
              {c.task === "Rest"
                ? "Rest reduces fatigue and stress continuously. Keep an engineer available for repairs."
                : c.task === "Standby"
                  ? "Available for assignment. Specialist tasks take about 45 simulated seconds."
                  : c.task === "Exercise"
                    ? "Exercise improves health and reduces stress over time."
                    : "Fatigued crew work more slowly. Parts are allocated when a repair is assigned."}
            </p>
          </Panel>
        ))}
      </div>
      <EventPanel id="suit" />
      <EventPanel id="radiation" />
      <Science>
        Microgravity, disrupted sleep, demanding EVA work, and isolation can
        strain a crew. This deterministic gameplay model tracks fatigue,
        hydration, nutrition, stress, and accumulated radiation. Its heart-rate
        and health readings are fictional instrument values, not medical advice
        or clinical predictions.
      </Science>
    </>
  );
}
export function LifeSupport() {
  const { mission: s, setView } = useGame();
  return (
    <>
      <PageHead
        title="Life support"
        description="A small, carefully maintained atmosphere. An entire world."
        action={
          <Tag tone={s.life.fault ? "red" : "green"}>
            {s.life.fault ? "ENVIRONMENTAL FAULT" : "CABIN STABLE"}
          </Tag>
        }
      />
      <EventPanel id="life" />
      <EventPanel id="electrical" />
      <div className="resource-strip">
        <Stat
          label="OXYGEN RESERVE"
          value={s.resources.oxygen.toFixed(1)}
          unit="%"
        />
        <Stat
          label="CABIN PRESSURE"
          value={s.life.pressure.toFixed(1)}
          unit="kPa"
        />
        <Stat label="CARBON DIOXIDE" value={s.life.co2.toFixed(0)} unit="ppm" />
        <Stat
          label="TEMPERATURE"
          value={s.life.temperature.toFixed(1)}
          unit="°C"
        />
      </div>
      <div className="two-column">
        <Panel
          title="Environmental control"
          eyebrow="ECLSS / ASTRA CREW MODULE"
        >
          <div className={`life-diagram ${s.life.fault ? "fault" : ""}`}>
            <div>
              <Wind size={32} />
              <b>O₂</b>
              <small>RESERVOIR</small>
            </div>
            <span>→</span>
            <div>
              <Users size={35} />
              <b>CABIN</b>
              <small>{s.life.pressure.toFixed(1)} kPa</small>
            </div>
            <span>→</span>
            <div>
              <Activity size={32} />
              <b>CO₂</b>
              <small>SCRUBBER</small>
            </div>
          </div>
          <Meter
            label="ECLSS condition"
            value={s.life.condition}
            color={s.life.fault ? "amber" : "cyan"}
          />
          <div className="key-value">
            <span>Scrubber controller</span>
            <b>{s.life.fault ? "FAULT DETECTED" : "OPERATIONAL"}</b>
          </div>
          <div className="key-value">
            <span>Lab module</span>
            <b>{s.life.isolated ? "ISOLATED" : "CONNECTED"}</b>
          </div>
          <div className="key-value">
            <span>Spare parts available</span>
            <b>{s.resources.parts}</b>
          </div>
          <button
            className="button primary"
            onClick={() => setView("Crew & health")}
          >
            Assign crew to repair
          </button>
          <p className="microcopy">
            An emergency response buys time. A life-support repair restores the
            controller. Rest the most fatigued crew member while the engineer
            works.
          </p>
        </Panel>
        <Panel title="Consumables & power" eyebrow="CLOSED-LOOP HABITAT">
          <Meter label="Oxygen" value={s.resources.oxygen} />
          <Meter label="Water supply" value={s.resources.water} />
          <Meter label="Food supply" value={s.resources.food} />
          <Meter label="Electrical power" value={s.resources.power} />
          <p className="muted">
            Supplies are shared across chapters. Active work consumes more
            oxygen. The faulty scrubber increases CO₂, leaks oxygen, and drains
            electrical power until repaired.
          </p>
          <div className="safety-note">
            <Shield size={20} />
            <span>
              {s.life.co2 > 5000 || s.resources.oxygen < 8
                ? "Hazardous atmosphere. Crew health is deteriorating."
                : "Continuous monitoring active. Crew readings are available in Crew & health."}
            </span>
          </div>
        </Panel>
      </div>
      <Science>
        Life support must remove exhaled CO₂ as well as replenish oxygen.
        Pressure and oxygen reserve are different measurements. This game uses
        simplified rates and thresholds; isolating a leak slows losses, while a
        full repair restores the recycling system.
      </Science>
    </>
  );
}
