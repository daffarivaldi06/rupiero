import { useEffect, useState } from 'react';

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

/**
 * The amount shown at progress `t` (0–1) of a count-up from 0 to `target` (minor units). Eases out,
 * truncates toward zero so it never passes the target, and is exactly `target` once `t` reaches 1.
 */
export function countUpFrame(target: number, t: number): number {
  if (t >= 1) return target;
  return Math.trunc(target * easeOutCubic(clamp01(t))) || 0; // `|| 0` turns -0 into 0
}

/** When a count-up runs, on the `performance.now()` clock. */
export interface RollSpec {
  startAt: number;
  durationMs: number;
}

/** `target`, counted up once if `roll` has not finished yet; static otherwise. */
export function useCountUp(target: number, roll: RollSpec | null | undefined): number {
  const pending = (spec: RollSpec | null | undefined): spec is RollSpec =>
    !!spec && performance.now() < spec.startAt + spec.durationMs;
  const [value, setValue] = useState(() => (pending(roll) ? 0 : target));

  useEffect(() => {
    if (!pending(roll)) {
      setValue(target);
      return;
    }
    let frame = 0;
    const tick = () => {
      const t = (performance.now() - roll.startAt) / roll.durationMs;
      setValue(countUpFrame(target, t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Snap to the exact value even if the loop is cut short.
    return () => {
      cancelAnimationFrame(frame);
      setValue(target);
    };
  }, [target, roll]);

  return value;
}
