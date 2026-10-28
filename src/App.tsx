import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Boxes,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Orbit,
  Pause,
  Play,
  Radio,
  Rocket as RocketIcon,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Telescope as TelescopeIcon,
  TriangleAlert,
  Wind,
  X,
} from "lucide-react";
import { useGame } from "./state/GameContext";
import { canAdvance } from "./simulation/rules";
import type { View } from "./simulation/types";
import { Audio } from "./components/Audio";
import { Brand, formatTime, Modal } from "./components/UI";
import { Overview } from "./features/Overview";
import { Rocket } from "./features/Rocket";
import { Navigation } from "./features/Navigation";
import { Telescope } from "./features/Telescope";
import { Crew, LifeSupport } from "./features/Crew";
import { Investigation, MissionLog, Resources } from "./features/Mission";
import {
  Ending,
  HelpContent,
  Intro,
  Menu,
  SettingsContent,
} from "./features/Menu";
const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Rocket & launch", icon: RocketIcon },
  { label: "Orbit & navigation", icon: Orbit },
  { label: "Telescope & science", icon: TelescopeIcon },
  { label: "Crew & health", icon: HeartPulse },
  { label: "Life support", icon: Wind },
  { label: "Resources", icon: Boxes },
  { label: "Mission log", icon: BookOpen },
  { label: "Investigation", icon: FlaskConical },
];
export default function App() {
  const {
    mission: s,
    settings,
    screen,
    view,
    setView,
    dispatch,
    setScreen,
    save,
    toast,
    notify,
  } = useGame();
  const [modal, setModal] = useState(""),
    [mobile, setMobile] = useState(false);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    document.documentElement.dataset.motion = settings.motion ? "on" : "off";
    document.documentElement.dataset.contrast = settings.contrast
      ? "high"
      : "normal";
    document.documentElement.dataset.text = settings.largeText
      ? "large"
      : "normal";
  }, [settings]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModal("");
        setMobile(false);
      }
      if (
        e.code === "Space" &&
        screen === "game" &&
        !modal &&
        !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      ) {
        e.preventDefault();
        dispatch({ type: "PAUSE" });
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [dispatch, modal, screen]);
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [view]);
  useEffect(() => {
    setModal("");
  }, [screen]);
  useEffect(() => {
    if (screen === "game" && s.log[0]?.level === "warning")
      notify(s.log[0].text);
  }, [s.log[0]?.text, screen, notify]);
  const content: Record<View, React.ReactNode> = {
    Overview: <Overview />,
    "Rocket & launch": <Rocket />,
    "Orbit & navigation": <Navigation />,
    "Telescope & science": <Telescope />,
    "Crew & health": <Crew />,
    "Life support": <LifeSupport />,
    Resources: <Resources />,
    "Mission log": <MissionLog />,
    Investigation: <Investigation />,
  };
  return (
    <>
      <Audio />
      {screen === "menu" ? (
        <Menu />
      ) : screen === "intro" ? (
        <Intro />
      ) : s.status === "ended" ? (
        <Ending />
      ) : (
        <div className="app-shell">
          <aside className={`sidebar ${mobile ? "open" : ""}`}>
            <button
              className="brand-button"
              onClick={() => {
                save();
                setScreen("menu");
              }}
              aria-label="Save and open main menu"
            >
              <Brand small />
            </button>
            <div className="mission-designation">
              <span className="eyebrow">ACTIVE MISSION</span>
              <div>
                <span className="live-dot" />
                OE-01 <b>ASTRA</b>
              </div>
              <small>The last mission beyond Earth</small>
            </div>
            <span className="nav-caption">MISSION CONTROL</span>
            <nav aria-label="Mission navigation">
              {nav.map((item, i) => (
                <button
                  key={item.label}
                  className={view === item.label ? "active" : ""}
                  onClick={() => {
                    setView(item.label as View);
                    setMobile(false);
                  }}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {i === 5 && s.life.fault ? (
                    <i className="nav-alert" />
                  ) : view === item.label ? (
                    <ChevronRight size={12} />
                  ) : null}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="science-switch">
                <FlaskConical size={16} />
                <span>Science Mode</span>
                <b>{settings.science ? "ON" : "OFF"}</b>
              </div>
              <button
                onClick={() => {
                  setModal("help");
                  setMobile(false);
                }}
              >
                <CircleHelp size={17} />
                Flight handbook
              </button>
              <button
                onClick={() => {
                  setModal("settings");
                  setMobile(false);
                }}
              >
                <SettingsIcon size={17} />
                Settings
              </button>
              <div className="operator">
                <span className="operator-avatar">C</span>
                <div>
                  <b>Mission Commander</b>
                  <small>ASTRA INITIATIVE</small>
                </div>
                <ShieldCheck size={15} />
              </div>
            </div>
          </aside>
          {mobile && (
            <button
              className="sidebar-scrim"
              aria-label="Close navigation"
              onClick={() => setMobile(false)}
            />
          )}
          <div className="main-shell">
            <header className="topbar">
              <div className="breadcrumb">
                <button
                  className="icon-button mobile-menu"
                  aria-label="Open navigation"
                  onClick={() => setMobile(true)}
                >
                  <MenuIcon size={20} />
                </button>
                <span>MISSION CONTROL</span>
                <ChevronRight size={13} />
                <b>{view}</b>
              </div>
              <div className="clock-controls">
                <span className="mission-clock">
                  <i />
                  MET <b>{formatTime(s.elapsed)}</b>
                </span>
                <div className="time-controls">
                  <button
                    className={`icon-button ${s.paused ? "is-paused" : ""}`}
                    onClick={() => dispatch({ type: "PAUSE" })}
                    aria-label={
                      s.paused ? "Resume simulation" : "Pause simulation"
                    }
                    title="Pause or resume · Space"
                  >
                    {s.paused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                  {[1, 2, 5, 10].map((n) => (
                    <button
                      aria-label={`Simulation speed ${n}x`}
                      key={n}
                      className={s.speed === n ? "active" : ""}
                      onClick={() => dispatch({ type: "SPEED", speed: n })}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
                <button
                  className="icon-button"
                  aria-label="Save mission"
                  title="Save mission"
                  onClick={save}
                >
                  <Save size={16} />
                </button>
              </div>
            </header>
            {(s.life.fault || s.resources.power < 25) &&
              view !== "Life support" && (
                <button
                  className="critical-banner"
                  onClick={() => setView("Life support")}
                >
                  <TriangleAlert size={16} />
                  <span>
                    {s.life.fault
                      ? `Cabin environmental fault · CO₂ ${s.life.co2.toFixed(0)} ppm`
                      : `Electrical reserve critical · ${s.resources.power.toFixed(0)}% power`}
                  </span>
                  Respond now
                  <ArrowRight size={14} />
                </button>
              )}
            <main ref={main} className="workspace" id="main-content">
              {s.paused && (
                <div className="paused-banner">
                  <Pause size={13} />
                  SIMULATION PAUSED
                  <span>Review systems and plan your next action.</span>
                  <button onClick={() => dispatch({ type: "PAUSE" })}>
                    Resume
                    <Play size={11} />
                  </button>
                </div>
              )}
              {content[view]}
              {view !== "Overview" && canAdvance(s) && (
                <div className="chapter-complete">
                  <div>
                    <ShieldCheck size={23} />
                    <span>
                      <b>Chapter objectives complete</b>
                      <small>The next part of your mission is ready.</small>
                    </span>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => dispatch({ type: "ADVANCE" })}
                  >
                    Begin chapter {s.chapter + 1}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </main>
          </div>
          {modal && (
            <Modal
              wide
              title={
                modal === "settings" ? "Mission preferences" : "Flight handbook"
              }
              close={() => setModal("")}
            >
              {modal === "settings" ? <SettingsContent /> : <HelpContent />}
            </Modal>
          )}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Radio size={16} />
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => notify("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
