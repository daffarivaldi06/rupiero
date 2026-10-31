import { rollFrame } from '../rolling';

const NBSP = ' ';
const target = `Rp${NBSP}12.450.000`;

describe('rollFrame', () => {
  it('ends on the target', () => {
    expect(rollFrame(target, 1)).toBe(target);
    expect(rollFrame(target, 1.5)).toBe(target);
  });

  it('keeps length and every non-digit in place on every frame', () => {
    for (let t = 0; t < 1; t += 0.05) {
      const frame = rollFrame(target, t);
      expect(frame).toHaveLength(target.length);
      expect(frame.replace(/\d/g, '#')).toBe(target.replace(/\d/g, '#'));
    }
  });

  it('starts away from the target and settles left to right', () => {
    expect(rollFrame(target, 0)).not.toBe(target);
    const midway = rollFrame(target, 0.6);
    expect(midway.slice(0, 4)).toBe(target.slice(0, 4)); // first digit settled
    expect(midway).not.toBe(target); // last digits still turning
  });

  it('handles a single digit and text without digits', () => {
    expect(rollFrame('€ 7', 0.5)).toHaveLength(3);
    expect(rollFrame('—', 0)).toBe('—');
  });
});
