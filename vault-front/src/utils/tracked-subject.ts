import type { TrackedSubject } from "@/types";

export const DEFAULT_SUBJECT: TrackedSubject = { kind: "SELF" };

export const isSelfSubject = (subject?: TrackedSubject): boolean => !subject || subject.kind === "SELF";

/** Nom de la personne ou de l'animal suivi, ou une formule neutre. */
export const subjectName = (subject?: TrackedSubject): string => {
  if (!subject || subject.kind === "SELF") return "vous";
  if (subject.name) return subject.name;
  return subject.kind === "ANIMAL" ? "l'animal suivi" : "la personne suivie";
};

export interface LeversWording {
  dataOwner: string;
  helps: string;
  helpsSubtitle: string;
  weighs: string;
  weighsSubtitle: string;
  keepNoting: string;
  nothingYet: string;
  targetsIntro: string;
}

/** Textes de l'écran des leviers : jamais « tu/ton/tes » quand le suivi ne concerne pas l'auteur. */
export const leversWording = (subject?: TrackedSubject): LeversWording => {
  if (isSelfSubject(subject)) {
    return {
      dataOwner: "tes données",
      helps: "Ce qui t'aide",
      helpsSubtitle: "Des liens qui vont dans le sens que tu souhaites.",
      weighs: "Ce qui pèse",
      weighsSubtitle: "Des liens qui vont à l'inverse de ce que tu souhaites.",
      keepNoting: "Continue à noter tes journées, à ton rythme.",
      nothingYet: "Rien n'est encore disponible pour toi",
      targetsIntro: "de ton profil",
    };
  }
  const name = subjectName(subject);
  return {
    dataOwner: `les données de ${name}`,
    helps: "Ce qui aide",
    helpsSubtitle: "Des liens qui vont dans le sens souhaité.",
    weighs: "Ce qui pèse",
    weighsSubtitle: "Des liens qui vont à l'inverse du sens souhaité.",
    keepNoting: "Continuez à noter les journées, à votre rythme.",
    nothingYet: "Rien n'est encore disponible",
    targetsIntro: "du profil",
  };
};
