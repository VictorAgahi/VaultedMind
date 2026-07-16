import { Injectable } from '@nestjs/common';
import { InsightType } from '../../domain/enums/insight-type.enum.js';

interface DailyEntry {
  date: string;
  notes?: string;
  fieldValues: Array<{
    fieldName: string;
    value: string;
    fieldType: string;
  }>;
}

interface SanitizedData {
  dateRange: string;
  totalLogs: number;
  fieldSummaries: Array<{
    fieldName: string;
    fieldType: string;
    valueKind?: 'duration' | 'date' | 'numeric' | 'categorical' | 'boolean';
    avgValue?: number;
    displayAvgValue?: string;
    trend?: string;
    values?: string[];
  }>;
  dailyEntries: DailyEntry[];
  lastEntryDate?: string;
}

interface PromptParams {
  logs: SanitizedData;
  userContext?: string;
}

interface FieldSummaryLine {
  fieldName: string;
  fieldType: string;
  valueKind?: 'duration' | 'date' | 'numeric' | 'categorical' | 'boolean';
  avgValue?: number;
  displayAvgValue?: string;
  trend?: string;
  values?: string[];
}

/**
 * Multi-agent evidence bundle produced by the first 3 parallel agents
 * and enriched by subsequent agents.
 */
export interface AgentEvidenceBundle {
  analysisBrief?: string;
  correlationBrief?: string;
  contextBrief?: string;
  predictionBrief?: string;
  qualityReview?: string;
}

@Injectable()
export class PromptService {
  // ════════════════════════════════════════════════════════════════════════════
  //  AGENT 1 — DATA ANALYST
  // ════════════════════════════════════════════════════════════════════════════

  generateAnalysisBriefPrompt(type: InsightType, params: PromptParams): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = this.formatFieldSummaries(sanitizedData.fieldSummaries);
    const dailyLogsText = this.formatDailyEntries(sanitizedData.dailyEntries);
    const contextBlock = userContext
      ? `\n[CONTEXTE PERSONNEL À PRENDRE EN COMPTE]\n${userContext}\n`
      : '';

    const title = this.getAnalysisTitle(type);
    return `Tu es le premier agent d'analyse de VaultedMind. Ton travail est de produire un dossier de preuve analytique, pas une réponse finale.

Objectif: ${title}

Règles non négociables:
1. NE TE LIMITE PAS à faire des calculs de moyennes arithmétiques simples (comme "vous dormez en moyenne 7h"). Les statistiques basiques brutes n'ont aucune valeur pour l'utilisateur.
2. Va plus loin dans le raisonnement : cherche des corrélations, des tendances, des variations et des liens de cause à effet potentiels entre les différents indicateurs mesurés et les notes quotidiennes rédigées par l'utilisateur.
3. Utilise le contexte personnel de l'utilisateur (ses notes de profil, antécédents, conditions comme les migraines, etc.) pour éclairer les variations des données. Par exemple, si l'utilisateur note une baisse d'humeur ou de sommeil, regarde si cela coïncide avec des événements, symptômes ou facteurs mentionnés dans son profil.
4. Ne confonds jamais corrélation et causalité, mais propose des hypothèses claires et constructives basées sur la coïncidence temporelle des faits.
5. N'invente aucune relation statistique qui n'est pas visible dans les données fournies.
6. Si une mesure semble être une durée ou une heure, écris toujours le format humain, par exemple 5h30, jamais 5.5 h.
7. Réponds uniquement en français.

Période: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}

Journaux quotidiens et notes de l'utilisateur :
${dailyLogsText}

Indicateurs consolidés :
${fieldText}

Produit exactement ce plan, avec des puces courtes et pertinentes :
## Faits observés (Comportements récurrents, patterns temporels, variations notables - pas de simples moyennes arithmétiques)
## Corrélations plausibles et niveau de confiance (Liens entre les indicateurs physiques/habitudes et l'état mental/notes quotidiennes de l'utilisateur)
## Facteurs de contexte / confondants à mentionner (Croisement avec le profil de l'utilisateur, ex: migraines, stress, traitements)
## Ce qu'il ne faut pas conclure
## Pistes de lecture pour le second agent (Suggestions d'explications psychologiques ou comportementales pour guider le second agent)

Le contenu doit rester prudent, factuel, et centré sur les éléments soutenus par les données.`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  AGENT 2 — CORRELATION ENGINE
  // ════════════════════════════════════════════════════════════════════════════

