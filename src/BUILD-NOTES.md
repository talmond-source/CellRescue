# Organelle Rangers — Cell in Crisis

The deliverable is `../index.html`. It embeds all 33 PNG assets and works without external asset requests.

## Build and checks

- Build with `python3 build.py` from this directory.
- Run logic checks with `node run-checks.mjs` using Node 20 or later.
- `assets/` preserves generated and approved artwork. `packed/` contains resized copies embedded by the build.
- The browser prepares sprite frames once, cleans their backgrounds, and caches them for rendering.

## Verified in this revision

All 56 mission/boss puzzle variants have deterministic solutions. The route-layout signatures are distinct for all 14 Rangers.

356 deterministic checks passed across all 14 missions. These cover mission start, attack windup/contact timing, one hit per swing, blaster timing, the firing pose, dodge immunity, objectives, zone transitions, boss defeat, debrief completion, saved results, gap crossing, death and retry.

All 244 animation cells passed foreground-silhouette and cell-boundary checks after the same background cleanup used by the game. All 33 embedded PNGs decode and the deliverable has no external asset dependencies. The old gold rectangle attack overlay is absent.

## Verification limits

The in-app browser rejected the local-file preview under its URL security policy. This revision has not had a full browser playthrough, actual FPS measurement, Chromebook hardware test, or timed 8–10-minute mission pacing test. The mission-route checks use a simulated DOM and exercise the game logic, rather than browser rendering or physical key input.

The 14 missions have individual story text, cargo, interactive objective systems, route layouts and debrief questions. Each Ranger has three workshop challenges and a fourth variant for disabling Phage’s mid-fight shield. They share the movement and combat system. Puzzles use explicit simplified models where their controls differ from real molecular processes. The generated action poses follow the approved character designs but have the small pose-to-pose drawing differences typical of generated sprite sheets.

Art was generated with the built-in image tool. `art-prompts.json` records the Ranger animation brief and its identity/layout references.
