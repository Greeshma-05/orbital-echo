import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Download,
  Flag,
  FolderOpen,
  Play,
  RotateCcw,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Upload,
  Volume2,
} from "lucide-react";
import { useGame } from "../state/GameContext";
import { getArchive } from "../state/persistence";
import { chapters } from "../data/mission";
import { scienceScore } from "../simulation/rules";
import { SpaceScene } from "../components/SpaceScene";
import {
  Brand,
  Comms,
  formatTime,
  Modal,
  Panel,
  Stat,
  Tag,
} from "../components/UI";
export function SettingsContent({
  onRestartChapter,
}: { onRestartChapter?: () => void } = {}) {
  const {
    settings: s,
    updateSettings,
    save,
    exportGame,
    importGame,
    restart,
    start,
    screen,
  } = useGame();
  const input = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState("");
  return (
    <>
      <div className="settings-grid">
        <div>
          <h3>Audio & atmosphere</h3>
          {[
            {
              key: "sound",
              name: "Instrument sounds",
              desc: "Countdown, alerts, and flight confirmations",
            },
            {
              key: "music",
              name: "Ambient soundscape",
              desc: "A quiet, synthesized orbital drone",
            },
          ].map((item) => (
            <label className="toggle-row" key={item.key}>
              <span>
                {item.name}
                <small>{item.desc}</small>
              </span>
              <input
                type="checkbox"
                checked={s[item.key as "sound" | "music"]}
                onChange={(e) =>
                  updateSettings({ [item.key]: e.target.checked })
                }
              />
            </label>
          ))}
          <label>
            Master volume <b>{s.volume}%</b>
            <input
              aria-label="Master volume"
              type="range"
              min="0"
              max="100"
              value={s.volume}
              onChange={(e) => updateSettings({ volume: +e.target.value })}
            />
          </label>
          <label>
            Graphics quality
            <select
              aria-label="Graphics quality"
              value={s.quality}
              onChange={(e) =>
                updateSettings({ quality: e.target.value as "High" | "Low" })
              }
            >
              <option>High</option>
              <option>Low</option>
            </select>
          </label>
        </div>
        <div>
          <h3>Accessibility & learning</h3>
          {[
            {
              key: "motion",
              name: "Animated space visuals",
              desc: "Disable for reduced motion and static scenes",
            },
            {
              key: "largeText",
              name: "Larger interface text",
              desc: "Increase text size throughout mission control",
            },
            {
              key: "contrast",
              name: "High contrast",
              desc: "Brighter text and stronger panel borders",
            },
            {
              key: "science",
              name: "Science Mode",
              desc: "Show formulas, context, and model limitations",
            },
          ].map((item) => (
            <label className="toggle-row" key={item.key}>
              <span>
                {item.name}
                <small>{item.desc}</small>
              </span>
              <input
                type="checkbox"
                checked={
                  s[item.key as "motion" | "largeText" | "contrast" | "science"]
                }
                onChange={(e) =>
                  updateSettings({ [item.key]: e.target.checked })
                }
              />
            </label>
          ))}
        </div>
      </div>
      <div className="divider" />
      <h3>Mission data</h3>
      <p className="microcopy">
        Progress saves every four seconds during a mission, at chapter
        boundaries, and on exit. Imports are validated and open paused. Settings
        are saved separately on this device.
      </p>
      <div className="button-row">
        {screen !== "menu" && (
          <>
            <button className="button secondary" onClick={save}>
              Save mission
            </button>
            <button className="button secondary" onClick={exportGame}>
              <Download size={14} />
              Export save
            </button>
          </>
        )}
        <button
          className="button secondary"
          onClick={() => input.current?.click()}
        >
          <Upload size={14} />
          Import save
        </button>
        <input
          ref={input}
          type="file"
          hidden
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void f.text().then(importGame);
            e.target.value = "";
          }}
        />
        {screen !== "menu" && (
          <>
            <button
              className="button quiet"
              onClick={() => setConfirm("chapter")}
            >
              Restart chapter
            </button>
            <button
              className="button quiet"
              onClick={() => setConfirm("mission")}
            >
              Restart mission
            </button>
          </>
        )}
      </div>
      {confirm && (
        <div className="confirm-inline">
          <p>
            {confirm === "chapter"
              ? "Restore this chapter’s entry checkpoint?"
              : "Archive the current attempt and begin a new mission?"}
          </p>
          <button
            className="button secondary compact"
            onClick={() => setConfirm("")}
          >
            Keep playing
          </button>
          <button
            className="button primary compact"
            onClick={() => {
              confirm === "chapter" ? (onRestartChapter ?? restart)() : start();
              setConfirm("");
            }}
          >
            Confirm restart
          </button>
        </div>
      )}
    </>
  );
}
export function HelpContent() {
  return (
    <div className="help-content">
      <p>
        Command Astra from preparation to recovery. Your crew, equipment, fuel,
        and evidence persist across five chapters.
      </p>
      {[
        {
          title: "01 · Build & launch",
          text: "Resolve the vibration warning, configure a rocket, run preflight, and start the countdown. Watch for stage burnout and separate the depleted stage. Use 10× speed for a quicker ascent.",
        },
        {
          title: "02 · Reach & restore",
          text: "Transfer to Hubble at 540 km, match velocity, and approach. Assign telescope repair in Crew & health, wait for completion, then deploy Echo and acquire an observation.",
        },
        {
          title: "03 · Observe & investigate",
          text: "Collect and analyze three datasets across at least two targets and two filters. Two Echo observations and a control galaxy observation are a useful start. Resolve the power alert and request independent confirmation.",
        },
        {
          title: "04 · Care for the crew",
          text: "Respond to the cabin alert, assign life-support repair to the engineer, and let Maya rest until fatigue falls below 60%. Repairs take about 45 simulated seconds. Rest continues until reassigned.",
        },
        {
          title: "05 · Decide & return",
          text: "Review the hypotheses, optionally launch a relay probe, and return to Earth. Strong evidence and a healthy crew support the best outcome. Returning early is a valid choice.",
        },
      ].map((x) => (
        <div className="help-step" key={x.title}>
          <h3>{x.title}</h3>
          <p>{x.text}</p>
        </div>
      ))}
      <div className="shortcut-row">
        <kbd>Space</kbd>
        <span>Pause / resume</span>
        <kbd>Esc</kbd>
        <span>Close dialog</span>
        <kbd>Tab</kbd>
        <span>Move between controls</span>
      </div>
      <p className="microcopy">
        Earth surface imagery: NASA Earth Observatory, Blue Marble: Next
        Generation. Clouds, spacecraft, and scientific datasets are simulated.{" "}
        <a
          href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/"
          target="_blank"
          rel="noreferrer"
        >
          Image source
        </a>
      </p>
      <p className="microcopy">
        This is an educational simulation with fictional crew and narrative.
        Time stops on the main menu and while the browser tab is hidden. Pause
        freezes all time-dependent systems; you can still plan and issue
        commands.
      </p>
    </div>
  );
}
export function Menu() {
  const { saved, start, continueGame } = useGame();
  const [modal, setModal] = useState("");
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal("");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <div className="main-menu">
      <div className="menu-space">
        <SpaceScene menu />
      </div>
      <div className="menu-grid" />
      <header className="menu-header">
        <Brand />
        <span className="agency-wordmark">
          ASTRA
          <br />
          <small>INTERNATIONAL SPACE INITIATIVE</small>
        </span>
      </header>
      <main className="menu-copy">
        <span className="eyebrow">
          <span className="live-dot" /> THE YEAR IS 2042. THE SIGNAL IS WAITING.
        </span>
        <h1>
          ORBITAL
          <br />
          <span>ECHO</span>
          <sup>01</sup>
        </h1>
        <p className="menu-subtitle">THE LAST MISSION BEYOND EARTH</p>
        <p className="menu-quote">
          Humanity’s next discovery
          <br />
          begins with a single launch.
        </p>
        <div className="menu-actions">
          <button className="button primary menu-start" onClick={start}>
            <Play size={16} fill="currentColor" />
            New mission
            <ArrowRight size={19} />
          </button>
          <button
            className="menu-continue"
            disabled={!saved}
            onClick={continueGame}
          >
            <FolderOpen size={16} />
            Continue mission
            <small>{saved ? "RESTORE LAST SAVE" : "NO SAVED MISSION"}</small>
          </button>
        </div>
        <div className="menu-secondary">
          <button onClick={() => setModal("archive")}>
            Mission archive
            <ArrowUpRight size={14} />
          </button>
          <button onClick={() => setModal("help")}>
            How to play
            <ArrowUpRight size={14} />
          </button>
          <button
            onClick={() => setModal("settings")}
            aria-label="Open settings"
          >
            <SlidersHorizontal size={16} />
            Settings
          </button>
        </div>
      </main>
      <div className="menu-coordinate">
        <div>
          <i />
          <span>
            EARTH<small>OUR HOME. OUR BEGINNING.</small>
          </span>
        </div>
        <span className="mono">25° 17′ N / 80° 54′ W</span>
      </div>
      <footer className="menu-footer">
        <Comms />
        <span>EXPLORE. DISCOVER. RETURN.</span>
        <span className="mono">OE—2042 / v1.0</span>
      </footer>
      {modal && (
        <Modal
          title={
            modal === "settings"
              ? "Your mission. Your settings."
              : modal === "help"
                ? "Welcome, Commander."
                : "Mission archive"
          }
          close={() => setModal("")}
          wide={modal !== "archive"}
        >
          {modal === "settings" ? (
            <SettingsContent />
          ) : modal === "help" ? (
            <HelpContent />
          ) : (
            <ArchiveContent />
          )}
        </Modal>
      )}
    </div>
  );
}
function ArchiveContent() {
  const archive = getArchive();
  return archive.length === 0 ? (
    <div className="empty-state">
      <Flag size={30} />
      <h3>Your story is unwritten.</h3>
      <p>Completed, failed, and abandoned missions appear here.</p>
    </div>
  ) : (
    <div className="archive-list">
      {archive.map((a, i) => (
        <div key={`${a.id}-${i}`}>
          <span className="eyebrow">
            OE-{a.id.toUpperCase()} · CHAPTER {a.chapter}
          </span>
          <h3>{a.ending}</h3>
          <p>
            {new Date(a.date).toLocaleDateString()} · Evidence{" "}
            {a.science.toFixed(0)}%
          </p>
        </div>
      ))}
    </div>
  );
}
export function Intro() {
  const { setScreen, mission } = useGame();
  const [page, setPage] = useState(0);
  const slides = [
    {
      overline: "INCOMING TRANSMISSION / ASTRA INITIATIVE",
      title: "Something has changed in the sky.",
      text: "Hubble recorded an unexplained pattern of light. A second observatory saw something similar. Then the images stopped making sense. In 2042, your crew is sent to find out why.",
    },
    {
      overline: "MISSION OE-01 / COMMANDER BRIEFING",
      title: "Three people. One extraordinary mission.",
      text: "Alex Reyes commands the spacecraft. Dr. Maya Chen leads the science. Flight engineer Eli Okafor keeps everything running. Service Hubble, deploy Echo, investigate the signal—and bring everyone home.",
    },
  ];
  const slide = slides[page];
  return (
    <div className="intro-screen">
      <SpaceScene menu />
      <header>
        <Brand />
        <button className="text-button" onClick={() => setScreen("game")}>
          Skip intro
          <ArrowRight size={16} />
        </button>
      </header>
      <div className="intro-copy">
        <span className="eyebrow">{slide.overline}</span>
        <h1>{slide.title}</h1>
        <p>{slide.text}</p>
        <div className="intro-dots">
          <i className={page === 0 ? "active" : ""} />
          <i className={page === 1 ? "active" : ""} />
        </div>
        <button
          className="button primary"
          onClick={() => (page === 0 ? setPage(1) : setScreen("game"))}
        >
          {page === 0 ? "Receive mission briefing" : "Enter mission control"}
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="intro-crew">
        {mission.crew.map((c) => (
          <div key={c.id}>
            <span className="avatar">{c.initials}</span>
            <b>{c.name}</b>
            <small>{c.role}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Ending() {
  const { mission: s, setScreen, start, restart, exportGame } = useGame();
  const greatest = s.ending === "THE GREATEST DISCOVERY",
    lost = s.ending === "MISSION LOST";
  return (
    <div className="ending-screen">
      <div className="ending-planet">
        <SpaceScene menu />
      </div>
      <div className="ending-content">
        <Brand />
        <Tag tone={lost ? "red" : "green"}>
          {lost ? "MISSION TERMINATED" : "CREW RECOVERED · PACIFIC OCEAN"}
        </Tag>
        <span className="eyebrow">MISSION OE-01 / DEBRIEF</span>
        <h1>{s.ending?.toLowerCase()}</h1>
        <p>
          {greatest
            ? "The crew is home. Your calibrated, repeated observations and independent confirmation make a compelling case for unusual stellar variability. The cause remains open, but humanity now knows where to look."
            : lost
              ? "The cabin could no longer support the crew. This simulation preserves your chapter checkpoint. Revisit the emergency response and assign repairs earlier."
              : s.ending === "THE PRICE OF DISCOVERY"
                ? "The crew returns with significant evidence, but the mission has paid for it in damaged equipment and depleted reserves. The science will continue. So will the lessons of this flight."
                : "The crew is home. The evidence is incomplete, but their observations have given the next expedition a place to begin. Protecting the people was part of the mission, too."}
        </p>
        <div className="ending-stats">
          <Stat
            label="EVIDENCE QUALITY"
            value={scienceScore(s).toFixed(0)}
            unit="%"
          />
          <Stat
            label="CREW HEALTH"
            value={(s.crew.reduce((a, c) => a + c.health, 0) / 3).toFixed(0)}
            unit="%"
          />
          <Stat label="MISSION TIME" value={formatTime(s.elapsed)} />
        </div>
        <div className="button-row">
          <button className="button primary" onClick={start}>
            A new mission
            <ArrowRight size={16} />
          </button>
          <button className="button secondary" onClick={restart}>
            Replay chapter {s.chapter}
          </button>
          <button className="button quiet" onClick={exportGame}>
            Export mission
          </button>
          <button className="button quiet" onClick={() => setScreen("menu")}>
            Main menu
          </button>
        </div>
        <small className="ending-note">
          The outcome was calculated from your mission state. Archive saved on
          this device.
        </small>
      </div>
    </div>
  );
}
