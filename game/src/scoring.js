// How a closed loop turns into points: the loop's area sets a tier, every moth inside adds its
// worth, the count multiplies, and loops closed in quick succession chain into a combo.
import { SCORING } from './config.js';

/** Tier 1 to 4 from the loop's area: bigger loops are worth more per moth. */
export function loopTier(area) {
  let tier = 1;
  for (const threshold of SCORING.tiers) if (area >= threshold) tier += 1;
  return tier;
}

/** The tier's name for the capture label. */
export function tierName(tier) {
  return SCORING.tierNames[Math.max(0, Math.min(SCORING.tierNames.length - 1, tier - 1))];
}

/** The chain multiplier: +50% per loop in the chain beyond the first, up to ×4. */
export function chainMultiplier(chain) {
  return Math.min(4, 1 + 0.5 * Math.max(0, chain - 1));
}

/**
 * Score a capture: `worths` are the base values of the moths enclosed; `chain` counts this loop
 * among the loops closed within the combo window; `goldWeave` raises the tier by one.
 */
export function scoreLoop(area, worths, chain, goldWeave) {
  const tier = Math.min(5, loopTier(area) + (goldWeave ? 1 : 0));
  const count = worths.length;
  if (count === 0) return { points: 0, tier, count, multiplier: 0, chainMultiplier: 1 };
  const base = worths.reduce((sum, worth) => sum + worth, 0);
  const chainMult = chainMultiplier(chain);
  const multiplier = tier * count * chainMult;
  const points = Math.round(base * multiplier);
  return { points, tier, count, multiplier, chainMultiplier: chainMult };
}

/** Points for clearing a wave, more when the Weaver was never touched. */
export function waveBonus(wave, perfect) {
  return SCORING.waveClear * wave + (perfect ? SCORING.perfectWave : 0);
}

/** A number with thin spaces every three digits, for the HUD. */
export function formatScore(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
