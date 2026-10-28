import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Crosshair,
  Focus,
  ScanLine,
  Send,
  Telescope as TelescopeIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { LightCurve } from "../components/LightCurve";
import { useGame } from "../state/GameContext";
import { targets } from "../data/mission";
import { observationQuality, spectrum } from "../simulation/physics";
import {
  EventPanel,
  formatTime,
  Meter,
  PageHead,
  Panel,
  Science,
  Stat,
  Tag,
} from "../components/UI";
function SkyImage({
  target,
  quality,
  zoom,
  brightness,
  contrast,
}: {
  target: string;
  quality: number;
  zoom: number;
  brightness: number;
  contrast: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = 1000,
      h = 600;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "#02060c";
    ctx.fillRect(0, 0, w, h);
    let seed = target.split("").reduce((a, c) => a + c.charCodeAt(0), 42);
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    for (let i = 0; i < 900; i++) {
      const x = rand() * w,
        y = rand() * h,
        size = rand() * 1.4;
      ctx.globalAlpha = rand() * 0.8;
      ctx.fillStyle = i % 3 === 0 ? "#b2d8e8" : "#fff";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const color =
      target === "nebula"
        ? "148,111,174"
        : target === "galaxy"
          ? "167,196,216"
          : "110,181,207";
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI * 2,
        r = rand() * 170;
      const x = 500 + Math.cos(a) * r * 1.5,
        y = 300 + Math.sin(a) * r * 0.62;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 50 + rand() * 120);
      g.addColorStop(0, `rgba(${color},.038)`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (target === "galaxy") {
      ctx.save();
      ctx.translate(500, 300);
      ctx.rotate(-0.35);
      for (let i = 0; i < 1800; i++) {
        const t = rand() * 14,
          r = t * 10 + rand() * 15,
          a = t + (i % 2) * Math.PI;
        ctx.fillStyle = `rgba(191,218,231,${rand() * 0.35})`;
        ctx.fillRect(
          Math.cos(a) * r,
          Math.sin(a) * r * 0.45,
          rand() * 3,
          rand() * 2,
        );
      }
      ctx.restore();
    } else {
      const g = ctx.createRadialGradient(
        500,
        300,
        1,
        500,
        300,
        target === "nebula" ? 100 : 45,
      );
      g.addColorStop(0, "rgba(238,249,255,.95)");
      g.addColorStop(0.07, "rgba(179,225,241,.8)");
      g.addColorStop(0.25, "rgba(99,163,202,.24)");
      g.addColorStop(1, "rgba(50,100,160,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (target !== "nebula") {
        ctx.strokeStyle = "rgba(178,222,246,.45)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(440, 300);
        ctx.lineTo(560, 300);
        ctx.moveTo(500, 250);
        ctx.lineTo(500, 350);
        ctx.stroke();
      }
    }
    for (let i = 0; i < (100 - quality) * 60; i++) {
      ctx.fillStyle = `rgba(180,198,210,${rand() * 0.12})`;
      ctx.fillRect(rand() * w, rand() * h, 1.3, 1.3);
    }
  }, [target, quality]);
  return (
    <div
      className="sky-image"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current)
          setPan({
            x: Math.max(-150, Math.min(150, e.clientX - drag.current.x)),
            y: Math.max(-90, Math.min(90, e.clientY - drag.current.y)),
          });
      }}
      onPointerUp={() => (drag.current = null)}
      onDoubleClick={() => setPan({ x: 0, y: 0 })}
    >
      <canvas
        ref={ref}
        style={{
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          filter: `brightness(${brightness}%) contrast(${contrast}%)`,
        }}
        aria-label={`Simulated ${target} astronomical image. Drag to pan; double-click to center.`}
      />
      <div className="image-reticle" />
      <span className="image-simulated">
        SIMULATED SCIENTIFIC IMAGE • DRAG TO PAN
      </span>
    </div>
  );
}
export function Telescope() {
  const { mission: s, dispatch } = useGame();
  const [target, setTarget] = useState("anomaly"),
    [filter, setFilter] = useState("Visible"),
    [exposure, setExposure] = useState(40),
    [duration, setDuration] = useState(40),
    [selected, setSelected] = useState<number | null>(null),
    [zoom, setZoom] = useState(1),
    [brightness, setBrightness] = useState(100),
    [contrast, setContrast] = useState(100),
    [line, setLine] = useState("590"),
    [compare, setCompare] = useState(false);
  const active = s.telescope.active;
  const dataset =
    selected === -1
      ? undefined
      : (s.telescope.observations.find((o) => o.id === selected) ??
        s.telescope.observations.at(-1));
  useEffect(() => {
    setSelected(null);
  }, [s.telescope.observations.length]);
  const shownTarget = dataset?.target ?? target;
  const info = targets.find((t) => t.id === shownTarget) ?? targets[0];
  const estimated = observationQuality(
    exposure,
    s.telescope.pointing,
    s.telescope.condition,
    filter,
    s.rocket.instrument,
  );
  const values = useMemo(
    () => spectrum(shownTarget, dataset?.filter ?? filter),
    [shownTarget, dataset?.filter, filter],
  );
  const previous = s.telescope.observations.at(-2);
  const compareValues = previous
    ? spectrum(previous.target, previous.filter)
    : [];
  return (
    <>
      <PageHead
        title="Telescope & science"
        description="Look closer. The universe has something to tell us."
        action={
          <Tag tone={s.telescope.deployed ? "green" : "amber"}>
            {s.telescope.deployed
              ? "OBSERVATORY ONLINE"
              : "AWAITING DEPLOYMENT"}
          </Tag>
        }
      />
      {!s.telescope.deployed && (
        <Panel title="Bring the observatory online">
          <p className="muted">
            Rendezvous with Hubble and assign telescope repair to a crew member.
            Then deploy the Echo observatory.
          </p>
          <button
            className="button primary"
            disabled={
              !s.telescope.repaired ||
              !s.orbit.rendezvous ||
              s.resources.power < 6
            }
            onClick={() => dispatch({ type: "DEPLOY" })}
          >
            <Send size={16} />
            Deploy Echo observatory · 6 power
          </button>
        </Panel>
      )}
      <div className="science-grid">
        <Panel title="Observation control" eyebrow="HUBBLE + ECHO">
          <label>
            Observation target
            <select
              aria-label="Observation target"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setSelected(-1);
              }}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Filter
            <select
              aria-label="Observation filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Visible</option>
              <option>Infrared</option>
              <option>Ultraviolet</option>
            </select>
          </label>
          <label>
            Exposure <b>{exposure} s</b>
            <input
              aria-label="Exposure time"
              type="range"
              min="10"
              max="120"
              step="10"
              value={exposure}
              onChange={(e) => {
                setExposure(+e.target.value);
                setDuration(Math.max(duration, +e.target.value));
              }}
            />
          </label>
          <label>
            Observation duration <b>{duration} s</b>
            <input
              aria-label="Observation duration"
              type="range"
              min={exposure}
              max="240"
              step="10"
              value={duration}
              onChange={(e) => setDuration(+e.target.value)}
            />
          </label>
          <div className="key-value">
            <span>Estimated SNR</span>
            <b>{estimated.snr.toFixed(1)}</b>
          </div>
          <div className="key-value">
            <span>Pointing accuracy</span>
            <b>{s.telescope.pointing.toFixed(0)}%</b>
          </div>
          <div className="key-value">
            <span>Observation time left</span>
            <b>{s.resources.observationTime.toFixed(1)} min</b>
          </div>
          <button
            className="button secondary full"
            disabled={
              !s.telescope.repaired || !!active || s.resources.power < 2
            }
            onClick={() => dispatch({ type: "CALIBRATE" })}
          >
            <Crosshair size={15} />
            Calibrate pointing · 2 power
          </button>
          <button
            className="button primary full"
            disabled={
              !s.telescope.deployed ||
              !!active ||
              s.resources.power < 5 ||
              s.resources.observationTime < duration / 60
            }
            onClick={() =>
              dispatch({ type: "OBSERVE", target, filter, exposure, duration })
            }
          >
            <TelescopeIcon size={16} />
            {active ? "Acquiring photons…" : "Start observation"}
          </button>
          {active && (
            <div className="acquisition">
              <Meter
                label={`Acquiring ${active.target} · ${Math.min(100, (active.progress / active.duration) * 100).toFixed(0)}%`}
                value={(active.progress / active.duration) * 100}
              />
              <small>
                {Math.max(0, active.duration - active.progress).toFixed(0)}{" "}
                simulated seconds remaining
              </small>
            </div>
          )}
          <p className="microcopy">
            Use two filters and a control target. Analyze completed datasets to
            update the investigation.
          </p>
        </Panel>
        <Panel className="image-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">
                {dataset
                  ? `DATASET OE-${String(dataset.id).padStart(3, "0")}`
                  : "TARGET PREVIEW · NO DATA ACQUIRED"}
              </span>
              <h3>{info.name}</h3>
            </div>
            <Tag>
              {dataset ? `${dataset.quality.toFixed(0)}% QUALITY` : "SIMULATED"}
            </Tag>
          </div>
          <SkyImage
            target={shownTarget}
            quality={dataset?.quality ?? estimated.quality}
            zoom={zoom}
            brightness={brightness}
            contrast={contrast}
          />
          {active && <div className="scan-line" />}
          <div className="image-toolbar">
            <button
              className="icon-button"
              aria-label="Zoom out image"
              onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            >
              <ZoomOut size={17} />
            </button>
            <span>{zoom.toFixed(2)}×</span>
            <button
              className="icon-button"
              aria-label="Zoom in image"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <ZoomIn size={17} />
            </button>
            <label>
              Brightness
              <input
                aria-label="Image brightness"
                type="range"
                min="40"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(+e.target.value)}
              />
            </label>
            <label>
              Contrast
              <input
                aria-label="Image contrast"
                type="range"
                min="50"
                max="180"
                value={contrast}
                onChange={(e) => setContrast(+e.target.value)}
              />
            </label>
          </div>
          <div className="image-metadata">
            <span>
              RA / DEC <b>{info.coordinates}</b>
            </span>
            <span>
              EXPOSURE <b>{dataset?.exposure ?? exposure} s</b>
            </span>
            <span>
              FILTER <b>{dataset?.filter ?? filter}</b>
            </span>
            <span>
              ACQUIRED <b>{dataset ? formatTime(dataset.time) : "PREVIEW"}</b>
            </span>
          </div>
        </Panel>
      </div>
      <div className="two-column">
        <Panel
          title="A spectrum of possibilities"
          eyebrow="SPECTRAL ANALYSIS · SIMULATED"
        >
          <div className="spectrum">
            <svg
              viewBox="0 0 600 180"
              role="img"
              aria-label="Simulated wavelength against intensity spectrum"
            >
              <path
                d="M40 20H580M40 60H580M40 100H580M40 140H580"
                stroke="#21303f"
              />
              <path
                d={`M40 150 ${values.map((p, i) => `L${40 + (i / 79) * 540} ${150 - p.y * 1.25}`).join(" ")}L580 150Z`}
                fill="#62d9dc"
                fillOpacity=".07"
              />
              <polyline
                points={values
                  .map((p, i) => `${40 + (i / 79) * 540},${150 - p.y * 1.25}`)
                  .join(" ")}
                fill="none"
                stroke="#6cdddd"
                strokeWidth="2"
              />
              {compare && (
                <polyline
                  points={compareValues
                    .map((p, i) => `${40 + (i / 79) * 540},${150 - p.y * 1.25}`)
                    .join(" ")}
                  fill="none"
                  stroke="#d8b77e"
                  strokeDasharray="4 4"
                />
              )}
              <path
                d={`M${40 + ((+line - 380) / 395) * 540} 12V150`}
                stroke="#d2ad70"
                strokeDasharray="3 3"
              />
              {[400, 500, 600, 700].map((n) => (
                <text
                  key={n}
                  x={40 + ((n - 380) / 395) * 540}
                  y="175"
                  fill="#8497a7"
                  fontSize="11"
                >
                  {n} nm
                </text>
              ))}
              <text
                x="5"
                y="100"
                transform="rotate(-90 12 100)"
                fill="#8497a7"
                fontSize="10"
              >
                INTENSITY (a.u.)
              </text>
            </svg>
          </div>
          <div className="feature-buttons">
            {[
              { v: "486", l: "Hβ · 486 nm" },
              { v: "590", l: "Na feature · 590 nm" },
              { v: "672", l: "S II · 672 nm" },
            ].map((f) => (
              <button
                key={f.v}
                className={line === f.v ? "active" : ""}
                onClick={() => setLine(f.v)}
              >
                {f.l}
              </button>
            ))}
          </div>
          <p className="microcopy">
            {line === "590"
              ? shownTarget === "anomaly"
                ? "Toy redshift estimate: (590 − 589) / 589 ≈ 0.0017. A single blended line is insufficient for a reliable velocity."
                : "The control spectrum has no resolved feature at 590 nm. Compare it with an anomaly dataset before interpreting a redshift."
              : line === "486"
                ? "A hydrogen-like emission feature. Relative line strength can suggest ionized gas; it does not measure abundance by itself."
                : "A sulfur-like feature. This illustrative spectrum is consistent with cooler line-emitting material, not a unique temperature measurement."}
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={compare}
              disabled={!previous}
              onChange={(e) => setCompare(e.target.checked)}
            />
            Overlay previous dataset{" "}
            {previous ? `OE-${previous.id}` : "(requires two observations)"}
          </label>
        </Panel>
        <Panel
          title="Observation archive"
          eyebrow={`${s.telescope.observations.length} DATASETS COLLECTED`}
        >
          <div className="observation-list">
            {s.telescope.observations.length === 0 ? (
              <div className="empty-state">
                <ScanLine size={28} />
                <h4>The sky is waiting.</h4>
                <p>Your first acquisition will appear here.</p>
              </div>
            ) : (
              [...s.telescope.observations].reverse().map((o) => (
                <div
                  className={`observation-row ${dataset?.id === o.id ? "selected" : ""}`}
                  key={o.id}
                >
                  <button onClick={() => setSelected(o.id)}>
                    <span className="mono">
                      {String(o.id).padStart(3, "0")}
                    </span>
                    <div>
                      <b>{targets.find((t) => t.id === o.target)?.name}</b>
                      <small>
                        {o.filter} · {o.exposure}s · SNR {o.snr.toFixed(1)} ·
                        noise {o.noise.toFixed(1)}
                      </small>
                    </div>
                  </button>
                  <button
                    className={`button compact ${o.analyzed ? "quiet" : "secondary"}`}
                    disabled={o.analyzed || s.resources.power < 1}
                    onClick={() => dispatch({ type: "ANALYZE", id: o.id })}
                  >
                    {o.analyzed ? (
                      <>
                        <Check size={12} />
                        Analyzed
                      </>
                    ) : (
                      "Analyze"
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
      <LightCurve observations={s.telescope.observations} />
      <EventPanel id="power" />
      <EventPanel id="blackout" />
      <Science>
        Photon noise falls relative to the signal as exposure increases: SNR ∝
        √(exposure time). Pointing errors and damaged optics reduce image
        quality. Comparing independent exposures, control targets, and filters
        helps separate detector artifacts from real variability. All images,
        spectra, and the Echo anomaly are simulated; they are not actual Hubble
        discoveries.
      </Science>
    </>
  );
}
