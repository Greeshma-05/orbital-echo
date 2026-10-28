import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EYE_HEIGHT, findInteraction, movePlayer } from "./physics";
import {
  collidersFor,
  advanceWorld,
  groundSpawn,
  interactionsFor,
  persistWorld,
  regionFor,
  shipSpawn,
  type Region,
  type WorldRuntime,
} from "./world";
import type { Mission } from "../simulation/types";
export interface PlayerReadout {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  focus: string | null;
  door: number;
  rollout: number;
  locked: boolean;
  distance: number;
}
export function PlayerRig({
  runtime,
  mission,
  onReadout,
  onRegion,
  onInteract,
  onPause,
  onClose,
  onWarp,
  canvasRef,
}: {
  runtime: MutableRefObject<WorldRuntime>;
  mission: Mission;
  onReadout: (v: PlayerReadout) => void;
  onRegion: (r: Region) => void;
  onInteract: () => void;
  onPause: () => void;
  onClose: () => void;
  onWarp: () => void;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
}) {
  const { camera, gl } = useThree();
  const callbacks = useRef({
    mission,
    onReadout,
    onRegion,
    onInteract,
    onPause,
    onClose,
    onWarp,
  });
  callbacks.current = {
    mission,
    onReadout,
    onRegion,
    onInteract,
    onPause,
    onClose,
    onWarp,
  };
  const publish = useRef(0);
  const jumpWasDown = useRef(false);
  useEffect(() => {
    canvasRef.current = gl.domElement;
    gl.domElement.tabIndex = 0;
    gl.domElement.setAttribute(
      "aria-label",
      "First-person 3D world. Click to capture the mouse.",
    );
    camera.rotation.order = "YXZ";
    const drag = { active: false, x: 0, y: 0 };
    const down = (e: KeyboardEvent) => {
      const w = runtime.current;
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Escape") {
        if (document.querySelector(".modal[aria-modal=true]")) return;
        if (w.mode === "terminal") callbacks.current.onClose();
        else if (w.mode === "play") callbacks.current.onPause();
        return;
      }
      if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
      if (w.mode !== "play") return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ShiftLeft",
          "ShiftRight",
          "Space",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
        ].includes(e.code)
      ) {
        e.preventDefault();
        w.input.add(e.code);
      }
      if (e.code === "KeyE" && !e.repeat) {
        e.preventDefault();
        callbacks.current.onInteract();
      }
      if (e.code === "KeyT" && !e.repeat) callbacks.current.onWarp();
    };
    const up = (e: KeyboardEvent) => runtime.current.input.delete(e.code);
    const move = (e: MouseEvent) => {
      const w = runtime.current;
      if (!w.locked || w.mode !== "play") return;
      w.pose.yaw -= e.movementX * 0.0022;
      w.pose.pitch = Math.max(
        -1.3,
        Math.min(1.3, w.pose.pitch - e.movementY * 0.0022),
      );
    };
    const lock = () => {
      const w = runtime.current,
        was = w.locked;
      w.locked = document.pointerLockElement === gl.domElement;
      if (was && !w.locked && w.mode === "play") callbacks.current.onPause();
    };
    const blur = () => {
      runtime.current.input.clear();
      if (runtime.current.mode === "play") callbacks.current.onPause();
    };
    const pointerDown = (e: PointerEvent) => {
      if (runtime.current.mode !== "play") return;
      drag.active = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const pointerMove = (e: PointerEvent) => {
      const w = runtime.current;
      if (w.mode !== "play" || w.locked || !drag.active) return;
      w.pose.yaw -= (e.clientX - drag.x) * 0.004;
      w.pose.pitch = Math.max(
        -1.3,
        Math.min(1.3, w.pose.pitch - (e.clientY - drag.y) * 0.004),
      );
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const pointerUp = () => (drag.active = false);
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    document.addEventListener("mousemove", move);
    document.addEventListener("pointerlockchange", lock);
    window.addEventListener("blur", blur);
    gl.domElement.addEventListener("pointerdown", pointerDown);
    gl.domElement.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("pointerlockchange", lock);
      window.removeEventListener("blur", blur);
      gl.domElement.removeEventListener("pointerdown", pointerDown);
      gl.domElement.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      runtime.current.input.clear();
      canvasRef.current = null;
    };
  }, [camera, gl, runtime, canvasRef]);
  useFrame((_, frameDelta) => {
    const w = runtime.current,
      s = callbacks.current.mission;
    const dt = Math.min(0.05, Math.max(0, frameDelta));
    const nextRegion = regionFor(s);
    if (nextRegion !== w.region) {
      const wasGround = w.region === "ground";
      w.region = nextRegion;
      if (wasGround || nextRegion === "ground")
        w.pose = { ...(nextRegion === "ground" ? groundSpawn : shipSpawn) };
      w.input.clear();
      callbacks.current.onRegion(nextRegion);
    }
    advanceWorld(w, s, dt);
    if (w.mode === "play") {
      w.pose.yaw +=
        ((w.input.has("ArrowLeft") ? 1 : 0) -
          (w.input.has("ArrowRight") ? 1 : 0)) *
        dt *
        1.5;
      w.pose.pitch = Math.max(
        -1.3,
        Math.min(
          1.3,
          w.pose.pitch +
            ((w.input.has("ArrowUp") ? 1 : 0) -
              (w.input.has("ArrowDown") ? 1 : 0)) *
              dt *
              1.1,
        ),
      );
      const jumping = w.input.has("Space");
      const before = w.pose;
      w.pose = movePlayer(
        w.pose,
        {
          forward:
            (w.input.has("KeyW") ? 1 : 0) - (w.input.has("KeyS") ? 1 : 0),
          right: (w.input.has("KeyD") ? 1 : 0) - (w.input.has("KeyA") ? 1 : 0),
          sprint: w.input.has("ShiftLeft") || w.input.has("ShiftRight"),
          jump: jumping && !jumpWasDown.current,
        },
        dt,
        collidersFor(w, s),
      );
      jumpWasDown.current = jumping;
      w.travel += Math.hypot(w.pose.x - before.x, w.pose.z - before.z);
      w.focused =
        findInteraction(w.pose, interactionsFor(w, s), collidersFor(w, s))
          ?.id ?? null;
    } else {
      w.input.clear();
      w.focused = null;
    }
    camera.position.set(w.pose.x, w.pose.y + EYE_HEIGHT, w.pose.z);
    camera.rotation.set(w.pose.pitch, w.pose.yaw, 0, "YXZ");
    publish.current += dt;
    if (publish.current > 0.1) {
      publish.current = 0;
      callbacks.current.onReadout({
        x: w.pose.x,
        y: w.pose.y,
        z: w.pose.z,
        yaw: w.pose.yaw,
        pitch: w.pose.pitch,
        focus: w.focused,
        door: w.door,
        rollout: w.rollout,
        locked: w.locked,
        distance: w.travel,
      });
    }
    w.lastSave += dt;
    if (w.lastSave > 3) {
      persistWorld(w);
      w.lastSave = 0;
    }
  });
  return null;
}