  generateCorrelationPrompt(params: PromptParams): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = this.formatFieldSummaries(sanitizedData.fieldSummaries);
    const dailyLogsText = this.formatDailyEntries(sanitizedData.dailyEntries);
    const contextBlock = userContext
      ? `\n[CONTEXTE PERSONNEL]\n${userContext}\n`
      : '';

    return `Tu es l'agent spécialisé en CORRÉLATION DE DONNÉES de VaultedMind. Tu es un statisticien comportemental expert.

TON UNIQUE MISSION : Identifier et quantifier les corrélations entre TOUTES les variables mesurées par l'utilisateur.

Période: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}

Journaux quotidiens avec notes :
${dailyLogsText}

Indicateurs consolidés :
${fieldText}

INSTRUCTIONS PRÉCISES :

1. MATRICE DE CORRÉLATION : Pour chaque paire d'indicateurs numériques, évalue la force de la corrélation (forte positive, modérée positive, faible, modérée négative, forte négative) basée sur la co-variation temporelle dans les données.

2. CORRÉLATIONS TEMPORELLES DÉCALÉES : Cherche les effets retardés. Par exemple :
   - Est-ce que le sommeil de J affecte l'humeur de J+1 ?
   - Est-ce qu'un indicateur en hausse la veille prédit une baisse d'un autre le lendemain ?
   - Y a-t-il un effet cumulatif (ex: 3 jours de mauvais sommeil → chute d'humeur) ?

3. CLUSTERS D'ÉVÉNEMENTS : Identifie les jours qui se ressemblent (profil similaire sur plusieurs variables) et nomme ces clusters (ex: "jour optimal", "jour sous pression", "jour de récupération").

4. SIGNAUX DANS LES NOTES : Croise les notes textuelles de l'utilisateur avec les variations des indicateurs numériques. Quand l'utilisateur mentionne un événement, un symptôme ou une émotion dans ses notes, est-ce corrélé à des changements mesurables ?

5. NIVEAU DE CONFIANCE : Pour chaque corrélation identifiée, attribue un niveau de confiance :
   - 🔴 HAUTE (pattern très visible, N > 5 occurrences)
   - 🟡 MOYENNE (pattern probable, N = 3-5 occurrences)
   - ⚪ EXPLORATOIRE (signal faible, N < 3, à surveiller)

FORMAT DE SORTIE (respecte EXACTEMENT cette structure) :
## Corrélations directes (même jour)
## Corrélations temporelles décalées (J-1, J-2, effet cumulatif)
## Clusters de profils journaliers
## Signaux notes-données
## Résumé des corrélations les plus fiables (top 5 avec niveau de confiance)

Réponds en français. Sois rigoureux. N'invente rien qui n'est pas soutenu par les données.`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  AGENT 3 — CONTEXT INTERPRETER
  // ════════════════════════════════════════════════════════════════════════════

