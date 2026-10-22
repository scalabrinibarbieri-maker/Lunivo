import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

export function AnimatedInstructionCue({ text }: { text: string }) {
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).slice(0, 6), [text]);
  const entries = useRef<Animated.Value[]>([]).current;
  const underline = useRef(new Animated.Value(0)).current;

  if (entries.length !== words.length) {
    entries.splice(0, entries.length, ...words.map(() => new Animated.Value(0)));
  }

  useEffect(() => {
    entries.forEach(value => value.setValue(0));
    underline.setValue(0);
    const reveal = Animated.stagger(65, entries.map(value => Animated.timing(value, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })));
    const line = Animated.sequence([
      Animated.delay(190),
      Animated.timing(underline, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(underline, { toValue: 0.72, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]);
    reveal.start();
    line.start();
  }, [entries, underline, text]);

  if (words.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.kicker}>OBJETIVO DA QUESTÃO</Text>
      <View style={styles.row}>
        {words.map((word, index) => {
          const value = entries[index]!;
          return (
            <Animated.View key={`${word}-${index}`} style={[
              styles.chip,
              {
                opacity: value,
                transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }],
              },
            ]}>
              <Text style={styles.word}>{word.toUpperCase()}</Text>
            </Animated.View>
          );
        })}
      </View>
      <View style={styles.underlineTrack}>
        <Animated.View style={[styles.underline, { width: underline.interpolate({ inputRange: [0, 1], outputRange: ['18%', '74%'] }) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 16 },
  kicker: { color: '#7DBEFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  chip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(142,200,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  word: { color: '#F6FBFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  underlineTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(177,214,247,0.14)', marginTop: 11, overflow: 'hidden' },
  underline: { height: '100%', borderRadius: 2, backgroundColor: '#F6C27E' },
});
