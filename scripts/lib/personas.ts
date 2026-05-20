import type { Tone } from './content.ts';

export type Persona =
  | 'whale'
  | 'cinephile'
  | 'casual'
  | 'lurker'
  | 'mainstream'
  | 'genre-fan';

export interface PersonaProfile {
  replyLambda: number;
  likeLambda: number;
  toneWeights: Record<Tone, number>;
}

export const personas: Record<Persona, PersonaProfile> = {
  whale: {
    replyLambda: 18,
    likeLambda: 60,
    toneWeights: {
      agree: 4, disagree: 2, humor: 3, cinephile: 2, recommendation: 2,
      question: 2, emotional: 2, technical: 1, short: 1, mixed: 2,
    },
  },
  cinephile: {
    replyLambda: 9,
    likeLambda: 25,
    toneWeights: {
      agree: 2, disagree: 3, humor: 1, cinephile: 6, recommendation: 4,
      question: 2, emotional: 1, technical: 5, short: 0.2, mixed: 2,
    },
  },
  casual: {
    replyLambda: 3,
    likeLambda: 12,
    toneWeights: {
      agree: 5, disagree: 1, humor: 3, cinephile: 0.5, recommendation: 1,
      question: 2, emotional: 3, technical: 0.2, short: 4, mixed: 1,
    },
  },
  lurker: {
    replyLambda: 0.4,
    likeLambda: 5,
    toneWeights: {
      agree: 3, disagree: 0.2, humor: 1, cinephile: 0.1, recommendation: 0.2,
      question: 1, emotional: 1, technical: 0.1, short: 6, mixed: 0.2,
    },
  },
  mainstream: {
    replyLambda: 5,
    likeLambda: 18,
    toneWeights: {
      agree: 4, disagree: 1, humor: 4, cinephile: 1, recommendation: 2,
      question: 2, emotional: 3, technical: 0.3, short: 3, mixed: 1,
    },
  },
  'genre-fan': {
    replyLambda: 7,
    likeLambda: 20,
    toneWeights: {
      agree: 3, disagree: 2, humor: 2, cinephile: 3, recommendation: 5,
      question: 2, emotional: 3, technical: 2, short: 1, mixed: 2,
    },
  },
};

// Deterministic long-tail distribution from user index — same user, same persona across runs.
export function assignPersona(idx: number): Persona {
  const r = ((idx * 9301 + 49297) % 233280) / 233280;
  if (r < 0.05) return 'whale';
  if (r < 0.15) return 'cinephile';
  if (r < 0.35) return 'mainstream';
  if (r < 0.55) return 'genre-fan';
  if (r < 0.80) return 'casual';
  return 'lurker';
}
