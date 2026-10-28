export type Task =
  | "Standby"
  | "Telescope repair"
  | "Scientific analysis"
  | "Equipment inspection"
  | "Spacewalk"
  | "Life-support repair"
  | "Rest"
  | "Exercise";
export type View =
  | "Overview"
  | "Rocket & launch"
  | "Orbit & navigation"
  | "Telescope & science"
  | "Crew & health"
  | "Life support"
  | "Resources"
  | "Mission log"
  | "Investigation";
export interface RocketConfig {
  engine: "Atlas" | "Vega" | "Meridian";
  stages: number;
  fuel: number;
  payload: number;
  boosters: number;
  instrument: "Spectrometer" | "Wide-field camera" | "Interferometer";
}
export interface Crew {
  id: string;
  name: string;
  role: string;
  initials: string;
  skill: number;
  health: number;
  fatigue: number;
  stress: number;
  sleepDebt: number;
  hydration: number;
  nutrition: number;
  radiation: number;
  suit: number;
  task: Task;
  progress: number;
  condition: string;
}
export interface Observation {
  id: number;
  target: string;
  filter: string;
  exposure: number;
  duration: number;
  quality: number;
  snr: number;
  noise: number;
  time: number;
  analyzed: boolean;
  pointing: number;
}
export interface Resources {
  fuel: number;
  power: number;
  oxygen: number;
  water: number;
  food: number;
  parts: number;
  budget: number;
  observationTime: number;
}
export interface Settings {
  sound: boolean;
  music: boolean;
  volume: number;
  quality: "High" | "Low";
  motion: boolean;
  largeText: boolean;
  contrast: boolean;
  science: boolean;
}
export interface MissionEvent {
  id: string;
  title: string;
  description: string;
  severity: "warning" | "critical" | "info";
  choices: { label: string; detail: string; effect: string; parts?: number }[];
}
export interface Log {
  time: number;
  text: string;
  level: "info" | "success" | "warning";
}
export interface Mission {
  version: 1;
  id: string;
  chapter: number;
  elapsed: number;
  paused: boolean;
  speed: number;
  status: "active" | "ended";
  ending: string | null;
  rocket: RocketConfig;
  launch: {
    phase: "preflight" | "countdown" | "ascent" | "failed" | "orbit";
    countdown: number;
    stage: number;
    stageFuel: number[];
    altitude: number;
    velocity: number;
    time: number;
    pressure: number;
    thrust: number;
    mass: number;
    staging: boolean;
    failure: string | null;
    checked: boolean;
    vibration: string | null;
  };
  orbit: {
    altitude: number;
    target: number;
    rendezvous: boolean;
    matched: boolean;
    distance: number;
    relative: number;
    comms: boolean;
  };
  resources: Resources;
  integrity: number;
  telescope: {
    condition: number;
    pointing: number;
    repaired: boolean;
    deployed: boolean;
    active: {
      target: string;
      filter: string;
      exposure: number;
      duration: number;
      progress: number;
    } | null;
    observations: Observation[];
  };
  crew: Crew[];
  life: {
    condition: number;
    co2: number;
    pressure: number;
    temperature: number;
    fault: boolean;
    isolated: boolean;
  };
  events: MissionEvent[];
  triggered: string[];
  decisions: string[];
  log: Log[];
  crosschecked: boolean;
  probe: boolean;
  conclusion: string;
  telemetry: { time: number; altitude: number; velocity: number }[];
}
export type Action =
  | { type: "TICK"; dt: number }
  | { type: "PAUSE" }
  | { type: "SPEED"; speed: number }
  | { type: "CONFIG"; config: Partial<RocketConfig> }
  | { type: "PREFLIGHT" }
  | { type: "LAUNCH" }
  | { type: "ABORT" }
  | { type: "STAGE" }
  | { type: "RETRY" }
  | { type: "DECIDE"; id: string; effect: string }
  | { type: "MANEUVER"; altitude: number }
  | { type: "MATCH" }
  | { type: "DOCK" }
  | { type: "DEPLOY" }
  | {
      type: "OBSERVE";
      target: string;
      filter: string;
      exposure: number;
      duration: number;
    }
  | { type: "ANALYZE"; id: number }
  | { type: "CALIBRATE" }
  | { type: "CROSSCHECK" }
  | { type: "ASSIGN"; id: string; task: Task }
  | { type: "ADVANCE" }
  | { type: "PROBE"; target: number }
  | { type: "CONCLUSION"; value: string }
  | { type: "RETURN" }
  | { type: "REFILL"; resource: "oxygen" | "water" | "food" };
