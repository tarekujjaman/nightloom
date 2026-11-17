// Points for a closed loop (area tier × moths × chain), the wave bonus and the run grade.
import { SCORING } from './config.js';

/** Tier 1 to 4 from the loop's area: bigger loops are worth more per moth. */
export function loopTier(area) {
  let tier = 1;
  for (const threshold of SCORING.tiers) if (area >= threshold) tier += 1;
  return tier;
}

/** The tier's name for the capture callout. */
export function tierName(tier) {
  return SCORING.tierNames[Math.max(0, Math.min(SCORING.tierNames.length - 1, tier - 1))];
}

/** The chain multiplier: +50% per loop in the chain beyond the first, up to ×4. */
export function chainMultiplier(chain) {
  return Math.min(4, 1 + 0.5 * Math.max(0, chain - 1));
}

/** Score a capture of the moths worth `worths`, the `chain`th loop of a combo; Gold Weave raises the tier. */
export function scoreLoop(area, worths, chain, goldWeave) {
  const tier = Math.min(5, loopTier(area) + (goldWeave ? 1 : 0));
  const count = worths.length;
  if (count === 0) return { points: 0, tier, count, multiplier: 0 };
  const base = worths.reduce((sum, worth) => sum + worth, 0);
  const multiplier = tier * count * chainMultiplier(chain);
  return { points: Math.round(base * multiplier), tier, count, multiplier };
}

/** Points for clearing a wave, more when the Weaver was never touched. */
export function waveBonus(wave, perfect) {
  return SCORING.waveClear * wave + (perfect ? SCORING.perfectWave : 0);
}

/** The run's grade so far, S to D: the score against par for the waves woven, with progress to the next grade. */
export function runGrade(state) {
  const total = Math.max(1, state.waveTotal || 1);
  const woven = Math.max(0.5, state.wave - 1 + Math.min(1, state.stats.waveCaptured / total));
  const ratio = state.score / (SCORING.par * woven * (woven + 1));
  const grades = SCORING.grades;
  for (let i = 0; i < grades.length; i += 1) {
    if (ratio >= grades[i][1]) {
      const next = i > 0 ? grades[i - 1][1] : grades[0][1];
      return { letter: grades[i][0], ratio, progress: i > 0 ? (ratio - grades[i][1]) / (next - grades[i][1]) : 1 };
    }
  }
  return { letter: 'D', ratio, progress: 0 };
}

/** A number with thin spaces every three digits, for the HUD. */
export function formatScore(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
