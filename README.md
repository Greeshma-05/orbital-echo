# ORBITAL ECHO

**The Last Mission Beyond Earth** — a complete, local browser game about spacecraft engineering, scientific evidence, and bringing a crew home.

## Run

Requires Node.js **22.12 or newer** and npm. Dependencies are already installed in this workspace.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. Start a new mission, read or skip the briefing, and follow the chapter objectives. Use **10×** speed during ascent and crew tasks; separate stages when the flight director reports burnout.

For a production build:

```sh
npm run build
npm run preview
```

Vite prints the preview address, normally **http://127.0.0.1:4173/**. The generated `dist/` directory can also be served by any static web server. No API keys, accounts, backend, or runtime external service are required. Assets and fonts are local or system-provided.

## Playable campaign

1. **The Countdown:** select engines, staging, boosters, propellant, payload, and instruments; resolve the vibration warning; pass preflight; manage countdown, abort, ascent, and manual stage separation.
2. **The Silent Telescope:** plan a two-burn transfer, match Hubble’s orbit and velocity, approach, assign servicing, deploy Echo, and acquire a usable observation.
3. **Signals in the Dark:** acquire and analyze three datasets with two targets and two filters; handle a power-bus event; obtain independent confirmation after restoring communications.
4. **The Human Limit:** stabilize a failing cabin, allocate a spare part and an engineer to life support, and rest the exhausted astrophysicist.
5. **Beyond the Known:** evaluate the hypotheses, optionally deploy a local relay probe, choose a conclusion, and return to Earth.

The three principal endings use actual evidence, crew health, oxygen, vehicle integrity, and telescope condition. An early return can preserve the crew with an unresolved mystery. Continuing through a damaging telescope power fault can yield substantial science at an equipment cost. Unresolved survival emergencies can also end in mission loss; the chapter checkpoint remains available.

## Controls and systems

- Sidebar navigation connects nine operational views; Settings is accessible from the sidebar and opening menu.
- **Space:** pause/resume when focus is outside a form or button. **Esc:** close dialogs. **Tab:** keyboard navigation, with visible focus and dialog focus trapping.
- Simulation speeds: **1× / 2× / 5× / 10×**. Time uses controlled steps of at most 0.5 simulated seconds. Pausing stops consumption, tasks, and acquisition. Menus and hidden browser tabs suspend time; there is no offline catch-up.
- Launch calculations use SI units, staged mass reduction, the rocket equation, TWR, propellant flow, gravity, approximate drag, and a guided gravity turn. Bad configurations are rejected with explanations; missed staging and exhausted propellant can fail an ascent.
- Circular-orbit velocity and period and two-impulse Hohmann transfer costs are calculated from Earth’s gravitational parameter. Maneuver fuel is represented as remaining **m/s of delta-v**, separately from launch propellant in **kg**. The return reserve is protected.
- Science includes target/filter/exposure/duration selection, calibration, acquisition progress, deterministic scientific images, pan/zoom, image adjustments, metadata, spectra, line selection, control comparison, and evidence-weighted hypotheses.
- Temporal photometry uses acquired, analyzed Echo samples. After at least eight samples spanning ten simulated minutes, a least-squares frequency scan estimates a candidate period. Sparse sampling and uncertain astrophysical interpretation are stated explicitly.
- Three individual crew profiles track health, fatigue, stress, sleep debt, hydration, nutrition, radiation, suit condition, current task, and progress. Task completion changes real equipment and mission state.
- Oxygen, CO₂, pressure, temperature, water, food, power, parts, budget, observation time, and maneuver reserves persist between chapters.
- Deterministic events cover launch vibration, telescope power faults, cabin leaks/CO₂, exhaustion, EVA suit faults, communications blackouts, radiation, and low electrical reserves. Decisions spend resources and alter conditions.
- Synthesized effects and ambient audio are optional, with volume control. Graphics quality, reduced motion, larger text, high contrast, and Science Mode change actual application behavior.
- Three.js renders Earth, atmosphere, stars, orbital paths, and the spacecraft. A CSS 2D display preserves all operations when WebGL is unavailable. A procedural Earth remains available if the local texture fails to load.

