import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type AuraVariant = 'surface' | 'hero' | 'lesson' | 'streak';

const palettes: Record<AuraVariant, { primary: string; secondary: string; tertiary: string }> = {
  surface: { primary: 'rgba(61,145,231,0.16)', secondary: 'rgba(151,221,255,0.10)', tertiary: 'rgba(246,194,126,0.08)' },
  hero: { primary: 'rgba(125,191,255,0.14)', secondary: 'rgba(50,121,245,0.12)', tertiary: 'rgba(255,255,255,0.05)' },
  lesson: { primary: 'rgba(108,189,255,0.12)', secondary: 'rgba(246,194,126,0.10)', tertiary: 'rgba(255,255,255,0.04)' },
  streak: { primary: 'rgba(247,166,94,0.18)', secondary: 'rgba(255,226,152,0.10)', tertiary: 'rgba(255,255,255,0.04)' },
};

export function PremiumLoopAura({ variant = 'surface', opacity = 1 }: { variant?: AuraVariant; opacity?: number }) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopA = Animated.loop(Animated.sequence([
      Animated.timing(driftA, { toValue: 1, duration: 4600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftA, { toValue: 0, duration: 4600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loopB = Animated.loop(Animated.sequence([
      Animated.timing(driftB, { toValue: 1, duration: 5700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftB, { toValue: 0, duration: 5700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loopGlow = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loopA.start();
    loopB.start();
    loopGlow.start();
    return () => {
      loopA.stop();
      loopB.stop();
      loopGlow.stop();
    };
  }, [driftA, driftB, glow]);

  const palette = palettes[variant];
  const shared = { opacity };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.puff,
          shared,
          {
            width: 210,
            height: 118,
            top: -28,
            right: -26,
            backgroundColor: palette.primary,
            transform: [
              { translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
              { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
              { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.puff,
          shared,
          {
            width: 176,
            height: 84,
            bottom: -12,
            left: -36,
            backgroundColor: palette.secondary,
            transform: [
              { translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
              { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
              { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1.02, 0.94] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.shine,
          shared,
          {
            backgroundColor: palette.tertiary,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.14 * opacity, 0.3 * opacity] }),
            transform: [
              { translateX: glow.interpolate({ inputRange: [0, 1], outputRange: [-24, 26] }) },
              { rotate: '-9deg' },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  puff: {
    position: 'absolute',
    borderRadius: 999,
  },
  shine: {
    position: 'absolute',
    top: 14,
    right: 10,
    width: 96,
    height: 210,
    borderRadius: 72,
  },
});
