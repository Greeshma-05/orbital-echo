import { useMemo } from "react";
import type { Observation } from "../simulation/types";
import { estimatePeriod } from "../simulation/photometry";
import { Panel } from "./UI";
export function LightCurve({ observations }: { observations: Observation[] }) {
  const result = useMemo(() => estimatePeriod(observations), [observations]);
  const { data, baseline, period } = result;
  return (
    <Panel
      title="Is the signal repeating?"
      eyebrow="TEMPORAL PHOTOMETRY · SIMULATED"
      className="temporal-panel"
    >
      <div className="temporal-grid">
        <div>
          <div className="key-value">
            <span>Analyzed Echo samples</span>
            <b>{data.length}</b>
          </div>
          <div className="key-value">
            <span>Measurement baseline</span>
            <b>{(baseline / 60).toFixed(1)} min</b>
          </div>
          <div className="key-value">
            <span>Candidate cycle</span>
            <b>{period ? `≈ ${period} s` : "Unresolved"}</b>
          </div>
          <p className="microcopy">
            {period
              ? "A sinusoidal least-squares scan favors this candidate. Sparse sampling can alias a signal; this does not establish its astrophysical cause."
              : "Acquire at least 8 Echo observations across 10 simulated minutes to fit a candidate cycle. A single exposure cannot establish periodicity."}
          </p>
        </div>
        <div className="light-curve-chart">
          <svg
            viewBox="0 0 600 190"
            role="img"
            aria-label="Brightness across acquired Echo observations"
          >
            <path d="M40 35H580M40 90H580M40 145H580" stroke="#263d4b" />
            {[0.85, 1, 1.15].map((v, i) => (
              <text x="4" y={149 - i * 55} fontSize="11" fill="#7b9aaf" key={v}>
                {v.toFixed(2)}
              </text>
            ))}
            {data.length > 0 && (
              <>
                <polyline
                  fill="none"
                  stroke="#76dedc"
                  strokeOpacity=".5"
                  strokeDasharray="4 4"
                  points={data
                    .map(
                      (p) =>
                        `${40 + ((p.time - data[0].time) / Math.max(1, baseline)) * 540},${90 - (p.flux - 1) * 366}`,
                    )
                    .join(" ")}
                />
                {data.map((p, i) => (
                  <circle
                    key={i}
                    cx={
                      40 +
                      ((p.time - data[0].time) / Math.max(1, baseline)) * 540
                    }
                    cy={90 - (p.flux - 1) * 366}
                    r="4"
                    fill="#76dedc"
                  />
                ))}
                <text x="40" y="180" fontSize="10" fill="#7b9aaf">
                  FIRST ACQUISITION
                </text>
                <text x="430" y="180" fontSize="10" fill="#7b9aaf">
                  +{baseline.toFixed(0)} s
                </text>
              </>
            )}
            {data.length === 0 && (
              <text x="145" y="95" fontSize="12" fill="#7b9aaf">
                Analyze an Echo dataset to begin.
              </text>
            )}
          </svg>
          <small>RELATIVE BRIGHTNESS · ACQUIRED SAMPLES ONLY</small>
        </div>
      </div>
    </Panel>
  );
}
