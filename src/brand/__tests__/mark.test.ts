import { buildMarkSvg, markColors } from '../mark';
import { palettes } from '../../theme/tokens';

const colors = { ink: '#111111', eur: '#2222AA', idr: '#AA8800' };

describe('buildMarkSvg', () => {
  it('draws the letter and rule in ink and one bar per currency', () => {
    const svg = buildMarkSvg(colors);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">')).toBe(true);
    expect(svg.match(/#111111/g)).toHaveLength(5);
    expect(svg.match(/#2222AA/g)).toHaveLength(1);
    expect(svg.match(/#AA8800/g)).toHaveLength(1);
  });

  it('pads by growing the viewBox and fills the background', () => {
    const svg = buildMarkSvg(colors, { background: '#FFFFFF', padding: 0.25 });
    expect(svg).toContain('viewBox="-50 -50 200 200"');
    expect(svg).toContain('<rect x="-50" y="-50" width="200" height="200" fill="#FFFFFF"/>');
  });

  it('rejects padding that leaves no room for the mark', () => {
    expect(() => buildMarkSvg(colors, { padding: 0.5 })).toThrow(RangeError);
    expect(() => buildMarkSvg(colors, { padding: -0.1 })).toThrow(RangeError);
  });
});

describe('markColors', () => {
  it('uses the IDR text colour for the lower bar', () => {
    expect(markColors(palettes.light)).toEqual({ ink: '#1C1B19', eur: '#2E4A8B', idr: '#8A5D00' });
    expect(markColors(palettes.dark)).toEqual({ ink: '#ECE8DF', eur: '#9DB2EA', idr: '#E0A93A' });
  });
});
