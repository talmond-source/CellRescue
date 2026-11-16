# Organelle Rangers — Cell Rescue

An educational pixel-art side-scrolling game for high-school biology, with 14 playable Rangers, illustrated biology bio-scans at every station, bacterial enemies and a Phage boss encounter in every mission.

## Play

Open `index.html` in a modern browser. Artwork, scripts and styles are embedded in that single file. Student progress is stored in the browser. Results can be downloaded as CSV. Hosting this file on GitHub Pages supports Chromebook access.

Use arrow keys to move and jump, or Space to jump. Z chains melee attacks; in the air, hold ↓ and press Z for a dive kick. X fires the blaster, C dodges and E activates a nearby mission station. Enter advances dialogue (the first press finishes the line), number keys 1–3 answer bio-scan questions and Escape pauses.

## Publish on GitHub Pages

1. Upload the contents of this package into the intended repository. Keep `index.html` at the publishing root.
2. In the repository’s Settings → Pages, select Deploy from a branch, the intended branch (usually `main`), and `/(root)`.
3. Save, wait for GitHub’s deployment to finish, and test the published URL.

The included `.nojekyll` supports direct static-file publishing. The root `index.html` is already built. The source folders are included for future editing. [GitHub Pages publishing documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Edit and rebuild

Python 3 builds the standalone HTML using only the standard library. Node 20 or newer runs the logic checks. No dependency installation is needed.

```sh
node src/run-checks.mjs
python3 src/build.py
```

Commit the rebuilt root `index.html` when changing the game. The browser uses that file as the deployed game entry point. [GitHub Pages entry-file documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## Package contents

- `index.html` — latest playable build, including the distinct-mission update.
- `CLAUDE-HANDOFF.md` — project context, deployment task and remaining verification.
- `src/index.html` — editable interface template.
- `src/engine.js` — gameplay, rendering, input, saving and CSV export.
- `src/campaigns.js` — Ranger identities, stories and cargo.
- `src/missions.js` — the bio-scan question stations (zone stations, Phage shield and debrief).
- `src/questions.js` — all 70 bio-scan questions (5 per Ranger), explanations and hints. Edit questions here.
- `src/diagrams.js` — the labeled scientific diagrams drawn for each question.
- `src/fonts/` — Press Start 2P title font (SIL Open Font License), embedded by the build so the game works offline.
- `src/assets/` — approved character images, original generated animation sheets and environment art.
- `src/packed/` — resized PNGs embedded by the build script.
- `design-references/` — original front, side and back design cards, including Phage.
- `src/run-checks.mjs`, `src/verify.js`, `src/verify-missions.js` — runnable regression checks.
- `src/verify-art.js` — historical pixel-check harness, requiring decoded RGBA inputs as described in the handoff.
- `src/art-prompts.json` — Ranger animation generation brief and frame order.
- `SHA256SUMS.txt` — checksums for the exported files.

## Validation status

481 logic checks pass, covering all 14 mission routes, all 70 bio-scan questions (each diagram is drawn headlessly), the dive kick and the typed story text. Every question panel was measured in Chromium at 1300×860, 1024×700 and phone width. Prior asset checks covered all 244 animation cells. Full browser playtesting, measured FPS, Chromebook testing and 8–10-minute mission pacing remain outstanding. See `src/BUILD-NOTES.md` for details.
