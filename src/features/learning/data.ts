import type { Lesson } from './types';

// Dados separados do motor: futuramente cursos podem vir de um CMS/API versionada.
export const LESSONS: readonly Lesson[] = [
  {
    id: 'it-a1-01', title: 'Primeiras palavras', subtitle: 'Saudações e cortesia', unit: 1,
    exercises: [
      { type: 'choice', id: 'q01', instruction: 'Escolha a tradução', prompt: 'Ciao!', options: [
        { id: 'a', label: 'Olá!' }, { id: 'b', label: 'Até amanhã!' }, { id: 'c', label: 'Obrigado!' }
      ], correctOptionId: 'a', explanation: '“Ciao” pode ser usado para cumprimentar ou se despedir informalmente.' },
      { type: 'choice', id: 'q02', instruction: 'Escolha a tradução', prompt: 'Buongiorno', options: [
        { id: 'a', label: 'Boa noite' }, { id: 'b', label: 'Bom dia' }, { id: 'c', label: 'Com licença' }
      ], correctOptionId: 'b', explanation: '“Buongiorno” é uma saudação usada durante o dia.' },
      { type: 'write', id: 'q03', instruction: 'Escreva em português', prompt: 'Grazie',
        acceptedAnswers: ['obrigado', 'obrigada'], sampleAnswer: 'Obrigado', explanation: '“Grazie” significa obrigado(a).' },
      { type: 'choice', id: 'q04', instruction: 'Qual é a tradução?', prompt: 'Per favore', options: [
        { id: 'a', label: 'Sinto muito' }, { id: 'b', label: 'De nada' }, { id: 'c', label: 'Por favor' }
      ], correctOptionId: 'c', explanation: '“Per favore” é uma forma educada de pedir algo.' },
      { type: 'write', id: 'q05', instruction: 'Escreva em italiano', prompt: 'Obrigado',
        acceptedAnswers: ['grazie'], sampleAnswer: 'Grazie', explanation: '“Grazie” é invariável para quem agradece.' },
      { type: 'choice', id: 'q06', instruction: 'Responda em italiano', prompt: 'Qual palavra significa “sim”?', options: [
        { id: 'a', label: 'No' }, { id: 'b', label: 'Sì' }, { id: 'c', label: 'Ciao' }
      ], correctOptionId: 'b', explanation: '“Sì” significa sim. “No” significa não.' }
    ],
  },
  {
    id: 'it-a1-02', title: 'Como você está?', subtitle: 'Perguntas e respostas', unit: 1,
    exercises: [
      { type: 'choice', id: 'q07', instruction: 'Escolha a tradução', prompt: 'Come stai?', options: [
        { id: 'a', label: 'Como você está?' }, { id: 'b', label: 'Qual é seu nome?' }, { id: 'c', label: 'Aonde você vai?' }
      ], correctOptionId: 'a', explanation: '“Come stai?” é uma pergunta informal.' },
      { type: 'write', id: 'q08', instruction: 'Escreva em português', prompt: 'Sto bene',
        acceptedAnswers: ['estou bem', 'eu estou bem'], sampleAnswer: 'Estou bem', explanation: '“Sto bene” expressa que você está bem.' },
      { type: 'choice', id: 'q09', instruction: 'Escolha a tradução', prompt: 'E tu?', options: [
        { id: 'a', label: 'E agora?' }, { id: 'b', label: 'E você?' }, { id: 'c', label: 'E ontem?' }
      ], correctOptionId: 'b', explanation: '“Tu” corresponde ao tratamento informal.' },
      { type: 'choice', id: 'q10', instruction: 'Escolha a tradução', prompt: 'Mi chiamo Luca', options: [
        { id: 'a', label: 'Eu chamo Luca' }, { id: 'b', label: 'Eu conheço Luca' }, { id: 'c', label: 'Meu nome é Luca' }
      ], correctOptionId: 'c', explanation: '“Mi chiamo” é usado para apresentar o próprio nome.' }
    ],
  },
  {
    id: 'it-a1-03', title: 'No café', subtitle: 'Pedidos simples', unit: 1,
    exercises: [
      { type: 'choice', id: 'q11', instruction: 'Escolha a tradução', prompt: 'Un caffè, per favore', options: [
        { id: 'a', label: 'Um café, por favor' }, { id: 'b', label: 'Uma água, por favor' }, { id: 'c', label: 'A conta, por favor' }
      ], correctOptionId: 'a', explanation: '“Un caffè” normalmente indica um café expresso.' },
      { type: 'write', id: 'q12', instruction: 'Escreva em italiano', prompt: 'Água',
        acceptedAnswers: ['acqua'], sampleAnswer: 'Acqua', explanation: '“Acqua” se escreve com duas letras c.' },
      { type: 'choice', id: 'q13', instruction: 'Escolha a tradução', prompt: 'Il conto, per favore', options: [
        { id: 'a', label: 'O cardápio, por favor' }, { id: 'b', label: 'A conta, por favor' }, { id: 'c', label: 'Um chá, por favor' }
      ], correctOptionId: 'b', explanation: '“Il conto” significa a conta.' },
      { type: 'choice', id: 'q14', instruction: 'Escolha a tradução', prompt: 'Quanto costa?', options: [
        { id: 'a', label: 'Quanto tempo?' }, { id: 'b', label: 'Onde fica?' }, { id: 'c', label: 'Quanto custa?' }
      ], correctOptionId: 'c', explanation: '“Quanto costa?” pergunta o preço.' }
    ],
  }
];