## Saving and recovery

Progress autosaves every four seconds during a mission, at chapter transitions, on completion, and on page exit. Manual save, versioned JSON export/import, restart chapter, restart mission, and a persistent archive are implemented. Import validation checks shape, finite values, ranges, known events, observations, and matching checkpoint identity. Restored missions open paused.

Preferences persist separately on the device and are included in exported saves. Restarting a chapter restores the entry checkpoint and retains prior-attempt log entries with a label. The mission archive retains completed, lost, and abandoned attempts.

Storage keys:

- `orbital-echo-save-v1`
- `orbital-echo-settings-v1`
- `orbital-echo-archive-v1`

Device storage can be cleared by browser privacy settings. Export a JSON copy for portable backup. If storage is unavailable, the game remains playable and offers export.

## Tests

```sh
npm test          # 20 core simulation and persistence tests
npm run build    # TypeScript and production compilation
npm run test:e2e  # Chrome browser tests; local dev server must be running
```

The browser configuration uses the installed **Google Chrome**. Tests cover a full five-chapter playthrough through the actual controls to **The Greatest Discovery**, archive and reload, launch abort, mobile navigation, reduced motion, larger text, pause, chapter recovery, invalid imports, mid-mission save restoration, settings, offline operations, and the WebGL-unavailable fallback. All four browser scenarios also passed against the packaged production build. To target a preview server, run `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e`. The full playthrough checks for blocking browser console errors. Screenshots are saved under `artifacts/`; failures retain Playwright traces under `test-results/`.

Core tests cover rocket mass/TWR/delta-v, launch success, weak thrust and insufficient fuel, countdown abort/refund, dry-mass separation, orbit constants, maneuver costs and reserve rejection, paused time, fatigue/rest, observations/evidence, life-support repair, objective gates, three ending rules, save round-trip and rejection, event deduplication, blackout recovery, life-support decisions, optional probe reserves, photometric period fitting, launch retry, and malformed save fields.

## Source organization

- `src/simulation/`: pure typed physics, health/resource/time stepping, event effects, progression rules, and photometry.
- `src/state/`: React state integration, autosave/checkpoints, settings, and validated persistence.
- `src/features/`: menu/briefing/ending, overview, launch, navigation, telescope, crew/life support, investigation/resources/log.
- `src/components/`: shared instruments, dialogs, Web Audio, the Three.js space scene, and brightness chart.
- `src/data/`: chapters, fictional crew, targets, defaults, and event definitions.
- `src/styles/`: responsive CSS design system and accessibility modes.
- `tests/`: simulation unit tests and browser acceptance tests.

Code formatting uses Prettier. `npm exec prettier -- --write src tests` formats the implementation.

## Deliberate simulation limits

This is an educational game, not a flight-certified solver or a clinical health model. Ascent uses a guided scalar-velocity approximation rather than six-degree-of-freedom dynamics. Orbital transfer burns and final recovery resolve immediately; the planet view is illustrative and does not claim orbital scale. Crew duties represent timed operations rather than a first-person EVA game. Resource and fatigue rates are compressed for a short campaign.

Astronomical images, spectra, light curves, hypothesis confidence, crew, and the Echo anomaly are fictional simulations. The period model is illustrative, and confidence scores are not calibrated statistical probabilities. The probe travels to a local Earth orbit for a separated observation baseline; it does not fly to a distant star.

All essential controls work offline **after loading**. A fresh reload still requires the local/static web server; this version does not install a service worker. Desktop and mobile layouts were exercised in Chrome; other browser engines have not been verified. Audio is synthesized and subject to browser user-gesture restrictions.

## Imagery credit

The locally bundled Earth surface is a resized NASA Earth Observatory **Blue Marble: Next Generation** July base map. Clouds, lighting, spacecraft, and other visuals are procedural. NASA endorsement is not implied.

- [NASA image source](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/)
- [NASA image and media usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- Exact source URL and asset details: `public/assets/CREDITS.txt`.
