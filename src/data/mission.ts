import type { Mission, MissionEvent, Settings } from "../simulation/types";
export const chapters = [
  {
    name: "The countdown",
    location: "KENNEDY SPACE CENTER",
    description: "Every discovery begins with a leap.",
    briefing:
      "An unexplained pattern has appeared in Hubble’s latest transmission. Assemble the Astra launch vehicle, evaluate a vibration warning, and deliver your crew safely to orbit.",
  },
  {
    name: "The silent telescope",
    location: "LOW EARTH ORBIT",
    description: "Something out there is waiting.",
    briefing:
      "Hubble has fallen silent. Transfer to its 540 km orbit, match velocity, and approach. Assign an engineer to restore its pointing system before deploying the Echo observatory.",
  },
  {
    name: "Signals in the dark",
    location: "ECHO OBSERVATORY",
    description: "A pattern is only the beginning.",
    briefing:
      "Compare at least three observations across different targets and filters. Analyze each dataset and request an independent observatory check. Good science needs repeatable evidence.",
  },
  {
    name: "The human limit",
    location: "ASTRA CREW MODULE",
    description: "Bring them home. All of them.",
    briefing:
      "The carbon-dioxide scrubber has failed. Resolve the emergency, assign a life-support repair, and let the crew recover. Your mission is only as strong as the people behind it.",
  },
  {
    name: "Beyond the known",
    location: "THE FINAL OBSERVATION WINDOW",
    description: "The next chapter is yours to write.",
    briefing:
      "Review your evidence, select a defensible conclusion, and decide whether to launch a local relay probe for another perspective. Preserve at least 160 m/s of maneuver fuel for the return.",
  },
];
export const targets = [
  {
    id: "anomaly",
    name: "Echo anomaly · OE-2042",
    category: "Unclassified transient",
    coordinates: "20h 06m 15s / +44° 27′",
    color: "#87dfe9",
  },
  {
    id: "galaxy",
    name: "NGC 4414",
    category: "Distant galaxy",
    coordinates: "12h 26m 27s / +31° 13′",
    color: "#acd0f7",
  },
  {
    id: "nebula",
    name: "Orion nebula",
    category: "Nebula / star formation",
    coordinates: "05h 35m 17s / −05° 23′",
    color: "#c5a5e5",
  },
  {
    id: "variable",
    name: "V404 Cygni",
    category: "Variable star",
    coordinates: "20h 24m 04s / +33° 52′",
    color: "#e8bf82",
  },
  {
    id: "exoplanet",
    name: "Kepler-186",
    category: "Exoplanet host star",
    coordinates: "19h 54m 36s / +43° 57′",
    color: "#f2bd8e",
  },
];
export const defaultSettings: Settings = {
  sound: false,
  music: false,
  volume: 30,
  quality: "High",
  motion:
    typeof window === "undefined" ||
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  largeText: false,
  contrast: false,
  science: true,
};
export const eventCatalog: Record<string, MissionEvent> = {
  vibration: {
    id: "vibration",
    title: "A vibration in the silence",
    description:
      "Sensor A-7 reports an unusual oscillation in the first-stage fuel pump. The weather window remains open for 30 minutes. Flight control needs your decision.",
    severity: "warning",
    choices: [
      {
        label: "Inspect & delay",
        detail: "−$4M · −3 power · restore reliability",
        effect: "inspect",
      },
      {
        label: "Proceed with monitoring",
        detail: "Keep the window · −14 vehicle integrity",
        effect: "proceed",
      },
    ],
  },
  power: {
    id: "power",
    title: "Telescope power fluctuation",
    description:
      "The observatory’s power bus is fluctuating during acquisition. Continuing could preserve this exposure at the cost of equipment.",
    severity: "warning",
    choices: [
      {
        label: "Run a full diagnostic",
        detail: "Cancel exposure · −3 power · restore 8 condition",
        effect: "diagnose",
      },
      {
        label: "Continue acquisition",
        detail: "Preserve exposure · −32 telescope condition",
        effect: "continue",
      },
      {
        label: "Isolate the power bus",
        detail: "Preserve exposure · −5 condition · −5 power",
        effect: "isolate-power",
      },
    ],
  },
  life: {
    id: "life",
    title: "The air is getting heavier",
    description:
      "The primary CO₂ scrubber is offline. Cabin pressure is falling and Dr. Chen is exhausted. Stabilize the cabin, then assign a crew member to life-support repair.",
    severity: "critical",
    choices: [
      {
        label: "Install emergency cartridge",
        detail: "−1 spare part · immediate CO₂ reduction",
        effect: "cartridge",
        parts: 1,
      },
      {
        label: "Isolate the lab module",
        detail: "Reduce leak · −12 integrity · preserve parts",
        effect: "isolate-life",
      },
      {
        label: "Emergency oxygen flush",
        detail: "−14 oxygen · buys time for a repair",
        effect: "flush",
      },
    ],
  },
  radiation: {
    id: "radiation",
    title: "Solar particle warning",
    description:
      "A modest solar particle event is predicted. The crew can shelter behind water storage, or keep working through the observation window.",
    severity: "warning",
    choices: [
      {
        label: "Shelter the crew",
        detail: "All crew rest · −3 observation minutes",
        effect: "shelter",
      },
      {
        label: "Continue on schedule",
        detail: "+8 mSv exposure per crew member",
        effect: "expose",
      },
    ],
  },
  suit: {
    id: "suit",
    title: "Suit pressure irregularity",
    description:
      "An EVA pressure regulator has drifted outside tolerance. Recall the astronaut or use a spare regulator to continue safely.",
    severity: "critical",
    choices: [
      {
        label: "Recall EVA crew",
        detail: "Stop spacewalk · +8 fatigue",
        effect: "recall",
      },
      {
        label: "Replace regulator",
        detail: "−1 spare part · restore suit condition",
        effect: "suit-repair",
        parts: 1,
      },
    ],
  },
  electrical: {
    id: "electrical",
    title: "Main battery reserve critical",
    description:
      "The primary electrical bus has fallen below 25%. Life support has priority. Recover reserve power or reduce the telescope load.",
    severity: "critical",
    choices: [
      {
        label: "Activate reserve battery",
        detail: "−1 spare part · +25 power",
        effect: "battery",
        parts: 1,
      },
      {
        label: "Shed observatory load",
        detail: "+15 power · −15 telescope condition · cancel exposure",
        effect: "shed-load",
      },
    ],
  },
  blackout: {
    id: "blackout",
    title: "Behind the horizon",
    description:
      "The ground station has moved below the radio horizon. Switch to a relay or continue autonomously until the next contact.",
    severity: "info",
    choices: [
      {
        label: "Use relay satellite",
        detail: "−4 power · immediate connection",
        effect: "relay",
      },
      {
        label: "Operate autonomously",
        detail: "+5 crew stress · contact returns in 60 seconds",
        effect: "autonomous",
      },
    ],
  },
};
export function newMission(): Mission {
  return {
    version: 1,
    id: Date.now().toString(36),
    chapter: 1,
    elapsed: 0,
    paused: false,
    speed: 1,
    status: "active",
    ending: null,
    rocket: {
      engine: "Atlas",
      stages: 2,
      fuel: 240000,
      payload: 6000,
      boosters: 0,
      instrument: "Spectrometer",
    },
    launch: {
      phase: "preflight",
      countdown: 10,
      stage: 0,
      stageFuel: [],
      altitude: 0,
      velocity: 0,
      time: 0,
      pressure: 0,
      thrust: 0,
      mass: 0,
      staging: false,
      failure: null,
      checked: false,
      vibration: null,
    },
    orbit: {
      altitude: 200000,
      target: 540000,
      rendezvous: false,
      matched: false,
      distance: 180,
      relative: 120,
      comms: true,
    },
    resources: {
      fuel: 1800,
      power: 100,
      oxygen: 100,
      water: 100,
      food: 100,
      parts: 6,
      budget: 180,
      observationTime: 45,
    },
    integrity: 100,
    telescope: {
      condition: 54,
      pointing: 64,
      repaired: false,
      deployed: false,
      active: null,
      observations: [],
    },
    crew: [
      {
        id: "reyes",
        name: "Alex Reyes",
        initials: "AR",
        role: "COMMANDER",
        skill: 91,
        health: 100,
        fatigue: 12,
        stress: 14,
        sleepDebt: 0,
        hydration: 98,
        nutrition: 98,
        radiation: 0,
        suit: 100,
        task: "Standby",
        progress: 0,
        condition: "Nominal",
      },
      {
        id: "chen",
        name: "Maya Chen",
        initials: "MC",
        role: "ASTROPHYSICIST",
        skill: 96,
        health: 100,
        fatigue: 22,
        stress: 10,
        sleepDebt: 0,
        hydration: 98,
        nutrition: 98,
        radiation: 0,
        suit: 100,
        task: "Standby",
        progress: 0,
        condition: "Nominal",
      },
      {
        id: "okafor",
        name: "Eli Okafor",
        initials: "EO",
        role: "FLIGHT ENGINEER",
        skill: 94,
        health: 100,
        fatigue: 16,
        stress: 12,
        sleepDebt: 0,
        hydration: 98,
        nutrition: 98,
        radiation: 0,
        suit: 100,
        task: "Standby",
        progress: 0,
        condition: "Nominal",
      },
    ],
    life: {
      condition: 100,
      co2: 600,
      pressure: 101.3,
      temperature: 21.2,
      fault: false,
      isolated: false,
    },
    events: [eventCatalog.vibration],
    triggered: ["vibration"],
    decisions: [],
    log: [
      {
        time: 0,
        text: "Astra Initiative · Mission OE-01 initialized. Awaiting commander.",
        level: "info",
      },
    ],
    crosschecked: false,
    probe: false,
    conclusion: "variability",
    telemetry: [],
  };
}
