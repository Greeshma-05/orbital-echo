import type { RocketConfig } from "./types";
export const G0 = 9.80665,
  MU = 3.986004418e14,
  EARTH_RADIUS = 6371000;
export const engines = {
  Atlas: {
    name: "Atlas RS-42",
    thrust: 5200000,
    isp: 340,
    upperThrust: 850000,
    upperIsp: 450,
    cost: 58,
    reliability: 98,
  },
  Vega: {
    name: "Vega LV-8",
    thrust: 2400000,
    isp: 300,
    upperThrust: 520000,
    upperIsp: 350,
    cost: 34,
    reliability: 94,
  },
  Meridian: {
    name: "Meridian HX",
    thrust: 6800000,
    isp: 360,
    upperThrust: 1000000,
    upperIsp: 460,
    cost: 76,
    reliability: 96,
  },
};
export function rocketStats(c: RocketConfig) {
  const e = engines[c.engine],
    dry =
      c.stages === 1
        ? [22000]
        : c.stages === 2
          ? [18000, 4000]
          : [18000, 4000, 1800];
  const shares =
    c.stages === 1 ? [1] : c.stages === 2 ? [0.8, 0.2] : [0.7, 0.22, 0.08];
  const fuels = shares.map((f) => f * c.fuel);
  fuels[0] += c.boosters * 24000;
  dry[0] += c.boosters * 1800;
  const mass =
    dry.reduce((a, b) => a + b, 0) +
    fuels.reduce((a, b) => a + b, 0) +
    c.payload;
  let remaining = mass,
    deltaV = 0;
  const stageDeltaV: number[] = [];
  for (let i = 0; i < c.stages; i++) {
    const dv =
      (i === 0 ? e.isp : e.upperIsp) *
      G0 *
      Math.log(remaining / (remaining - fuels[i]));
    deltaV += dv;
    stageDeltaV.push(dv);
    remaining -= fuels[i] + dry[i];
  }
  const thrust = e.thrust + c.boosters * 650000;
  return {
    mass,
    dry,
    fuels,
    deltaV,
    stageDeltaV,
    thrust,
    twr: thrust / (mass * G0),
    reliability:
      e.reliability - Math.max(0, c.stages - 2) * 0.6 - c.boosters * 0.5,
    cost:
      e.cost +
      c.stages * 8 +
      c.boosters * 9 +
      (c.payload / 1000) * 1.2 +
      (c.fuel / 1000) * 0.03,
  };
}
export function orbitStats(altitude: number) {
  const r = EARTH_RADIUS + altitude;
  return {
    velocity: Math.sqrt(MU / r),
    period: 2 * Math.PI * Math.sqrt(r ** 3 / MU),
    radius: r,
  };
}
export function transferCost(from: number, to: number) {
  const r1 = EARTH_RADIUS + from,
    r2 = EARTH_RADIUS + to,
    a = (r1 + r2) / 2;
  return (
    Math.abs(Math.sqrt(MU * (2 / r1 - 1 / a)) - Math.sqrt(MU / r1)) +
    Math.abs(Math.sqrt(MU / r2) - Math.sqrt(MU * (2 / r2 - 1 / a)))
  );
}
export function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}
export function observationQuality(
  exposure: number,
  pointing: number,
  condition: number,
  filter: string,
  instrument: string,
) {
  const snr =
    Math.sqrt(exposure) *
    3.6 *
    (pointing / 100) *
    (condition / 100) *
    (instrument === "Spectrometer" ? 1.12 : 1);
  const quality = clamp(25 + snr * 3 + (filter === "Infrared" ? 3 : 0));
  return { snr, quality, noise: Math.max(1, 100 / (snr + 1)) };
}
export function spectrum(target: string, filter: string) {
  return Array.from({ length: 80 }, (_, i) => {
    const x = 380 + i * 5;
    const peak = (center: number, w: number, h: number) =>
      h * Math.exp(-(((x - center) / w) ** 2));
    return {
      x,
      y:
        12 +
        peak(500, 100, 24) +
        peak(target === "anomaly" ? 590 : 656, 9, 58) +
        peak(486, 8, 30) +
        peak(672, 6, 22) +
        (Math.sin(i * 7.3) + Math.cos(i * 3.7)) * 2 +
        (filter === "Infrared" ? i / 10 : 0),
    };
  });
}
