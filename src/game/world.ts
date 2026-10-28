import type { Mission } from "../simulation/types";
import {
  box,
  bodyOverlaps,
  type Collider,
  type Pose,
  type Interaction,
} from "./physics";
export type Region = "ground" | "flight" | "orbit";
export type Terminal =
  | "inspection"
  | "flight"
  | "navigation"
  | "science"
  | "evidence"
  | "crew"
  | "life"
  | "log"
  | "settings"
  | "resources"
  | "handbook"
  | null;
export interface WorldRuntime {
  missionId: string;
  suited: boolean;
  doorWanted: boolean;
  door: number;
  rolloutRequested: boolean;
  rollout: number;
  pose: Pose;
  region: Region;
  lastSave: number;
  input: Set<string>;
  mode: "play" | "terminal" | "pause";
  focused: string | null;
  locked: boolean;
  repairHold: number;
  travel: number;
}
export const groundSpawn: Pose = {
  x: 0,
  y: 0,
  z: 14.5,
  yaw: 0,
  pitch: 0,
  vy: 0,
  grounded: true,
};
export const shipSpawn: Pose = {
  x: 0,
  y: 0,
  z: 1.7,
  yaw: 0,
  pitch: 0,
  vy: 0,
  grounded: true,
};
export function regionFor(s: Mission): Region {
  return s.launch.phase === "orbit"
    ? "orbit"
    : s.launch.phase === "ascent" && s.launch.altitude > 350
      ? "flight"
      : "ground";
}
export function makeRuntime(s: Mission): WorldRuntime {
  const region = regionFor(s);
  let stored: Partial<WorldRuntime> = {};
  try {
    const raw = JSON.parse(
      localStorage.getItem("orbital-echo-world-v1") ?? "null",
    );
    if (
      raw?.missionId === s.id &&
      raw.region === region &&
      raw.pose &&
      ["x", "y", "z", "yaw", "pitch"].every((k) =>
        Number.isFinite(raw.pose[k]),
      ) &&
      Math.abs(raw.pose.x) < 50 &&
      Math.abs(raw.pose.z) < 100 &&
      raw.pose.y >= 0 &&
      raw.pose.y < 30
    )
      stored = raw;
  } catch {}
  return {
    missionId: s.id,
    suited: !!stored.suited || !!s.launch.vibration,
    doorWanted: !!stored.doorWanted,
    door: stored.doorWanted ? 1 : 0,
    rolloutRequested:
      !!stored.rolloutRequested || s.launch.phase !== "preflight",
    rollout:
      s.launch.phase !== "preflight"
        ? 1
        : Math.min(1, Math.max(0, stored.rollout ?? 0)),
    pose: stored.pose
      ? { ...stored.pose, vy: 0 }
      : { ...(region === "ground" ? groundSpawn : shipSpawn) },
    region,
    lastSave: 0,
    input: new Set(),
    mode: "play",
    focused: null,
    locked: false,
    repairHold: 0,
    travel: 0,
  };
}
export function persistWorld(w: WorldRuntime) {
  try {
    localStorage.setItem(
      "orbital-echo-world-v1",
      JSON.stringify({
        missionId: w.missionId,
        suited: w.suited,
        doorWanted: w.doorWanted,
        rolloutRequested: w.rolloutRequested,
        rollout: w.rollout,
        pose: w.pose,
        region: w.region,
      }),
    );
  } catch {}
}
export interface Solid {
  id: string;
  p: [number, number, number];
  s: [number, number, number];
  color?: string;
}
// The same geometry bounds feed both the renderer and collision solver.
export const groundWalls: Solid[] = [
  { id: "prep-west", p: [-5, 2, 13], s: [0.3, 4, 10] },
  { id: "prep-east", p: [5, 2, 13], s: [0.3, 4, 10] },
  { id: "prep-back", p: [0, 2, 18], s: [10.3, 4, 0.3] },
  { id: "prep-front-left", p: [-3.1, 2, 8], s: [3.8, 4, 0.3] },
  { id: "prep-front-right", p: [3.1, 2, 8], s: [3.8, 4, 0.3] },
  { id: "door-lintel", p: [0, 3.65, 8], s: [2.4, 0.7, 0.3] },
  { id: "corridor-left", p: [-2, 1.8, 5.5], s: [0.25, 3.6, 5] },
  { id: "corridor-right", p: [2, 1.8, 5.5], s: [0.25, 3.6, 5] },
  { id: "hangar-south-left", p: [-5.5, 11, 3], s: [7, 22, 0.4] },
  { id: "hangar-south-right", p: [5.5, 11, 3], s: [7, 22, 0.4] },
  { id: "hangar-entrance-top", p: [0, 12.8, 3], s: [4, 18.4, 0.4] },
  { id: "hangar-east", p: [9, 11, -8.5], s: [0.4, 22, 23] },
  { id: "hangar-west-north", p: [-9, 11, -14], s: [0.4, 22, 12] },
  { id: "hangar-west-south", p: [-9, 11, -0.5], s: [0.4, 22, 7] },
  { id: "control-door-top", p: [-9, 12.7, -6], s: [0.4, 18.6, 4] },
  { id: "hangar-north-left", p: [-6, 11, -20], s: [6, 22, 0.4] },
  { id: "hangar-north-right", p: [6, 11, -20], s: [6, 22, 0.4] },
  { id: "control-west", p: [-18, 2, -6.5], s: [0.3, 4, 13] },
  { id: "control-south", p: [-13.5, 2, 0], s: [9, 4, 0.3] },
  { id: "control-window-base", p: [-13.5, 0.45, -13], s: [9, 0.9, 0.25] },
  { id: "control-window-top", p: [-13.5, 3.8, -13], s: [9, 0.4, 0.25] },
  {
    id: "control-glass",
    p: [-13.5, 2.2, -13],
    s: [9, 2.6, 0.08],
    color: "glass",
  },
  { id: "fence-west", p: [-25, 2, -20], s: [0.4, 4, 90] },
  { id: "fence-east", p: [25, 2, -20], s: [0.4, 4, 90] },
  { id: "fence-north", p: [0, 2, -65], s: [50, 4, 0.4] },
  { id: "fence-south", p: [0, 2, 25], s: [50, 4, 0.4] },
];
export const groundEquipment: Solid[] = [
  { id: "suit", p: [3.9, 1.3, 13.7], s: [1.1, 2.6, 1.5] },
  { id: "locker-a", p: [-4.45, 1.3, 12.2], s: [0.7, 2.6, 1.3] },
  { id: "locker-b", p: [-4.45, 1.3, 14.1], s: [0.7, 2.6, 1.3] },
  { id: "bench", p: [-2.5, 0.38, 16], s: [3.6, 0.76, 0.7] },
  { id: "inspection", p: [-3.6, 0.65, -3.2], s: [1.7, 1.3, 0.9] },
  { id: "crate-a", p: [6, 0.6, -3], s: [1.7, 1.2, 1.6] },
  { id: "crate-b", p: [6.5, 0.5, -14], s: [1.7, 1, 2] },
  { id: "crate-c", p: [-6.7, 0.6, -15], s: [1.7, 1.2, 1.6] },
  { id: "launch-console", p: [-13, 0.65, -10.4], s: [7, 1.3, 1.3] },
  { id: "control-desk", p: [-16, 0.6, -2], s: [2.6, 1.2, 1.1] },
];
export const shipWalls: Solid[] = [
  { id: "cockpit-west", p: [-5, 1.9, -1], s: [0.3, 3.8, 14] },
  { id: "cockpit-east", p: [5, 1.9, -1], s: [0.3, 3.8, 14] },
  { id: "cockpit-front", p: [0, 0.35, -8], s: [10, 0.7, 0.3] },
  { id: "cockpit-window", p: [0, 2.1, -8], s: [10, 2.8, 0.06], color: "glass" },
  { id: "cockpit-rear-left", p: [-3.3, 1.9, 6], s: [3.4, 3.8, 0.3] },
  { id: "cockpit-rear-right", p: [3.3, 1.9, 6], s: [3.4, 3.8, 0.3] },
  { id: "cockpit-rear-top", p: [0, 3.5, 6], s: [3.2, 0.6, 0.3] },
  { id: "ship-corridor-west", p: [-1.6, 1.8, 8], s: [0.25, 3.6, 4] },
  { id: "ship-corridor-east", p: [1.6, 1.8, 8], s: [0.25, 3.6, 4] },
  { id: "hab-front-left", p: [-3.8, 1.9, 10], s: [4.4, 3.8, 0.3] },
  { id: "hab-front-right", p: [3.8, 1.9, 10], s: [4.4, 3.8, 0.3] },
  { id: "hab-west", p: [-6, 1.9, 17.5], s: [0.3, 3.8, 15] },
  { id: "hab-east", p: [6, 1.9, 17.5], s: [0.3, 3.8, 15] },
  { id: "hab-aft", p: [0, 1.9, 25], s: [12, 3.8, 0.3] },
];
export const shipEquipment: Solid[] = [
  { id: "navigation", p: [-2.8, 0.65, -5.6], s: [2.5, 1.3, 1.3] },
  { id: "staging", p: [2.8, 0.65, -5.6], s: [2.5, 1.3, 1.3] },
  { id: "captain-seat", p: [0, 0.6, 3.8], s: [1.2, 1.2, 1.2] },
  { id: "telescope-repair", p: [5.2, 1.3, 12.4], s: [1.3, 2.6, 2] },
  { id: "science", p: [4.7, 0.65, 18.5], s: [1.8, 1.3, 2.5] },
  { id: "life", p: [-5.1, 1.3, 12.5], s: [1.5, 2.6, 2.2] },
  { id: "bunk", p: [3, 0.5, 23.5], s: [3.4, 1, 1.6] },
  { id: "crew", p: [-3.8, 0.6, 23.5], s: [2.8, 1.2, 1] },
];
export function rocketPosition(w: WorldRuntime) {
  return -9 - w.rollout * 39;
}
export function collidersFor(w: WorldRuntime, s: Mission): Collider[] {
  if (w.region !== "ground")
    return [...shipWalls, ...shipEquipment].map((b) => box(b.id, b.p, b.s));
  const blockers = [...groundWalls, ...groundEquipment].map((b) =>
    box(b.id, b.p, b.s),
  );
  blockers.push(box("door", [w.door * 2.6, 1.55, 8], [2.4, 3.1, 0.28]));
  const open = w.rolloutRequested ? Math.min(1, w.rollout * 5) : 0;
  blockers.push(
    box("bay-door-left", [-1.5 - open * 3, 11, -20], [3, 22, 0.3]),
    box("bay-door-right", [1.5 + open * 3, 11, -20], [3, 22, 0.3]),
  );
  if (s.launch.phase !== "ascent" && s.launch.phase !== "orbit")
    blockers.push(box("rocket", [0, 10, rocketPosition(w)], [5, 20, 5]));
  else if (s.launch.altitude < 25)
    blockers.push(
      box("rocket", [0, 10 + s.launch.altitude, rocketPosition(w)], [5, 20, 5]),
    );
  return blockers;
}
export function interactionsFor(w: WorldRuntime, s: Mission): Interaction[] {
  if (w.region === "ground")
    return [
      {
        id: "suit",
        position: [3.27, 1.55, 13.7],
        label: w.suited ? "Flight suit equipped" : "Equip flight suit",
        radius: 0.65,
      },
      {
        id: "door",
        position: [0, 1.55, 8],
        label: w.doorWanted ? "Close hangar access" : "Open hangar access",
        radius: 0.85,
      },
      {
        id: "inspection",
        position: [-3.6, 1.35, -2.68],
        label: s.launch.checked
          ? "Inspect rocket configuration"
          : "Inspect the Astra launch vehicle",
        radius: 0.65,
      },
      {
        id: "rollout",
        position: [-15.2, 1.45, -9.65],
        label: w.rolloutRequested
          ? "Vehicle rollout in progress"
          : "Open bay & roll out Astra",
        radius: 0.35,
      },
      {
        id: "launch",
        position: [-13, 1.45, -9.65],
        label:
          s.launch.phase === "countdown"
            ? "Abort countdown"
            : s.launch.phase === "failed"
              ? "Recover failed launch"
              : "Arm launch & start countdown",
        radius: 0.38,
      },
      {
        id: "hold",
        position: [-10.8, 1.45, -9.65],
        label: s.paused ? "Release countdown hold" : "Hold countdown",
        radius: 0.35,
      },
      {
        id: "log",
        position: [-16, 1.3, -1.35],
        label: "Read mission transmissions",
        radius: 0.7,
      },
    ];
  return [
    {
      id: "navigation",
      position: [-2.8, 1.4, -4.85],
      label:
        s.chapter === 1
          ? "Confirm orbit & begin operations"
          : "Use navigation console",
      radius: 0.65,
    },
    {
      id: "staging",
      position: [2.8, 1.4, -4.85],
      label: s.launch.staging
        ? `Separate stage ${s.launch.stage + 1}`
        : "View flight telemetry",
      radius: 0.65,
    },
    {
      id: "telescope-repair",
      position: [4.48, 1.5, 12.4],
      label: s.telescope.repaired
        ? "Calibrate telescope pointing"
        : s.crew.some((c) => c.task === "Telescope repair")
          ? "Servicing in progress"
          : "Service Hubble pointing assembly",
      radius: 0.7,
    },
    {
      id: "science",
      position: [3.72, 1.4, 18.5],
      label: "Operate telescope workstation",
      radius: 0.75,
    },
    {
      id: "life",
      position: [-4.25, 1.55, 12.5],
      label: s.life.fault
        ? "Repair environmental control"
        : "Inspect life-support equipment",
      radius: 0.8,
    },
    {
      id: "bunk",
      position: [3, 1.2, 22.65],
      label: "Send Maya Chen to rest",
      radius: 0.8,
    },
    {
      id: "crew",
      position: [-3.8, 1.3, 22.9],
      label: "Assign crew duties",
      radius: 0.7,
    },
    {
      id: "evidence",
      position: [-5.7, 1.65, 18.5],
      label: "Review mission evidence",
      radius: 0.85,
      range: 2.9,
    },
  ];
}

/** Moving obstacles stop when the next position would overlap the player. */
export function advanceWorld(w: WorldRuntime, s: Mission, dt: number) {
  if (w.mode === "pause" || s.paused) return;
  const door = Math.max(
    0,
    Math.min(1, w.door + (w.doorWanted ? 1 : -1) * dt * 2),
  );
  if (
    !bodyOverlaps(w.pose, box("door", [door * 2.6, 1.55, 8], [2.4, 3.1, 0.28]))
  )
    w.door = door;
  if (w.rolloutRequested && w.rollout < 1) {
    const old = w.rollout;
    w.rollout = Math.min(1, old + dt / 9);
    if (
      w.region === "ground" &&
      bodyOverlaps(
        w.pose,
        box("rocket", [0, 10, rocketPosition(w)], [5, 20, 5]),
      )
    )
      w.rollout = old;
  }
}
