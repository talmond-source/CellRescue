# Enemy sprite sheets — prompts for ChatGPT image generation

Each Ranger now fights an enemy family that matches its biology. Until a family's own sheet is added,
the game borrows the bacteria art with a color shift as a stand-in. These prompts make the real sheets.

## How to make each sheet

1. Open ChatGPT (image generation) and attach **`bacteria-sheet.png`** (in `src/assets/`). It is the style and layout reference.
2. Paste the shared prompt below, followed by the family block.
3. Check the result: 4 columns × 3 rows, transparent (or plain white) background, every creature facing **left**, nothing touching a neighboring cell.
4. Save it with the exact file name shown, and send it to Claude to integrate (it goes in `src/assets/` and `src/packed/`, then the game is rebuilt).

## Shared prompt (paste first, every time)

> Create a production sprite animation sheet for a side-scrolling arcade enemy, matching the attached reference sheet exactly in art style: polished 16-bit arcade pixel art, crisp shaded pixel clusters, dark outlines, glossy highlights, the same creature scale and chunky proportions. Transparent background. EXACTLY 4 columns by 3 rows: TWELVE equal cells, one full creature per cell, generous empty margins, no overlap between cells, every creature facing LEFT, identical scale, feet or lowest point on the same baseline in every cell. Each row is a different variant of the same enemy family. In every row the columns are: (1) walk pose A, (2) walk pose B, (3) attack windup, (4) attack. Keep the entire creature and any attack effect inside its own cell. No labels, no text, no floor, no shadows outside the figure. A cell-biology villain for a high-school classroom game: menacing arcade style, no gore. Landscape 4×3 sheet.

## 1. Retroviruses — `retrovirus-sheet.png` (DNA, RNA and Nucleus missions)

> Enemy family: RETROVIRUS minions. A round virus particle wrapped in a glossy lipid envelope studded with knob-tipped glycoprotein spikes. Through a glowing window in the envelope you can see a cone-shaped capsid holding two coiled RNA strands. Short hooked legs underneath. Palette: teal-green envelope, magenta spikes, glowing violet RNA.
> Row 1, LATCHER: walks on hooked legs; windup rears back with spikes flared; attack lunges forward with spike-hooks extended to grab.
> Row 2, SPITTER: windup puffs up; attack fires a small glowing violet RNA-strand blob forward (the projectile stays inside the cell).
> Row 3, ROLLER: walks; windup curls into a spiky ball; attack is a fast rolling tumble with a motion streak.

## 2. Mutated cells — `mutant-sheet.png` (Mitosis mission)

> Enemy family: MUTATED CELL minions. A lumpy, irregular rogue cell with an uneven bulging membrane, an oversized dark nucleus showing two nucleoli, and a scowling face formed in the cytoplasm. Small pseudopod feet. Palette: sickly violet-pink membrane, deep indigo nucleus, glowing yellow eyes. Cartoon-menacing, not gory.
> Row 1, LASHER: windup coils a pseudopod; attack whips the pseudopod forward.
> Row 2, SPITTER: windup swells; attack spits a small glowing cell fragment forward.
> Row 3, BULLDOZER: windup squashes low; attack is a bulging forward dash with a motion streak.

## 3. Misfolded proteins — `misfolded-sheet.png` (Ribosome, Rough ER and Golgi missions)

> Enemy family: MISFOLDED PROTEIN minions. A tangled, knotted golem made of a protein chain: twisted ribbon coils (alpha helices) and flat arrow-shaped ribbons (beta sheets) clumped into a stocky body with heavy tangled arms. Palette: amber and coral ribbons with hot-pink glowing knots, small angry eyes in the tangle.
> Row 1, SLAMMER: slow heavy walk; windup raises a tangled arm overhead; attack slams it down.
> Row 2, THROWER: windup pulls off a clump; attack hurls a small protein clump forward.
> Row 3, ROLLER: windup tucks into a knotted ball; attack is a heavy rolling charge with a motion streak.

## 4. Free radicals — `radical-sheet.png` (ATP, Mitochondria and Smooth ER missions)

> Enemy family: FREE RADICAL minions (reactive oxygen species). A small, unstable, crackling oxygen orb with a lone unpaired electron orbiting it as a bright spark, jagged energy arcs and an angry face. They hover, so draw them floating slightly above the baseline with a crackle trail under them. Palette: hot orange and yellow core, white-hot spark, red outline glow.
> Row 1, ZAPPER: jittery hover; windup crackles brighter; attack jabs a short spark forward.
> Row 2, SHOOTER: windup spins the electron fast; attack fires a small electron bolt forward.
> Row 3, ZIPPER: this one stays on the ground; windup crouches into a flare; attack is a zig-zag dash streak.

## 5. Mini-phages — `miniphage-sheet.png` (CRISPR mission)

> Enemy family: MINI-PHAGE minions, small cousins of a bacteriophage villain. A gem-like icosahedral head (twenty-sided capsid) on a ringed tail sheath, standing on six spidery tail fibers like legs. Palette: silver-teal capsid, magenta glowing core, steel legs.
> Row 1, LEAPER: skittering walk; windup crouches low on bent legs; attack is mid-leap with legs spread, plunging forward and down.
> Row 2, DART: windup aims its tail; attack shoots a small DNA-strand dart forward.
> Row 3, RUSHER: windup braces; attack is a fast scuttling rush with a motion streak.
