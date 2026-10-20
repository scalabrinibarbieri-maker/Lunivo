import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { encodeMatches } from '../features/learning/engine';
import type { MatchExercise } from '../features/learning/types';

/** Sem ajuda de correção até o aluno apertar Verificar; pode desfazer um par. */
export function MatchBoard({ exercise, checked, onAnswer }: {
  exercise: MatchExercise;
  checked: boolean;
  onAnswer: (encoded: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const rightOrder = [...exercise.pairs.slice(1), exercise.pairs[0]!].filter(Boolean);
  const rightChosen = new Set(Object.values(matches));
  const leftPress = (id: string) => {
    if (checked) return;
    if (matches[id]) {
      const next = { ...matches };
      delete next[id];
      setMatches(next);
      setSelected(null);
      onAnswer(encodeMatches(next));
    } else {
      setSelected(id);
    }
  };
  const rightPress = (id: string) => {
    if (checked || !selected || rightChosen.has(id)) return;
    const next = { ...matches, [selected]: id };
    setMatches(next);
    setSelected(null);
    onAnswer(encodeMatches(next));
  };

  return <View style={styles.wrap}>
    <Text style={styles.hint}>Toque primeiro no italiano, depois na tradução. Toque num par feito para desfazê-lo.</Text>
    <View style={styles.columns}>
      <View style={styles.column}>
        <Text style={styles.heading}>ITALIANO</Text>
        {exercise.pairs.map(pair => {
          const assigned = Boolean(matches[pair.id]);
          return <Pressable key={pair.id} accessibilityRole="button"
            accessibilityLabel={`Italiano: ${pair.left}${assigned ? ', associado. Toque para desfazer.' : ''}`}
            accessibilityState={{ selected: selected === pair.id, disabled: checked }}
            disabled={checked} onPress={() => leftPress(pair.id)}
            style={[styles.tile, selected === pair.id && styles.active, assigned && styles.done]}>
            <Text style={[styles.tileText, (assigned || selected === pair.id) && styles.strong]}>{pair.left}</Text>
            {assigned && <Text style={styles.marker}>✓</Text>}
          </Pressable>;
        })}
      </View>
      <View style={styles.column}>
        <Text style={styles.heading}>PORTUGUÊS</Text>
        {rightOrder.map(pair => {
          const assigned = rightChosen.has(pair.id);
          return <Pressable key={pair.id} accessibilityRole="button"
            accessibilityLabel={`Português: ${pair.right}${assigned ? ', associado' : ''}`}
            accessibilityState={{ disabled: checked || assigned }}
            disabled={checked || assigned} onPress={() => rightPress(pair.id)}
            style={[styles.tile, assigned && styles.done, !selected && !assigned && styles.inactive]}>
            <Text style={[styles.tileText, assigned && styles.strong]}>{pair.right}</Text>
            {assigned && <Text style={styles.marker}>✓</Text>}
          </Pressable>;
        })}
      </View>
    </View>
    <Text style={styles.counter}>{Object.keys(matches).length} de {exercise.pairs.length} pares associados</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 25, gap: 12 },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 11 },
  heading: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tile: { minHeight: 73, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.line,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 9, flexDirection: 'row', gap: 5 },
  active: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  done: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  inactive: { opacity: 0.8 },
  tileText: { color: colors.ink, fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  strong: { fontWeight: '900' },
  marker: { color: colors.green, fontWeight: '900' },
  counter: { color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: 4 },
});
