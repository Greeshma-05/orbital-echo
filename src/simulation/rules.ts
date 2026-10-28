import type { Mission } from "./types";
export function scienceScore(s: Mission) {
  const obs = s.telescope.observations.filter((o) => o.analyzed);
  const anomalies = obs.filter((o) => o.target === "anomaly");
  return Math.min(
    100,
    anomalies.reduce((v, o) => v + o.quality * 0.27, 0) +
      new Set(obs.map((o) => o.filter)).size * 6 +
      (obs.some((o) => o.target !== "anomaly") ? 12 : 0) +
      (s.crosschecked ? 20 : 0) +
      (s.probe ? 14 : 0),
  );
}
export function hypotheses(s: Mission) {
  const n = s.telescope.observations.filter((o) => o.analyzed).length,
    q = scienceScore(s);
  return [
    {
      id: "calibration",
      name: "Instrument calibration error",
      confidence: Math.max(6, 64 - (s.telescope.repaired ? 20 : 0) - q * 0.42),
      support: "Pointing faults corrupted the original images.",
      against: s.telescope.repaired
        ? "The pattern persists after calibration."
        : "A calibrated control exposure is still needed.",
    },
    {
      id: "variability",
      name: "Unusual stellar variability",
      confidence: Math.min(94, 14 + q * 0.8),
      support:
        n > 1
          ? "Repeated spectra show a stable, narrow emission feature."
          : "An initial change in brightness is consistent with a variable source.",
      against: s.crosschecked
        ? "The short baseline cannot establish a long-term period."
        : "An independent instrument has yet to confirm the signal.",
    },
    {
      id: "lensing",
      name: "Gravitational lensing",
      confidence: Math.min(48, 12 + q * 0.24),
      support: "Apparent brightness changes may indicate magnification.",
      against:
        n > 2
          ? "The wavelength-dependent feature weakens a pure lensing model."
          : "More filters are needed to test achromaticity.",
    },
    {
      id: "unclassified",
      name: "Unclassified natural event",
      confidence: Math.max(15, 58 - q * 0.35),
      support: "The source is not fully characterized.",
      against:
        "Incomplete evidence does not establish a new class of phenomenon.",
    },
  ];
}
export function objectives(
  s: Mission,
): { text: string; done: boolean; view: string }[] {
  const analyzed = s.telescope.observations.filter((o) => o.analyzed);
  switch (s.chapter) {
    case 1:
      return [
        {
          text: "Resolve the fuel-pump vibration",
          done: !!s.launch.vibration,
          view: "Rocket & launch",
        },
        {
          text: "Complete vehicle preflight",
          done: s.launch.checked,
          view: "Rocket & launch",
        },
        {
          text: "Establish a stable Earth orbit",
          done: s.launch.phase === "orbit",
          view: "Rocket & launch",
        },
      ];
    case 2:
      return [
        {
          text: "Rendezvous with Hubble at 540 km",
          done: s.orbit.rendezvous,
          view: "Orbit & navigation",
        },
        {
          text: "Assign an engineer to telescope repair",
          done: s.telescope.repaired,
          view: "Crew & health",
        },
        {
          text: "Deploy the Echo observatory",
          done: s.telescope.deployed,
          view: "Telescope & science",
        },
        {
          text: "Acquire a usable observation",
          done: s.telescope.observations.some((o) => o.quality >= 45),
          view: "Telescope & science",
        },
      ];
    case 3:
      return [
        {
          text: "Analyze three separate observations",
          done: analyzed.length >= 3,
          view: "Telescope & science",
        },
        {
          text: "Compare two targets and two filters",
          done:
            new Set(analyzed.map((o) => o.target)).size >= 2 &&
            new Set(analyzed.map((o) => o.filter)).size >= 2,
          view: "Telescope & science",
        },
        {
          text: "Request independent confirmation",
          done: s.crosschecked,
          view: "Investigation",
        },
      ];
    case 4:
      return [
        {
          text: "Respond to the cabin emergency",
          done: s.decisions.some((d) => d.startsWith("life:")),
          view: "Life support",
        },
        {
          text: "Repair environmental control to 85%",
          done: !s.life.fault && s.life.condition >= 85,
          view: "Crew & health",
        },
        {
          text: "Bring all crew fatigue below 60%",
          done: s.crew.every((c) => c.fatigue < 60 && c.health >= 55),
          view: "Crew & health",
        },
      ];
    default:
      return [
        {
          text: "Review the scientific evidence",
          done: analyzed.length >= 3,
          view: "Investigation",
        },
        {
          text: "Select a final mission conclusion",
          done: !!s.conclusion,
          view: "Investigation",
        },
        {
          text: "Preserve 160 m/s for the return burn",
          done: s.resources.fuel >= 160,
          view: "Orbit & navigation",
        },
      ];
  }
}
export function canAdvance(s: Mission) {
  return s.chapter < 5 && objectives(s).every((o) => o.done);
}
export function endingFor(s: Mission) {
  const healthy =
    s.crew.every((c) => c.health >= 65) && s.resources.oxygen > 20;
  const strong = scienceScore(s) >= 75 && s.conclusion === "variability";
  if (strong && healthy && s.integrity >= 70 && s.telescope.condition >= 65)
    return "THE GREATEST DISCOVERY";
  if (
    scienceScore(s) >= 60 &&
    (!healthy || s.integrity < 70 || s.telescope.condition < 65)
  )
    return "THE PRICE OF DISCOVERY";
  return "AN UNFINISHED MYSTERY";
}
