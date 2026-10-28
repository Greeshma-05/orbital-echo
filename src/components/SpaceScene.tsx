import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../state/GameContext";
const vertex = `varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv; void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `uniform sampler2D earthMap; uniform float hasEarthMap; varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+1.5;a*=.5;}return v;}
float land(vec2 p,vec2 c,vec2 s){vec2 q=(p-c)/s;return 1.-dot(q,q);}
void main(){vec2 p=vUv;float n=fbm(p*35.);float continents=max(max(land(p,vec2(.28,.65),vec2(.12,.17)),land(p,vec2(.36,.34),vec2(.065,.20))),max(max(land(p,vec2(.55,.48),vec2(.085,.19)),land(p,vec2(.67,.70),vec2(.22,.13))),land(p,vec2(.83,.28),vec2(.085,.07))));
float l=smoothstep(.15,.3,continents+n*.9);float detail=fbm(p*160.);vec3 ocean=mix(vec3(.012,.045,.10),vec3(.025,.15,.25),n);vec3 ground=mix(vec3(.09,.15,.13),vec3(.29,.30,.23),detail);float desert=smoothstep(.48,.63,p.y)*(1.-smoothstep(.64,.72,p.y));ground=mix(ground,vec3(.4,.33,.23),desert*.65);vec3 color=mix(ocean,ground,l);if(hasEarthMap>.5)color=texture2D(earthMap,p).rgb;float cloud=fbm(p*vec2(110.,85.)+fbm(p*18.)*4.);float clouds=smoothstep(.56,.78,cloud)*.46;color=mix(color,vec3(.82,.87,.9),clouds);float polar=smoothstep(.91,.99,p.y)+1.-smoothstep(.01,.08,p.y);color=mix(color,vec3(.8,.89,.95),polar);vec3 norm=normalize(vNormal);float light=dot(norm,normalize(vec3(-.9,.6,1.)));color*=.09+max(0.,light)*1.18;float rim=pow(1.-max(0.,norm.z),3.);color+=vec3(.03,.29,.48)*rim*max(.12,light);gl_FragColor=vec4(color,1.);}`;
// Keep one local texture in memory across screen changes; failures retain procedural rendering.
let cachedEarth: THREE.Texture | null = null;
let loadingEarth: Promise<THREE.Texture> | null = null;
function Globe({ motion }: { motion: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(cachedEarth);
  useEffect(() => {
    let alive = true;
    if (!loadingEarth)
      loadingEarth = new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
          "/assets/earth-blue-marble.jpg",
          (value) => {
            cachedEarth = value;
            resolve(value);
          },
          undefined,
          reject,
        );
      });
    void loadingEarth
      .then((value) => {
        if (alive) setTexture(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const uniforms = useMemo(
    () => ({
      earthMap: { value: texture },
      hasEarthMap: { value: texture ? 1 : 0 },
    }),
    [texture],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current && motion) ref.current.rotation.y += dt * 0.012;
  });
  return (
    <group rotation={[0.12, 0, -0.22]}>
      <mesh ref={ref} rotation={[0, -1.3, 0]}>
        <sphereGeometry args={[1.6, 80, 64]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
        />
      </mesh>
      <mesh scale={1.018}>
        <sphereGeometry args={[1.6, 64, 48]} />
        <shaderMaterial
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={vertex}
          fragmentShader={`varying vec3 vNormal;void main(){float i=pow(1.-max(0.,normalize(vNormal).z),4.);gl_FragColor=vec4(.10,.48,.83,i*.48);}`}
        />
      </mesh>
    </group>
  );
}
function Stars({ low }: { low: boolean }) {
  const positions = useMemo(() => {
    const a = new Float32Array((low ? 400 : 1100) * 3);
    for (let i = 0; i < a.length; i += 3) {
      a[i] = Math.sin(i * 127.1) * 20;
      a[i + 1] = Math.sin(i * 311.7) * 13;
      a[i + 2] = -5 - Math.abs(Math.sin(i * 74.7)) * 12;
    }
    return a;
  }, [low]);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#bdd6e8"
        size={0.023}
        transparent
        opacity={0.65}
        sizeAttenuation
      />
    </points>
  );
}
function Ring({
  radius = 2,
  color = "#5bb9c2",
  opacity = 0.42,
  rotation = [1.05, 0.25, 0.2],
}: {
  radius?: number;
  color?: string;
  opacity?: number;
  rotation?: [number, number, number];
}) {
  const geom = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 180 }, (_, i) => {
          const a = (i / 179) * Math.PI * 2;
          return new THREE.Vector3(
            Math.cos(a) * radius,
            Math.sin(a) * radius,
            0,
          );
        }),
      ),
    [radius],
  );
  return (
    <group rotation={rotation}>
      <lineLoop geometry={geom}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineLoop>
    </group>
  );
}
function Spacecraft({
  motion,
  menu = false,
}: {
  motion: boolean;
  menu?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && motion) {
      const angle = clock.elapsedTime * 0.025 + (menu ? 2.15 : 0.55);
      ref.current.position.set(
        Math.cos(angle) * 2,
        Math.sin(angle) * (menu ? 1.2 : 0.6),
        Math.sin(angle) * 1.4,
      );
      ref.current.rotation.z = -0.3 + Math.sin(clock.elapsedTime * 0.1) * 0.05;
    }
  });
  return (
    <group
      ref={ref}
      position={menu ? [-1.1, 1.0, 1.2] : [1.7, 0.25, 1.2]}
      scale={menu ? 0.075 : 0.16}
      rotation={[0.4, 0.5, -0.3]}
    >
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.3, 1.6, 12]} />
        <meshStandardMaterial color="#c8d6d8" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-1, 1].map((x) => (
        <group key={x} position={[0, x * 0.85, 0]}>
          <mesh>
            <boxGeometry args={[1.4, 1.1, 0.04]} />
            <meshStandardMaterial
              color="#285876"
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          {[-0.4, 0, 0.4].map((v) => (
            <mesh key={v} position={[v, 0, 0.03]}>
              <boxGeometry args={[0.015, 1.1, 0.02]} />
              <meshBasicMaterial color="#97bec6" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.3, 0.5, 12]} />
        <meshStandardMaterial color="#e3e6e2" />
      </mesh>
    </group>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
function Fallback() {
  return (
    <div
      className="earth-fallback"
      role="img"
      aria-label="Earth and a circular orbital trajectory"
    >
      <div />
      <span>2D navigation display · all flight controls available</span>
    </div>
  );
}
let webgl: boolean | undefined;
function hasWebGL() {
  if (webgl !== undefined) return webgl;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}
export function SpaceScene({
  menu = false,
  zoom = 1,
  orbits = true,
}: {
  menu?: boolean;
  zoom?: number;
  orbits?: boolean;
}) {
  const { settings, mission } = useGame();
  const moving = settings.motion && !mission.paused;
  return (
    <div
      className={`space-scene ${menu ? "menu-scene" : ""}`}
      aria-label="Procedural Earth, spacecraft, and orbital paths"
    >
      {hasWebGL() ? (
        <SceneBoundary>
          <Suspense fallback={<Fallback />}>
            <Canvas
              key={`${zoom}-${settings.quality}`}
              dpr={settings.quality === "High" ? [1, 1.6] : 1}
              camera={{ position: [0, 0, menu ? 4.4 : 5.6 / zoom], fov: 42 }}
              gl={{ antialias: settings.quality === "High", alpha: true }}
              frameloop={moving ? "always" : "demand"}
            >
              <ambientLight intensity={1} />
              <directionalLight position={[-4, 4, 6]} intensity={3} />
              <Stars low={settings.quality === "Low"} />
              <group position={menu ? [0.55, -0.15, 0] : [0, 0, 0]}>
                <Globe motion={moving} />
                {orbits && (
                  <>
                    <Ring />
                    <Ring
                      radius={2.25}
                      opacity={0.16}
                      rotation={[1.1, -0.2, -0.6]}
                      color="#91a9bb"
                    />
                    <Ring
                      radius={2.1}
                      opacity={0.16}
                      rotation={[0.7, 0.4, 1.3]}
                      color="#91a9bb"
                    />
                  </>
                )}
                <Spacecraft motion={moving} menu={menu} />
              </group>
            </Canvas>
          </Suspense>
        </SceneBoundary>
      ) : (
        <Fallback />
      )}
    </div>
  );
}
