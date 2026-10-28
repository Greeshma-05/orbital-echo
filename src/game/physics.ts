/** World units are meters. Collision uses a vertical player capsule projected onto AABBs. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Collider {
  id: string;
  min: Vec3;
  max: Vec3;
}
export interface Pose extends Vec3 {
  yaw: number;
  pitch: number;
  vy: number;
  grounded: boolean;
}
export interface MoveInput {
  forward: number;
  right: number;
  sprint: boolean;
  jump: boolean;
}
export const EYE_HEIGHT = 1.68,
  PLAYER_HEIGHT = 1.82,
  PLAYER_RADIUS = 0.3;
export function box(
  id: string,
  position: [number, number, number],
  size: [number, number, number],
): Collider {
  return {
    id,
    min: {
      x: position[0] - size[0] / 2,
      y: position[1] - size[1] / 2,
      z: position[2] - size[2] / 2,
    },
    max: {
      x: position[0] + size[0] / 2,
      y: position[1] + size[1] / 2,
      z: position[2] + size[2] / 2,
    },
  };
}
export function bodyOverlaps(p: Vec3, c: Collider) {
  if (p.y >= c.max.y - 0.001 || p.y + PLAYER_HEIGHT <= c.min.y + 0.001)
    return false;
  const x = Math.max(c.min.x, Math.min(p.x, c.max.x)),
    z = Math.max(c.min.z, Math.min(p.z, c.max.z));
  return (p.x - x) ** 2 + (p.z - z) ** 2 < PLAYER_RADIUS ** 2 - 1e-8;
}
function moveAxis(
  p: Pose,
  delta: number,
  axis: "x" | "z",
  colliders: Collider[],
) {
  if (!delta) return;
  const start = p[axis];
  p[axis] += delta;
  if (colliders.some((c) => bodyOverlaps(p, c))) {
    let low = 0,
      high = 1;
    for (let i = 0; i < 12; i++) {
      const f = (low + high) / 2;
      p[axis] = start + delta * f;
      if (colliders.some((c) => bodyOverlaps(p, c))) high = f;
      else low = f;
    }
    p[axis] = start + delta * low;
  }
}
export function movePlayer(
  original: Pose,
  input: MoveInput,
  seconds: number,
  colliders: Collider[],
): Pose {
  const p = { ...original };
  const dt = Math.max(0, Math.min(seconds, 0.1));
  const count = Math.max(1, Math.ceil(dt / (1 / 120))),
    step = dt / count;
  const length = Math.hypot(input.forward, input.right) || 1;
  const speed = input.sprint ? 5.3 : 2.8;
  const forward = input.forward / Math.max(1, length),
    right = input.right / Math.max(1, length);
  const dx = (-Math.sin(p.yaw) * forward + Math.cos(p.yaw) * right) * speed;
  const dz = (-Math.cos(p.yaw) * forward - Math.sin(p.yaw) * right) * speed;
  if (input.jump && p.grounded) {
    p.vy = 4.6;
    p.grounded = false;
  }
  for (let i = 0; i < count; i++) {
    moveAxis(p, dx * step, "x", colliders);
    moveAxis(p, dz * step, "z", colliders);
    const oldY = p.y;
    p.vy -= 9.80665 * step;
    p.y += p.vy * step;
    p.grounded = false;
    for (const c of colliders) {
      if (!bodyOverlaps(p, c)) continue;
      if (p.vy < 0 && oldY >= c.max.y - 0.02) {
        p.y = c.max.y;
        p.vy = 0;
        p.grounded = true;
      } else if (p.vy > 0 && oldY + PLAYER_HEIGHT <= c.min.y + 0.02) {
        p.y = c.min.y - PLAYER_HEIGHT;
        p.vy = 0;
      } else {
        p.y = oldY;
        p.vy = 0;
      }
    }
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.grounded = true;
    }
  }
  return p;
}
export function direction(yaw: number, pitch: number): Vec3 {
  return {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
}
export interface Interaction {
  id: string;
  position: [number, number, number];
  label: string;
  radius?: number;
  range?: number;
}
export function rayBox(origin: Vec3, dir: Vec3, c: Collider) {
  let near = 0,
    far = Infinity;
  for (const axis of ["x", "y", "z"] as const) {
    if (Math.abs(dir[axis]) < 1e-9) {
      if (origin[axis] < c.min[axis] || origin[axis] > c.max[axis]) return null;
      continue;
    }
    let a = (c.min[axis] - origin[axis]) / dir[axis],
      b = (c.max[axis] - origin[axis]) / dir[axis];
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a);
    far = Math.min(far, b);
    if (near > far) return null;
  }
  return near;
}
export function findInteraction(
  p: Pose,
  items: Interaction[],
  colliders: Collider[],
): Interaction | null {
  const origin = { x: p.x, y: p.y + EYE_HEIGHT, z: p.z },
    dir = direction(p.yaw, p.pitch);
  let best: Interaction | null = null,
    nearest = Infinity;
  for (const item of items) {
    const v = {
        x: item.position[0] - origin.x,
        y: item.position[1] - origin.y,
        z: item.position[2] - origin.z,
      },
      distance = Math.hypot(v.x, v.y, v.z);
    if (distance > (item.range ?? 2.65) || distance < 0.05) continue;
    const projection = v.x * dir.x + v.y * dir.y + v.z * dir.z;
    const perpendicular = Math.sqrt(
      Math.max(0, distance ** 2 - projection ** 2),
    );
    if (
      projection <= 0 ||
      perpendicular > (item.radius ?? 0.48) ||
      projection < distance * 0.88
    )
      continue;
    const aim = { x: v.x / distance, y: v.y / distance, z: v.z / distance };
    const occluded = colliders.some((c) => {
      if (c.id === item.id) return false;
      const hit = rayBox(origin, aim, c);
      return hit !== null && hit < distance - 0.35;
    });
    if (!occluded && distance < nearest) {
      best = item;
      nearest = distance;
    }
  }
  return best;
}
