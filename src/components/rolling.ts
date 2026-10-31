import { useEffect, useState } from 'react';

const isDigit = (char: string) => char >= '0' && char <= '9';
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

/**
 * One frame of an odometer roll toward `target` at progress `t` (0–1). Each digit spins and
 * settles, left to right; everything else (symbol, separators, sign) stays put, so the text keeps
 * its length and, with tabular figures, its width.
 */
export function rollFrame(target: string, t: number, spins = 2): string {
  if (t >= 1) return target;
  const chars = [...target];
  const digitCount = chars.filter(isDigit).length;
  let index = 0;
  return chars
    .map((char) => {
      if (!isDigit(char)) return char;
      // The first digit settles at 55% of the roll, the last at 100%.
      const settleAt = digitCount > 1 ? 0.55 + 0.45 * (index / (digitCount - 1)) : 1;
      index += 1;
      const remaining = 1 - easeOutCubic(clamp01(t / settleAt));
      const offset = Math.ceil(remaining * (spins * 10 - 1));
      return String((Number(char) + offset) % 10);
    })
    .join('');
}

/** When a roll runs, on the `performance.now()` clock. */
export interface RollSpec {
  startAt: number;
  durationMs: number;
}

/** `target`, rolled in once if `roll` has not finished yet; static otherwise. */
export function useRollingText(target: string, roll: RollSpec | null | undefined): string {
  const pending = (spec: RollSpec | null | undefined): spec is RollSpec =>
    !!spec && performance.now() < spec.startAt + spec.durationMs;
  const [text, setText] = useState(() => (pending(roll) ? rollFrame(target, 0) : target));

  useEffect(() => {
    if (!pending(roll)) {
      setText(target);
      return;
    }
    let frame = 0;
    const tick = () => {
      const t = (performance.now() - roll.startAt) / roll.durationMs;
      setText(rollFrame(target, Math.max(t, 0)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, roll]);

  return text;
}
