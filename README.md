# NIGHTLOOM
[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tarekujjaman/nightloom/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tarekujjaman/nightloom/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Weave the stars, defend the Loom. At the heart of the sky stands the Loom, a golden frame of warp
threads with a spinning wheel; the void-moths fly at it, and every moth that reaches it tears a
thread away. You are the Weaver, a spark of light. Hold a thread from star to star, close the loop,
and every moth inside is caught in a burst of gold and pays out starlight. Ten waves cross four
realms, each with its own sky: Aurora Reach (waves 1 to 3), Ember Nebula (4 to 5, where the Eclipse
Moth rises), Frost Veil (6 to 8) and The Hollow Dark (9 to 10, where the Hollow Queen waits). The
bosses wear veils that fall one per loop closed around them and turn fiercer with each. After every
wave you take a card: three free threads or relics, a fourth for starlight, or a re-roll. The night
is woven when the tenth wave falls; it is lost when the Loom unravels or the Weaver loses the last
heart.

## The screen

The playfield sits inside a HUD frame that spells the game out at a glance. The top bar carries the
word mark, the score, the wave with the realm's name, **LOOM 100/100** with its health bar,
**✦ starlight**, and the two banners: **WIN** (weave all 10 waves, with the waves woven so far) and
**LOSE** (the Loom unravels or the Weaver falls, with the Loom's health and the hearts left). The
right-hand panel is the **THREAT QUEUE**: every kind of moth still coming this wave with its icon,
name, one-line behaviour and bite, the boss with its veils and phase, and what spawns next; beneath
it **THREADS HELD** lists the cards taken with their level and live stat. The bottom bar has the
hearts, the **hotbar** (LMB WEAVE · RMB PLUCK · SPACE STILL TIME · E STAR with its starlight cost ·
Q LANCE with its charges, each with a cooldown sweep), the combo meter, the high score and the run
grade (S to D, the score against par). A boss bar crosses the top of the field while a boss lives,
a realm title card opens each realm, and a **NOW** line along the foot says what to do right now.
The field itself stays clean: moths are told apart by silhouette, colour and a small badge, the Loom
shows its torn threads, and only the boss, the Weaver and the **LOOP CLOSED** callout carry words.

## Controls

- **WASD / arrow keys** move the Weaver. Only stars inside its reach circle can be woven.
- **Hold the left mouse button** on a star, then drag star to star to chain glowing threads.
  **Return to the first star** to snap the loop shut. Bigger loops score higher tiers, more moths
  multiply the catch, and loops closed within five seconds chain into a combo.
- **Right mouse button** plucks the held thread, whipping away and stunning the moths along it (or,
  with no thread held, the moths around the Weaver). Four seconds to recharge.
- **Space** fires Still Time, slowing every moth for a few seconds; it recharges over 14 s.
- **E** plants a new anchor star where the Weaver stands, for starlight (45, rising with each star
  planted; at most five). Planted stars persist across waves, so where you plant decides which loops
  are possible.
- **Q** fires a Lance along the move direction (toward the cursor when still): a piercing thread
  that pins every moth it crosses for two seconds. Three charges, one back every 7 s.
- **1, 2, 3** take a card between waves; **4** takes the fourth for 60 starlight; **Tab** re-rolls
  the cards for 30. **P / Esc** pause. **M** sound. **R** or a click restarts from the results;
  **Esc** there returns to the title. The high score is kept in localStorage.

## The void-moths

Every moth flies at the Loom and bites it when it arrives: Drifters (4), Dashers, which aim and lunge
at you (5), Splitters, which shed Mites until caught (6, mites 1), Cutters, which hunt your held
thread and chew through it (4), Phantoms, which fade out and slip through loops while faded (5), and
Hex Wardens, which shield every moth near them until the warden itself is caught (6). The Eclipse
Moth (three veils; Corona, Umbra, Totality) and the Hollow Queen (five veils; Brood, Teeth, Fury, in
which she lunges at the Weaver) release escorts that change with each phase. Touching any moth costs
a heart. Captures pay starlight, more for bigger loops, longer chains and boss veils, and a cleared
wave mends the Loom.

## Cards

Ten threads: Long Reach, Swift Spark, Another Heart and Mending Thread (common, up to level III),
Ember Thread, Deeper Stillness, Star Shield, Steady Hand and Wide Net (rare) and Gold Weave (epic).
Four relics after the Eclipse Moth falls: Moonspool (threads cannot be cut), Starfall (every loop
stuns the moths around it), Hourglass (captures recharge Still Time) and Lodestar (loops catch 80 px
outside the thread). Each card shows its rarity, its level and the stat it changes before you take
it; the fourth card of every offer is the rarest left and costs starlight.

## Run it

```
node serve.ts
```

Then open http://localhost:8080. The game is plain HTML5 canvas and ES modules under `game/`
with no build step, no libraries and no network requests; every sound is synthesised with the
Web Audio API. `?seed=N` fixes the night.

## Tools

- `node tools/shoot.mjs` serves the repository, drives headless Chrome over the DevTools protocol
  and writes the scenes in `shots.json` (`?shot=play|title|upgrade|results&seed=N`, staged by
  `tools/stage.mjs`, which the game imports only under `?shot=`) to `screenshots/`.
- `node tools/contact.mjs` lays the screenshots out as the judge's contact sheet (the cover inside
  768x480, the rest small beneath it) in `out/contact.jpg`.
- `node tools/check.mjs` plays the game through in headless Chrome (start, move, weave a loop, the
  HUD's threat queue, grade, realm, Loom and starlight, pause, mute, still time, the hotbar's star,
  lance and pluck, a moth biting the Loom, every realm, both bosses and their phases, the relic
  choice, the fourth card and the re-roll, ten waves to victory, restart, defeat by hearts and by
  the Loom) and reports any console error.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` hands the entry in: it copies `game/` and `screenshots/`
  and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=y2gg1pq1&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
