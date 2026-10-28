import { Radio, X } from "lucide-react";
import { Audio } from "./components/Audio";
import { useGame } from "./state/GameContext";
import { FirstPersonGame } from "./game/FirstPersonGame";
import "./game/game.css";
export default function App() {
  const { mission, settings, toast, notify } = useGame();
  return (
    <div
      className={`game-root ${settings.largeText ? "large-text" : ""} ${settings.contrast ? "high-contrast" : ""} ${!settings.motion ? "reduce-motion" : ""}`}
    >
      <Audio />
      <FirstPersonGame key={mission.id} />
      {toast && (
        <div className="toast world-toast" role="status">
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
    </div>
  );
}
