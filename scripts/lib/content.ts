import { type Rng, chance, pick, weightedPick } from './random.ts';

export type Tone =
  | 'agree'
  | 'disagree'
  | 'humor'
  | 'cinephile'
  | 'recommendation'
  | 'question'
  | 'emotional'
  | 'technical'
  | 'short'
  | 'mixed';

export const TONES: readonly Tone[] = [
  'agree',
  'disagree',
  'humor',
  'cinephile',
  'recommendation',
  'question',
  'emotional',
  'technical',
  'short',
  'mixed',
];

const openers: Record<Exclude<Tone, 'mixed'>, readonly string[]> = {
  agree: [
    'Completamente de acuerdo',
    'Justo eso pensé',
    'Comparto cada palabra',
    'Sí, sí y mil veces sí',
    'No podría haberlo dicho mejor',
    'Coincido, sobre todo',
    'Igualito que tú lo viví',
    'Mismo sentimiento aquí',
    'Mira que me pasa lo mismo',
    'Esto que dices del final me pasó tal cual',
  ],
  disagree: [
    'Mmm, no del todo',
    'A mí me pareció lo opuesto',
    'Discrepo con la valoración',
    'Para mí está sobrevalorada',
    'No la veo tan redonda',
    'Creo que se le perdona mucho',
    'No me convenció en absoluto',
    'Honestamente me esperaba más',
    'No sé, a mí se me hizo larga',
    'Le veo más costuras que tú',
  ],
  humor: [
    'JAJA exacto',
    'Me reí más de la cuenta',
    'Mi cara durante toda la peli era un poema',
    'Mi pareja me miró raro cuando',
    'Me quedé con cara de bobo en',
    'Me la vendieron como drama y me reí solo',
    'Casi tiro las palomitas en',
  ],
  cinephile: [
    'La fotografía hace todo el trabajo',
    'El uso del color en la segunda mitad merece estudio',
    'El montaje paralelo del tercer acto es delicioso',
    'La banda sonora puntúa cada decisión narrativa',
    'Hay un guiño claro a Tarkovsky',
    'Recuerda mucho al Bergman de los 60',
    'Plano-contraplano clásico pero efectivo',
    'La planificación de la escena del bar es de manual',
    'Mise-en-scène impecable',
    'El blocking de los secundarios cuenta otra película detrás',
  ],
  recommendation: [
    'Si te gustó, prueba con',
    'Te recomendaría también',
    'Va perfecta como doble sesión con',
    'Después de ésta toca ver',
    'En la misma vena tienes',
    'Pareja perfecta con',
    'Y si quieres más de lo mismo',
  ],
  question: [
    '¿Viste también la secuela?',
    '¿Qué pensaste del giro del segundo acto?',
    '¿Es la versión del director o la teatral?',
    '¿Te dio el mismo bajón al final?',
    '¿Crees que el personaje secundario era sincero?',
    '¿La viste en cine o en casa?',
    '¿Le pillaste el detalle del espejo?',
    '¿Lo del título tiene doble lectura para ti?',
  ],
  emotional: [
    'Esa escena final me destrozó',
    'Tuve que pausar y respirar',
    'No esperaba salir tan tocado',
    'Hacía tiempo que una peli no me removía así',
    'Me acordé de mi padre durante',
    'Lloré más de lo que admito',
    'Me dejó pensando dos días',
    'Me hizo llamar a un amigo al terminar',
  ],
  technical: [
    'El sonido envolvente cambia todo',
    'Anamórfico clarísimo, mira los reflejos',
    'El grano es decisión estética, no descuido',
    'Edición invisible: 90 cortes que no notas',
    '24fps en exteriores hace mucho',
    'El sound design del clímax es maestría pura',
    'Foley de manual en la pelea del puente',
    'La corrección de color va dos pasos por delante del guion',
  ],
  short: [
    'Esto',
    '+1',
    'Brutal',
    'Tal cual',
    'Real',
    'Justo',
    'Bestia',
    'Crack',
    'Suscribo',
    'Mítica',
    'Joya',
    'Top',
  ],
};

const middles: readonly string[] = [
  'sobre todo cuando',
  'pero pensándolo bien',
  'y aun así',
  'lo curioso es que',
  'aunque admito que',
  'y eso que normalmente',
  'incluso si descuentas',
  'aunque la primera vez',
  'al final me convenció',
];

const closers: readonly string[] = [
  '. Revisar pendiente.',
  '. Te dejo pensándolo.',
  '. Cosa rara, sí.',
  '. ¿O soy solo yo?',
  '. Lo dejo ahí.',
  '. La rejugaría ya.',
  '. Sin spoilers, claro.',
  '. Por eso digo.',
  '.',
  '.',
  '.',
  '.',
  '!',
];

const specificScenes: readonly string[] = [
  'el monólogo del minuto 90',
  'el plano del pasillo',
  'la escena del coche',
  'la cena familiar',
  'el flashback en blanco y negro',
  'la conversación bajo la lluvia',
  'el corte a negro',
  'el primer acto',
  'el clímax',
  'la última frase',
  'el plano secuencia',
  'la elipsis del aeropuerto',
  'la escena del ascensor',
];

const titles: readonly string[] = [
  'Heat',
  'Drive',
  'Whiplash',
  'La La Land',
  'Parasite',
  'Oldboy',
  'Mulholland Drive',
  'Mad Max: Fury Road',
  'No Country for Old Men',
  'The Social Network',
  'Children of Men',
  'Burning',
  'In Bruges',
  'Sicario',
  'Memories of Murder',
  'Past Lives',
  'Aftersun',
  'The Worst Person in the World',
  'Anatomy of a Fall',
];

// Cap so we never violate review_replies_body_length_check (max 2000).
const MAX_LEN = 1800;
const cap = (s: string): string => (s.length > MAX_LEN ? s.slice(0, MAX_LEN - 1).trimEnd() + '.' : s);

export function generateReply(rng: Rng, tone: Tone): string {
  if (tone === 'mixed') {
    const a = generateReply(rng, pick(rng, ['agree', 'disagree'] as const));
    const b = generateReply(
      rng,
      pick(rng, ['cinephile', 'emotional', 'technical', 'recommendation'] as const),
    );
    return cap(`${a.replace(/[.!]+$/, '')}. ${b}`);
  }

  if (tone === 'short') return pick(rng, openers.short);

  const opener = pick(rng, openers[tone]);
  const scene = pick(rng, specificScenes);
  const middle = pick(rng, middles);
  const closer = pick(rng, closers);

  switch (tone) {
    case 'recommendation':
      return cap(`${opener} ${pick(rng, titles)}${closer}`);
    case 'question':
      return opener;
    case 'cinephile':
    case 'technical':
      return cap(
        `${opener}${chance(rng, 0.4) ? ` (${scene})` : ''}${closer}`.replace(/\s+/g, ' ').trim(),
      );
    case 'agree':
      return cap(`${opener} con ${scene}${closer}`);
    case 'disagree':
      return cap(`${opener}, ${middle} ${scene} no me convenció${closer}`);
    case 'humor':
      return cap(`${opener} en ${scene}${closer}`);
    case 'emotional':
      return cap(
        `${opener}.${chance(rng, 0.4) ? ` Sobre todo ${scene}.` : ''}`.replace(/\s+/g, ' ').trim(),
      );
  }
}

export function pickTone(rng: Rng, weights: Record<Tone, number>): Tone {
  return weightedPick(rng, TONES, TONES.map((t) => weights[t] ?? 1));
}
