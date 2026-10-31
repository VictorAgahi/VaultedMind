import type { ConstructKey } from './constructs.js';
import { STATE_QUESTIONS } from './self-question-bank.js';
import {
  eventQuestion,
  themeQuestion,
  type BankQuestion,
  type ScoreQuestion,
} from './question-types.js';

const OBSERVED = 'la personne suivie';
const OBSERVED_DAY_PHRASE = `la journée de ${OBSERVED}`;

/** Events of the self bank, rephrased for an author who describes someone else. */
const OBSERVED_EVENTS: Array<[string, ConstructKey, string, string]> = [
  [
    'conflict',
    'conflict',
    'Tension',
    `La note décrit-elle une tension ou un conflit entre ${OBSERVED} et quelqu'un ?`,
  ],
  [
    'physical_activity',
    'physical_activity',
    'Sport',
    `La note décrit-elle une activité physique ou sportive de ${OBSERVED} ?`,
  ],
  [
    'social_time',
    'social',
    'Moment avec des proches',
    `La note décrit-elle un moment de ${OBSERVED} avec des proches ou des amis ?`,
  ],
  [
    'busy_work',
    'work',
    'Journée chargée',
    `La note décrit-elle une journée de travail ou d'études chargée ou stressante pour ${OBSERVED} ?`,
  ],
  [
    'poor_sleep',
    'sleep',
    'Mauvaise nuit',
    `La note décrit-elle une mauvaise nuit ou un manque de sommeil chez ${OBSERVED} ?`,
  ],
  [
    'alcohol',
    'substances',
    'Alcool',
    `La note décrit-elle une consommation d'alcool de ${OBSERVED} ?`,
  ],
  [
    'other_substance',
    'substances',
    'Autre substance',
    `La note décrit-elle une consommation de cannabis ou d'une autre substance par ${OBSERVED} ?`,
  ],
  [
    'late_screens',
    'screens',
    'Écrans tardifs',
    `La note décrit-elle des écrans ou des réseaux sociaux tard le soir ou en excès chez ${OBSERVED} ?`,
  ],
  [
    'outdoors',
    'outdoors',
    'Dehors',
    `La note décrit-elle du temps passé dehors ou dans la nature par ${OBSERVED} ?`,
  ],
  [
    'accomplishment',
    'achievement',
    'Accomplissement',
    `La note décrit-elle un accomplissement ou un signe de fierté chez ${OBSERVED} ?`,
  ],
  [
    'bad_news',
    'other',
    'Imprévu',
    `La note mentionne-t-elle un imprévu ou une mauvaise nouvelle concernant ${OBSERVED} ?`,
  ],
  [
    'pleasure',
    'pleasure',
    'Détente',
    `La note décrit-elle un moment de détente ou de plaisir choisi par ${OBSERVED} ?`,
  ],
  [
    'physical_pain',
    'pain',
    'Douleur',
    `La note décrit-elle une douleur ou un symptôme physique que ${OBSERVED} exprime ou semble ressentir ?`,
  ],
  [
    'avoidance',
    'avoidance',
    'Évitement',
    `La note décrit-elle de la procrastination ou l'évitement de quelque chose chez ${OBSERVED} ?`,
  ],
];

const OBSERVED_THEMES: Array<[string, ConstructKey, string, string]> = [
  ['work_studies', 'work', 'Travail', 'le travail ou les études'],
  ['romance', 'romance', 'Couple', 'le couple ou la vie amoureuse'],
  ['family', 'family', 'Famille', 'la famille'],
  ['friends', 'social', 'Amis', 'les amis et la vie sociale'],
  ['physical_health', 'physical_health', 'Santé physique', 'la santé physique'],
  ['money', 'money', 'Argent', "l'argent"],
  ['future', 'future', 'Avenir', "l'avenir, les projets ou l'incertitude"],
];

/**
 * Self-report states that cannot be observed from the outside (inner rumination, self-criticism,
 * sense of control) are left out; the others are asked as what the person seems or says.
 */
const OBSERVED_STATE_INSTRUCTIONS: Record<string, string> = {
  expressed_anxiety: `Dans quelle mesure ${OBSERVED} semble-t-elle anxieuse ou exprime-t-elle de l'inquiétude ?`,
  low_mood: `Dans quelle mesure ${OBSERVED} semble-t-elle triste ou exprime-t-elle une humeur basse ?`,
  fatigue: `Dans quelle mesure ${OBSERVED} semble-t-elle fatiguée ou exprime-t-elle de la fatigue ?`,
  overall_tone: `Quelle est la tonalité générale de la journée de ${OBSERVED}, d'après la note ?`,
  loneliness: `Dans quelle mesure ${OBSERVED} semble-t-elle seule ou exprime-t-elle un sentiment de solitude ?`,
};

function buildObservedStates(): ScoreQuestion[] {
  return STATE_QUESTIONS.filter(
    (question) => question.key in OBSERVED_STATE_INSTRUCTIONS,
  ).map((question) => ({
    ...question,
    instructions: OBSERVED_STATE_INSTRUCTIONS[question.key],
  }));
}

/** The self bank rephrased for someone who describes another person's days. */
export function buildObservedQuestionBank(): BankQuestion[] {
  return [
    ...OBSERVED_EVENTS.map(([key, construct, label, instructions]) =>
      eventQuestion(key, construct, label, instructions),
    ),
    ...OBSERVED_THEMES.map(([key, construct, label, subject]) =>
      themeQuestion(key, construct, label, subject, OBSERVED_DAY_PHRASE),
    ),
    ...buildObservedStates(),
  ];
}
