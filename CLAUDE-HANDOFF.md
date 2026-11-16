# Handoff to Claude

Please upload and publish this latest Organelle Rangers game through the user’s intended GitHub repository, then return the working GitHub Pages link. The repository destination has not been specified in this package. Establish the intended repository with the user or their existing GitHub context before uploading.

## Authoritative build

Use the root `index.html`. It is the exact export of `Organelle-Rangers-Diverse-Missions.html` from November 16, 2026. The older Ribosome pilots and original 3D fighting game are separate projects. This package contains the standalone pixel-art side-scrolling game.

Upload the extracted package contents so `index.html` is at the publishing root. GitHub Pages can deploy the built file directly. Keep the editable source and art with the repository for future revisions. Preserve the user’s repository history and any unrelated projects when selecting the destination.

## User’s design requirements

The user approved the middle “B” Red Ribosome pixel design and then the complete 14-Ranger roster. Preserve those identities, helmets, suit colors, armor, emblems and proportions. The target is richly shaded handheld arcade pixel art inspired by Power Rangers Dino Thunder for GBA. The user rejected low-detail geometric characters, flat placeholder environments and attacks made by warping one static pose.

The audience is high-school freshmen using Chromebooks. The user prefers one downloadable HTML file that also works on GitHub Pages. Teaching should happen through story and actions, with an end-of-mission question. The intended pacing is roughly 8–10 minutes per Ranger, which has not been measured or tuned yet.

## Implemented scope

All 14 Rangers are selectable and have a 16-pose animation sheet. Punches use windup, extension, contact and recovery poses. The blaster has draw, aim and firing poses. There are three bacterial enemy types and an eight-pose Phage boss sheet. The gold rectangle previously drawn over punches was removed.

Each Ranger has distinct story content, cargo, a distinct route layout, three mission-workshop variants and a fourth variant for Phage’s mid-fight shield. Combat and movement controls are shared. Interactive mechanics cover energy allocation, translation assembly, folding, sorting, flow networks, selective transport, proton gradients, archive access, calcium regulation, recycling, base-pair repair, courier navigation, chromosome distribution and sequence targeting.

Phage raises a shield at half health. The player uses the left-side station with E to complete their Ranger’s mechanic, disables the shield and returns to the fight. The final debrief records results. Names, checkpoints and completed results are stored with browser localStorage. CSV export produces a downloadable class-results file. Local-file and hosted-site browser storage are separate origins, so existing local progress does not automatically appear on the hosted site.

The cell-city and combat are fictional. The in-game explanatory note distinguishes a bacteriophage’s real bacterial host range from the fictional organelle-city conflict. Simplified puzzle representations include explanatory text.

## Source and build

Run `node src/run-checks.mjs` with Node 20+ and `python3 src/build.py` from the package root. The build writes the root `index.html` and embeds all PNGs in `src/packed/`. It is portable and has no dependency on the originating laptop’s paths.

`src/assets/` preserves the original artwork. `src/packed/` contains the sized copies currently used by the game. After changing art, update the corresponding packed copy as well. Asset keys are filename stems. Ranger sheets use 4 columns and 4 rows, bacteria 4 columns and 3 rows, and Phage 4 columns and 2 rows. The engine cleans backgrounds and caches frames on load.

The historical `verify-art.js` harness expects `vm`, `engineText` and `pixelInputs` supplied by a caller. Each pixel input has `width`, `height` and a decoded RGBA `Uint8ClampedArray`. This harness is separate from the portable logic test command. Prior execution checked all 244 cells for silhouettes and cell boundaries. Do not treat that check as a visual animation playtest.

## Verification to finish before reporting a polished release

The recorded 356 automated checks use a simulated DOM and deterministic game logic. They cover 14 campaign routes, 56 puzzle variants, combat timing, projectile timing, invulnerability, checkpoint recovery, saved completion and distinct route signatures. The exported build contains 33 PNG assets and has no external asset dependencies.

The in-app browser previously rejected local-file access under its URL policy. Full browser playtesting, actual animation quality in motion, mobile control behavior, real CSV downloads, FPS, Chromebook performance and mission pacing remain unverified. Once the intended hosting workflow makes a preview available, test the actual browser experience, including the following.

1. Load the roster and start Ribosome. Confirm that all artwork loads, dialogue advances and controls respond.
2. Play through all three mission zones and a Phage shield challenge. Check the end-of-mission question, replay and return to roster.
3. Test every Ranger’s station mechanic and verify that the full animated character remains visible.
4. Check blaster aim/muzzle placement, left/right facing, combo contact timing, jumping, dodging, enemy warnings and damage feedback.
5. Confirm checkpoint resume after reload, results export and usability at Chromebook screen sizes.
6. Measure actual pacing and frame rate. Record remaining issues plainly rather than equating passing logic tests with a fully playtested release.

## Upload outcome

Provide the repository URL, the working GitHub Pages URL, and a short account of what was actually tested. The user’s primary goal is a playable, visually polished educational game with enough mission variety to make multiple Ranger playthroughs worthwhile.
