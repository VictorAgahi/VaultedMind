import { FieldType } from "@/types";

export interface PackField {
  key: string;
  name: string;
  fieldType: FieldType;
  category: string;
  min?: number;
  max?: number;
  optionsOrder?: string[];
  /** Le champ utilisé par le check-in express de l'accueil. */
  quickCheckin?: boolean;
}

export interface FieldPack {
  id: string;
  title: string;
  description: string;
  fields: PackField[];
}

const HOURLY = ["isHourly"];

export const FIELD_PACKS: FieldPack[] = [
  {
    id: "essentiel",
    title: "L'essentiel",
    description: "Humeur, énergie, sommeil et activité : la base pour voir ce qui vous fait du bien.",
    fields: [
      { key: "humeur", name: "Humeur", fieldType: FieldType.NUMBER, category: "Ressenti", min: 1, max: 5, quickCheckin: true },
      { key: "energie", name: "Énergie", fieldType: FieldType.NUMBER, category: "Ressenti", min: 1, max: 5 },
      { key: "sommeil", name: "Durée de sommeil", fieldType: FieldType.NUMBER, category: "Corps", optionsOrder: HOURLY },
      { key: "activite", name: "Activité physique", fieldType: FieldType.BOOLEAN, category: "Corps" },
    ],
  },
  {
    id: "anxiete",
    title: "Anxiété",
    description: "Le niveau d'anxiété du jour et ce qui l'a déclenchée.",
    fields: [
      { key: "anxiete", name: "Anxiété", fieldType: FieldType.NUMBER, category: "Ressenti", min: 1, max: 5 },
      {
        key: "declencheur",
        name: "Source de stress",
        fieldType: FieldType.STRING,
        category: "Ressenti",
        optionsOrder: ["Aucune", "Travail ou études", "Relations", "Santé", "Argent", "Sommeil", "Autre"],
      },
    ],
  },
  {
    id: "sommeil",
    title: "Sommeil",
    description: "Heures de coucher et de lever, et la qualité ressentie.",
    fields: [
      { key: "coucher", name: "Heure de coucher", fieldType: FieldType.NUMBER, category: "Sommeil", optionsOrder: HOURLY },
      { key: "lever", name: "Heure de lever", fieldType: FieldType.NUMBER, category: "Sommeil", optionsOrder: HOURLY },
      { key: "qualite", name: "Qualité du sommeil", fieldType: FieldType.NUMBER, category: "Sommeil", min: 1, max: 5 },
    ],
  },
  {
    id: "habitudes",
    title: "Habitudes",
    description: "Ce qui influence souvent l'humeur et le sommeil.",
    fields: [
      { key: "alcool", name: "Alcool", fieldType: FieldType.BOOLEAN, category: "Habitudes" },
      { key: "cafeine", name: "Caféine après 14 h", fieldType: FieldType.BOOLEAN, category: "Habitudes" },
      { key: "ecrans", name: "Écrans après 22 h", fieldType: FieldType.BOOLEAN, category: "Habitudes" },
      { key: "dehors", name: "Temps passé dehors", fieldType: FieldType.BOOLEAN, category: "Habitudes" },
    ],
  },
  {
    id: "cycle",
    title: "Cycle menstruel",
    description: "Pour repérer les liens entre votre cycle et votre humeur.",
    fields: [
      { key: "regles", name: "Règles", fieldType: FieldType.BOOLEAN, category: "Cycle" },
      { key: "douleurs", name: "Douleurs", fieldType: FieldType.NUMBER, category: "Cycle", min: 1, max: 5 },
    ],
  },
];

export interface OnboardingGoal {
  id: string;
  label: string;
  packs: string[];
}

export const ONBOARDING_GOALS: OnboardingGoal[] = [
  { id: "humeur", label: "Mieux comprendre mon humeur", packs: ["essentiel"] },
  { id: "sommeil", label: "Mieux dormir", packs: ["essentiel", "sommeil"] },
  { id: "anxiete", label: "Gérer mon anxiété", packs: ["essentiel", "anxiete"] },
  { id: "therapie", label: "Préparer mes séances avec un thérapeute", packs: ["essentiel", "anxiete"] },
];
