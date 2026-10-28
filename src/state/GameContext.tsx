import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { newMission } from "../data/mission";
import { reduceMission, log } from "../simulation/engine";
import { scienceScore } from "../simulation/rules";
import type { Action, Mission, Settings, View } from "../simulation/types";
import {
  archiveMission,
  loadSave,
  loadSettings,
  parseSave,
  saveGame,
  saveSettings,
} from "./persistence";
const initialSave = loadSave();
type Screen = "menu" | "intro" | "game";
interface Game {
  mission: Mission;
  settings: Settings;
  screen: Screen;
  view: View;
  toast: string;
  saved: boolean;
  dispatch: (a: Action) => void;
  setView: (v: View) => void;
  setScreen: (s: Screen) => void;
  updateSettings: (s: Partial<Settings>) => void;
  start: () => void;
  continueGame: () => void;
  restart: () => void;
  save: () => void;
  importGame: (text: string) => void;
  exportGame: () => void;
  notify: (s: string) => void;
}
const Context = createContext<Game>(null!);
export function GameProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState(initialSave?.mission ?? newMission),
    [checkpoint, setCheckpoint] = useState(initialSave?.checkpoint ?? mission),
    [settings, setSettings] = useState(loadSettings),
    [screen, setScreen] = useState<Screen>("menu"),
    [view, setView] = useState<View>("Overview"),
    [toast, notify] = useState(""),
    [saved, setSaved] = useState(!!initialSave);
  const current = useRef({ mission, checkpoint, settings, screen });
  current.current = { mission, checkpoint, settings, screen };
  const dispatch = useCallback((action: Action) => {
    setMission((old) => reduceMission(old, action));
  }, []);
  const save = useCallback(() => {
    const { mission, checkpoint } = current.current;
    try {
      saveGame(mission, checkpoint);
      setSaved(true);
      notify("Mission saved to this device.");
    } catch {
      notify(
        "Device storage is unavailable. Export your mission to keep a copy.",
      );
    }
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => notify(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const timer = setInterval(() => {
      const c = current.current;
      if (
        c.screen === "game" &&
        !c.mission.paused &&
        c.mission.status === "active" &&
        !document.hidden
      )
        dispatch({ type: "TICK", dt: 0.25 * c.mission.speed });
    }, 250);
    return () => clearInterval(timer);
  }, [dispatch]);
  useEffect(() => {
    if (screen !== "game") return;
    const timer = setInterval(() => {
      const c = current.current;
      try {
        saveGame(c.mission, c.checkpoint);
        setSaved(true);
      } catch {
        /* Manual export remains available. */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [screen]);
  useEffect(() => {
    if (mission.chapter !== checkpoint.chapter) {
      setCheckpoint(structuredClone(mission));
      setView("Overview");
      try {
        saveGame(mission, mission);
        setSaved(true);
      } catch {
        notify(
          "Checkpoint is available for this session. Export to preserve it.",
        );
      }
    }
  }, [mission.chapter, checkpoint.chapter, mission]);
  useEffect(() => {
    if (mission.status === "ended") {
      try {
        archiveMission({
          id: mission.id,
          ending: mission.ending!,
          chapter: mission.chapter,
          date: new Date().toISOString(),
          science: scienceScore(mission),
        });
        saveGame(mission, checkpoint);
        setSaved(true);
      } catch {
        notify(
          "Archive could not be saved. Export your mission from Settings.",
        );
      }
    }
  }, [mission.status, mission, checkpoint]);
  useEffect(() => {
    const saveOnExit = () => {
      if (current.current.screen === "game") {
        try {
          saveGame(current.current.mission, current.current.checkpoint);
        } catch {}
      }
    };
    window.addEventListener("pagehide", saveOnExit);
    return () => window.removeEventListener("pagehide", saveOnExit);
  }, []);
  function start() {
    if (saved && mission.status === "active") {
      try {
        archiveMission({
          id: mission.id,
          ending: "MISSION ABANDONED",
          chapter: mission.chapter,
          date: new Date().toISOString(),
          science: scienceScore(mission),
        });
      } catch {}
    }
    const next = newMission();
    setMission(next);
    setCheckpoint(structuredClone(next));
    setView("Overview");
    setScreen("intro");
    try {
      saveGame(next, next);
      setSaved(true);
    } catch {
      notify("Device storage unavailable. Export your mission from Settings.");
    }
  }
  function continueGame() {
    const s = loadSave();
    if (s) {
      setMission({ ...s.mission, paused: true });
      setCheckpoint(s.checkpoint);
      setScreen("game");
      setView("Overview");
      notify("Mission restored and paused. Resume when ready.");
    } else notify("No valid mission save was found. Start a new mission.");
  }
  function restart() {
    const next = structuredClone(checkpoint);
    next.paused = false;
    const later = mission.log
      .filter(
        (entry) =>
          entry.time >= checkpoint.elapsed &&
          !checkpoint.log.some(
            (old) => old.time === entry.time && old.text === entry.text,
          ),
      )
      .map((entry) => ({ ...entry, text: `[Previous attempt] ${entry.text}` }));
    next.log = [...later, ...next.log].slice(0, 199);
    log(
      next,
      "Chapter checkpoint restored. Previous decisions within this chapter can be replayed.",
    );
    setMission(next);
    setScreen("game");
    try {
      saveGame(next, checkpoint);
    } catch {}
    notify("Chapter checkpoint restored.");
  }
  function importGame(text: string) {
    try {
      const data = parseSave(text);
      setMission({ ...data.mission, paused: true });
      setCheckpoint(data.checkpoint);
      if (data.settings) {
        setSettings(data.settings);
        saveSettings(data.settings);
      }
      saveGame(data.mission, data.checkpoint);
      setSaved(true);
      setScreen("game");
      setView("Overview");
      notify("Mission imported. Simulation paused.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Invalid save file.");
    }
  }
  function exportGame() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, mission, checkpoint, settings }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbital-echo-${mission.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Save file exported.");
  }
  function updateSettings(p: Partial<Settings>) {
    setSettings((old) => {
      const n = { ...old, ...p };
      try {
        saveSettings(n);
      } catch {
        notify(
          "Preferences apply for this session; device storage is unavailable.",
        );
      }
      return n;
    });
  }
  return (
    <Context.Provider
      value={{
        mission,
        settings,
        screen,
        view,
        toast,
        saved,
        dispatch,
        setView,
        setScreen,
        updateSettings,
        start,
        continueGame,
        restart,
        save,
        importGame,
        exportGame,
        notify,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useGame = () => useContext(Context);
