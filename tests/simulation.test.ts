import { describe, it, expect } from "vitest";
import { newMission } from "../src/data/mission";
import { reduceMission, advanceTime } from "../src/simulation/engine";
import {
  rocketStats,
  orbitStats,
  transferCost,
  observationQuality,
} from "../src/simulation/physics";
import { canAdvance, endingFor, scienceScore } from "../src/simulation/rules";
import { parseSave } from "../src/state/persistence";
function preflight() {
  let s = newMission();
  s = reduceMission(s, { type: "DECIDE", id: "vibration", effect: "inspect" });
  return reduceMission(s, { type: "PREFLIGHT" });
}
function launch() {
  let s = reduceMission(preflight(), { type: "LAUNCH" });
  for (let i = 0; i < 600; i++) {
    s = advanceTime(s, 1);
    if (s.launch.staging) s = reduceMission(s, { type: "STAGE" });
    if (["failed", "orbit"].includes(s.launch.phase)) break;
  }
  return s;
}
describe("rocket engineering and ascent", () => {
  it("calculates staged mass, TWR and delta-v in SI units", () => {
    const st = rocketStats(newMission().rocket);
    expect(st.mass).toBe(268000);
    expect(st.twr).toBeGreaterThan(1.9);
    expect(st.deltaV).toBeGreaterThan(10000);
    expect(st.stageDeltaV.reduce((a, b) => a + b, 0)).toBe(st.deltaV);
  });
  it("launches a valid vehicle to a physically valid circular insertion", () => {
    const s = launch();
    expect(s.launch.failure).toBeNull();
    expect(s.launch.phase).toBe("orbit");
    expect(s.launch.altitude).toBeGreaterThan(160000);
    expect(s.launch.velocity).toBeGreaterThanOrEqual(
      orbitStats(s.launch.altitude).velocity,
    );
    expect(canAdvance(s)).toBe(true);
  });
  it("rejects inadequate thrust and inadequate fuel", () => {
    let s = preflight();
    s = reduceMission(s, {
      type: "CONFIG",
      config: { engine: "Vega", fuel: 360000, payload: 30000 },
    });
    s = reduceMission(s, { type: "PREFLIGHT" });
    expect(s.launch.checked).toBe(false);
    expect(s.log[0].text).toContain("thrust-to-weight");
    s = reduceMission(s, {
      type: "CONFIG",
      config: { engine: "Atlas", fuel: 80000, stages: 1 },
    });
    s = reduceMission(s, { type: "PREFLIGHT" });
    expect(s.launch.checked).toBe(false);
    expect(s.log[0].text).toContain("delta-v");
  });
  it("aborts countdown, refunds budget, and does not ignite", () => {
    let s = preflight();
    const budget = s.resources.budget;
    s = reduceMission(s, { type: "LAUNCH" });
    s = advanceTime(s, 4);
    s = reduceMission(s, { type: "ABORT" });
    s = advanceTime(s, 20);
    expect(s.launch.phase).toBe("preflight");
    expect(s.resources.budget).toBe(budget);
  });
  it("drops dry mass at separation and activates upper engine", () => {
    let s = reduceMission(preflight(), { type: "LAUNCH" });
    while (!s.launch.staging && s.launch.phase !== "failed")
      s = advanceTime(s, 1);
    const mass = s.launch.mass;
    s = reduceMission(s, { type: "STAGE" });
    expect(mass - s.launch.mass).toBeCloseTo(18000);
    expect(s.launch.thrust).toBe(850000);
  });
});
describe("orbital navigation", () => {
  it("has plausible Earth orbit constants and symmetric Hohmann cost", () => {
    const o = orbitStats(400000);
    expect(o.velocity).toBeCloseTo(7672.6, 0);
    expect(o.period / 60).toBeGreaterThan(92);
    expect(o.period / 60).toBeLessThan(93);
    expect(transferCost(200000, 540000)).toBeCloseTo(
      transferCost(540000, 200000),
      6,
    );
  });
  it("consumes transfer fuel and blocks unsafe maneuvers", () => {
    let s = launch();
    const fuel = s.resources.fuel,
      cost = transferCost(s.orbit.altitude, 540000);
    s = reduceMission(s, { type: "MANEUVER", altitude: 540000 });
    expect(s.resources.fuel).toBeCloseTo(fuel - cost);
    const current = s.orbit.altitude;
    s = reduceMission(s, { type: "MANEUVER", altitude: 1 });
    expect(s.orbit.altitude).toBe(current);
    s.resources.fuel = 170;
    s = reduceMission(s, { type: "MANEUVER", altitude: 1000000 });
    expect(s.orbit.altitude).toBe(current);
  });
});
describe("time, science, crew and persistence", () => {
  it("does not consume anything while paused and rest reduces fatigue", () => {
    let s = launch();
    s.paused = true;
    expect(advanceTime(s, 120)).toEqual(s);
    s.paused = false;
    s.crew[0].fatigue = 80;
    s = reduceMission(s, { type: "ASSIGN", id: "reyes", task: "Rest" });
    const oxygen = s.resources.oxygen;
    s = advanceTime(s, 60);
    expect(s.resources.oxygen).toBeLessThan(oxygen);
    expect(s.crew[0].fatigue).toBeLessThan(60);
  });
  it("exposure and pointing influence quality and observations accumulate evidence", () => {
    expect(
      observationQuality(60, 98, 96, "Visible", "Spectrometer").quality,
    ).toBeGreaterThan(
      observationQuality(10, 60, 54, "Visible", "Spectrometer").quality,
    );
    let s = launch();
    s.telescope.deployed = true;
    s.telescope.repaired = true;
    s.telescope.condition = 96;
    s.telescope.pointing = 97;
    s = reduceMission(s, {
      type: "OBSERVE",
      target: "anomaly",
      filter: "Visible",
      exposure: 30,
      duration: 30,
    });
    s = advanceTime(s, 31);
    expect(s.telescope.observations).toHaveLength(1);
    expect(scienceScore(s)).toBe(0);
    s = reduceMission(s, { type: "ANALYZE", id: 1 });
    expect(scienceScore(s)).toBeGreaterThan(20);
  });
  it("environment fault harms conditions; repair restores them and consumes a part", () => {
    let s = launch();
    s.life.fault = true;
    s.life.condition = 30;
    const co2 = s.life.co2;
    s = advanceTime(s, 20);
    expect(s.life.co2).toBeGreaterThan(co2);
    const parts = s.resources.parts;
    s = reduceMission(s, {
      type: "ASSIGN",
      id: "okafor",
      task: "Life-support repair",
    });
    s = advanceTime(s, 55);
    expect(s.life.fault).toBe(false);
    expect(s.life.condition).toBe(96);
    expect(s.resources.parts).toBe(parts - 1);
  });
  it("requires actual objectives to unlock a chapter", () => {
    const s = newMission();
    expect(reduceMission(s, { type: "ADVANCE" }).chapter).toBe(1);
    expect(reduceMission(launch(), { type: "ADVANCE" }).chapter).toBe(2);
  });
  it("validates a round-trip save and rejects malformed input", () => {
    const s = launch();
    expect(
      parseSave(JSON.stringify({ version: 1, mission: s, checkpoint: s }))
        .mission,
    ).toEqual(s);
    expect(() => parseSave("{broken")).toThrow();
    expect(() =>
      parseSave(JSON.stringify({ version: 1, mission: {}, checkpoint: {} })),
    ).toThrow();
    const bad = structuredClone(s);
    bad.resources.oxygen = -12;
    expect(() =>
      parseSave(JSON.stringify({ version: 1, mission: bad, checkpoint: bad })),
    ).toThrow();
  });
  it("calculates all three endings from evidence and condition", () => {
    const s = launch();
    expect(endingFor(s)).toBe("AN UNFINISHED MYSTERY");
    s.crosschecked = true;
    s.telescope.condition = 96;
    s.telescope.observations = [1, 2, 3].map((id) => ({
      id,
      target: id === 3 ? "galaxy" : "anomaly",
      filter: id === 2 ? "Infrared" : "Visible",
      quality: 96,
      exposure: 60,
      duration: 60,
      snr: 25,
      noise: 2,
      time: 0,
      analyzed: true,
      pointing: 98,
    }));
    expect(endingFor(s)).toBe("THE GREATEST DISCOVERY");
    s.integrity = 50;
    expect(endingFor(s)).toBe("THE PRICE OF DISCOVERY");
  });
});
describe("event decisions and recovery invariants", () => {
  it("blocks a late launch even after a previously valid preflight", () => {
    let s = preflight();
    s = advanceTime(s, 1801);
    s = reduceMission(s, { type: "LAUNCH" });
    expect(s.launch.phase).toBe("preflight");
    expect(s.launch.checked).toBe(false);
    expect(s.log[0].text).toContain("Launch window missed");
  });
  it("each event fires at most once and an autonomous blackout recovers", () => {
    let s = launch();
    s.chapter = 3;
    s.telescope.observations = [1, 2, 3].map((id) => ({
      id,
      target: "anomaly",
      filter: "Visible",
      quality: 80,
      exposure: 30,
      duration: 30,
      snr: 15,
      noise: 3,
      time: 0,
      analyzed: true,
      pointing: 97,
    }));
    s = advanceTime(s, 1);
    expect(s.orbit.comms).toBe(false);
    expect(s.events.filter((e) => e.id === "blackout")).toHaveLength(1);
    s = reduceMission(s, {
      type: "DECIDE",
      id: "blackout",
      effect: "autonomous",
    });
    s = advanceTime(s, 61);
    expect(s.orbit.comms).toBe(true);
    expect(s.events.filter((e) => e.id === "blackout")).toHaveLength(0);
    expect(s.triggered.filter((id) => id === "blackout")).toHaveLength(1);
  });
  it("an explicit life-support decision changes reserves and pressure", () => {
    let s = launch();
    s.chapter = 3;
    s.telescope.observations = [1, 2, 3].map((id) => ({
      id,
      target: id === 3 ? "galaxy" : "anomaly",
      filter: id === 2 ? "Infrared" : "Visible",
      quality: 80,
      exposure: 30,
      duration: 30,
      snr: 15,
      noise: 3,
      time: 0,
      analyzed: true,
      pointing: 97,
    }));
    s.crosschecked = true;
    s = reduceMission(s, { type: "ADVANCE" });
    expect(s.chapter).toBe(4);
    expect(s.life.fault).toBe(true);
    const oxygen = s.resources.oxygen;
    s = reduceMission(s, { type: "DECIDE", id: "life", effect: "flush" });
    expect(s.resources.oxygen).toBeCloseTo(oxygen - 14);
    expect(s.life.co2).toBe(650);
    expect(s.life.fault).toBe(true);
  });
  it("preserves the return reserve during optional probe deployment", () => {
    let s = launch();
    s.chapter = 5;
    s.resources.fuel = 200;
    const before = s.resources.fuel;
    s = reduceMission(s, { type: "PROBE", target: 900000 });
    expect(s.probe).toBe(false);
    expect(s.resources.fuel).toBe(before);
  });
});

