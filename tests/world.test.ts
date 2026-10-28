import { describe, it, expect } from "vitest";
import {
  box,
  movePlayer,
  findInteraction,
  type Pose,
} from "../src/game/physics";
import {
  groundWalls,
  shipWalls,
  shipEquipment,
  groundEquipment,
  groundSpawn,
  collidersFor,
  makeRuntime,
  advanceWorld,
} from "../src/game/world";
import { newMission } from "../src/data/mission";
import { reduceMission, advanceTime } from "../src/simulation/engine";
const idle = { forward: 0, right: 0, sprint: false, jump: false };
function walk(
  p: Pose,
  seconds: number,
  hz: number,
  blocks = groundWalls.map((b) => box(b.id, b.p, b.s)),
  input = { ...idle, forward: 1 },
) {
  for (let i = 0; i < seconds * hz; i++)
    p = movePlayer(p, input, 1 / hz, blocks);
  return p;
}
describe("first-person physics and physical interactions", () => {
  it("moves at the same speed across frame rates, with normalized diagonals and sprint", () => {
    const a = walk({ ...groundSpawn }, 1, 30, []),
      b = walk({ ...groundSpawn }, 1, 144, []);
    expect(a.z).toBeCloseTo(11.7, 5);
    expect(b.z).toBeCloseTo(a.z, 5);
    const diagonal = walk({ ...groundSpawn }, 1, 60, [], {
      ...idle,
      forward: 1,
      right: 1,
    });
    expect(Math.hypot(diagonal.x, diagonal.z - 14.5)).toBeCloseTo(2.8, 5);
    expect(
      walk({ ...groundSpawn }, 1, 60, [], { ...idle, forward: 1, sprint: true })
        .z,
    ).toBeCloseTo(9.2, 5);
  });
  it("blocks the closed door and allows walking through the open doorway", () => {
    const s = newMission(),
      w = makeRuntime(s);
    w.door = 0;
    expect(
      walk({ ...groundSpawn }, 4, 60, collidersFor(w, s)).z,
    ).toBeGreaterThan(8.43);
    w.door = 1;
    expect(walk({ ...groundSpawn }, 4, 60, collidersFor(w, s)).z).toBeLessThan(
      3.5,
    );
  });
  it("blocks walls, rocket, equipment and ship hull even when sprinting", () => {
    const blocks = [...groundWalls, ...groundEquipment].map((b) =>
      box(b.id, b.p, b.s),
    );
    expect(
      walk({ ...groundSpawn, yaw: -Math.PI / 2 }, 10, 20, blocks, {
        ...idle,
        forward: 1,
        sprint: true,
      }).x,
    ).toBeLessThan(4.56);
    const rocket = box("rocket", [0, 10, -9], [3.4, 20, 3.4]);
    expect(
      walk({ ...groundSpawn, z: -3 }, 4, 30, [rocket], {
        ...idle,
        forward: 1,
        sprint: true,
      }).z,
    ).toBeGreaterThan(-7.01);
    const ship = [...shipWalls, ...shipEquipment].map((b) =>
      box(b.id, b.p, b.s),
    );
    expect(
      walk({ ...groundSpawn, z: 0, yaw: -Math.PI / 2 }, 5, 30, ship).x,
    ).toBeLessThan(4.56);
  });
  it("stops a moving door or rocket when the player occupies its next position", () => {
    const s = newMission(),
      w = makeRuntime(s);
    w.door = 1;
    w.doorWanted = false;
    w.pose = { ...groundSpawn, z: 8 };
    for (let i = 0; i < 120; i++) advanceWorld(w, s, 1 / 60);
    expect(w.door).toBeGreaterThan(0.57);
    w.pose = { ...groundSpawn };
    for (let i = 0; i < 120; i++) advanceWorld(w, s, 1 / 60);
    expect(w.door).toBe(0);
    w.rollout = 0;
    w.rolloutRequested = true;
    w.pose = { ...groundSpawn, z: -12 };
    for (let i = 0; i < 120; i++) advanceWorld(w, s, 1 / 60);
    expect(w.rollout).toBeLessThan(0.01);
    w.pose.x = 6;
    for (let i = 0; i < 120; i++) advanceWorld(w, s, 1 / 60);
    expect(w.rollout).toBeGreaterThan(0.2);
  });
  it("jumps and returns to the floor under gravity", () => {
    let p = movePlayer({ ...groundSpawn }, { ...idle, jump: true }, 0.016, []);
    expect(p.y).toBeGreaterThan(0);
    expect(p.grounded).toBe(false);
    p = walk(p, 2, 60, [], idle);
    expect(p.y).toBe(0);
    expect(p.grounded).toBe(true);
  });
  it("requires proximity, facing and an unobstructed line of sight", () => {
    const item = {
      id: "console",
      position: [0, 1.68, 0] as [number, number, number],
      label: "Use console",
    };
    const p = { ...groundSpawn, z: 2 };
    expect(findInteraction(p, [item], [])?.id).toBe("console");
    expect(findInteraction({ ...p, z: 4 }, [item], [])).toBeNull();
    expect(findInteraction({ ...p, yaw: Math.PI }, [item], [])).toBeNull();
    expect(
      findInteraction(p, [item], [box("wall", [0, 1, 1], [4, 3, 0.2])]),
    ).toBeNull();
  });
  it("averages actual telescope pointing during exposure", () => {
    let s = newMission();
    s.telescope.repaired = true;
    s.telescope.deployed = true;
    s = reduceMission(s, { type: "POINT", accuracy: 100 });
    s = reduceMission(s, {
      type: "OBSERVE",
      target: "anomaly",
      filter: "Visible",
      exposure: 10,
      duration: 10,
    });
    s = advanceTime(s, 5);
    s = reduceMission(s, { type: "POINT", accuracy: 40 });
    s = advanceTime(s, 5);
    expect(s.telescope.observations[0].pointing).toBeCloseTo(70);
    expect(s.telescope.active).toBeNull();
  });
});
