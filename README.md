# NIGHTLOOM
[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tarekujjaman/nightloom/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tarekujjaman/nightloom/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Weave the stars, catch the void. You are the Weaver, a spark of light in a luminous night sky.
Hold a thread from star to star, close the loop, and every void-moth inside it is captured in a
burst of gold. Ten waves of moths drift in from the dark, each faster and stranger than the last,
with the Eclipse Moth rising on waves five and ten. Between waves you pick one of three thread
upgrades. Lose every heart and the loom goes dark; clear the tenth wave and the night is woven.

## Controls

- **WASD / arrow keys** move the Weaver. Only stars inside its reach circle can be woven.
- **Hold the left mouse button** on a star, then drag star to star to chain glowing threads.
- **Return to the first star** to snap the loop shut. Bigger loops, more moths per loop and loops
  closed in quick succession multiply the score; the HUD shows the combo as it builds.
- **Space** fires Still Time once that thread is held. **P / Esc** pause. **M** mute. **R** or a
  click restarts from the results screen. The high score is kept in localStorage.

## The void-moths

Drifters wander toward you. Dashers aim, then lunge. Splitters shed mites until caught. Cutters
hunt your held thread and chew through it. The Eclipse Moth, a black disc in a golden corona,
wears three veils (five on wave ten) and loses one to every loop closed around it. Touching any
moth costs a heart.

## Thread upgrades

Long Reach, Swift Spark, Ember Thread (moths touching a held thread burn away), Another Heart,
Still Time, Star Shield, Gold Weave, Steady Hand and Wide Net. Three are offered after each wave.

## Run it

```
node serve.ts
```

Then open http://localhost:8080. The game is plain HTML5 canvas and ES modules under `game/`
with no build step, no libraries and no network requests; every sound is synthesised with the
Web Audio API. `?seed=N` fixes the night.

## Tools

- `node tools/shoot.mjs` serves `game/`, drives headless Chrome over the DevTools protocol and
  writes the scenes in `shots.json` (`?shot=title|play|upgrade|victory&seed=N`) to `screenshots/`.
- `node tools/check.mjs` plays the game through in headless Chrome (start, move, weave a loop,
  pause, mute, ten waves to victory, restart, defeat) and reports any console error.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` hands the entry in: it copies `game/` and `screenshots/`
  and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=y2gg1pq1&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
