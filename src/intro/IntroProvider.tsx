import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { RupieroMark } from '../brand/RupieroMark';
import type { RollSpec } from '../components/countUp';
import { useTheme } from '../theme/ThemeProvider';

// Keep the native splash up until the overlay below (the same mark, same spot) is laid out. Holding it
// longer blocks the app's first frame, and if that outlasts Android's splash hand-off timeout the
// system drops the splash and shows an empty black window.
SplashScreen.preventAutoHideAsync().catch(() => {});
const hideNativeSplash = () => SplashScreen.hide();

// Android 12+ draws the splash icon at 288 dp; the mark fills 1 − 2 × 0.27 of it
// (SPLASH_PADDING in scripts/render-brand-assets.ts), so the overlay mark lines up with it.
const MARK_SIZE = Math.round(288 * (1 - 2 * 0.27));

// Timeline in ms from the moment the native splash goes away. Everything ends before 1 s.
const LIFT_MS = 170;
const PRESS_MS = 110;
const SETTLE_MS = 100;
const IMPACT_MS = LIFT_MS + PRESS_MS;
const FADE_START_MS = 380;
const FADE_MS = 180;
// The count-up starts as the overlay is mostly gone, so it visibly begins near 0, and ends at 920 ms.
const ROLL: { delayMs: number; durationMs: number } = { delayMs: 480, durationMs: 440 };
// Hide the splash anyway if the first screen never reports in (e.g. a database error).
const FALLBACK_MS = 4000;

interface IntroContextValue {
  /** Call once the first screen can be shown; starts the stamp. Safe to call repeatedly. */
  ready: () => void;
  /** Count-up for the opening balances, or null (reduced motion, or not started). */
  roll: RollSpec | null;
}

const IntroContext = createContext<IntroContextValue>({ ready: () => {}, roll: null });

export const useIntro = () => useContext(IntroContext);

type Phase = 'waiting' | 'stamping' | 'done';

/**
 * Opening sequence: static native splash → the same mark as an overlay while the first screen loads →
 * once it is ready, the mark is stamped (lift, press, ink ring) while the
 * overlay fades → the balances count up from 0. With the system's reduce-motion setting on, the splash just
 * goes away and nothing moves.
 */
export function IntroProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('waiting');
  const [roll, setRoll] = useState<RollSpec | null>(null);
  const started = useRef(false);

  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value, transform: [{ scale: ringScale.value }] }));

  const ready = useCallback(() => {
    if (started.current) return;
    started.current = true;
    hideNativeSplash();

    if (reduceMotion) {
      setPhase('done');
      return;
    }

    setPhase('stamping');
    setRoll({ startAt: performance.now() + ROLL.delayMs, durationMs: ROLL.durationMs });

    const lift = { duration: LIFT_MS, easing: Easing.out(Easing.quad) };
    const press = { duration: PRESS_MS, easing: Easing.in(Easing.cubic) };
    scale.value = withSequence(
      withTiming(1.12, lift),
      withTiming(0.94, press),
      withTiming(1, { duration: SETTLE_MS, easing: Easing.out(Easing.quad) }),
    );
    rotate.value = withSequence(withTiming(-5, lift), withTiming(0, press));
    ringOpacity.value = withDelay(
      IMPACT_MS,
      withSequence(withTiming(0.35, { duration: 0 }), withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) })),
    );
    ringScale.value = withDelay(IMPACT_MS, withTiming(1.35, { duration: 240, easing: Easing.out(Easing.quad) }));
    overlayOpacity.value = withDelay(FADE_START_MS, withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.quad) }));
  }, [reduceMotion, scale, rotate, ringScale, ringOpacity, overlayOpacity]);

  useEffect(() => {
    const timer = setTimeout(ready, FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (phase !== 'stamping') return;
    const timer = setTimeout(() => setPhase('done'), FADE_START_MS + FADE_MS + 20);
    return () => clearTimeout(timer);
  }, [phase]);

  const value = useMemo(() => ({ ready, roll }), [ready, roll]);

  return (
    <IntroContext.Provider value={value}>
      {children}
      {phase !== 'done' && (
        <StampOverlay overlayStyle={overlayStyle} markStyle={markStyle} ringStyle={ringStyle} />
      )}
    </IntroContext.Provider>
  );
}

interface StampOverlayProps {
  overlayStyle: ReturnType<typeof useAnimatedStyle>;
  markStyle: ReturnType<typeof useAnimatedStyle>;
  ringStyle: ReturnType<typeof useAnimatedStyle>;
}

function StampOverlay({ overlayStyle, markStyle, ringStyle }: StampOverlayProps) {
  const { color } = useTheme();
  return (
    <Animated.View
      pointerEvents="none"
      onLayout={hideNativeSplash}
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: color.bg }, overlayStyle]}
    >
      <View style={styles.stage}>
        <Animated.View
          style={[styles.ring, { borderColor: color.ink, borderRadius: MARK_SIZE * 0.08 }, ringStyle]}
        />
        <Animated.View style={markStyle}>
          <RupieroMark size={MARK_SIZE} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: MARK_SIZE,
    height: MARK_SIZE,
  },
  ring: {
    position: 'absolute',
    // The ring traces the mark's frame (inset 9/100, stroke 6/100).
    top: MARK_SIZE * 0.06,
    left: MARK_SIZE * 0.06,
    right: MARK_SIZE * 0.06,
    bottom: MARK_SIZE * 0.06,
    borderWidth: MARK_SIZE * 0.06,
  },
});
