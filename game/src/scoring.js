// Points for a closed loop (area tier × moths × chain), the wave bonus and the run grade.
import { SCORING } from './config.js';

export function loopTier(area) {
  return 1 + SCORING.tiers.filter((threshold) => area >= threshold).length;
}

export function tierName(tier) {
  return SCORING.tierNames[Math.max(0, Math.min(SCORING.tierNames.length - 1, tier - 1))];
}

export function chainMultiplier(chain) {
  return Math.min(4, 1 + 0.5 * Math.max(0, chain - 1));
}

/** Score a capture of moths worth `worths`, the `chain`th loop of a combo; Gold Weave raises the tier. */
export function scoreLoop(area, worths, chain, goldWeave) {
  const tier = Math.min(5, loopTier(area) + (goldWeave ? 1 : 0));
  const count = worths.length;
  if (count === 0) return { points: 0, tier, count, multiplier: 0 };
  const multiplier = tier * count * chainMultiplier(chain);
  return { points: Math.round(worths.reduce((sum, worth) => sum + worth, 0) * multiplier), tier, count, multiplier };
}

export function waveBonus(wave, perfect) {
  return SCORING.waveClear * wave + (perfect ? SCORING.perfectWave : 0);
}

/** The run's grade so far, S to D: score against par for the waves woven, with progress to the next grade. */
export function runGrade(state) {
  const woven = Math.max(0.5, state.wave - 1 + Math.min(1, state.stats.waveCaptured / Math.max(1, state.waveTotal || 1)));
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

export function formatScore(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
