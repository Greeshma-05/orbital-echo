import { useEffect, useRef } from "react";
import { useGame } from "../state/GameContext";
export function Audio() {
  const { settings, mission } = useGame();
  const ctx = useRef<AudioContext | null>(null);
  const music = useRef<{ nodes: OscillatorNode[]; gain: GainNode } | null>(
    null,
  );
  const last = useRef("");
  useEffect(() => {
    function unlock() {
      if ((settings.sound || settings.music) && !ctx.current)
        ctx.current = new AudioContext();
      void ctx.current?.resume();
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [settings.sound, settings.music]);
  useEffect(() => {
    if ((settings.music || settings.sound) && !ctx.current)
      ctx.current = new AudioContext();
    const c = ctx.current;
    if (!c) return;
    if (settings.music && !music.current) {
      const gain = c.createGain();
      gain.gain.value = (0.015 * settings.volume) / 100;
      gain.connect(c.destination);
      const nodes = [55, 82.41, 110].map((f) => {
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(gain);
        o.start();
        return o;
      });
      music.current = { nodes, gain };
    }
    if (music.current) {
      music.current.gain.gain.value = (0.025 * settings.volume) / 100;
      if (!settings.music) {
        music.current.nodes.forEach((n) => n.stop());
        music.current = null;
      }
    }
  }, [settings.music, settings.volume, mission.elapsed]);
  useEffect(() => {
    const c = ctx.current;
    const entry = mission.log[0];
    const key =
      mission.launch.phase === "countdown"
        ? `count${Math.ceil(mission.launch.countdown)}`
        : entry?.text;
    if (!c || !settings.sound || key === last.current) return;
    last.current = key;
    const o = c.createOscillator(),
      gain = c.createGain();
    o.type = "sine";
    o.frequency.value =
      entry?.level === "warning"
        ? 230
        : mission.launch.phase === "ascent"
          ? 95
          : 660;
    gain.gain.setValueAtTime((0.07 * settings.volume) / 100, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
    o.connect(gain);
    gain.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.25);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
  }, [mission.log, mission.launch.countdown, mission.launch.phase, settings]);
  useEffect(
    () => () => {
      music.current?.nodes.forEach((n) => n.stop());
      void ctx.current?.close();
    },
    [],
  );
  return null;
}
