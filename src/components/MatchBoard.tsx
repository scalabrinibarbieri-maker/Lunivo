import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MatchExercise } from '../features/learning/types';
import { encodeMatches } from '../features/learning/engine';

const NAVY = '#102942';
const BLUE = '#246FEB';
const MUTED = '#74849A';

/** A associação não confirma acerto até o botão Verificar resposta ser acionado. */
export function MatchBoard({ exercise, checked, onAnswer }: {
  exercise: MatchExercise;
  checked: boolean;
  onAnswer: (encoded: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  // Permuta somente a ordem visual; mantém os IDs reais para a correção existente.
  const rightOrder = [...exercise.pairs.slice(1), exercise.pairs[0]!].filter(Boolean);
  const rightChosen = new Set(Object.values(matches));
  const assignedIds = Object.keys(matches);

  const leftPress = (id: string) => {
    if (checked) return;
    if (matches[id]) {
      const next = { ...matches };
      delete next[id];
      setMatches(next);
      setSelected(null);
      onAnswer(encodeMatches(next));
    } else setSelected(id);
  };

  const rightPress = (id: string) => {
    if (checked || !selected || rightChosen.has(id)) return;
    const next = { ...matches, [selected]: id };
    setMatches(next);
    setSelected(null);
    onAnswer(encodeMatches(next));
  };

  const linkMarker = (leftId: string): string => {
    if (checked) return matches[leftId] === leftId ? '✓' : '×';
    return String(assignedIds.indexOf(leftId) + 1);
  };

  const pairedStyle = (leftId: string) => checked
    ? matches[leftId] === leftId ? styles.correct : styles.incorrect
    : styles.paired;
  const markerStyle = (leftId: string) => checked
    ? matches[leftId] === leftId ? styles.markerCorrect : styles.markerIncorrect
    : styles.markerPaired;

  return <View style={styles.wrap}>
    <View style={styles.guide}>
      <View style={styles.guideDot} />
      <Text style={styles.hint}>Escolha uma palavra italiana e toque na tradução correspondente. O acerto será mostrado depois de verificar.</Text>
    </View>
    <View style={styles.columns}>
      <View style={styles.column}>
        <Text style={styles.heading}>ITALIANO</Text>
        {exercise.pairs.map(pair => {
          const assigned = Boolean(matches[pair.id]);
          const active = selected === pair.id;
          return <Pressable key={pair.id} accessibilityRole="button"
            accessibilityLabel={`Italiano: ${pair.left}${assigned ? checked ? matches[pair.id] === pair.id ? ', associação correta' : ', associação incorreta' : ', par associado, aguardando correção; toque para desfazer' : active ? ', selecionado' : ''}`}
            accessibilityState={{ selected: active, disabled: checked }}
            disabled={checked} onPress={() => leftPress(pair.id)}
            style={({ pressed }) => [styles.tile, active && styles.active, assigned && pairedStyle(pair.id), pressed && styles.pressed]}>
            <Text style={[styles.tileText, (assigned || active) && styles.strong]}>{pair.left}</Text>
            {assigned && <View style={[styles.marker, markerStyle(pair.id)]}>
              <Text style={[styles.markerText, checked && styles.checkedText]}>{linkMarker(pair.id)}</Text>
            </View>}
          </Pressable>;
        })}
      </View>
      <View style={styles.column}>
        <Text style={styles.heading}>PORTUGUÊS</Text>
        {rightOrder.map(pair => {
          const leftId = Object.keys(matches).find(id => matches[id] === pair.id);
          const assigned = leftId !== undefined;
          return <Pressable key={pair.id} accessibilityRole="button"
            accessibilityLabel={`Português: ${pair.right}${assigned ? checked ? matches[leftId!] === pair.id && leftId === pair.id ? ', associação correta' : ', associação incorreta' : ', par associado, aguardando correção' : ''}`}
            accessibilityState={{ disabled: checked || assigned }}
            disabled={checked || assigned} onPress={() => rightPress(pair.id)}
            style={({ pressed }) => [styles.tile, assigned && pairedStyle(leftId), !selected && !assigned && styles.inactive, pressed && styles.pressed]}>
            <Text style={[styles.tileText, assigned && styles.strong]}>{pair.right}</Text>
            {assigned && <View style={[styles.marker, markerStyle(leftId)]}>
              <Text style={[styles.markerText, checked && styles.checkedText]}>{linkMarker(leftId)}</Text>
            </View>}
          </Pressable>;
        })}
      </View>
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.counter}>
      {checked ? 'Associações corrigidas' : `${assignedIds.length} de ${exercise.pairs.length} pares associados · Azul significa apenas selecionado`}
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24, gap: 14 },
  guide: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EAF1FD', paddingHorizontal: 13, paddingVertical: 13, borderRadius: 15, gap: 10 },
  guideDot: { width: 7, height: 7, backgroundColor: BLUE, borderRadius: 4, marginTop: 7 },
  hint: { flex: 1, color: '#436181', fontSize: 13, lineHeight: 19 },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 10 },
  heading: { color: MUTED, fontSize: 10, fontWeight: '900', letterSpacing: 1.25, marginBottom: 1 },
  tile: { minHeight: 77, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#DBE3ED', borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 7 },
  active: { borderColor: BLUE, backgroundColor: '#EAF2FF' },
  paired: { borderColor: '#5B9DFF', backgroundColor: '#ECF4FF' },
  correct: { borderColor: '#28A37B', backgroundColor: '#E9F9F3' },
  incorrect: { borderColor: '#D76A65', backgroundColor: '#FFF0EF' },
  inactive: { opacity: 0.77 },
  tileText: { color: NAVY, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  strong: { fontWeight: '900' },
  marker: { minWidth: 24, height: 24, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  markerPaired: { backgroundColor: '#3074DD' },
  markerCorrect: { backgroundColor: '#1E9A70' },
  markerIncorrect: { backgroundColor: '#CB5551' },
  markerText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  checkedText: { fontSize: 15 },
  counter: { textAlign: 'center', color: MUTED, fontSize: 11.5, lineHeight: 17, marginTop: 2 },
  pressed: { opacity: 0.8 },
});