import { estimatePeriod } from "../src/simulation/photometry";
it("requires a real observation baseline before fitting the simulated cycle", () => {
  const observations = Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    target: "anomaly",
    filter: "Visible",
    quality: 98,
    exposure: 30,
    duration: 30,
    snr: 24,
    noise: 2,
    time: i * 90,
    analyzed: true,
    pointing: 99,
  }));
  expect(estimatePeriod(observations.slice(0, 3)).period).toBeNull();
  expect(estimatePeriod(observations).period).toBeGreaterThanOrEqual(290);
  expect(estimatePeriod(observations).period).toBeLessThanOrEqual(310);
});
it("a failed launch can be retried without spending its budget twice", () => {
  let s = reduceMission(preflight(), { type: "LAUNCH" });
  const allocated = s.resources.budget;
  s = advanceTime(s, 670);
  expect(s.launch.phase).toBe("failed");
  s = reduceMission(s, { type: "CONFIG", config: { fuel: 80000 } });
  expect(s.launch.phase).toBe("failed");
  s = reduceMission(s, { type: "RETRY" });
  expect(s.resources.budget).toBeCloseTo(
    allocated + rocketStats(s.rocket).cost,
  );
  s = reduceMission(s, { type: "PREFLIGHT" });
  expect(s.launch.checked).toBe(true);
});
it("rejects malformed nullable and active-observation fields without rendering them", () => {
  const s = newMission();
  const raw = { version: 1, mission: s, checkpoint: structuredClone(s) };
  expect(() => parseSave("null")).toThrow("Unsupported save format");
  (raw.mission.launch as unknown as { failure: unknown }).failure = {
    unexpected: "object",
  };
  expect(() => parseSave(JSON.stringify(raw))).toThrow();
  raw.mission = newMission();
  (raw.mission.telescope as unknown as { active: unknown }).active = false;
  expect(() => parseSave(JSON.stringify(raw))).toThrow();
});
