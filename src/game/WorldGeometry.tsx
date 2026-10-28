import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Globe } from "../components/SpaceScene";
import type { Mission, Settings } from "../simulation/types";
import {
  groundWalls,
  shipWalls,
  rocketPosition,
  type Solid,
  type WorldRuntime,
} from "./world";

export function Block({
  p,
  s,
  color = "#9ba9ad",
  metal = 0.15,
  rough = 0.65,
  emissive,
  opacity = 1,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color?: string;
  metal?: number;
  rough?: number;
  emissive?: string;
  opacity?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        metalness={metal}
        roughness={rough}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 2 : 0}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
export function Sign({
  p,
  size = [2, 0.5],
  text,
  sub = "",
  color = "#d9eef1",
  background = "#10232d",
  rotation = 0,
}: {
  p: [number, number, number];
  size?: [number, number];
  text: string;
  sub?: string;
  color?: string;
  background?: string;
  rotation?: number;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = Math.round((1024 * size[1]) / size[0]);
    const x = c.getContext("2d")!;
    x.fillStyle = background;
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = color;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = `600 ${Math.min(c.height * (sub ? 0.3 : 0.45), text.length > 28 ? 46 : text.length > 18 ? 58 : 75)}px Arial`;
    x.fillText(text, 512, c.height * (sub ? 0.38 : 0.5), 960);
    if (sub) {
      x.font = `${Math.min(28, c.height * 0.16)}px monospace`;
      x.fillStyle = color;
      x.globalAlpha = 0.65;
      x.fillText(sub, 512, c.height * 0.73, 930);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [text, sub, color, background, size[0], size[1]]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={p} rotation={[0, rotation, 0]}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
function Floor({
  p,
  s,
  color = "#48545b",
}: {
  p: [number, number, number];
  s: [number, number];
  color?: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext("2d")!;
    c.fillStyle = color;
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = "#1d2a3166";
    c.lineWidth = 3;
    c.strokeRect(1, 1, 254, 254);
    for (let i = 0; i < 1200; i++) {
      c.fillStyle = i % 2 ? "#ffffff08" : "#00000009";
      c.fillRect((i * 73) % 256, (i * 197) % 256, 1, 1);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(s[0] / 2, s[1] / 2);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [s[0], s[1], color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={s} />
      <meshStandardMaterial map={texture} roughness={0.68} metalness={0.18} />
    </mesh>
  );
}
function Wall({ wall, ship = false }: { wall: Solid; ship?: boolean }) {
  if (wall.color === "glass")
    return (
      <Block
        p={wall.p}
        s={wall.s}
        color="#85cad9"
        metal={0.5}
        rough={0.08}
        opacity={0.12}
      />
    );
  const large = wall.s[1] > 10;
  return (
    <group>
      <Block
        p={wall.p}
        s={wall.s}
        color={large ? "#637782" : ship ? "#677c86" : "#9daaad"}
      />
      {!large && (
        <Block
          p={[wall.p[0], 0.15, wall.p[2]]}
          s={[wall.s[0] + 0.01, 0.3, wall.s[2] + 0.01]}
          color="#253641"
        />
      )}
    </group>
  );
}
function CeilingLight({
  p,
  length = 2,
}: {
  p: [number, number, number];
  length?: number;
}) {
  return (
    <group>
      <Block
        p={p}
        s={[length, 0.08, 0.13]}
        color="#f2f7e9"
        emissive="#c7e5e6"
      />
      <Block
        p={[p[0], p[1] + 0.04, p[2]]}
        s={[length + 0.2, 0.12, 0.3]}
        color="#253640"
      />
    </group>
  );
}
export function Console({
  p,
  title,
  readout,
  accent = "#77ddd3",
  width = 2.5,
  rotation = 0,
}: {
  p: [number, number, number];
  title: string;
  readout: string;
  accent?: string;
  width?: number;
  rotation?: number;
}) {
  return (
    <group position={p} rotation={[0, rotation, 0]}>
      <Block
        p={[0, 0.55, 0]}
        s={[width, 1.1, 1.2]}
        color="#273b46"
        metal={0.55}
      />
      <Block
        p={[0, 1.14, 0.1]}
        s={[width + 0.1, 0.12, 1.3]}
        color="#607b86"
        metal={0.5}
      />
      <Block
        p={[0, 1.68, -0.36]}
        s={[width * 0.85, 0.85, 0.12]}
        color="#09151e"
      />
      <Sign
        p={[0, 1.7, -0.285]}
        size={[width * 0.78, 0.68]}
        text={title}
        sub={readout}
        color={accent}
      />
      {[-0.28, 0, 0.28].map((x, i) => (
        <mesh
          key={x}
          position={[x * width, 1.24, 0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.065, 0.065, 0.03, 12]} />
          <meshStandardMaterial
            color={i === 2 ? "#dba76e" : accent}
            emissive={i === 2 ? "#8d5123" : accent}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      <Block
        p={[0, 0.25, 0.605]}
        s={[width * 0.7, 0.06, 0.015]}
        color={accent}
        emissive={accent}
      />
    </group>
  );
}
function FlightSuit({ equipped = false }: { equipped?: boolean }) {
  return (
    <group position={[3.9, 0, 13.7]} rotation={[0, Math.PI / 2, 0]}>
      <Block p={[0, 1.3, 0]} s={[1.5, 2.6, 1.1]} color="#28404c" />
      <Block p={[0, 1.38, 0.56]} s={[1.25, 2.05, 0.03]} color="#0b1720" />
      <Sign
        p={[0, 2.4, 0.58]}
        size={[1.2, 0.22]}
        text={equipped ? "SUIT CHECK · COMPLETE" : "EVA / FLIGHT SUIT"}
        color={equipped ? "#86e4b9" : "#f4d29d"}
      />
      {!equipped && (
        <group position={[0, 0, 0.65]}>
          <mesh position={[0, 1.96, 0]}>
            <sphereGeometry args={[0.23, 20, 16]} />
            <meshStandardMaterial color="#dce5df" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.98, 0.13]} scale={[1, 0.65, 0.55]}>
            <sphereGeometry args={[0.21, 20, 12]} />
            <meshStandardMaterial
              color="#233d48"
              metalness={0.9}
              roughness={0.12}
            />
          </mesh>
          <Block p={[0, 1.5, 0]} s={[0.46, 0.6, 0.3]} color="#d5ddd7" />
          <Block p={[0, 1.5, 0.17]} s={[0.28, 0.26, 0.04]} color="#426b76" />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Block
                p={[side * 0.33, 1.47, 0]}
                s={[0.16, 0.66, 0.19]}
                color="#cdd9d6"
              />
              <Block
                p={[side * 0.14, 0.94, 0]}
                s={[0.2, 0.54, 0.23]}
                color="#b4c6c6"
              />
              <Block
                p={[side * 0.14, 0.63, 0.05]}
                s={[0.22, 0.15, 0.34]}
                color="#2a414b"
              />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}
function PrepDoor({ runtime }: { runtime: MutableRefObject<WorldRuntime> }) {
  const door = useRef<THREE.Group>(null);
  useFrame(() => {
    if (door.current) door.current.position.x = runtime.current.door * 2.6;
  });
  return (
    <group>
      <Block p={[-1.3, 1.6, 8]} s={[0.18, 3.2, 0.55]} color="#1f333e" />
      <Block p={[1.3, 1.6, 8]} s={[0.18, 3.2, 0.55]} color="#1f333e" />
      <Block p={[0, 3.15, 8]} s={[2.8, 0.18, 0.55]} color="#1f333e" />
      <group ref={door}>
        <Block p={[0, 0.56, 8]} s={[2.4, 1.12, 0.28]} color="#3f5865" />
        <Block p={[0, 2.7, 8]} s={[2.4, 0.8, 0.28]} color="#3f5865" />
        <Block p={[-0.95, 1.7, 8]} s={[0.5, 1.2, 0.28]} color="#3f5865" />
        <Block p={[0.95, 1.7, 8]} s={[0.5, 1.2, 0.28]} color="#3f5865" />
        <Block
          p={[0, 1.7, 8]}
          s={[1.4, 1.2, 0.07]}
          color="#a8d5da"
          opacity={0.17}
        />
        <Block
          p={[0.8, 1.4, 8.18]}
          s={[0.11, 0.42, 0.12]}
          color="#e6c28b"
          metal={0.7}
        />
        <Sign
          p={[0, 2.65, 8.16]}
          size={[1.8, 0.42]}
          text="HANGAR 01"
          sub="PRESS E · ACCESS CONTROL"
        />
        <Sign
          p={[0, 2.65, 7.84]}
          size={[1.8, 0.42]}
          text="CREW PREPARATION"
          rotation={Math.PI}
        />
      </group>
      <Sign
        p={[0, 3.65, 8.2]}
        size={[2.3, 0.35]}
        text="↑ VEHICLE ASSEMBLY"
        color="#aee9df"
      />
    </group>
  );
}
function RocketModel({
  mission: s,
  runtime,
}: {
  mission: Mission;
  runtime: MutableRefObject<WorldRuntime>;
}) {
  const rocket = useRef<THREE.Group>(null),
    flame = useRef<THREE.Group>(null),
    smoke = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    if (rocket.current) {
      rocket.current.position.z = rocketPosition(runtime.current);
      rocket.current.position.y = THREE.MathUtils.damp(
        rocket.current.position.y,
        s.launch.phase === "ascent" ? s.launch.altitude : 0,
        8,
        dt,
      );
    }
    if (flame.current && !s.paused)
      flame.current.scale.set(
        1 + Math.sin(clock.elapsedTime * 38) * 0.08,
        1 + Math.sin(clock.elapsedTime * 24) * 0.14,
        1,
      );
    if (smoke.current && !s.paused) {
      for (let i = 0; i < 24; i++) {
        const progress = (clock.elapsedTime * 0.5 + i / 24) % 1;
        dummy.position.set(
          Math.cos(i * 2.4) * progress * 9,
          progress * 2 - 0.2,
          rocketPosition(runtime.current) + Math.sin(i * 2.4) * progress * 8,
        );
        dummy.scale.setScalar(0.25 + progress * 2.3);
        dummy.updateMatrix();
        smoke.current.setMatrixAt(i, dummy.matrix);
      }
      smoke.current.instanceMatrix.needsUpdate = true;
    }
  });
  const flying = s.launch.phase === "ascent";
  return (
    <>
      <group ref={rocket} position={[0, 0, rocketPosition(runtime.current)]}>
        <group>
          <mesh position={[0, 8.5, 0]} castShadow>
            <cylinderGeometry args={[1.28, 1.35, 14, 32]} />
            <meshStandardMaterial
              color="#d4ddd9"
              roughness={0.38}
              metalness={0.35}
            />
          </mesh>
          <mesh position={[0, 17, 0]} castShadow>
            <coneGeometry args={[1.28, 3, 32]} />
            <meshStandardMaterial
              color="#f0eee5"
              roughness={0.3}
              metalness={0.35}
            />
          </mesh>
          {[2, 9.2, 14.7].map((y) => (
            <mesh position={[0, y, 0]} key={y}>
              <cylinderGeometry args={[1.3, 1.36, 0.6, 32]} />
              <meshStandardMaterial color="#173540" metalness={0.65} />
            </mesh>
          ))}
          <Sign
            p={[0, 11.5, 1.29]}
            size={[1.5, 0.38]}
            text="ASTRA"
            background="#d4ddd9"
            color="#233d49"
          />
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => (
            <group key={a} rotation={[0, a, 0]}>
              <mesh position={[0, 2.5, 1.2]} rotation={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.13, 3, 2]} />
                <meshStandardMaterial color="#587985" metalness={0.6} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.85, 1.15, 1.4, 24]} />
            <meshStandardMaterial
              color="#3a4c55"
              metalness={0.85}
              roughness={0.35}
            />
          </mesh>
          {s.rocket.boosters > 0 &&
            Array.from(
              { length: s.rocket.boosters },
              (_, i) => (i * Math.PI * 2) / s.rocket.boosters,
            ).map((a) => (
              <mesh
                key={a}
                position={[Math.cos(a) * 1.9, 5, Math.sin(a) * 1.9]}
              >
                <cylinderGeometry args={[0.5, 0.55, 9, 20]} />
                <meshStandardMaterial color="#c1d0d0" metalness={0.4} />
              </mesh>
            ))}
          {flying && !s.launch.staging && (
            <group ref={flame}>
              <mesh position={[0, -3, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[1.1, 7, 24]} />
                <meshBasicMaterial
                  color="#ffbd6c"
                  transparent
                  opacity={0.6}
                  depthWrite={false}
                />
              </mesh>
              <mesh position={[0, -1.8, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.7, 4.4, 24]} />
                <meshBasicMaterial color="#c9f8ff" />
              </mesh>
              <pointLight
                position={[0, -1, 0]}
                intensity={150}
                distance={30}
                color="#ffbb73"
              />
            </group>
          )}
        </group>
      </group>
      {flying && s.launch.altitude < 200 && (
        <instancedMesh
          ref={smoke}
          args={[undefined, undefined, 24]}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial
            color="#ccd1c9"
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </>
  );
}
function BayDoors({ runtime }: { runtime: MutableRefObject<WorldRuntime> }) {
  const left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null);
  useFrame(() => {
    const shift = runtime.current.rolloutRequested
      ? Math.min(1, runtime.current.rollout * 5) * 3
      : 0;
    if (left.current) left.current.position.x = -shift;
    if (right.current) right.current.position.x = shift;
  });
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} ref={side === -1 ? left : right}>
          <Block p={[side * 1.5, 11, -20]} s={[3, 22, 0.3]} color="#344e5c" />
          {Array.from({ length: 12 }, (_, i) => (
            <Block
              key={i}
              p={[side * 1.5, i * 1.8 + 0.4, -19.8]}
              s={[2.95, 0.08, 0.12]}
              color="#617d87"
            />
          ))}
        </group>
      ))}
    </>
  );
}
function Crate({
  p,
  s = [1.7, 1.2, 1.6],
}: {
  p: [number, number, number];
  s?: [number, number, number];
}) {
  return (
    <group>
      <Block p={p} s={s} color="#697267" metal={0.2} />
      {[-0.35, 0.35].map((x) => (
        <Block
          key={x}
          p={[p[0] + x * s[0], p[1], p[2]]}
          s={[0.1, s[1] + 0.02, s[2] + 0.02]}
          color="#263e47"
        />
      ))}
      <Sign
        p={[p[0], p[1], p[2] + s[2] / 2 + 0.01]}
        size={[s[0] * 0.6, 0.25]}
        text="ASTRA / CARGO"
        background="#49564c"
        color="#c8d2bb"
      />
    </group>
  );
}
export function GroundWorld({
  mission: s,
  runtime,
}: {
  mission: Mission;
  runtime: MutableRefObject<WorldRuntime>;
}) {
  return (
    <group>
      <Floor p={[0, -0.015, -15]} s={[110, 110]} color="#65716b" />
      <Floor p={[0, 0.005, 13]} s={[10, 10]} color="#607078" />
      <Floor p={[0, 0.01, 5.5]} s={[4, 5]} color="#415762" />
      <Floor p={[0, 0.015, -8.5]} s={[18, 23]} color="#4b6068" />
      <Floor p={[-13.5, 0.01, -6.5]} s={[9, 13]} color="#455b65" />
      {groundWalls.map((w) => (
        <Wall wall={w} key={w.id} />
      ))}
      <Block p={[0, 4.1, 13]} s={[10.5, 0.25, 10.5]} color="#758a92" />
      <Block p={[0, 3.7, 5.5]} s={[4.3, 0.2, 5.2]} color="#536a77" />
      <Block p={[-13.5, 4.15, -6.5]} s={[9.3, 0.25, 13.3]} color="#687e88" />
      <Block p={[0, 22.2, -8.5]} s={[18.5, 0.4, 23.5]} color="#526b78" />
      <PrepDoor runtime={runtime} />
      <FlightSuit equipped={runtime.current.suited} />
      {[-4.45].flatMap((x) =>
        [12.2, 14.1].map((z) => (
          <group key={z}>
            <Block p={[x, 1.3, z]} s={[0.7, 2.6, 1.3]} color="#304b59" />
            <Block
              p={[x + 0.36, 1.3, z]}
              s={[0.03, 2.4, 1.15]}
              color="#507080"
            />
            <Block
              p={[x + 0.4, 1.35, z + 0.4]}
              s={[0.05, 0.3, 0.04]}
              color="#b7c6c7"
            />
            <Sign
              p={[x + 0.41, 2.15, z]}
              size={[0.7, 0.2]}
              rotation={Math.PI / 2}
              text={z < 13 ? "REYES / 01" : "CHEN / 02"}
            />
          </group>
        )),
      )}
      <Block p={[-2.5, 0.38, 16]} s={[3.6, 0.16, 0.7]} color="#293d48" />
      {[-3.9, -1.1].map((x) => (
        <Block
          p={[x, 0.18, 16]}
          s={[0.15, 0.35, 0.5]}
          key={x}
          color="#899b9f"
        />
      ))}
      <Sign
        p={[0, 2.8, 17.82]}
        size={[5, 1.1]}
        rotation={Math.PI}
        text="ASTRA INITIATIVE"
        sub="CREW PREPARATION / KENNEDY LAUNCH COMPLEX"
      />
      <Sign
        p={[4.8, 2.7, 11]}
        rotation={-Math.PI / 2}
        size={[2.5, 0.65]}
        text="01 / SUIT UP"
        sub="EQUIP · INSPECT · LAUNCH"
        color="#d5ba84"
      />
      {[10.5, 15.5].map((z) => (
        <CeilingLight key={z} p={[0, 3.8, z]} length={3} />
      ))}
      <CeilingLight p={[0, 3.45, 5.5]} length={2.5} />
      <pointLight
        position={[0, 3.2, 12]}
        color="#c6e3e8"
        intensity={32}
        distance={12}
        decay={1.5}
      />
      <pointLight
        position={[0, 3.1, 5]}
        color="#bddde7"
        intensity={14}
        distance={8}
      />
      <Console
        p={[-3.6, 0, -3.2]}
        width={1.7}
        title="VEHICLE INSPECTION"
        readout={
          s.launch.checked
            ? "PREFLIGHT / VERIFIED"
            : "A-7 SENSOR / CHECK REQUIRED"
        }
        accent={s.launch.checked ? "#87e3b7" : "#ecc083"}
      />
      <Crate p={[6, 0.6, -3]} />
      <Crate p={[6.5, 0.5, -14]} s={[1.7, 1, 2]} />
      <Crate p={[-6.7, 0.6, -15]} />
      {[-7.8, 7.8].flatMap((x) =>
        [-2, -9, -16].map((z) => (
          <group key={`${x}${z}`}>
            <Block p={[x, 10.5, z]} s={[0.35, 21, 0.4]} color="#203c4d" />
            <Block p={[0, 21, z]} s={[16, 0.4, 0.4]} color="#2d4655" />
            <CeilingLight p={[0, 20.7, z]} length={7} />
          </group>
        )),
      )}
      {[-2.4, 2.4].map((x) => (
        <Block
          key={x}
          p={[x, 0.035, -28.5]}
          s={[0.09, 0.04, 53]}
          color="#b4aa75"
          metal={0.6}
        />
      ))}
      {[-7.4, 7.4].map((x) => (
        <Block key={x} p={[x, 0.04, -8]} s={[0.09, 0.02, 20]} color="#e4ba65" />
      ))}
      <Sign
        p={[8.76, 4, -8]}
        rotation={-Math.PI / 2}
        size={[7, 1.6]}
        text="ASTRA / HEAVY LIFT"
        sub="OE—01   •   VEHICLE ASSEMBLY BUILDING"
        background="#344f5e"
        color="#d7e6e5"
      />
      <Sign
        p={[-8.76, 3, -6]}
        rotation={Math.PI / 2}
        size={[3.5, 0.7]}
        text="← LAUNCH CONTROL"
        color="#9ce5d7"
      />
      <pointLight
        position={[0, 14, -8]}
        intensity={160}
        distance={32}
        decay={1.5}
        color="#d4e5e5"
      />
      <Block
        p={[-13, 0.65, -10.4]}
        s={[7, 1.3, 1.3]}
        color="#203c49"
        metal={0.5}
      />
      <Block
        p={[-13, 1.32, -10.3]}
        s={[7.1, 0.1, 1.4]}
        color="#78919b"
        metal={0.6}
      />
      {[-15.2, -13, -10.8].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 1.44, -9.65]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.16, 0.11, 20]} />
            <meshStandardMaterial
              color={i === 1 ? "#e0a56a" : i === 0 ? "#75c5be" : "#c8d2cc"}
              emissive={i === 1 ? "#e69744" : "#65998d"}
              emissiveIntensity={0.55}
            />
          </mesh>
          <Sign
            p={[x, 1.7, -10.7]}
            size={[1.8, 0.45]}
            text={
              i === 0
                ? "01 / ROLLOUT"
                : i === 1
                  ? s.launch.phase === "countdown"
                    ? `T − ${Math.ceil(s.launch.countdown)}`
                    : s.launch.phase === "ascent"
                      ? "LIFTOFF"
                      : "02 / LAUNCH"
                  : "03 / HOLD"
            }
            sub={
              i === 0
                ? "BAY DOORS + TRANSPORT"
                : i === 1
                  ? "ARM / ABORT"
                  : "COUNTDOWN SAFETY"
            }
            color={i === 1 ? "#f0c289" : "#a2e4e0"}
          />
        </group>
      ))}
      <Sign
        p={[-13.5, 3.4, -12.8]}
        size={[5.5, 0.55]}
        text="ASTRA LAUNCH CONTROL"
        sub="PAD 39 / DIRECT VISUAL"
      />
      {[-17.8, -14.8, -11.8, -9.2].map((x) => (
        <Block
          key={x}
          p={[x, 2.2, -12.94]}
          s={[0.12, 2.8, 0.2]}
          color="#1d3a48"
        />
      ))}
      <Console
        p={[-16, 0, -2]}
        title="MISSION TRANSMISSIONS"
        readout="FLIGHT DIRECTOR / OE—01"
      />
      <CeilingLight p={[-13.5, 3.85, -6]} length={4} />
      <pointLight
        position={[-13, 3.4, -7]}
        intensity={35}
        color="#b6dbe5"
        distance={15}
        decay={1.4}
      />
      <BayDoors runtime={runtime} />
      <RocketModel mission={s} runtime={runtime} />
      <mesh
        position={[0, 0.02, -48]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[8, 48]} />
        <meshStandardMaterial color="#3b5057" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.04, -48]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.5, 6.6, 64]} />
        <meshStandardMaterial color="#d3bb79" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block p={[side * 4.7, 12, -51]} s={[0.5, 24, 0.5]} color="#324f5e" />
          {Array.from({ length: 8 }, (_, i) => (
            <Block
              key={i}
              p={[side * 4.7, i * 3 + 1, -51]}
              s={[0.8, 0.2, 3]}
              color="#647e87"
            />
          ))}
        </group>
      ))}
      <Block p={[0, 22, -51]} s={[10, 0.5, 0.5]} color="#344e5b" />
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 17, 2.5, -49]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[2.5, 2.5, 8, 24]} />
          <meshStandardMaterial
            color="#bfc7bd"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
      ))}
      {[-50, -30, 30, 50].map((x, i) => (
        <mesh key={x} position={[x, -4, -70 - i * 8]}>
          <coneGeometry args={[18, 22 + i * 3, 5]} />
          <meshStandardMaterial color="#76827b" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
function LifeModule({ mission: s }: { mission: Mission }) {
  const fan = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (fan.current && !s.paused)
      fan.current.rotation.x += dt * (s.life.fault ? 0.3 : 3);
  });
  return (
    <group position={[-5.1, 0, 12.5]} rotation={[0, Math.PI / 2, 0]}>
      <Block p={[0, 1.3, 0]} s={[2.2, 2.6, 1.5]} color="#304b58" />
      <Sign
        p={[0, 2.35, 0.77]}
        size={[1.9, 0.35]}
        text="ENVIRONMENTAL CONTROL"
        color={s.life.fault ? "#f6a08b" : "#b1e7d8"}
      />
      <Sign
        p={[0, 1.92, 0.77]}
        size={[1.7, 0.3]}
        text={`${s.life.co2.toFixed(0)} PPM / ${s.life.pressure.toFixed(1)} KPA`}
        color={s.life.fault ? "#f6a08b" : "#b1e7d8"}
      />
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.9, 0.79]}>
          <cylinderGeometry args={[0.17, 0.17, 1.2, 20]} />
          <meshStandardMaterial color="#6e9fa6" metalness={0.7} />
        </mesh>
      ))}
      <group
        ref={fan}
        position={[0, 1.05, 0.83]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        {[0, Math.PI / 2].map((a) => (
          <mesh key={a} rotation={[0, a, 0]}>
            <boxGeometry args={[0.8, 0.06, 0.12]} />
            <meshStandardMaterial
              color={s.life.fault ? "#dd9a72" : "#8bd0b9"}
              metalness={0.5}
            />
          </mesh>
        ))}
      </group>
      <Block
        p={[0, 0.25, 0.78]}
        s={[1.9, 0.05, 0.03]}
        color={s.life.fault ? "#ef8873" : "#7de1ba"}
        emissive={s.life.fault ? "#ed6b52" : "#5ba98e"}
      />
    </group>
  );
}
function SpaceBackdrop({
  mission: s,
  settings,
}: {
  mission: Mission;
  settings: Settings;
}) {
  const points = useMemo(() => {
    const a = new Float32Array((settings.quality === "Low" ? 700 : 1800) * 3);
    for (let i = 0; i < a.length; i += 3) {
      const theta = i * 2.399,
        lat = Math.asin(Math.sin(i * 127.13));
      a[i] = Math.cos(theta) * Math.cos(lat) * 450;
      a[i + 1] = Math.sin(lat) * 450;
      a[i + 2] = Math.sin(theta) * Math.cos(lat) * 450;
    }
    return a;
  }, [settings.quality]);
  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d4e6f4" size={0.4} sizeAttenuation />
      </points>
      <group position={[25, -45, -125]} scale={48}>
        <Globe motion={settings.motion && !s.paused} />
      </group>
      {s.launch.stage > 0 && (
        <group position={[9, -3, -18]} rotation={[0.8, 0.4, 0.6]}>
          <mesh>
            <cylinderGeometry args={[0.8, 0.8, 9, 20]} />
            <meshStandardMaterial color="#889eaa" metalness={0.5} />
          </mesh>
          <mesh position={[0, -4.5, 0]}>
            <coneGeometry args={[0.9, 1, 16]} />
            <meshStandardMaterial color="#364f5b" />
          </mesh>
        </group>
      )}
    </>
  );
}
export function ShipWorld({
  mission: s,
  settings,
}: {
  mission: Mission;
  settings: Settings;
}) {
  const phase = s.launch.phase;
  return (
    <group>
      <SpaceBackdrop mission={s} settings={settings} />
      <Floor p={[0, 0, -1]} s={[10, 14]} color="#435864" />
      <Floor p={[0, 0, 8]} s={[3.2, 4]} color="#3c5360" />
      <Floor p={[0, 0, 17.5]} s={[12, 15]} color="#4e626c" />
      {shipWalls.map((w) => (
        <Wall key={w.id} wall={w} ship />
      ))}
      <Block p={[0, 3.9, -1]} s={[10.3, 0.25, 14.2]} color="#536d7b" />
      <Block p={[0, 3.7, 8]} s={[3.5, 0.2, 4.2]} color="#536d7b" />
      <Block p={[0, 3.9, 17.5]} s={[12.3, 0.2, 15.2]} color="#536d7b" />
      {[-4.8, -2.5, 2.5, 4.8].map((x) => (
        <Block key={x} p={[x, 2, -7.92]} s={[0.15, 3.4, 0.2]} color="#1b3547" />
      ))}
      <Block p={[0, 3.55, -7.92]} s={[10, 0.2, 0.25]} color="#1b3547" />
      <Console
        p={[-2.8, 0, -5.6]}
        title="NAVIGATION"
        readout={`${(s.orbit.altitude / 1000).toFixed(0)} KM / ${s.resources.fuel.toFixed(0)} M/S RESERVE`}
      />
      <Console
        p={[2.8, 0, -5.6]}
        title={s.launch.staging ? "STAGE SEPARATION" : "FLIGHT GUIDANCE"}
        readout={
          s.launch.staging
            ? "E / SEPARATE SPENT STAGE"
            : `${(s.launch.altitude / 1000).toFixed(1)} KM / ${s.launch.velocity.toFixed(0)} M/S`
        }
        accent={s.launch.staging ? "#ffd08e" : "#91dedf"}
      />
      <Sign
        p={[0, 3.12, -7.8]}
        size={[3.8, 0.42]}
        text={
          phase === "orbit"
            ? "ASTRA / ORBITAL FLIGHT DECK"
            : "ASTRA / ASCENT GUIDANCE"
        }
        color="#8ed2d8"
      />
      <Block p={[0, 0.5, 3.8]} s={[1.2, 0.5, 1.2]} color="#233744" />
      <Block p={[0, 1.15, 4.32]} s={[1.2, 1.4, 0.2]} color="#304d5b" />
      {[0, 4, 8, 12, 17, 22].map((z) => (
        <group key={z}>
          <CeilingLight
            p={[0, z === 8 ? 3.5 : 3.7, z]}
            length={z === 8 ? 2 : 3}
          />
          {z !== 8 && (
            <pointLight
              position={[0, 3.2, z]}
              intensity={z === 0 ? 24 : 18}
              color={s.life.fault && z > 10 ? "#ed8c76" : "#a7d5e5"}
              distance={10}
              decay={1.5}
            />
          )}
        </group>
      ))}
      {[-4.75, 4.75].flatMap((x) =>
        [-3, 1, 4].map((z) => (
          <Block
            key={`${x}${z}`}
            p={[x, 1.9, z]}
            s={[0.18, 3.8, 0.15]}
            color="#213d4b"
          />
        )),
      )}
      <Sign
        p={[0, 3.18, 5.8]}
        size={[2.5, 0.4]}
        text="HABITAT / SCIENCE →"
        color="#bed9d9"
      />
      <LifeModule mission={s} />
      <group position={[5.2, 0, 12.4]} rotation={[0, -Math.PI / 2, 0]}>
        <Block p={[0, 1.3, 0]} s={[2, 2.6, 1.3]} color="#39515d" />
        <Sign
          p={[0, 2.25, 0.67]}
          size={[1.8, 0.4]}
          text="HUBBLE SERVICE LINK"
          color={s.telescope.repaired ? "#8fe1b3" : "#e3b67b"}
        />
        <Sign
          p={[0, 1.65, 0.67]}
          size={[1.6, 0.6]}
          text={s.telescope.repaired ? "POINTING / ONLINE" : "ACTUATOR / FAULT"}
          sub={
            s.orbit.rendezvous
              ? "DOCKING UMBILICAL CONNECTED"
              : "RENDEZVOUS REQUIRED"
          }
        />
        {[-0.6, 0, 0.6].map((x) => (
          <Block
            key={x}
            p={[x, 0.8, 0.7]}
            s={[0.3, 0.7, 0.12]}
            color={s.telescope.repaired ? "#78bca4" : "#b3865f"}
            metal={0.6}
          />
        ))}
      </group>
      <Console
        p={[4.7, 0, 18.5]}
        rotation={-Math.PI / 2}
        title="ECHO OBSERVATORY"
        readout={
          s.telescope.active
            ? "ACQUIRING PHOTONS"
            : `${s.telescope.observations.length} DATASETS / ${s.telescope.condition.toFixed(0)}% OPTICS`
        }
      />
      <group position={[-5.72, 1.65, 18.5]} rotation={[0, Math.PI / 2, 0]}>
        <Block p={[0, 0, -0.08]} s={[3.8, 2.2, 0.16]} color="#172e3b" />
        <Sign
          p={[0, 0.75, 0.02]}
          size={[3.4, 0.35]}
          text="ECHO / INVESTIGATION"
          color="#b0d8d8"
        />
        {[-1.15, 0, 1.15].map((x, i) => (
          <group key={x}>
            <Sign
              p={[x, -0.05, 0.02]}
              size={[0.95, 0.65]}
              text={["01 / SIGNAL", "02 / CONTROL", "03 / EVIDENCE"][i]}
              sub={
                s.telescope.observations.length > i
                  ? "DATA AVAILABLE"
                  : "AWAITING DATA"
              }
              color={
                s.telescope.observations.length > i ? "#9ce9c2" : "#779ba9"
              }
            />
            <Block
              p={[x, -0.55, 0.03]}
              s={[0.8, 0.025, 0.015]}
              color="#dfbd80"
              emissive="#ad854f"
            />
          </group>
        ))}
      </group>
      <Block p={[3, 0.5, 23.5]} s={[3.4, 1, 1.6]} color="#314959" />
      <Block p={[3, 1.03, 23.5]} s={[3.2, 0.12, 1.4]} color="#83999c" />
      <Block p={[4.15, 1.14, 23.5]} s={[0.65, 0.2, 1.1]} color="#b1c4c6" />
      <Sign
        p={[3, 2.4, 24.8]}
        rotation={Math.PI}
        size={[3, 0.45]}
        text="CREW REST / MAYA CHEN"
        color="#c5dccf"
      />
      <Console
        p={[-3.8, 0, 23.5]}
        rotation={Math.PI}
        title="CREW OPERATIONS"
        readout={`${s.crew.filter((c) => c.task === "Rest").length} RESTING / ${s.resources.oxygen.toFixed(0)}% OXYGEN`}
        width={2.8}
      />
      {[-5.7, 5.7].map((x) => (
        <Block
          key={x}
          p={[x, 0.15, 17.5]}
          s={[0.03, 0.04, 14]}
          color={s.life.fault ? "#ef8b74" : "#83c8ce"}
          emissive={s.life.fault ? "#b34b3d" : "#4e98a5"}
        />
      ))}
    </group>
  );
}
export function Environment({ ground }: { ground: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(ground ? "#9aaeb0" : "#020710");
    scene.fog = ground
      ? new THREE.Fog("#9aaeb0", 45, 160)
      : new THREE.Fog("#020710", 200, 500);
    return () => {
      scene.fog = null;
    };
  }, [ground, scene]);
  return (
    <>
      <ambientLight intensity={ground ? 0.6 : 0.55} />
      <hemisphereLight
        args={
          ground ? ["#c9e6eb", "#7f7764", 1.1] : ["#c1d9ea", "#263747", 1.1]
        }
      />
      <directionalLight
        position={ground ? [-20, 32, -35] : [-30, 25, -80]}
        intensity={ground ? 2.6 : 2.2}
        color={ground ? "#ffe1b3" : "#beddeb"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-far={120}
        shadow-bias={-0.0003}
      />
    </>
  );
}
