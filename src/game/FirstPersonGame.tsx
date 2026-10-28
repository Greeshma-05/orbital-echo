import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flag,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Save,
  Settings,
  X,
} from "lucide-react";
import { useGame } from "../state/GameContext";
import { formatTime } from "../components/UI";
import { scienceScore, canAdvance } from "../simulation/rules";
import { getArchive } from "../state/persistence";
import { Environment, GroundWorld, ShipWorld } from "./WorldGeometry";
import { PlayerRig, type PlayerReadout } from "./PlayerRig";
import { TerminalContent } from "./Terminals";
import { findInteraction } from "./physics";
import {
  collidersFor,
  groundSpawn,
  interactionsFor,
  makeRuntime,
  persistWorld,
  shipSpawn,
  type Region,
  type Terminal,
} from "./world";

class WorldBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="world-error">
        <h1>The 3D world needs WebGL.</h1>
        <p>
          Enable hardware acceleration in your browser, then reload the mission.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload world
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const terminalNames: Record<Exclude<Terminal, null>, string> = {
  inspection: "Vehicle inspection",
  flight: "Flight instruments",
  navigation: "Navigation",
  science: "Optical workstation",
  evidence: "Evidence board",
  crew: "Crew station",
  life: "Environmental control",
  log: "Mission transmissions",
  settings: "Preferences",
  resources: "Mission reserves",
  handbook: "Field handbook",
};
export function FirstPersonGame() {
  const {
    mission: s,
    settings,
    dispatch,
    notify,
    save,
    restart,
    start,
    exportGame,
  } = useGame();
  const [initialWorld] = useState(() => makeRuntime(s));
  const runtime = useRef(initialWorld),
    canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [region, setRegion] = useState<Region>(runtime.current.region),
    [terminal, setTerminal] = useState<Terminal>(null),
    [paused, setPaused] = useState(false),
    [archive, setArchive] = useState(false),
    [confirm, setConfirm] = useState(false),
    [transition, setTransition] = useState("");
  const [readout, setReadout] = useState<PlayerReadout>({
    ...runtime.current.pose,
    focus: null,
    door: runtime.current.door,
    rollout: runtime.current.rollout,
    locked: false,
    distance: 0,
  });
  const pauseWasHeld = useRef(false),
    terminalFromPause = useRef(false),
    previousPhase = useRef(s.launch.phase),
    panel = useRef<HTMLDivElement>(null);
  const w = runtime.current,
    phase = s.launch.phase;
  function capture() {
    if (w.mode !== "play" || !matchMedia("(pointer:fine)").matches) return;
    try {
      const result = canvasRef.current?.requestPointerLock();
      if (result && "catch" in result)
        result.catch(() =>
          notify(
            "Mouse capture unavailable. Drag the world or use arrow keys to look.",
          ),
        );
    } catch {
      notify("Drag the world or use arrow keys to look.");
    }
    canvasRef.current?.focus();
  }
  function release() {
    if (document.pointerLockElement) document.exitPointerLock();
    w.input.clear();
  }
  function pause() {
    if (w.mode === "pause") return;
    pauseWasHeld.current = s.paused && phase === "countdown";
    w.mode = "pause";
    release();
    setTerminal(null);
    setPaused(true);
    if (!s.paused) dispatch({ type: "PAUSE" });
    persistWorld(w);
  }
  function resume() {
    w.mode = "play";
    setPaused(false);
    setArchive(false);
    setConfirm(false);
    if (s.paused && !pauseWasHeld.current) dispatch({ type: "PAUSE" });
    capture();
  }
  function open(t: Terminal) {
    terminalFromPause.current = w.mode === "pause";
    w.mode = "terminal";
    release();
    setTerminal(t);
    setPaused(false);
  }
  function close() {
    setTerminal(null);
    if (terminalFromPause.current) {
      w.mode = "pause";
      setPaused(true);
    } else {
      w.mode = "play";
      canvasRef.current?.focus();
    }
  }
  function warp() {
    if (phase === "countdown") {
      notify("Countdown runs in real time. Use the HOLD switch to suspend it.");
      return;
    }
    const speeds = [1, 2, 5, 10];
    dispatch({
      type: "SPEED",
      speed: speeds[(speeds.indexOf(s.speed) + 1) % 4],
    });
  }
  function interact() {
    if (w.mode !== "play" || s.status !== "active") return;
    const item = findInteraction(
      w.pose,
      interactionsFor(w, s),
      collidersFor(w, s),
    );
    if (!item) return;
    switch (item.id) {
      case "suit":
        w.suited = true;
        persistWorld(w);
        notify("Flight suit secured. Open the hangar access door ahead.");
        break;
      case "door":
        if (
          w.doorWanted &&
          Math.abs(w.pose.z - 8) < 0.7 &&
          Math.abs(w.pose.x) < 1.7
        ) {
          notify("Step clear of the doorway before closing it.");
          break;
        }
        w.doorWanted = !w.doorWanted;
        persistWorld(w);
        break;
      case "inspection":
        if (!w.suited) {
          notify("Equip your flight suit in the preparation room first.");
          break;
        }
        open("inspection");
        break;
      case "rollout":
        if (!s.launch.checked) {
          notify(
            "Complete vehicle inspection at the station beside the rocket first.",
          );
          break;
        }
        if (phase === "preflight") {
          w.rolloutRequested = true;
          notify("Bay doors opening. Astra is moving to Pad 39.");
        }
        break;
      case "launch":
        if (phase === "countdown") {
          dispatch({ type: "ABORT" });
          if (s.paused) dispatch({ type: "PAUSE" });
          notify("Countdown aborted. Vehicle safe on the pad.");
        } else if (phase === "failed") {
          dispatch({ type: "RETRY" });
          notify("Vehicle recovered. Return to the hangar inspection station.");
        } else if (!w.suited || !s.launch.checked) {
          notify(
            "Flight suit and a verified preflight inspection are required.",
          );
        } else if (w.rollout < 0.999) {
          notify(
            "Use the ROLLOUT switch and wait for the vehicle to reach the pad.",
          );
        } else if (phase === "preflight") {
          dispatch({ type: "SPEED", speed: 1 });
          dispatch({ type: "LAUNCH" });
          notify(
            "T minus ten. Look through the window to your right to watch Astra lift off.",
          );
        }
        break;
      case "hold":
        if (phase === "countdown") {
          dispatch({ type: "PAUSE" });
          notify(
            s.paused
              ? "Countdown released."
              : "Countdown held. Press E here again to release.",
          );
        } else notify("The HOLD switch is available during countdown.");
        break;
      case "staging":
        if (s.launch.staging) {
          dispatch({ type: "STAGE" });
          notify("Stage separation confirmed. Next engine ignition.");
        } else open("flight");
        break;
      case "navigation":
        if (phase !== "orbit") {
          open("flight");
          break;
        }
        if (s.chapter === 1 && canAdvance(s)) dispatch({ type: "ADVANCE" });
        open("navigation");
        break;
      case "telescope-repair":
        if (!s.orbit.rendezvous) {
          notify(
            "Rendezvous with Hubble using the flight-deck navigation console first.",
          );
        } else if (s.telescope.repaired) {
          dispatch({ type: "CALIBRATE" });
          notify("Pointing assembly calibrated.");
        } else if (s.crew.some((c) => c.task === "Telescope repair"))
          notify(
            "Eli is servicing the pointing assembly. Allow 45 mission seconds.",
          );
        else {
          dispatch({ type: "ASSIGN", id: "okafor", task: "Telescope repair" });
          notify("Eli is replacing the Hubble pointing assembly.");
        }
        break;
      case "bunk":
        dispatch({ type: "ASSIGN", id: "chen", task: "Rest" });
        notify(
          "Maya is resting. Fatigue will decrease as mission time advances.",
        );
        break;
      case "science":
        open("science");
        break;
      case "life":
        open("life");
        break;
      case "crew":
        open("crew");
        break;
      case "evidence":
        open("evidence");
        break;
      case "log":
        open("log");
        break;
    }
  }
  function changeRegion(next: Region) {
    setRegion(next);
    if (next === "flight") {
      setTerminal(null);
      w.mode = "play";
      setTransition("ONBOARD ASTRA / ASCENT");
      dispatch({ type: "SPEED", speed: 5 });
      notify(
        "Onboard Astra. Flight time is now 5×. Stage separation is controlled at the right console.",
      );
    } else if (next === "orbit") {
      dispatch({ type: "SPEED", speed: 1 });
      notify(
        "Orbital insertion confirmed. Use the left navigation console to begin operations.",
      );
    }
  }
  useEffect(() => {
    if (!transition) return;
    const timer = setTimeout(() => setTransition(""), 3200);
    return () => clearTimeout(timer);
  }, [transition]);
  useEffect(() => {
    const persist = () => persistWorld(runtime.current);
    window.addEventListener("pagehide", persist);
    return () => {
      persist();
      window.removeEventListener("pagehide", persist);
    };
  }, []);
  useEffect(() => {
    if (previousPhase.current === "failed" && phase === "preflight") {
      w.rollout = 0;
      w.rolloutRequested = false;
      w.pose = { ...groundSpawn };
      w.doorWanted = true;
    }
    previousPhase.current = phase;
  }, [phase, w]);
  useEffect(() => {
    if (s.status === "ended") {
      w.mode = "pause";
      release();
      setTerminal(null);
      setPaused(false);
    }
  }, [s.status]);
  useEffect(() => {
    if (terminal || paused) {
      panel.current?.focus();
    }
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape" && paused) {
        e.preventDefault();
        resume();
        return;
      }
      if (
        e.key !== "Tab" ||
        !panel.current ||
        panel.current.querySelector(".modal")
      )
        return;
      const nodes = Array.from(
        panel.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [terminal, paused]);
  function replay() {
    restart();
    w.rollout = 0;
    w.rolloutRequested = false;
    w.pose = { ...(s.chapter === 1 ? groundSpawn : shipSpawn) };
    w.doorWanted = true;
    w.mode = "play";
    setPaused(false);
    setTerminal(null);
    setConfirm(false);
    pauseWasHeld.current = false;
    persistWorld(w);
  }
  let objective = "Equip your flight suit",
    detail = "Suit locker · right side of the preparation room";
  if (w.suited) {
    objective = "Enter the rocket hangar";
    detail = "Open the access door ahead · E";
  }
  if (w.suited && readout.z < 8) {
    objective = "Inspect the Astra launch vehicle";
    detail = "Inspection station · near-left side of the hangar";
  }
  if (s.launch.checked) {
    objective = w.rolloutRequested
      ? "Start the launch sequence"
      : "Move Astra to the launchpad";
    detail = w.rolloutRequested
      ? w.rollout < 0.999
        ? "Rollout in progress · watch the vehicle move outside"
        : "Launch control · center switch"
      : "West hangar doorway → launch control → ROLLOUT switch";
  }
  if (phase === "countdown") {
    objective = `${s.paused ? "COUNTDOWN HOLD" : "LAUNCH"} / T − ${Math.ceil(s.launch.countdown).toString().padStart(2, "0")}`;
    detail = "Watch the pad through the window · launch switch aborts";
  }
  if (phase === "ascent") {
    objective = s.launch.staging
      ? `Separate depleted stage ${s.launch.stage + 1}`
      : "Astra is ascending";
    detail = s.launch.staging
      ? "Right flight console · approach and press E"
      : region === "ground"
        ? "Liftoff · preparing onboard camera handoff"
        : "Flight deck · right console for telemetry · T changes time rate";
  }
  if (phase === "failed") {
    objective = "Launch unsuccessful";
    detail =
      region === "ground"
        ? "Recover using the launch switch"
        : "Pause and restore the chapter checkpoint";
  }
  if (phase === "orbit") {
    if (s.chapter === 1) {
      objective = "Confirm orbital insertion";
      detail = "Navigation console · front left";
    } else if (!s.orbit.rendezvous) {
      objective = "Rendezvous with Hubble";
      detail =
        "Navigation console · transfer to 540 km, match velocity, approach";
    } else if (!s.telescope.repaired) {
      objective = "Service Hubble’s pointing assembly";
      detail = "Walk aft through the corridor · service rack on the right";
    } else if (s.chapter === 2) {
      objective = "Acquire your first observation";
      detail = "Optical workstation · right side of the habitat";
    } else if (s.chapter === 3) {
      objective = "Investigate the signal";
      detail = "Acquire and analyze three datasets · review the evidence board";
    } else if (s.chapter === 4) {
      objective = "Stabilize life support and rest the crew";
      detail = "Environmental rack · habitat left · bunks at the aft wall";
    } else {
      objective = "Decide what the evidence supports";
      detail = "Evidence board · habitat left · select a conclusion and return";
    }
    if (canAdvance(s) && s.chapter > 1) {
      objective = "Chapter objectives complete";
      detail = "Evidence board · habitat left · accept the debrief";
    }
  }
  const focus = interactionsFor(w, s).find((i) => i.id === readout.focus),
    location =
      region === "ground"
        ? readout.z > 8
          ? "CREW PREPARATION"
          : readout.z > 3
            ? "HANGAR ACCESS"
            : readout.x < -9
              ? "LAUNCH CONTROL"
              : "VEHICLE ASSEMBLY"
        : readout.z > 10
          ? "HABITAT / OBSERVATORY"
          : readout.z > 6
            ? "ASTRA / TRANSIT"
            : "ASTRA / FLIGHT DECK";
  return (
    <main
      className="first-person-game"
      data-region={region}
      data-player-x={readout.x.toFixed(3)}
      data-player-y={readout.y.toFixed(3)}
      data-player-z={readout.z.toFixed(3)}
      data-yaw={readout.yaw.toFixed(4)}
      data-pitch={readout.pitch.toFixed(4)}
      data-focus={readout.focus ?? ""}
      data-door={readout.door.toFixed(3)}
      data-rollout={readout.rollout.toFixed(3)}
      data-suited={w.suited}
      data-phase={phase}
      data-altitude={s.launch.altitude.toFixed(1)}
      data-stage={s.launch.stage}
      data-staging={s.launch.staging}
      data-paused={s.paused}
      data-countdown={s.launch.countdown.toFixed(2)}
      data-chapter={s.chapter}
      data-speed={s.speed}
      data-repaired={s.telescope.repaired}
      data-docked={s.orbit.rendezvous}
      data-observations={s.telescope.observations.length}
    >
      <WorldBoundary>
        <Canvas
          className="world-canvas"
          shadows={settings.quality === "High"}
          dpr={settings.quality === "High" ? [1, 1.5] : 1}
          camera={{ fov: 72, near: 0.08, far: 700, position: [0, 1.68, 14.5] }}
          gl={{
            antialias: settings.quality === "High",
            powerPreference: "high-performance",
          }}
          onPointerMissed={() => {
            if (!("ontouchstart" in window)) capture();
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("click", () => {
              if (
                runtime.current.mode === "play" &&
                matchMedia("(pointer:fine)").matches
              )
                capture();
            });
          }}
        >
          <Suspense fallback={null}>
            <Environment ground={region === "ground"} />
            {region === "ground" ? (
              <GroundWorld mission={s} runtime={runtime} />
            ) : (
              <ShipWorld mission={s} settings={settings} />
            )}
          </Suspense>
          <PlayerRig
            runtime={runtime}
            mission={s}
            onReadout={setReadout}
            onRegion={changeRegion}
            onInteract={interact}
            onPause={pause}
            onClose={close}
            onWarp={warp}
            canvasRef={canvasRef}
          />
        </Canvas>
      </WorldBoundary>
      <div className="world-vignette" />
      {!terminal && !paused && s.status === "active" && (
        <>
          <header className="world-hud">
            <div className="hud-location">
              <span className="hud-emblem">
                O<span>·</span>E
              </span>
              <div>
                <b>{location}</b>
                <span>ASTRA INITIATIVE / CHAPTER 0{s.chapter}</span>
              </div>
            </div>
            <div className="hud-vitals">
              <span>
                O₂ <b>{s.resources.oxygen.toFixed(0)}%</b>
              </span>
              <span>
                MET <b>{formatTime(s.elapsed)}</b>
              </span>
              <button
                className="hud-pause"
                aria-label="Pause mission"
                onClick={pause}
              >
                <Pause size={17} />
              </button>
            </div>
          </header>
          <div className="world-objective">
            <span>MISSION OBJECTIVE</span>
            <h1>{objective}</h1>
            <p>{detail}</p>
          </div>
          <div
            className={`world-crosshair ${focus ? "focused" : ""}`}
            aria-hidden="true"
          >
            <i />
            <i />
          </div>
          {focus && (
            <div className="interact-prompt" role="status">
              <kbd>E</kbd>
              <span>{focus.label}</span>
            </div>
          )}
          {!readout.locked && (
            <button className="capture-hint" onClick={capture}>
              <span className="mouse-symbol" />
              <span className="desktop-look">Click to look around</span>
              <span className="touch-look">Drag to look around</span>{" "}
              <small>or drag / arrow keys</small>
            </button>
          )}
          <footer className="world-controls">
            <span>
              <kbd>W A S D</kbd> Move <kbd>SHIFT</kbd> Sprint <kbd>E</kbd>{" "}
              Interact
            </span>
            <span>
              {s.paused
                ? phase === "countdown"
                  ? "COUNTDOWN HELD"
                  : "SIMULATION PAUSED"
                : `${s.speed}× TIME`}{" "}
              <kbd>T</kbd>
              <button
                onClick={() => open("handbook")}
                aria-label="Open field handbook"
              >
                <BookOpen size={15} />
              </button>
              <kbd>ESC</kbd> Pause
            </span>
          </footer>
          {(phase === "ascent" || phase === "orbit") && (
            <div className="flight-strip">
              <span>
                ALT <b>{(s.launch.altitude / 1000).toFixed(1)} km</b>
              </span>
              <span>
                VEL <b>{s.launch.velocity.toFixed(0)} m/s</b>
              </span>
              <span>
                STG{" "}
                <b>
                  {s.launch.stage + 1}/{s.rocket.stages}
                </b>
              </span>
            </div>
          )}
          <div className="touch-controls">
            <div className="touch-dpad">
              {[
                ["KeyW", ChevronUp],
                ["KeyA", ChevronLeft],
                ["KeyS", ChevronDown],
                ["KeyD", ChevronRight],
              ].map(([code, Icon]) => {
                const ButtonIcon = Icon as typeof ChevronUp;
                return (
                  <button
                    key={String(code)}
                    aria-label={
                      code === "KeyW"
                        ? "Move forward"
                        : code === "KeyS"
                          ? "Move backward"
                          : code === "KeyA"
                            ? "Move left"
                            : "Move right"
                    }
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      w.input.add(String(code));
                    }}
                    onPointerUp={() => w.input.delete(String(code))}
                    onPointerCancel={() => w.input.delete(String(code))}
                  >
                    <ButtonIcon size={22} />
                  </button>
                );
              })}
            </div>
            <button className="touch-use" onClick={interact}>
              E
            </button>
          </div>
        </>
      )}
      {transition && (
        <div className="world-transition">
          <span>CREW TRANSFER CONFIRMED</span>
          <b>{transition}</b>
          <small>Manual stage separation / flight deck</small>
        </div>
      )}
      {terminal && (
        <div className="terminal-shade">
          <section
            className={`physical-terminal ${["settings", "crew", "evidence", "resources", "log"].includes(terminal) ? "terminal-wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={terminalNames[terminal]}
            ref={panel}
            tabIndex={-1}
          >
            <header className="terminal-header">
              <span>
                <Radio size={14} />
                {terminalNames[terminal]} <small>/ {location}</small>
              </span>
              <button onClick={close} aria-label="Close terminal">
                <span>ESC</span>
                <X size={19} />
              </button>
            </header>
            <div className="terminal-body">
              <TerminalContent
                terminal={terminal}
                close={close}
                onRestartChapter={replay}
              />
            </div>
          </section>
        </div>
      )}
      {paused && (
        <div className="pause-shade">
          <section
            className="pause-panel"
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Mission paused"
          >
            <span className="terminal-kicker">ORBITAL ECHO / OE—01</span>
            <h2>{archive ? "Mission archive" : "Take a breath."}</h2>
            <p>
              {archive
                ? "Previous expeditions, preserved on this device."
                : "Mission paused. Your crew and vehicle are holding position."}
            </p>
            {archive ? (
              <>
                <div className="pause-archive">
                  {getArchive().length ? (
                    getArchive().map((a, i) => (
                      <div key={i}>
                        <small>
                          {new Date(a.date).toLocaleDateString()} / CHAPTER{" "}
                          {a.chapter}
                        </small>
                        <b>{a.ending}</b>
                        <span>Evidence quality {a.science.toFixed(0)}%</span>
                      </div>
                    ))
                  ) : (
                    <p>No completed missions yet.</p>
                  )}
                </div>
                <button
                  className="button secondary full"
                  onClick={() => setArchive(false)}
                >
                  Back to pause menu
                </button>
              </>
            ) : (
              <>
                <button className="button primary full" onClick={resume}>
                  <Play size={16} />
                  Resume exploration
                </button>
                <div className="pause-actions">
                  <button
                    onClick={() => {
                      persistWorld(w);
                      save();
                    }}
                  >
                    <Save size={17} />
                    Save mission
                  </button>
                  <button onClick={() => open("settings")}>
                    <Settings size={17} />
                    Preferences
                  </button>
                  <button onClick={() => open("handbook")}>
                    <BookOpen size={17} />
                    Field handbook
                  </button>
                  <button onClick={() => open("log")}>
                    <Radio size={17} />
                    Mission log
                  </button>
                  <button onClick={() => open("resources")}>
                    <Save size={17} />
                    Mission reserves
                  </button>
                  <button onClick={() => setArchive(true)}>
                    <Flag size={17} />
                    Mission archive
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={() => setConfirm(true)}
                >
                  <RotateCcw size={14} />
                  Restore chapter checkpoint
                </button>
                {confirm && (
                  <div className="confirm-inline">
                    <p>Restore the start of chapter {s.chapter}?</p>
                    <button
                      className="button secondary compact"
                      onClick={() => setConfirm(false)}
                    >
                      Keep progress
                    </button>
                    <button className="button primary compact" onClick={replay}>
                      Restore checkpoint
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {s.status === "ended" && (
        <div className="pause-shade">
          <section
            className="pause-panel debrief-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Mission debrief"
          >
            <span className="terminal-kicker">ASTRA / MISSION DEBRIEF</span>
            <h2>{s.ending?.toLowerCase()}</h2>
            <p>
              {s.ending === "MISSION LOST"
                ? "The cabin could no longer support the crew. Restore the checkpoint to reconsider your emergency response."
                : "The crew has returned to Earth. Your evidence and the condition of your spacecraft determine the outcome of this expedition."}
            </p>
            <div className="game-instruments">
              <div>
                <span>EVIDENCE</span>
                <b>{scienceScore(s).toFixed(0)}%</b>
              </div>
              <div>
                <span>CREW HEALTH</span>
                <b>
                  {(
                    s.crew.reduce((n, c) => n + c.health, 0) / s.crew.length
                  ).toFixed(0)}
                  %
                </b>
              </div>
            </div>
            <button className="button primary full" onClick={start}>
              Begin a new expedition
            </button>
            <button className="button secondary full" onClick={replay}>
              Replay chapter {s.chapter}
            </button>
            <button className="text-button" onClick={exportGame}>
              Export mission record
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
