import type { Action, Mission, Task } from "./types";
import { eventCatalog } from "../data/mission";
import {
  clamp,
  engines,
  G0,
  observationQuality,
  orbitStats,
  rocketStats,
  transferCost,
  EARTH_RADIUS,
} from "./physics";
import { canAdvance, endingFor } from "./rules";
export function log(
  s: Mission,
  text: string,
  level: "info" | "success" | "warning" = "info",
) {
  s.log.unshift({ time: s.elapsed, text, level });
  s.log = s.log.slice(0, 200);
}
function trigger(s: Mission, id: string) {
  if (!s.triggered.includes(id)) {
    s.triggered.push(id);
    s.events.push(structuredClone(eventCatalog[id]));
    if (id === "blackout") s.orbit.comms = false;
    log(s, eventCatalog[id].title, "warning");
  }
}
function fail(s: Mission, reason: string) {
  s.launch.phase = "failed";
  s.launch.failure = reason;
  s.launch.thrust = 0;
  log(s, reason, "warning");
}
function completeTask(s: Mission, c: Mission["crew"][number]) {
  const task = c.task;
  if (task === "Telescope repair") {
    s.telescope.condition = 96;
    s.telescope.pointing = 97;
    s.telescope.repaired = true;
    log(
      s,
      `${c.name} restored Hubble’s pointing assembly. Observation capability online.`,
      "success",
    );
  }
  if (task === "Life-support repair") {
    s.life.condition = 96;
    s.life.fault = false;
    s.life.isolated = false;
    s.life.co2 = 700;
    s.life.pressure = 101.3;
    log(
      s,
      `${c.name} replaced the scrubber controller. Cabin stabilized.`,
      "success",
    );
  }
  if (task === "Equipment inspection") {
    s.integrity = clamp(s.integrity + 8);
    s.telescope.pointing = clamp(s.telescope.pointing + 4);
    log(s, `${c.name} completed a vehicle inspection.`, "success");
  }
  if (task === "Spacewalk") {
    s.telescope.condition = clamp(s.telescope.condition + 8);
    c.suit = clamp(c.suit - 12);
    log(s, `${c.name} completed the external inspection.`, "success");
  }
  if (task === "Scientific analysis") {
    const o = s.telescope.observations.find((o) => !o.analyzed);
    if (o) {
      o.analyzed = true;
      log(
        s,
        `${c.name} analyzed dataset OE-${o.id.toString().padStart(3, "0")}.`,
        "success",
      );
    }
  }
  c.task = "Standby";
  c.progress = 0;
}
function resourceTick(s: Mission, dt: number) {
  if (
    s.launch.phase === "preflight" ||
    s.launch.phase === "countdown" ||
    s.launch.phase === "failed"
  )
    return;
  const r = s.resources;
  const working = s.crew.filter(
    (c) => !["Rest", "Standby"].includes(c.task),
  ).length;
  r.oxygen = clamp(
    r.oxygen -
      dt *
        (0.0025 +
          working * 0.0008 +
          (s.life.fault && !s.life.isolated ? 0.055 : 0)),
  );
  r.water = clamp(r.water - dt * 0.002);
  r.food = clamp(r.food - dt * 0.0014);
  r.power = clamp(
    r.power -
      dt *
        (0.001 + (s.telescope.active ? 0.014 : 0) + (s.life.fault ? 0.012 : 0)),
  );
  if (s.life.fault) {
    s.life.co2 = clamp(s.life.co2 + dt * (s.life.isolated ? 3 : 15), 0, 20000);
    s.life.pressure = clamp(
      s.life.pressure - dt * (s.life.isolated ? 0.002 : 0.025),
      0,
      105,
    );
    s.life.temperature = clamp(s.life.temperature + dt * 0.005, 0, 40);
  } else {
    s.life.co2 = Math.max(550, s.life.co2 - dt * 12);
    s.life.pressure = Math.min(101.3, s.life.pressure + dt * 0.07);
    s.life.temperature += (21.2 - s.life.temperature) * 0.002 * dt;
  }
  for (const c of s.crew) {
    const rest = c.task === "Rest",
      work = !["Rest", "Standby", "Exercise"].includes(c.task),
      eva = c.task === "Spacewalk";
    c.fatigue = clamp(c.fatigue + dt * (rest ? -0.36 : work ? 0.065 : 0.003));
    c.stress = clamp(
      c.stress + dt * (s.life.fault ? 0.08 : rest ? -0.18 : -0.008),
    );
    c.sleepDebt = clamp(c.sleepDebt + dt * (rest ? -0.01 : 0.0003), 0, 24);
    c.hydration = clamp(c.hydration + dt * (r.water > 0 ? 0.004 : -0.04));
    c.nutrition = clamp(c.nutrition + dt * (r.food > 0 ? 0.003 : -0.025));
    c.radiation += dt * (eva ? 0.004 : 0.0002);
    const danger =
      s.life.co2 > 5000 || s.life.pressure < 70 || r.oxygen < 8 || r.power < 3;
    c.health = clamp(
      c.health +
        dt * (danger ? -0.08 : rest ? 0.07 : c.task === "Exercise" ? 0.025 : 0),
    );
    c.condition =
      c.health < 40
        ? "Critical"
        : c.fatigue > 70
          ? "Exhausted"
          : danger
            ? "Environmental stress"
            : "Nominal";
    if (c.task === "Exercise") c.stress = clamp(c.stress - dt * 0.09);
    if (work) {
      c.progress += dt * (c.skill / 90) * (c.fatigue > 65 ? 0.6 : 1);
      if (eva && c.progress > 15) trigger(s, "suit");
      if (c.progress >= 45) completeTask(s, c);
    }
  }
  if (r.power < 25) trigger(s, "electrical");
  if (s.crew.every((c) => c.health <= 0)) {
    s.status = "ended";
    s.ending = "MISSION LOST";
    s.paused = true;
    log(
      s,
      "The crew could not survive the unresolved cabin conditions. Restore a chapter checkpoint to try again.",
      "warning",
    );
  }
  if (s.decisions.includes("blackout:autonomous")) {
    const entry = s.log.find((l) => l.text.includes("Operate autonomously"));
    if (entry && s.elapsed - entry.time > 60) s.orbit.comms = true;
  }
}
function ascent(s: Mission, dt: number) {
  const l = s.launch,
    c = s.rocket,
    e = engines[c.engine],
    st = rocketStats(c);
  l.time += dt;
  if (l.staging) {
    l.thrust = 0;
    if (l.time > 650)
      fail(
        s,
        "Staging window missed. The vehicle lost its insertion opportunity. Retry and separate each depleted stage.",
      );
    return;
  }
  const i = l.stage;
  if (l.stageFuel[i] <= 0) {
    if (i < c.stages - 1) {
      l.staging = true;
      log(
        s,
        "Stage burnout. Separate the stage to ignite the next engine.",
        "warning",
      );
      return;
    }
    fail(
      s,
      "Propellant exhausted before orbital insertion. Increase fuel, reduce payload, or improve the staging configuration.",
    );
    return;
  }
  const thrust = i === 0 ? e.thrust + c.boosters * 650000 : e.upperThrust;
  const isp = i === 0 ? e.isp : e.upperIsp;
  const burn = Math.min(l.stageFuel[i], (thrust / (isp * G0)) * dt);
  l.stageFuel[i] -= burn;
  l.mass =
    c.payload +
    st.dry.slice(i).reduce((a, b) => a + b, 0) +
    l.stageFuel.slice(i).reduce((a, b) => a + b, 0);
  l.thrust = thrust;
  const rho = 1.225 * Math.exp(-l.altitude / 8500);
  l.pressure = 0.5 * rho * l.velocity ** 2;
  const pitch =
    l.altitude < 160000
      ? Math.max(0.13, (Math.PI / 2) * (1 - l.time / 185))
      : Math.max(0, (0.05 * (200000 - l.altitude)) / 40000);
  const gravity = G0 * (EARTH_RADIUS / (EARTH_RADIUS + l.altitude)) ** 2;
  const drag = l.pressure * 0.22 * 12;
  l.velocity = Math.max(
    0,
    l.velocity +
      (thrust / l.mass - gravity * Math.sin(pitch) - drag / l.mass) * dt,
  );
  l.altitude += l.velocity * Math.sin(pitch) * dt;
  if (l.pressure > 65000) s.integrity = clamp(s.integrity - dt * 0.04);
  if (!s.launch.vibration && l.time > 30)
    fail(
      s,
      "The unresolved fuel pump vibration caused an engine shutdown. Inspect the vehicle before retrying.",
    );
  if (s.integrity < 20)
    fail(
      s,
      "Structural limits exceeded during ascent. Use a lighter vehicle or a more reliable preflight procedure.",
    );
  if (l.time % 5 < dt) {
    s.telemetry.push({
      time: l.time,
      altitude: l.altitude,
      velocity: l.velocity,
    });
    s.telemetry = s.telemetry.slice(-100);
  }
  if (
    l.phase === "ascent" &&
    l.altitude >= 160000 &&
    l.velocity >= orbitStats(l.altitude).velocity
  ) {
    l.phase = "orbit";
    l.thrust = 0;
    s.orbit.altitude = l.altitude;
    s.orbit.distance = 180;
    log(
      s,
      `Orbital insertion confirmed at ${(l.altitude / 1000).toFixed(0)} km. Payload deployed; Astra is free of the launch vehicle.`,
      "success",
    );
  }
}
export function step(s: Mission, dt: number) {
  if (s.paused || s.status === "ended" || dt <= 0) return;
  s.elapsed += dt;
  if (s.launch.phase === "countdown") {
    s.launch.countdown -= dt;
    if (s.launch.countdown <= 0) {
      s.launch.phase = "ascent";
      log(s, "Liftoff. Astra has cleared the tower.", "success");
    }
  } else if (s.launch.phase === "ascent") ascent(s, dt);
  resourceTick(s, dt);
  const obs = s.telescope.active;
  if (obs) {
    const tracked = Math.min(dt, obs.duration - obs.progress);
    obs.pointingSum =
      (obs.pointingSum ?? s.telescope.pointing * obs.progress) +
      s.telescope.pointing * tracked;
    obs.trackedTime = (obs.trackedTime ?? obs.progress) + tracked;
    obs.progress += dt;
    s.telescope.condition = clamp(s.telescope.condition - dt * 0.0015);
    if (s.chapter >= 3 && obs.progress >= 8) trigger(s, "power");
    if (obs.progress >= obs.duration) {
      const pointing = obs.pointingSum / Math.max(0.001, obs.trackedTime);
      const result = observationQuality(
        obs.exposure,
        pointing,
        s.telescope.condition,
        obs.filter,
        s.rocket.instrument,
      );
      const id = s.telescope.observations.length + 1;
      s.telescope.observations.push({
        id,
        target: obs.target,
        filter: obs.filter,
        exposure: obs.exposure,
        duration: obs.duration,
        ...result,
        time: s.elapsed,
        analyzed: false,
        pointing,
      });
      s.telescope.active = null;
      log(
        s,
        `Dataset OE-${id.toString().padStart(3, "0")} acquired. Quality ${result.quality.toFixed(0)}%.`,
        "success",
      );
    }
  }
  if (s.chapter >= 3 && s.telescope.observations.length >= 3)
    trigger(s, "blackout");
}
export function advanceTime(input: Mission, seconds: number) {
  const s = structuredClone(input);
  for (let left = seconds; left > 0; left -= 0.5) step(s, Math.min(left, 0.5));
  return s;
}
export function reduceMission(input: Mission, a: Action): Mission {
  if (a.type === "TICK") return advanceTime(input, a.dt);
  const s = structuredClone(input),
    r = s.resources,
    l = s.launch;
  if (a.type === "PAUSE") {
    s.paused = !s.paused;
    return s;
  }
  if (a.type === "SPEED") {
    if ([1, 2, 5, 10].includes(a.speed)) s.speed = a.speed;
    return s;
  }
  if (s.status === "ended") return s;
  switch (a.type) {
    case "CONFIG":
      if (l.phase === "preflight") {
        s.rocket = { ...s.rocket, ...a.config };
        l.checked = false;
        l.phase = "preflight";
        l.failure = null;
      }
      break;
    case "PREFLIGHT": {
      const st = rocketStats(s.rocket);
      if (!l.vibration)
        log(s, "Resolve the vibration alert before preflight.", "warning");
      else if (st.twr < 1.15)
        log(
          s,
          "Preflight rejected: thrust-to-weight ratio must exceed 1.15. Reduce mass or choose a stronger engine.",
          "warning",
        );
      else if (st.deltaV < 9300)
        log(
          s,
          "Preflight rejected: at least 9,300 m/s ideal delta-v is required for insertion and launch losses.",
          "warning",
        );
      else if (st.cost > r.budget)
        log(
          s,
          "Preflight rejected: vehicle cost exceeds the available budget.",
          "warning",
        );
      else if (s.elapsed > 1800)
        log(
          s,
          "Launch window missed. Restart the chapter to return to a safe window.",
          "warning",
        );
      else {
        l.checked = true;
        log(
          s,
          "Preflight passed. Engines, guidance, weather, and flight termination verified.",
          "success",
        );
      }
      break;
    }
    case "LAUNCH":
      if (s.elapsed > 1800 && l.phase === "preflight") {
        l.checked = false;
        log(
          s,
          "Launch window missed. Restart the chapter to restore the launch opportunity.",
          "warning",
        );
        break;
      }
      if (l.checked && l.phase === "preflight") {
        const st = rocketStats(s.rocket);
        l.phase = "countdown";
        l.countdown = 10;
        l.stageFuel = st.fuels;
        l.mass = st.mass;
        s.paused = false;
        r.budget -= st.cost;
        log(s, "Terminal countdown started. T−10 seconds.");
      }
      break;
    case "ABORT":
      if (l.phase === "countdown") {
        l.phase = "preflight";
        l.countdown = 10;
        r.budget += rocketStats(s.rocket).cost;
        log(s, "Countdown aborted. Vehicle safe; launch budget restored.");
      }
      break;
    case "RETRY":
      if (l.phase === "failed") {
        r.budget += rocketStats(s.rocket).cost;
        l.phase = "preflight";
        l.checked = false;
        l.stage = 0;
        l.time = 0;
        l.velocity = 0;
        l.altitude = 0;
        l.staging = false;
        l.failure = null;
        s.integrity = Math.max(86, s.integrity);
        log(
          s,
          "Launch simulation reset. Configuration retained and launch budget restored.",
        );
      }
      break;
    case "STAGE":
      if (l.phase === "ascent" && l.staging) {
        l.stage++;
        l.staging = false;
        const st = rocketStats(s.rocket);
        l.mass =
          s.rocket.payload +
          st.dry.slice(l.stage).reduce((a, b) => a + b, 0) +
          l.stageFuel.slice(l.stage).reduce((a, b) => a + b, 0);
        l.thrust = engines[s.rocket.engine].upperThrust;
        log(
          s,
          `Stage ${l.stage} separated. Stage ${l.stage + 1} ignition confirmed.`,
          "success",
        );
      }
      break;
    case "DECIDE": {
      const ev = s.events.find((e) => e.id === a.id),
        choice = ev?.choices.find((c) => c.effect === a.effect);
      if (!choice || r.parts < (choice.parts ?? 0)) break;
      if (choice.parts) r.parts -= choice.parts;
      s.events = s.events.filter((e) => e.id !== a.id);
      s.decisions.push(`${a.id}:${a.effect}`);
      log(s, `${ev!.title}: ${choice.label}.`);
      switch (a.effect) {
        case "inspect":
          l.vibration = "inspected";
          r.budget -= 4;
          r.power = clamp(r.power - 3);
          break;
        case "proceed":
          l.vibration = "monitored";
          s.integrity -= 14;
          break;
        case "diagnose":
          s.telescope.active = null;
          r.power -= 3;
          s.telescope.condition = clamp(s.telescope.condition + 8);
          break;
        case "continue":
          s.telescope.condition = clamp(s.telescope.condition - 32);
          break;
        case "isolate-power":
          s.telescope.condition = clamp(s.telescope.condition - 5);
          r.power = clamp(r.power - 5);
          break;
        case "cartridge":
          s.life.co2 = 850;
          s.life.isolated = true;
          break;
        case "isolate-life":
          s.life.isolated = true;
          s.integrity -= 12;
          break;
        case "flush":
          r.oxygen = clamp(r.oxygen - 14);
          s.life.co2 = 650;
          s.life.pressure = 101;
          s.life.isolated = true;
          break;
        case "shelter":
          s.crew.forEach((c) => {
            c.task = "Rest";
            c.progress = 0;
          });
          r.observationTime = Math.max(0, r.observationTime - 3);
          break;
        case "expose":
          s.crew.forEach((c) => {
            c.radiation += 8;
            c.health -= 4;
          });
          break;
        case "recall":
          s.crew
            .filter((c) => c.task === "Spacewalk")
            .forEach((c) => {
              c.task = "Standby";
              c.fatigue = clamp(c.fatigue + 8);
            });
          break;
        case "suit-repair":
          s.crew.forEach((c) => (c.suit = 100));
          break;
        case "battery":
          r.power = clamp(r.power + 25);
          break;
        case "shed-load":
          r.power = clamp(r.power + 15);
          s.telescope.condition = clamp(s.telescope.condition - 15);
          s.telescope.active = null;
          break;
        case "relay":
          r.power = clamp(r.power - 4);
          s.orbit.comms = true;
          break;
        case "autonomous":
          s.orbit.comms = false;
          s.crew.forEach((c) => (c.stress = clamp(c.stress + 5)));
          break;
      }
      break;
    }
    case "MANEUVER": {
      if (l.phase !== "orbit" || s.orbit.rendezvous) break;
      const cost = transferCost(s.orbit.altitude, a.altitude);
      if (
        !Number.isFinite(a.altitude) ||
        a.altitude < 160000 ||
        a.altitude > 2000000
      ) {
        log(
          s,
          "Transfer rejected: operational orbit must be between 160 and 2,000 km.",
          "warning",
        );
        break;
      }
      if (cost > r.fuel - 160) {
        log(
          s,
          "Transfer rejected: insufficient fuel after preserving the 160 m/s return reserve.",
          "warning",
        );
        break;
      }
      r.fuel -= cost;
      s.orbit.altitude = a.altitude;
      s.orbit.matched = false;
      s.orbit.relative = 120;
      s.orbit.distance = 18;
      log(
        s,
        `Two-impulse transfer complete: ${(a.altitude / 1000).toFixed(0)} km. ${cost.toFixed(1)} m/s consumed.`,
        "success",
      );
      break;
    }
    case "MATCH":
      if (
        Math.abs(s.orbit.altitude - 540000) < 5000 &&
        r.fuel >= 195 &&
        !s.orbit.matched
      ) {
        r.fuel -= 35;
        s.orbit.relative = 0.3;
        s.orbit.matched = true;
        log(
          s,
          "Relative velocity matched to 0.3 m/s. Cleared for final approach.",
          "success",
        );
      } else
        log(
          s,
          "Match requires the 540 km target orbit and 35 m/s plus return reserve.",
          "warning",
        );
      break;
    case "DOCK":
      if (s.orbit.matched && r.fuel >= 175 && !s.orbit.rendezvous) {
        r.fuel -= 15;
        s.orbit.rendezvous = true;
        s.orbit.distance = 0.02;
        log(
          s,
          "Soft capture confirmed. Hubble servicing operations authorized.",
          "success",
        );
      }
      break;
    case "DEPLOY":
      if (
        s.telescope.repaired &&
        s.orbit.rendezvous &&
        !s.telescope.deployed &&
        r.power >= 6
      ) {
        s.telescope.deployed = true;
        r.power -= 6;
        log(
          s,
          "Echo observatory deployed. Solar arrays and communications online.",
          "success",
        );
      }
      break;
    case "POINT":
      if (s.telescope.repaired && Number.isFinite(a.accuracy))
        s.telescope.pointing = clamp(a.accuracy);
      break;
    case "CALIBRATE":
      if (s.telescope.repaired && r.power >= 2) {
        r.power -= 2;
        s.telescope.pointing = 99;
        log(
          s,
          "Guide-star calibration complete. Pointing accuracy 99%.",
          "success",
        );
      }
      break;
    case "OBSERVE":
      if (
        s.telescope.deployed &&
        !s.telescope.active &&
        r.power >= 5 &&
        r.observationTime >= a.duration / 60 &&
        a.exposure >= 10 &&
        a.exposure <= 120 &&
        a.duration >= a.exposure &&
        a.duration <= 240
      ) {
        s.telescope.active = {
          ...a,
          progress: 0,
          pointingSum: 0,
          trackedTime: 0,
        };
        r.power -= 2;
        r.observationTime -= a.duration / 60;
        log(
          s,
          `Acquiring ${a.target} through ${a.filter.toLowerCase()} filter. ${a.exposure}s exposure.`,
        );
      }
      break;
    case "ANALYZE": {
      const o = s.telescope.observations.find((o) => o.id === a.id);
      if (o && !o.analyzed && r.power >= 1) {
        o.analyzed = true;
        r.power--;
        s.crew[1].fatigue = clamp(s.crew[1].fatigue + 4);
        log(
          s,
          `Dataset OE-${o.id.toString().padStart(3, "0")} analyzed. Hypothesis confidence updated.`,
          "success",
        );
      }
      break;
    }
    case "CROSSCHECK":
      if (
        !s.crosschecked &&
        s.telescope.observations.filter((o) => o.analyzed).length >= 3 &&
        s.orbit.comms &&
        r.power >= 4
      ) {
        s.crosschecked = true;
        r.power -= 4;
        log(
          s,
          "Independent observatory confirms a related emission pattern. Stellar variability is favored; the period remains uncertain.",
          "success",
        );
      }
      break;
    case "ASSIGN": {
      const c = s.crew.find((c) => c.id === a.id);
      if (!c || c.task === a.task) break;
      const task: Task = a.task;
      if (
        task === "Telescope repair" &&
        (!s.orbit.rendezvous || s.telescope.repaired)
      )
        break;
      if (task === "Life-support repair" && !s.life.fault) break;
      if (["Telescope repair", "Life-support repair"].includes(task)) {
        if (r.parts < 1) {
          log(s, "Repair requires one spare part.", "warning");
          break;
        }
        if (s.crew.some((c) => c.task === task)) {
          log(
            s,
            "A crew member is already assigned to this repair.",
            "warning",
          );
          break;
        }
        r.parts--;
      }
      if (task === "Spacewalk" && !s.orbit.rendezvous) break;
      c.task = task;
      c.progress = 0;
      log(s, `${c.name} assigned to ${task.toLowerCase()}.`);
      break;
    }
    case "ADVANCE":
      if (canAdvance(s)) {
        s.chapter++;
        log(s, `Chapter ${s.chapter} unlocked.`, "success");
        if (s.chapter === 4) {
          s.life.fault = true;
          s.life.condition = 32;
          s.life.co2 = 2800;
          s.crew[1].fatigue = Math.max(79, s.crew[1].fatigue);
          s.crew[1].stress = 65;
          trigger(s, "life");
        }
        if (s.chapter === 5) trigger(s, "radiation");
      }
      break;
    case "PROBE": {
      const cost = 80 + transferCost(s.orbit.altitude, a.target);
      if (
        s.chapter === 5 &&
        !s.probe &&
        a.target >= 600000 &&
        a.target <= 2000000 &&
        r.fuel >= cost + 160 &&
        r.power >= 8
      ) {
        r.fuel -= cost;
        r.power -= 8;
        s.probe = true;
        log(
          s,
          `Local relay probe inserted at ${Math.round(a.target / 1000)} km. The separated vantage reduces instrument bias; the distant source is not physically reachable.`,
          "success",
        );
      } else
        log(
          s,
          "Probe rejected: check trajectory, power, and return reserves.",
          "warning",
        );
      break;
    }
    case "CONCLUSION":
      s.conclusion = a.value;
      log(s, "Final science interpretation updated.");
      break;
    case "RETURN":
      if (l.phase === "orbit" && r.fuel >= 160) {
        r.fuel -= 160;
        s.ending = endingFor(s);
        s.status = "ended";
        s.paused = true;
        log(
          s,
          "Deorbit burn complete. Parachutes deployed. Crew recovered in the Pacific.",
          "success",
        );
      } else
        log(
          s,
          "Return requires a stable orbit and 160 m/s of maneuver fuel.",
          "warning",
        );
      break;
    case "REFILL":
      if (r.budget >= 8 && l.phase === "preflight" && r[a.resource] < 100) {
        r.budget -= 8;
        r[a.resource] = 100;
        log(s, `${a.resource} replenished at the launch complex.`);
      }
      break;
  }
  return s;
}
