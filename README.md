# ORBITAL ECHO

A first-person 3D space game built with React, React Three Fiber, Three.js, TypeScript, and Vite. The application opens directly inside an astronaut preparation facility. Walk through the hangar, inspect the rocket, operate physical launch switches, and continue the expedition aboard Astra.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. No accounts, API keys, backend, or external runtime services are required. Earth imagery and other assets are served locally. WebGL is required for the playable world.

```sh
npm run build
npm run preview
```

The production bundle is in `dist/`. Preview normally runs at **http://127.0.0.1:4173/**.

## Controls

| Input      | Action                                              |
| ---------- | --------------------------------------------------- |
| WASD       | Walk                                                |
| Mouse      | Look; click the world to capture the pointer        |
| E          | Use nearby equipment under the crosshair            |
| Shift      | Sprint                                              |
| Space      | Jump                                                |
| Escape     | Release pointer capture and pause; close a terminal |
| T          | Cycle 1×, 2×, 5×, and 10× simulation time           |
| Arrow keys | Alternative keyboard look                           |
| Drag       | Alternative look without pointer capture            |

Touch screens have movement buttons, drag look, and an E interaction button. Pause opens preferences, the field handbook, mission log, reserves, saves, archives, and chapter recovery. Detailed operations open as contextual overlays over the 3D world.

## First launch

1. Approach the flight suit on the preparation room’s right wall, look at it, and press E.
2. Approach the door ahead and press E. Walk through the corridor into the hangar.
3. Use the inspection station near the rocket’s left side. Resolve the vibration warning, configure the vehicle, and complete preflight. Close the terminal and walk around the station.
4. Enter the launch control room through the west hangar doorway. Use the left **ROLLOUT** switch. The bay doors open and Astra moves to the pad.
5. Use the center **LAUNCH** switch to start the real-time countdown. Use it again to abort, or use **HOLD** to suspend/release the countdown. Look through the north window toward the pad to watch liftoff.
6. Above 350 m, the viewpoint transfers to the spacecraft’s flight deck. Mission time changes to 5×. Approach the right console and press E at stage burnout to separate the spent stage. T changes the time rate.
7. Once in orbit, the left navigation console starts chapter two. Transfer to Hubble at 540 km, match relative velocity, and approach.

## Aboard Astra

The flight deck connects through a corridor to a walkable habitat. The same mission simulation continues throughout the expedition.

- **Navigation console, flight deck left:** transfers, velocity matching, Hubble approach, and the optional final-chapter relay probe.
- **Flight console, flight deck right:** manual staging and live fuel, thrust, mass, altitude, velocity, pressure, and integrity.
- **Hubble service rack, habitat right near the entrance:** assign the engineer to a timed repair using a spare part; recalibrate the pointing assembly after servicing.
- **Optical workstation, habitat right:** deploy Echo, aim a reticle at the guide star, select target/filter/exposure, acquire observations, and analyze datasets. Pointing accuracy is averaged over the exposure and affects its scientific quality. Detailed images, spectra, image adjustments, comparisons, and light curves remain available within this terminal.
- **Environmental rack, habitat left near the entrance:** inspect pressure, CO₂, oxygen, and controller condition; respond to the emergency and replace the failed controller.
- **Bunk and crew station, habitat aft:** rest Maya and assign crew duties. Health, fatigue, stress, nutrition, hydration, radiation, suit condition, and task progress remain persistent.
- **Evidence board, habitat left:** compare hypotheses, request independent confirmation, accept chapter debriefs, choose a conclusion, and return to Earth.

The five chapters cover launch, Hubble servicing, scientific investigation, crew survival, and the final decision. Endings depend on collected evidence, interpretation, health, oxygen, vehicle integrity, and telescope condition. Early return and failed missions remain possible.

## Movement and simulation

World units are meters; the camera sits 1.68 m above the player’s feet. A vertical player body collides against room/equipment bounds. Movement uses substeps, normalized diagonal input, horizontal collision resolution, gravity, and floor/ceiling contact. The door and rocket collider positions follow their visible geometry. Walk speed is 2.8 m/s and sprint speed is 5.3 m/s. Time acceleration affects mission systems, not walking speed.

