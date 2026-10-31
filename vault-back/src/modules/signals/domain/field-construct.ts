import type { JevAnswer, JevQuestion } from './jev-types.js';
import {
  MIN_CONSTRUCT_CONFIDENCE,
  OTHER_CONSTRUCT,
  isConstruct,
  type Construct,
} from './constructs.js';

export const FIELD_CONSTRUCT_QUESTION_KEY = 'construct';
export const FIELD_CONSTRUCT_HASH_PURPOSE = 'field-construct';

const CONSTRUCT_DESCRIPTIONS: Record<Construct, string> = {
  sleep: 'Le sommeil (durée, qualité, heure du coucher ou du réveil)',
  fatigue: "La fatigue, l'énergie, la forme physique du moment",
  mood: "L'humeur, le moral, la tristesse ou la joie",
  anxiety: "L'anxiété, l'inquiétude, l'angoisse",
  stress: 'Le stress, la tension nerveuse, la pression',
  rumination: 'Les pensées qui tournent en boucle',
  social: 'La vie sociale, les amis, les moments avec des proches',
  romance: 'Le couple, la vie amoureuse',
  family: 'La famille',
  work: 'Le travail, les études, la charge de travail',
  money: "L'argent, le budget, les dépenses",
  future: "L'avenir, les projets, l'incertitude",
  physical_activity: 'Le sport, les pas, les mouvements, la dépense physique',
  physical_health:
    'La santé physique, le corps, la fréquence cardiaque, les symptômes',
  pain: 'La douleur, les maux de tête, les symptômes douloureux',
  substances: "L'alcool, le tabac, le cannabis ou toute autre substance",
  screens: 'Les écrans, les réseaux sociaux, les jeux vidéo',
  outdoors: 'Le temps passé dehors, la nature, la lumière du jour',
  pleasure: 'Les moments de détente, de plaisir, les loisirs',
  achievement: 'Les accomplissements, la fierté, les tâches terminées',
  conflict: 'Les tensions, les disputes, les conflits',
  avoidance: "L'évitement, la procrastination",
  loneliness: "La solitude, l'isolement",
  self_view: "L'image de soi, l'estime de soi, l'autocritique",
  control: 'Le sentiment de contrôle, de maîtrise',
  appetite: "L'alimentation, l'appétit, les repas",
  mindfulness: 'La méditation, la pleine conscience, la respiration',
  language: "La façon d'écrire ou de parler",
  logging: 'Le fait de remplir ou non le journal',
  aggression: "L'agressivité, les morsures, les griffures, les bagarres",
  elimination:
    'Les besoins (urine, selles), la propreté, les accidents hors du lieu prévu',
  play: 'Le jeu, les jouets, les moments ludiques',
  environment_change:
    "Les changements d'environnement ou de routine, les visites, le bruit",
  solitude: "Les moments passés seul, l'absence des proches",
  vet: 'Le vétérinaire, les traitements, les soins',
  other: "Autre chose, ou impossible à dire d'après le nom",
};

/** The choice question asking Jev which construct a field measures. */
export function buildFieldConstructQuestion(): JevQuestion {
  return {
    type: 'choice',
    instructions:
      'Que mesure ce champ de suivi ? Choisis la catégorie qui décrit le mieux ce qui est mesuré, ou "other" si aucune ne convient clairement.',
    criteria: { ...CONSTRUCT_DESCRIPTIONS },
  };
}

export interface ClassifiableField {
  name: string;
  category?: string | null;
  optionsOrder?: string[] | null;
}

/** Text describing the field to Jev; also what the change detection hash is computed from. */
export function describeFieldForClassification(
  field: ClassifiableField,
): string {
  const lines = [`Nom du champ : ${field.name.trim()}`];
  if (field.category?.trim())
    lines.push(`Catégorie : ${field.category.trim()}`);
  if (field.optionsOrder && field.optionsOrder.length > 0) {
    lines.push(`Valeurs possibles : ${field.optionsOrder.join(', ')}`);
  }
  return lines.join('\n');
}

/** Reads the construct from the Jev answer; anything doubtful becomes "other". */
export function parseConstructAnswer(answer: JevAnswer | undefined): Construct {
  if (!answer || answer.type !== 'choice') return OTHER_CONSTRUCT;
  if (answer.confidence < MIN_CONSTRUCT_CONFIDENCE) return OTHER_CONSTRUCT;
  return isConstruct(answer.choice) ? answer.choice : OTHER_CONSTRUCT;
}
