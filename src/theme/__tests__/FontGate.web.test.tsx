import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { useFonts } from 'expo-font';
import { FONT_TIMEOUT_MS, FontGate } from '../FontGate.web';
import { fontNames } from '../typography';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
const mockUseFonts = useFonts as jest.MockedFunction<typeof useFonts>;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderGate(): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <FontGate>
        <Text>app</Text>
      </FontGate>,
    );
  });
  return renderer;
}

const showsApp = (renderer: ReactTestRenderer) => renderer.toJSON() !== null;

describe('FontGate (web)', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
    mockUseFonts.mockReset();
  });

  it('registers every font under the family name typography.ts uses', () => {
    mockUseFonts.mockReturnValue([false, null]);
    renderGate();
    expect(Object.keys(mockUseFonts.mock.calls[0][0] as object).sort()).toEqual(Object.values(fontNames).sort());
  });

  it('renders nothing while the fonts load, then the app once they are loaded', () => {
    mockUseFonts.mockReturnValue([false, null]);
    const renderer = renderGate();
    expect(showsApp(renderer)).toBe(false);

    mockUseFonts.mockReturnValue([true, null]);
    act(() => renderer.update(<FontGate><Text>app</Text></FontGate>));
    expect(showsApp(renderer)).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('renders the app and warns when the fonts fail to load', () => {
    mockUseFonts.mockReturnValue([false, new Error('network')]);
    const renderer = renderGate();
    expect(showsApp(renderer)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it(`renders the app and warns when the fonts are not ready after ${FONT_TIMEOUT_MS} ms`, () => {
    mockUseFonts.mockReturnValue([false, null]);
    const renderer = renderGate();

    act(() => jest.advanceTimersByTime(FONT_TIMEOUT_MS - 1));
    expect(showsApp(renderer)).toBe(false);
    expect(warn).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(showsApp(renderer)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn about a timeout when the fonts load in time', () => {
    mockUseFonts.mockReturnValue([false, null]);
    const renderer = renderGate();
    mockUseFonts.mockReturnValue([true, null]);
    act(() => renderer.update(<FontGate><Text>app</Text></FontGate>));
    act(() => jest.advanceTimersByTime(FONT_TIMEOUT_MS * 2));
    expect(warn).not.toHaveBeenCalled();
  });
});
