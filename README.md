# NIGHTLOOM
[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tarekujjaman/nightloom/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tarekujjaman/nightloom/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Weave the stars, catch the void. You are the Weaver, a spark of light under a twilight of violet
and teal. Hold a thread from star to star, close the loop, and every void-moth inside is caught in
a burst of gold. Ten waves drift in from the dark, each faster and stranger than the last; the
Eclipse Moth rises on wave five and the Hollow Queen on wave ten, each wearing veils that fall one
per loop closed around it and each turning fiercer with every veil lost. After every wave you take
one card: a thread upgrade in one of three rarities, or a relic after the first boss. Lose every
heart and the night unravels; clear the tenth wave and the night is woven.

## The screen

The playfield sits inside a HUD frame that spells the game out at a glance. The top bar carries the
word mark, the score, the wave and its progress, and the two banners: **WIN** (weave all 10 waves,
with the waves woven so far) and **LOSE** (all hearts gone, with the hearts left). The right-hand
panel is the **THREAT QUEUE**: every kind of moth still coming this wave with its icon, name,
one-line behaviour and count, the boss with its veils and phase, and what spawns next; beneath it
**THREADS HELD** lists the cards taken with their level and live stat. The bottom bar has the
hearts, the still-time meter, the combo meter, the high score, the run grade (S to D, the score
against par) and a strip of key caps. A boss bar crosses the top of the field while a boss lives,
every moth wears a label naming its kind and what it does, and every catch raises a **LOOP CLOSED**
callout with the points, the tier, the catch, the multiplier and the chain.

## Controls

- **WASD / arrow keys** move the Weaver. Only stars inside its reach circle can be woven.
- **Hold the left mouse button** on a star, then drag star to star to chain glowing threads.
- **Return to the first star** to snap the loop shut. Bigger loops score higher tiers, more moths
  multiply the catch, and loops closed within five seconds chain into a combo.
- **Space** fires Still Time once that card is held. **P / Esc** pause. **M** sound. **R** or a
  click restarts from the results screen; **Esc** there returns to the title. The high score is
  kept in localStorage.

## The void-moths

Drifters wander toward you. Dashers aim, then lunge. Splitters shed mites until caught. Cutters
hunt your held thread and chew through it. Phantoms fade out, and a faded phantom slips through any
loop. Hex Wardens shield every moth near them until the warden itself is caught. The Eclipse Moth
(three veils; Corona, Umbra, Totality) and the Hollow Queen (five veils; Brood, Teeth, Fury, in
which she lunges at the Weaver) release escorts that change with each phase. Touching any moth
costs a heart.

## Cards

Nine threads: Long Reach, Swift Spark and Another Heart (common, up to level III), Ember Thread,
Still Time, Star Shield, Steady Hand and Wide Net (rare) and Gold Weave (epic). Four relics after
the Eclipse Moth falls: Moonspool (threads cannot be cut), Starfall (every loop stuns the moths
around it), Hourglass (captures recharge Still Time) and Lodestar (loops catch 80 px outside the
thread). Each card shows its rarity, its level and the stat it changes before you take it.

## Run it

```
node serve.ts
```

Then open http://localhost:8080. The game is plain HTML5 canvas and ES modules under `game/`
with no build step, no libraries and no network requests; every sound is synthesised with the
Web Audio API. `?seed=N` fixes the night.

## Tools

- `node tools/shoot.mjs` serves `game/`, drives headless Chrome over the DevTools protocol and
  writes the scenes in `shots.json` (`?shot=play|title|upgrade|results&seed=N`) to `screenshots/`.
- `node tools/contact.mjs` lays the screenshots out as the judge's contact sheet (the cover inside
  768x480, the rest small beneath it) in `out/contact.jpg`.
- `node tools/check.mjs` plays the game through in headless Chrome (start, move, weave a loop, the
  HUD's threat queue and grade, pause, mute, still time, both bosses and their phases, the relic
  choice, ten waves to victory, restart, defeat) and reports any console error.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` hands the entry in: it copies `game/` and `screenshots/`
  and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=y2gg1pq1&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
