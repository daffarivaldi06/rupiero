import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { BREAKPOINTS, breakpointFor, useBreakpoint } from '../layout';

// react-native's index re-exports this module through a getter, so mock the module itself.
let mockWidth = 0;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 1, fontScale: 1 }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('breakpointFor', () => {
  it('is compact below 768px', () => {
    expect(breakpointFor(0)).toBe('compact');
    expect(breakpointFor(390)).toBe('compact');
    expect(breakpointFor(767)).toBe('compact');
  });

  it('is medium from 768px to 1023px', () => {
    expect(breakpointFor(768)).toBe('medium');
    expect(breakpointFor(1023)).toBe('medium');
  });

  it('is wide from 1024px to 1279px', () => {
    expect(breakpointFor(1024)).toBe('wide');
    expect(breakpointFor(1279)).toBe('wide');
  });

  it('is xl from 1280px', () => {
    expect(breakpointFor(1280)).toBe('xl');
    expect(breakpointFor(2560)).toBe('xl');
  });

  it('compares fractional widths (browser zoom) by value', () => {
    expect(breakpointFor(1023.5)).toBe('medium');
    expect(breakpointFor(1024.4)).toBe('wide');
  });

  it('uses the documented thresholds', () => {
    expect(BREAKPOINTS).toEqual({ medium: 768, wide: 1024, xl: 1280 });
  });
});

describe('useBreakpoint', () => {
  function Probe() {
    return <Text>{useBreakpoint()}</Text>;
  }

  const breakpointAt = (width: number) => {
    mockWidth = width;
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Probe />);
    });
    const json = renderer.toJSON();
    renderer.unmount();
    return json && !Array.isArray(json) ? json.children?.[0] : null;
  };

  it('follows the window width', () => {
    expect(breakpointAt(390)).toBe('compact');
    expect(breakpointAt(800)).toBe('medium');
    expect(breakpointAt(1024)).toBe('wide');
    expect(breakpointAt(1440)).toBe('xl');
  });
});
