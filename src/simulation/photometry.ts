import type { Observation } from "./types";
// A fictional five-minute brightness modulation, integrated over each exposure.
// Only acquired, analyzed samples enter the period fit; no hidden future samples.
export function lightCurve(observations: Observation[]) {
  return observations
    .filter((o) => o.analyzed && o.target === "anomaly")
    .map((o) => {
      const phase = (Math.PI * o.exposure) / 300;
      const integration = phase === 0 ? 1 : Math.sin(phase) / phase;
      return {
        time: o.time - o.exposure / 2,
        flux:
          1 +
          0.12 *
            integration *
            Math.sin((2 * Math.PI * (o.time - o.exposure / 2)) / 300) +
          Math.sin(o.id * 12.9898) * (0.004 + (100 - o.quality) * 0.0004),
        quality: o.quality,
      };
    })
    .sort((a, b) => a.time - b.time);
}
export function estimatePeriod(observations: Observation[]) {
  const data = lightCurve(observations),
    baseline = data.length > 1 ? data.at(-1)!.time - data[0].time : 0;
  if (data.length < 8 || baseline < 600)
    return { data, baseline, period: null as number | null };
  const mean = data.reduce((sum, p) => sum + p.flux, 0) / data.length;
  let bestPower = 0,
    bestPeriod = 0;
  // Fit sine and cosine coefficients by least squares, rather than report the injected period.
  for (let period = 60; period <= Math.min(900, baseline / 2); period += 5) {
    let ss = 0,
      cc = 0,
      sc = 0,
      ys = 0,
      yc = 0;
    for (const p of data) {
      const a = (2 * Math.PI * p.time) / period,
        s = Math.sin(a),
        c = Math.cos(a),
        y = p.flux - mean;
      ss += s * s;
      cc += c * c;
      sc += s * c;
      ys += y * s;
      yc += y * c;
    }
    const determinant = ss * cc - sc * sc;
    if (determinant < 1e-6) continue;
    const sine = (ys * cc - yc * sc) / determinant,
      cosine = (yc * ss - ys * sc) / determinant;
    const power = sine * ys + cosine * yc;
    if (power > bestPower) {
      bestPower = power;
      bestPeriod = period;
    }
  }
  return { data, baseline, period: bestPeriod || null };
}