Interactions require proximity, facing, and an unobstructed line of sight. Launch requires a flight suit, a verified vehicle, and completed rollout. The rendered rocket’s altitude follows the actual ascent simulation.

The existing engineering model uses SI units, staged mass reduction, TWR, the rocket equation, fuel flow, gravity, drag, and a guided gravity turn. Orbital maneuvers use circular-orbit and two-impulse Hohmann calculations. Launch propellant is measured in kilograms; maneuver reserves are remaining m/s of delta-v. Resource consumption, crew tasks, acquisition, and emergencies advance in steps no larger than 0.5 simulated seconds.

Pause freezes mission systems and movement. A countdown hold freezes mission time while allowing the player to walk to the release switch. Contextual workstations normally leave mission time running. Hidden browser tabs suspend mission time; there is no offline catch-up.

## Saves and accessibility

Mission state autosaves every four seconds and on chapter changes and exit. Player position, suit, door, and rollout state save separately every three seconds and on exit. Reload restores an active mission directly into its first-person world. Completed attempts remain in the archive, and the next load starts a new expedition. Portable JSON import/export preserves mission state and settings; imported missions pause until resumed through the pause menu. Player position is local to the device.

Preferences include sound, ambient audio, volume, graphics quality, reduced decorative motion, larger text, high contrast, and optional science explanations. Keyboard look and drag look provide alternatives to pointer lock. Dialogs provide visible focus and keyboard navigation.

Storage keys:

- `orbital-echo-save-v1`
- `orbital-echo-world-v1`
- `orbital-echo-settings-v1`
- `orbital-echo-archive-v1`

## Verification

```sh
npm test          # Simulation, persistence, player physics, and interaction tests
npm run build    # TypeScript and production build
npm run test:e2e  # Chrome; run the dev server first
```

Browser tests exercise the game through keyboard, mouse, touch controls, and contextual terminals. They do not teleport the player or inject mission progress. Coverage includes pointer lock, mouse look, pause, collision blocking, door interaction, inspection, rollout, countdown abort/hold, liftoff, onboard transition, staging, orbital operations, physical repair, telescope aiming, investigation, life support, crew rest, ending, saved position, chapter recovery, and a small touch viewport. Screenshots go to `artifacts/`; failures retain traces under `test-results/`. Set `PLAYWRIGHT_BASE_URL` to test a production preview server.

## Source layout

- `src/main.tsx` → `src/App.tsx` → `src/game/FirstPersonGame.tsx`: the actual application entry and first-person game.
- `src/game/world.ts`: room bounds, collision objects, interactions, and local player saves.
- `src/game/physics.ts`: player movement, gravity, collision, and interaction targeting.
- `src/game/PlayerRig.tsx`: input, pointer lock, camera, and frame updates.
- `src/game/WorldGeometry.tsx`: procedural facility, rocket, spacecraft, Earth, and stars.
- `src/game/Terminals.tsx`: physical-console mission interfaces and telescope aiming.
- `src/game/game.css`: minimal HUD, contextual terminals, pause menu, and touch controls.
- `src/simulation/`: pure mission dynamics, progression, resources, science, and photometry.
- `src/state/`: React integration, saves, checkpoints, and import validation.
- `src/features/`: retained detailed science, crew, investigation, settings, and records.
- `tests/`: unit and browser acceptance tests.

## Model limits and imagery

This is a stylized procedural game. Player collision uses axis-aligned bounds rather than a general rigid-body solver. The ship uses the same grounded walking model as the facility. The ascent is a guided scalar-velocity approximation; transfers and final recovery resolve immediately. The camera handoff is a gameplay transition, and Earth’s backdrop is illustrative rather than drawn at orbital scale. Crew repairs are timed assignments initiated at physical hardware, not a free-flight EVA simulation.

Scientific images, spectra, light curves, crew, and the Echo anomaly are fictional. Evidence confidence is a gameplay heuristic, not a calibrated statistical probability. The relay probe travels to a local Earth orbit. The local NASA Blue Marble Earth texture is real imagery; clouds, spacecraft, and other geometry are procedural.

The app works without external network access after loading, but a fresh reload needs the local/static web server; there is no service worker. Chrome is the browser used for acceptance testing.

Earth imagery: [NASA Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/). Exact source and credits are in `public/assets/CREDITS.txt`. NASA endorsement is not implied.
