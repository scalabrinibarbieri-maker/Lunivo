export type ChoiceExercise = {
  type: 'choice'; id: string; prompt: string; instruction: string;
  options: readonly { id: string; label: string }[]; correctOptionId: string;
  explanation: string;
};
export type WriteExercise = {
  type: 'write'; id: string; prompt: string; instruction: string;
  acceptedAnswers: readonly string[]; sampleAnswer: string; explanation: string;
};
export type Exercise = ChoiceExercise | WriteExercise;
export type Lesson = { id: string; title: string; subtitle: string; unit: number; exercises: readonly Exercise[] };
