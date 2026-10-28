import type { Mission, Settings } from "../simulation/types";
import {
  newMission,
  defaultSettings,
  eventCatalog,
  targets,
} from "../data/mission";
const KEY = "orbital-echo-save-v1",
  ARCHIVE = "orbital-echo-archive-v1",
  PREFS = "orbital-echo-settings-v1";
export interface Save {
  version: 1;
  mission: Mission;
  checkpoint: Mission;
  settings?: Settings;
}
export interface Archive {
  id: string;
  ending: string;
  chapter: number;
  date: string;
  science: number;
}
const finite = (x: unknown) => typeof x === "number" && Number.isFinite(x);
function shape(value: unknown, example: unknown): boolean {
  if (example === null) return true;
  if (typeof example === "number") return finite(value);
  if (typeof example === "string" || typeof example === "boolean")
    return typeof value === typeof example;
  if (Array.isArray(example))
    return (
      Array.isArray(value) &&
      value.length < 1000 &&
      (example.length === 0 || value.every((v) => shape(v, example[0])))
    );
  if (typeof example === "object")
    return (
      value !== null &&
      typeof value === "object" &&
      Object.entries(example as object).every(([k, v]) =>
        shape((value as Record<string, unknown>)[k], v),
      )
    );
  return false;
}
export function validateMission(raw: unknown): Mission {
  const template = newMission();
  if (!shape(raw, template))
    throw new Error("Save data is incomplete or contains invalid values.");
  const s = raw as Mission;
  const percentage = (n: number) => finite(n) && n >= 0 && n <= 100;
  const filters = ["Visible", "Infrared", "Ultraviolet"];
  const nullableText = (value: unknown) =>
    value === null || typeof value === "string";
  const allowedTasks = [
    "Standby",
    "Telescope repair",
    "Scientific analysis",
    "Equipment inspection",
    "Spacewalk",
    "Life-support repair",
    "Rest",
    "Exercise",
  ];
  if (
    s.version !== 1 ||
    !Number.isInteger(s.chapter) ||
    s.chapter < 1 ||
    s.chapter > 5 ||
    ![1, 2, 5, 10].includes(s.speed) ||
    s.elapsed < 0 ||
    s.elapsed > 1e8 ||
    !["active", "ended"].includes(s.status) ||
    !["preflight", "countdown", "ascent", "failed", "orbit"].includes(
      s.launch.phase,
    ) ||
    !["Atlas", "Vega", "Meridian"].includes(s.rocket.engine) ||
    ![1, 2, 3].includes(s.rocket.stages) ||
    s.rocket.fuel < 80000 ||
    s.rocket.fuel > 360000 ||
    s.rocket.payload < 2000 ||
    s.rocket.payload > 30000 ||
    ![0, 2, 4].includes(s.rocket.boosters) ||
    s.crew.length !== 3 ||
    s.crew.some(
      (c) => !allowedTasks.includes(c.task) || c.health < 0 || c.health > 100,
    ) ||
    s.events.some((e) => !Object.hasOwn(eventCatalog, e.id)) ||
    !nullableText(s.launch.failure) ||
    !nullableText(s.launch.vibration) ||
    ![
      null,
      "THE GREATEST DISCOVERY",
      "THE PRICE OF DISCOVERY",
      "AN UNFINISHED MYSTERY",
      "MISSION LOST",
    ].includes(s.ending) ||
    (s.status === "ended" && s.ending === null) ||
    !["calibration", "variability", "lensing", "unclassified"].includes(
      s.conclusion,
    ) ||
    !["Spectrometer", "Wide-field camera", "Interferometer"].includes(
      s.rocket.instrument,
    ) ||
    ![
      s.integrity,
      s.telescope.condition,
      s.telescope.pointing,
      s.life.condition,
      s.resources.power,
      s.resources.oxygen,
      s.resources.water,
      s.resources.food,
    ].every(percentage) ||
    s.crew.some(
      (c) =>
        ![c.fatigue, c.stress, c.hydration, c.nutrition, c.suit].every(
          percentage,
        ) ||
        c.progress < 0 ||
        c.radiation < 0,
    ) ||
    new Set(s.crew.map((c) => c.id)).size !== 3 ||
    Object.values(s.resources).some((v) => !finite(v) || v < 0) ||
    s.resources.parts > 100 ||
    s.orbit.altitude < 0 ||
    s.orbit.altitude > 2e6 ||
    s.launch.stage < 0 ||
    s.launch.stage >= s.rocket.stages ||
    s.launch.stageFuel.some((v) => !finite(v) || v < 0) ||
    s.launch.stageFuel.length > 3
  )
    throw new Error(
      "Save data has unsupported or out-of-range mission values.",
    );
  const o = {
    id: 0,
    target: "",
    filter: "",
    exposure: 0,
    duration: 0,
    quality: 0,
    snr: 0,
    noise: 0,
    time: 0,
    analyzed: false,
    pointing: 0,
  };
  if (
    !s.telescope.observations.every(
      (v) =>
        shape(v, o) &&
        percentage(v.quality) &&
        percentage(v.pointing) &&
        Number.isInteger(v.id) &&
        v.id > 0 &&
        targets.some((t) => t.id === v.target) &&
        filters.includes(v.filter) &&
        v.exposure >= 10 &&
        v.exposure <= 120 &&
        v.duration >= v.exposure &&
        v.duration <= 240 &&
        v.snr >= 0 &&
        v.noise >= 0,
    ) ||
    (s.telescope.active !== null &&
      (!shape(s.telescope.active, {
        target: "",
        filter: "",
        exposure: 0,
        duration: 0,
        progress: 0,
      }) ||
        !targets.some((t) => t.id === s.telescope.active!.target) ||
        !filters.includes(s.telescope.active.filter) ||
        s.telescope.active.exposure < 10 ||
        s.telescope.active.exposure > 120 ||
        s.telescope.active.duration < s.telescope.active.exposure ||
        s.telescope.active.duration > 240 ||
        s.telescope.active.progress < 0)) ||
    !s.telemetry.every((v) =>
      shape(v, { time: 0, altitude: 0, velocity: 0 }),
    ) ||
    !s.decisions.every((v) => typeof v === "string") ||
    !s.triggered.every((v) => typeof v === "string")
  )
    throw new Error("Observation or mission history data is invalid.");
  if (
    s.launch.phase === "ascent" &&
    s.launch.stageFuel.length !== s.rocket.stages
  )
    throw new Error("Launch stage data is incomplete.");
  return structuredClone({
    ...s,
    events: s.events.map((e) => eventCatalog[e.id]),
  });
}
export function parseSave(text: string): Save {
  if (text.length > 2e6) throw new Error("Save file exceeds the 2 MB limit.");
  const raw = JSON.parse(text);
  if (
    !raw ||
    typeof raw !== "object" ||
    raw.version !== 1 ||
    !raw.mission ||
    !raw.checkpoint
  )
    throw new Error(
      "Unsupported save format. Expected Orbital Echo version 1.",
    );
  const mission = validateMission(raw.mission),
    checkpoint = validateMission(raw.checkpoint);
  if (mission.id !== checkpoint.id || mission.chapter !== checkpoint.chapter)
    throw new Error("Checkpoint does not belong to this chapter.");
  if (
    raw.settings &&
    (!shape(raw.settings, defaultSettings) ||
      !["High", "Low"].includes(raw.settings.quality) ||
      raw.settings.volume < 0 ||
      raw.settings.volume > 100)
  )
    throw new Error("Save preferences are invalid.");
  return { version: 1, mission, checkpoint, settings: raw.settings };
}
export function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseSave(raw) : null;
  } catch {
    return null;
  }
}
export function saveGame(mission: Mission, checkpoint: Mission) {
  // Preserve the previous valid save during the render that enters a new chapter.
  if (mission.id !== checkpoint.id || mission.chapter !== checkpoint.chapter)
    throw new Error("Chapter checkpoint is still updating.");
  localStorage.setItem(
    KEY,
    JSON.stringify({
      version: 1,
      mission,
      checkpoint,
      settings: loadSettings(),
    }),
  );
}
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(PREFS) || "null");
    return s &&
      shape(s, defaultSettings) &&
      ["High", "Low"].includes(s.quality) &&
      s.volume >= 0 &&
      s.volume <= 100
      ? s
      : defaultSettings;
  } catch {
    return defaultSettings;
  }
}
export function saveSettings(s: Settings) {
  localStorage.setItem(PREFS, JSON.stringify(s));
}
export function getArchive(): Archive[] {
  try {
    const a = JSON.parse(localStorage.getItem(ARCHIVE) || "[]");
    return Array.isArray(a)
      ? a
          .filter((x) =>
            shape(x, { id: "", ending: "", chapter: 0, date: "", science: 0 }),
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
export function archiveMission(a: Archive) {
  const rows = getArchive();
  if (!rows.some((r) => r.id === a.id && r.ending === a.ending))
    localStorage.setItem(ARCHIVE, JSON.stringify([a, ...rows].slice(0, 50)));
}
