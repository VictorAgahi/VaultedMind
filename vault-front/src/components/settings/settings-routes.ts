// Sections de la page Paramètres : chacune a sa propre vue, /settings/<id>.
export const SETTINGS_SECTION_IDS = ["analyse", "assistant", "rappels", "confidentialite", "donnees"] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export const SETTINGS_TITLES: Record<SettingsSectionId, string> = {
  analyse: "Analyse avancée",
  assistant: "Assistant IA",
  rappels: "Rappels et notifications",
  confidentialite: "Confidentialité et sécurité",
  donnees: "Mes données",
};

export const settingsHref = (section: SettingsSectionId, anchor?: string): string =>
  `/settings/${section}${anchor ? `#${anchor}` : ""}`;

/** Toutes les routes de l'espace Paramètres, pour les listes de routes de la navigation. */
export const SETTINGS_ROUTES = ["/settings", ...SETTINGS_SECTION_IDS.map((section) => settingsHref(section))];

export const isSettingsSectionId = (value: string): value is SettingsSectionId =>
  (SETTINGS_SECTION_IDS as readonly string[]).includes(value);