  generateContextInterpretationPrompt(params: PromptParams): string {
    const { logs: sanitizedData, userContext } = params;
    const dailyLogsText = this.formatDailyEntries(sanitizedData.dailyEntries);
    const contextBlock = userContext
      ? `\n[PROFIL ET CONTEXTE PERSONNEL DE L'UTILISATEUR]\n${userContext}\n`
      : '';

    return `Tu es l'agent INTERPRÈTE DE CONTEXTE de VaultedMind. Tu es un expert en analyse sémantique et en psychologie comportementale.

TON UNIQUE MISSION : Extraire un maximum d'intelligence des notes quotidiennes de l'utilisateur et de son profil personnel.

Période: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}

Journaux quotidiens avec notes :
${dailyLogsText}

INSTRUCTIONS PRÉCISES :

1. ANALYSE SÉMANTIQUE DES NOTES :
   - Identifie les thèmes récurrents dans les notes (santé, travail, social, émotions, loisirs, alimentation, sport, etc.)
   - Repère les changements de ton et de vocabulaire au fil du temps
   - Détecte les expressions de satisfaction, frustration, fatigue, motivation, anxiété

2. SIGNAUX FAIBLES :
   - Identifie les signaux subtils que l'utilisateur ne verbalise pas explicitement mais qui transparaissent dans ses notes
   - Exemples : raccourcissement progressif des notes (désengagement ?), disparition d'un sujet habituellement mentionné, apparition d'un nouveau vocabulaire

3. CROISEMENT PROFIL ↔ NOTES :
   - Si l'utilisateur a mentionné des conditions médicales (migraines, insomnie, etc.) dans son profil, cherche quand ces sujets apparaissent dans les notes
   - Identifie les contradictions potentielles entre le profil et les notes quotidiennes

4. CHRONOLOGIE NARRATIVE :
   - Construis une mini-timeline des événements significatifs extraits des notes
   - Identifie les points de rupture ou de transition

FORMAT DE SORTIE :
## Thèmes récurrents et leur fréquence
## Signaux faibles détectés
## Croisement profil ↔ notes quotidiennes
## Timeline des événements clés
## Hypothèses comportementales à explorer

Réponds en français. Sois précis et empathique. Ne projette aucune interprétation qui ne soit soutenue par le texte réel des notes.`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  AGENT 4 — PREDICTION STRATEGIST
  // ════════════════════════════════════════════════════════════════════════════

  generatePredictionPrompt(
    params: PromptParams,
    evidence: AgentEvidenceBundle,
  ): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = this.formatFieldSummaries(sanitizedData.fieldSummaries);
    const dailyLogsText = this.formatDailyEntries(sanitizedData.dailyEntries);
    const contextBlock = userContext
      ? `\n[CONTEXTE PERSONNEL]\n${userContext}\n`
      : '';

    return `Tu es l'agent STRATÈGE DE PRÉDICTION de VaultedMind. Tu utilises l'analyse de données, les corrélations et l'interprétation contextuelle produites par les agents précédents pour formuler des scénarios prédictifs.

TON UNIQUE MISSION : Créer des scénarios de prédiction COURT TERME (7 jours) et LONG TERME (30 jours) basés sur les tendances et corrélations observées.

Période analysée: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}

[DOSSIER DE L'AGENT 1 — ANALYSE STATISTIQUE]
${evidence.analysisBrief || 'Non disponible'}

[DOSSIER DE L'AGENT 2 — CORRÉLATIONS]
${evidence.correlationBrief || 'Non disponible'}

[DOSSIER DE L'AGENT 3 — INTERPRÉTATION CONTEXTUELLE]
${evidence.contextBrief || 'Non disponible'}

Données brutes consolidées :
${fieldText}

Dernières entrées :
${dailyLogsText}

INSTRUCTIONS PRÉCISES :

1. SCÉNARIOS COURT TERME (7 prochains jours) :
   - Basé sur les tendances actuelles, les corrélations temporelles décalées et les patterns hebdomadaires détectés
   - Scénario OPTIMISTE : si les tendances positives se maintiennent, que peut-on attendre ?
   - Scénario RÉALISTE : projection linéaire des tendances actuelles
   - Scénario À RISQUE : si les signaux faibles négatifs se confirment, quels indicateurs pourraient se dégrader ?
   - Pour chaque scénario, identifie les indicateurs les plus susceptibles de varier et dans quelle direction

2. SCÉNARIOS LONG TERME (30 prochains jours) :
   - Basé sur les tendances de fond, les cycles détectés et les corrélations structurelles
   - Identifie les trajectoires probables pour les 2-3 indicateurs les plus importants
   - Formule des hypothèses sur les points de basculement potentiels

3. FACTEURS DÉCLENCHEURS :
   - Identifie les "leviers" que l'utilisateur peut actionner pour influencer positivement ses indicateurs
   - Basé sur les corrélations les plus fortes détectées par l'Agent 2

4. ALERTES PRÉVENTIVES :
   - Si des patterns à risque sont en cours de formation, signale-les
   - Ex: "Si votre sommeil continue de baisser au même rythme, dans X jours vous serez sous le seuil critique observé le [date]"

NIVEAU DE CONFIANCE : Chaque prédiction doit porter un niveau de confiance (🔴 haute, 🟡 moyenne, ⚪ exploratoire)

FORMAT DE SORTIE :
## Scénarios Court Terme (7 jours)
### Optimiste
### Réaliste
### À risque
## Scénarios Long Terme (30 jours)
## Facteurs déclencheurs (leviers d'action)
## Alertes préventives

Réponds en français. Sois ambitieux dans les prédictions mais toujours honnête sur les limites. Ne confonds jamais prédiction et certitude.`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  AGENT 5 — QUALITY GATE / META-REVIEWER
  // ════════════════════════════════════════════════════════════════════════════

  generateQualityGatePrompt(
    params: PromptParams,
    evidence: AgentEvidenceBundle,
  ): string {
    const { logs: sanitizedData } = params;

    return `Tu es l'agent QUALITY GATE de VaultedMind. Tu es le dernier rempart avant que les insights soient présentés à l'utilisateur.

TON UNIQUE MISSION : Relire, vérifier et noter la qualité de tout ce qui a été produit par les 4 agents précédents. Tu élimines les hallucinations, les corrélations douteuses et les prédictions non fondées.

Période analysée: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}

[DOSSIER AGENT 1 — ANALYSE STATISTIQUE]
${evidence.analysisBrief || 'Non disponible'}

[DOSSIER AGENT 2 — CORRÉLATIONS]
${evidence.correlationBrief || 'Non disponible'}

[DOSSIER AGENT 3 — INTERPRÉTATION CONTEXTUELLE]
${evidence.contextBrief || 'Non disponible'}

[DOSSIER AGENT 4 — PRÉDICTIONS]
${evidence.predictionBrief || 'Non disponible'}

INSTRUCTIONS PRÉCISES :

1. VÉRIFICATION DES FAITS :
   - Chaque affirmation chiffrée est-elle cohérente avec les ${sanitizedData.totalLogs} entrées sur la période ${sanitizedData.dateRange} ?
   - Y a-t-il des contradictions entre les agents ?
   - Des corrélations ont-elles été inventées ou exagérées ?

2. ANTI-HALLUCINATION :
   - Repère tout insight qui ne peut PAS être dérivé des données fournies
   - Signale les prédictions qui extrapolent trop loin des tendances observées
   - Marque les affirmations qui ressemblent à des conseils médicaux non fondés

3. SCORING DE CONFIANCE GLOBAL :
   - Note chaque section produite par les agents sur 10
   - Score global de l'insight final
   - Identifie les 3 insights les plus fiables et les 3 les plus risqués

4. RECOMMANDATIONS POUR L'AGENT FINAL :
   - Quels éléments doivent absolument apparaître dans le résumé final ?
   - Quels éléments doivent être atténués ou supprimés ?
   - Quel ton adopter (prudent, encourageant, alertant) ?

FORMAT DE SORTIE :
## Vérification des faits (OK / ⚠️ problème identifié)
## Hallucinations détectées (le cas échéant)
## Scoring par section (/10)
## Score de confiance global (/10)
## Top 3 insights les plus fiables
## Top 3 insights les plus risqués
## Recommandations pour l'agent de synthèse finale

Réponds en français. Sois impitoyable sur la rigueur.`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  AGENT 6 — NARRATIVE SYNTHESIZER (enrichi)
  // ════════════════════════════════════════════════════════════════════════════

  generateInsightNarrativePrompt(
    type: InsightType,
    params: PromptParams,
    evidenceBrief: string | null,
    evidence?: AgentEvidenceBundle,
  ): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = this.formatFieldSummaries(sanitizedData.fieldSummaries);
    const dailyLogsText = this.formatDailyEntries(sanitizedData.dailyEntries);
    const contextBlock = userContext
      ? `\n[CONTEXTE PERSONNEL ET CONFIGURATION DE L'UTILISATEUR]\n${userContext}\n`
      : '';

    // Build multi-agent evidence blocks
    let evidenceBlocks = '';
    if (evidence) {
      if (evidence.analysisBrief) {
        evidenceBlocks += `\n[DOSSIER AGENT 1 — ANALYSE STATISTIQUE]\n${evidence.analysisBrief}\n`;
      }
      if (evidence.correlationBrief) {
        evidenceBlocks += `\n[DOSSIER AGENT 2 — CORRÉLATIONS]\n${evidence.correlationBrief}\n`;
      }
      if (evidence.contextBrief) {
        evidenceBlocks += `\n[DOSSIER AGENT 3 — INTERPRÉTATION CONTEXTUELLE]\n${evidence.contextBrief}\n`;
      }
      if (evidence.predictionBrief) {
        evidenceBlocks += `\n[DOSSIER AGENT 4 — PRÉDICTIONS]\n${evidence.predictionBrief}\n`;
      }
      if (evidence.qualityReview) {
        evidenceBlocks += `\n[DOSSIER AGENT 5 — QUALITY GATE]\n${evidence.qualityReview}\n`;
      }
    } else if (evidenceBrief) {
      // Backward compatibility: single evidence brief
      evidenceBlocks = `\n[DOSSIER ANALYTIQUE DU PREMIER AGENT]\n${evidenceBrief}\n`;
    }

    const title = this.getAnalysisTitle(type);
    const header = this.getNarrativeHeader(type);

    return `${header}

Tu es l'agent final de synthèse de VaultedMind. Tu reçois les dossiers de 5 agents spécialisés (analyse statistique, corrélation, interprétation contextuelle, prédictions, quality gate) et ton rôle est de les transformer en un insight EXCEPTIONNEL, profondément personnalisé et actionnable.

Règles non négociables:
1. BANNIS LES PHRASES BANALES ET LES STATISTIQUES SIMPLES SANS VALEUR AJOUTÉE (ex: "Vous dormez en moyenne X heures"). L'utilisateur connaît déjà ses moyennes. Donne-lui plutôt des faits marquants sur sa propre personne (ex: "Votre sommeil chute drastiquement de 2h les jours précédant vos épisodes de migraine").
2. Connecte les données chiffrées aux notes quotidiennes et au contexte personnel (migraines, stress, habitudes) pour formuler des hypothèses de corrélation intelligentes et des conseils d'hygiène de vie adaptés.
3. INTÈGRE LES PRÉDICTIONS : Présente les scénarios court terme et long terme de manière engageante et motivante, pas alarmiste.
4. INTÈGRE LES CORRÉLATIONS : Mets en valeur les corrélations les plus fortes et les plus surprenantes découvertes par l'agent de corrélation.
5. RESPECTE LE QUALITY GATE : Suis les recommandations de l'agent quality gate. N'inclus PAS les insights marqués comme hallucinations ou trop risqués.
6. Propose des conseils et recommandations extrêmement personnalisés, concrets et actionnables. Évite les conseils génériques évidents (comme "dormez plus" ou "buvez de l'eau").
7. N'ajoute aucune corrélation nouvelle qui n'est pas déjà soutenue par les dossiers des agents ou les données fournies.
8. Si le dossier ou la corrélation est incertaine, présente-la comme une hypothèse intéressante à explorer ou à surveiller ("Il semblerait que...", "Vous pourriez observer si...").
9. Quand une durée apparaît, écris-la en format humain: 5h30, 2h15, 45 min. Jamais 5.5 h.
10. Réponds en français, avec un ton empathique, engageant et précis.

Type d'analyse: ${title}
Période: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}
${evidenceBlocks}

Journaux quotidiens et notes de l'utilisateur :
${dailyLogsText}

Base de données consolidée:
${fieldText}

Format attendu (sans mentionner les noms des sections mais en respectant cette structure de pensée) :
- **Un titre accrocheur, personnalisé et bienveillant** (qui résume la découverte principale de la période)
- **Faits & Corrélations sur vous** : Révèle les observations les plus profondes issues de la corrélation croisée des données. Mets en avant les patterns les plus surprenants et les liens causaux potentiels.
- **Ce que cela prédit pour vous** : Résumé des scénarios court terme (7j) et long terme (30j) les plus probables. Présente-les de manière engageante, pas comme un bulletin météo.
- **Ce que cela suggère** : Une lecture comportementale ou d'hygiène de vie basée sur le profil de l'utilisateur et les corrélations détectées.
- **2 à 3 actions concrètes** : Recommandations ultra-personnalisées basées sur les corrélations et prédictions. Chaque action doit être liée à un levier identifié dans les données (ex: "Les jours où vous [action], votre [indicateur] s'améliore de [X]%").

Garde un ton qui valorise la curiosité et l'auto-observation, sans faire de diagnostic médical mais en étant un vrai compagnon analytique de son bien-être.`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  LEGACY WRAPPERS (backward compat)
  // ════════════════════════════════════════════════════════════════════════════

  generateDailySummaryPrompt(params: PromptParams): string {
    return this.generateInsightNarrativePrompt(
      InsightType.DAILY_SUMMARY,
      params,
      null,
    );
  }

  generateWeeklyTrendPrompt(params: PromptParams): string {
    return this.generateInsightNarrativePrompt(
      InsightType.WEEKLY_TREND,
      params,
      null,
    );
  }

  generateAnomalyPrompt(params: PromptParams): string {
    return this.generateInsightNarrativePrompt(
      InsightType.ANOMALY,
      params,
      null,
    );
  }

  generatePrompt(type: InsightType, params: PromptParams): string {
    switch (type) {
      case InsightType.DAILY_SUMMARY:
        return this.generateInsightNarrativePrompt(type, params, null);
      case InsightType.WEEKLY_TREND:
        return this.generateInsightNarrativePrompt(type, params, null);
      case InsightType.ANOMALY:
        return this.generateInsightNarrativePrompt(type, params, null);
      default:
        return this.generateInsightNarrativePrompt(
          InsightType.DAILY_SUMMARY,
          params,
          null,
        );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FORMATTING HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  formatFieldSummaries(fieldSummaries: FieldSummaryLine[]): string {
    return fieldSummaries
      .map((field) => this.formatFieldSummary(field))
      .join('\n');
  }

  formatDailyEntries(dailyEntries?: DailyEntry[]): string {
    if (!dailyEntries || dailyEntries.length === 0) {
      return 'Aucun journal quotidien disponible.';
    }
    return dailyEntries
      .map((entry) => {
        const fieldsStr = entry.fieldValues
          .map((fv) => `${fv.fieldName} = ${fv.value}`)
          .join(', ');
        const fieldsBlock = fieldsStr ? ` [${fieldsStr}]` : '';
        const noteBlock = entry.notes
          ? ` | Note de l'utilisateur : "${entry.notes}"`
          : '';
        return `- ${entry.date} :${fieldsBlock}${noteBlock}`;
      })
      .join('\n');
  }

  private formatFieldSummary(field: FieldSummaryLine): string {
    const valueKindLabel = field.valueKind
      ? `, interprété comme ${field.valueKind}`
      : '';
    let description = `- ${field.fieldName} (${field.fieldType}${valueKindLabel})`;

    if (field.avgValue !== undefined) {
      const displayedAverage =
        field.displayAvgValue ??
        this.formatNumericValue(field.avgValue, field.valueKind);
      description += `: moyenne de ${displayedAverage}`;
      if (field.trend) {
        description += ` (tendance : ${field.trend})`;
      }
      return description;
    }

    if (field.values && field.values.length > 0) {
      description += `: ${field.values.join(', ')}`;
    }

    return description;
  }

  private formatNumericValue(
    value: number,
    valueKind?: FieldSummaryLine['valueKind'],
  ): string {
    if (valueKind !== 'duration') {
      return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }

    const absoluteValue = Math.abs(value);
    const hours = Math.floor(absoluteValue);
    const minutes = Math.round((absoluteValue - hours) * 60);
    const normalizedMinutes = minutes === 60 ? 0 : minutes;
    const normalizedHours = minutes === 60 ? hours + 1 : hours;
    const formattedDuration =
      normalizedMinutes === 0
        ? `${normalizedHours}h`
        : `${normalizedHours}h${normalizedMinutes.toString().padStart(2, '0')}`;

    return value < 0 ? `-${formattedDuration}` : formattedDuration;
  }

  private getAnalysisTitle(type: InsightType): string {
    switch (type) {
      case InsightType.WEEKLY_TREND:
        return 'Analyse hebdomadaire du bien-être';
      case InsightType.ANOMALY:
        return "Détection d'anomalies";
      case InsightType.DAILY_SUMMARY:
      default:
        return 'Résumé quotidien du bien-être';
    }
  }

  private getNarrativeHeader(type: InsightType): string {
    switch (type) {
      case InsightType.WEEKLY_TREND:
        return 'Agis comme un analyste comportemental et un coach de suivi longitudinal.';
      case InsightType.ANOMALY:
        return 'Agis comme un analyste prudent spécialisé dans les anomalies et les signaux faibles.';
      case InsightType.DAILY_SUMMARY:
      default:
        return 'Agis comme un coach de bien-être expert et un analyste de données comportementales.';
    }
  }
}
