import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

type EmblemType = 'streak' | 'xp';
export function PremiumEmblem({ kind, size = 40, animated = true }: { kind: EmblemType; size?: number; animated?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2050, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 2050, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [pulse, animated]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.045] });
  // O streak anima somente a chama: sem círculo/halo dourado atrás dela.
  // O cristal de XP conserva o brilho próprio.
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.20, 0.47] });
  const asset = kind === 'streak' ? require('../../assets/ui/streak-flame.png') : require('../../assets/ui/xp-crystal.png');
  return (
    <View accessible accessibilityLabel={kind === 'streak' ? 'Emblema de sequência' : 'Emblema de experiência'}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {animated && kind === 'xp' && <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size * 0.72, height: size * 0.72,
        borderRadius: size, backgroundColor: '#66C6FF', opacity,
        transform: [{ scale }], shadowColor: '#83CBFF',
        shadowOpacity: 0.75, shadowRadius: size * 0.22 }} />}
      <Animated.View style={{ transform: [{ scale: animated ? scale : 1 }] }}>
        <Image source={asset} resizeMode="contain" style={{ width: size * 0.9, height: size * 0.9 }} />
      </Animated.View>
    </View>
  );
}
