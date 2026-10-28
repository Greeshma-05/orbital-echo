import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  Flag,
  Radio,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useGame } from "../state/GameContext";
import { canAdvance, hypotheses, scienceScore } from "../simulation/rules";
import {
  EventPanel,
  formatTime,
  Meter,
  Modal,
  PageHead,
  Panel,
  Science,
  Stat,
  Tag,
} from "../components/UI";
export function Investigation() {
  const { mission: s, dispatch, setView } = useGame();
  const [confirm, setConfirm] = useState(false);
  const score = scienceScore(s);
  return (
    <>
      <PageHead
        title="Scientific investigation"
        description="Evidence first. Extraordinary conclusions can wait."
        action={<Tag>{score.toFixed(0)}% EVIDENCE QUALITY</Tag>}
      />
      <div className="investigation-intro">
        <div>
          <span className="eyebrow">CASE FILE / ECHO-2042</span>
          <h2>A signal in the noise.</h2>
          <p>
            A repeating brightness pattern. A persistent spectral feature. The
            question is not whether we can find an explanation, but whether our
            evidence can support it.
          </p>
        </div>
        <div className="evidence-score">
          <b>
            {score.toFixed(0)}
            <small>/ 100</small>
          </b>
          <span>EVIDENCE STRENGTH</span>
          <Meter value={score} />
        </div>
      </div>
      <div className="hypothesis-grid">
        {hypotheses(s).map((h, i) => (
          <Panel
            key={h.id}
            className={s.conclusion === h.id ? "selected-hypothesis" : ""}
          >
            <div className="hypothesis-heading">
              <span className="mono">HYPOTHESIS 0{i + 1}</span>
              <b>
                {h.confidence.toFixed(0)}
                <small>%</small>
              </b>
            </div>
            <h3>{h.name}</h3>
            <Meter value={h.confidence} />
            <div className="evidence-text">
              <span className="support">SUPPORTING EVIDENCE</span>
              <p>{h.support}</p>
              <span className="against">LIMITATIONS / CONTRADICTIONS</span>
              <p>{h.against}</p>
            </div>
            <button
              className={`button full ${s.conclusion === h.id ? "secondary" : "quiet"}`}
              onClick={() => dispatch({ type: "CONCLUSION", value: h.id })}
            >
              {s.conclusion === h.id ? (
                <>
                  <Check size={15} />
                  Current interpretation
                </>
              ) : (
                "Choose interpretation"
              )}
            </button>
          </Panel>
        ))}
      </div>
      <div className="two-column">
        <Panel
          title="Independent confirmation"
          eyebrow="CROSS-OBSERVATORY CHECK"
        >
          <p className="muted">
            Ask a second observatory to compare the emission pattern with its
            own calibrated measurements. Requires three analyzed datasets and an
            active ground link.
          </p>
          <button
            className="button secondary"
            disabled={
              s.crosschecked ||
              s.telescope.observations.filter((o) => o.analyzed).length < 3 ||
              !s.orbit.comms ||
              s.resources.power < 4
            }
            onClick={() => dispatch({ type: "CROSSCHECK" })}
          >
            <Radio size={16} />
            {s.crosschecked
              ? "Independent pattern confirmed"
              : "Request comparison · 4 power"}
          </button>
          {s.crosschecked && (
            <p className="success-text">
              A related pattern is confirmed. A longer time baseline is still
              needed to establish periodicity.
            </p>
          )}
        </Panel>
        <Panel
          title={
            s.chapter === 5
              ? "The final decision"
              : "Protect the mission. Protect the crew."
          }
          eyebrow="COMMAND AUTHORITY"
        >
          <p className="muted">
            {s.chapter === 5
              ? "Deploy a local relay probe for additional evidence, or use the remaining fuel to return. Your conclusion, data, equipment, and crew condition determine the outcome."
              : "You can return early from any stable orbit. An incomplete investigation is a valid outcome when the crew’s safety comes first."}
          </p>
          <div className="button-row">
            {s.chapter === 5 && (
              <button
                className="button secondary"
                onClick={() => setView("Orbit & navigation")}
              >
                {s.probe ? "Review probe trajectory" : "Plan relay probe"}
                <ArrowUpRight size={15} />
              </button>
            )}
            <button
              className="button primary"
              disabled={s.launch.phase !== "orbit" || s.resources.fuel < 160}
              onClick={() => setConfirm(true)}
            >
              Return to Earth
              <ArrowRight size={16} />
            </button>
          </div>
        </Panel>
      </div>
      <EventPanel id="blackout" />
      <EventPanel id="radiation" />
      <Science>
        These confidence scores are evidence-weighted gameplay heuristics, not
        Bayesian probabilities. No observation establishes an extraterrestrial
        or supernatural origin. Repeated calibrated spectra and independent
        measurements favor unusual stellar variability, while the short mission
        cannot fully resolve its cause.
      </Science>
      {confirm && (
        <Modal title="Bring them home." close={() => setConfirm(false)}>
          <p className="muted">
            Commit 160 m/s to the deorbit burn and conclude this mission. Your
            current scientific evidence is {score.toFixed(0)}%, vehicle
            integrity is {s.integrity.toFixed(0)}%, and crew health averages{" "}
            {(s.crew.reduce((a, c) => a + c.health, 0) / 3).toFixed(0)}%.
          </p>
          <p className="microcopy">
            The current chapter checkpoint remains available if you want to
            replay the decision later.
          </p>
          <button
            className="button primary full"
            onClick={() => {
              setConfirm(false);
              dispatch({ type: "RETURN" });
            }}
          >
            <ShieldCheck size={16} />
            Confirm deorbit & recovery
          </button>
        </Modal>
      )}
    </>
  );
}
export function Resources() {
  const { mission: s, dispatch } = useGame();
  return (
    <>
      <PageHead
        title="Mission resources"
        description="Every decision leaves a trace in the ledger."
      />
      <div className="resource-cards">
        {Object.entries(s.resources).map(([key, value]) => {
          const labels: Record<string, [string, string, string]> = {
            fuel: [
              "Maneuver reserve",
              "m/s",
              "160 m/s required for the return burn",
            ],
            power: [
              "Electrical power",
              "%",
              "Shared by life support, instruments, and communications",
            ],
            oxygen: [
              "Oxygen",
              "%",
              "Consumption increases with crew activity and leaks",
            ],
            water: ["Water", "%", "Hydration and closed-loop habitat reserves"],
            food: ["Food", "%", "Crew nutrition for the entire mission"],
            parts: [
              "Spare parts",
              "units",
              "Each major repair allocates one part",
            ],
            budget: [
              "Mission budget",
              "$M",
              "Launch configuration and diagnostics spend budget",
            ],
            observationTime: [
              "Observation time",
              "min",
              "Acquisition duration uses the remaining allocation",
            ],
          };
          const [title, unit, description] = labels[key];
          return (
            <Panel key={key} title={title}>
              <div className="big-number">
                {key === "budget" ? "$" : ""}
                {value.toFixed(key === "parts" ? 0 : 1)}
                <small>{unit}</small>
              </div>
              {["power", "oxygen", "water", "food"].includes(key) && (
                <Meter value={value} />
              )}
              <p className="microcopy">{description}</p>
              {["oxygen", "water", "food"].includes(key) &&
                s.launch.phase === "preflight" && (
                  <button
                    className="button secondary compact"
                    disabled={value >= 100 || s.resources.budget < 8}
                    onClick={() =>
                      dispatch({
                        type: "REFILL",
                        resource: key as "oxygen" | "water" | "food",
                      })
                    }
                  >
                    Replenish at launch complex · $8M
                  </button>
                )}
            </Panel>
          );
        })}
      </div>
      <Science>
        Spacecraft maneuver reserve is expressed as available delta-v, not
        kilograms of propellant. Launch propellant is tracked separately in
        kilograms. Resource rates are compressed educational models designed for
        a short, connected mission.
      </Science>
    </>
  );
}
export function MissionLog() {
  const { mission: s } = useGame();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const rows = s.log.filter(
    (l) =>
      (filter === "all" || l.level === filter) &&
      l.text.toLowerCase().includes(query.toLowerCase()),
  );
  function download() {
    const blob = new Blob(
      [
        s.log
          .map((l) => `${formatTime(l.time)} [${l.level}] ${l.text}`)
          .reverse()
          .join("\n"),
      ],
      { type: "text/plain" },
    );
    const a = document.createElement("a"),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "orbital-echo-flight-log.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  return (
    <>
      <PageHead
        title="Mission log"
        description="A record of the choices that brought us here."
        action={
          <button className="button secondary" onClick={download}>
            <Download size={15} />
            Export flight log
          </button>
        }
      />
      <Panel>
        <div className="log-controls">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search mission log"
              placeholder="Search transmissions, events, decisions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter mission log"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All transmissions</option>
            <option value="success">Milestones</option>
            <option value="warning">Warnings</option>
            <option value="info">Operations</option>
          </select>
        </div>
        <div className="full-log">
          {rows.map((l, i) => (
            <div className={`log-row ${l.level}`} key={`${l.time}-${i}`}>
              <span className="mono">T+ {formatTime(l.time)}</span>
              <span className="log-symbol">
                {l.level === "success" ? (
                  <Check size={14} />
                ) : l.level === "warning" ? (
                  "!"
                ) : (
                  "·"
                )}
              </span>
              <p>{l.text}</p>
              <small>{l.level.toUpperCase()}</small>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="empty-state">
              No transmissions match your filter.
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}
