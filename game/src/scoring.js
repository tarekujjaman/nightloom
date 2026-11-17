// Points for a closed loop (area tier × moths × chain), the wave bonus and the run grade.
import { SCORING } from './config.js';

export const loopTier = (area) => 1 + SCORING.tiers.filter((threshold) => area >= threshold).length;
export const tierName = (tier) => SCORING.tierNames[Math.max(0, Math.min(SCORING.tierNames.length - 1, tier - 1))];
export const chainMultiplier = (chain) => Math.min(4, 1 + 0.5 * Math.max(0, chain - 1));

export function scoreLoop(area, worths, chain, goldWeave) {
  const tier = Math.min(5, loopTier(area) + (goldWeave ? 1 : 0));
  const count = worths.length;
  if (count === 0) return { points: 0, tier, count, multiplier: 0 };
  const multiplier = tier * count * chainMultiplier(chain);
  return { points: Math.round(worths.reduce((sum, worth) => sum + worth, 0) * multiplier), tier, count, multiplier };
}

export const waveBonus = (wave, perfect) => SCORING.waveClear * wave + (perfect ? SCORING.perfectWave : 0);

export function runGrade(state) {
  const woven = Math.max(0.5, state.wave - 1 + Math.min(1, state.stats.waveCaptured / Math.max(1, state.waveTotal || 1)));
  const ratio = state.score / (SCORING.par * woven * (woven + 1));
  const grades = SCORING.grades;
  const i = grades.findIndex((grade) => ratio >= grade[1]);
  if (i < 0) return { letter: 'D', ratio, progress: 0 };
  return { letter: grades[i][0], ratio, progress: i > 0 ? (ratio - grades[i][1]) / (grades[i - 1][1] - grades[i][1]) : 1 };
}

export const formatScore = (value) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
