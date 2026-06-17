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

@Injectable()
export class PromptService {
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

  generateInsightNarrativePrompt(
    type: InsightType,
    params: PromptParams,
    evidenceBrief: string | null,
  ): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = this.formatFieldSummaries(sanitizedData.fieldSummaries);
    const dailyLogsText = this.formatDailyEntries(sanitizedData.dailyEntries);
    const contextBlock = userContext
      ? `\n[CONTEXTE PERSONNEL ET CONFIGURATION DE L'UTILISATEUR]\n${userContext}\n`
      : '';

    const briefBlock = evidenceBrief
      ? `\n[DOSSIER ANALYTIQUE DU PREMIER AGENT]\n${evidenceBrief}\n`
      : '';

    const title = this.getAnalysisTitle(type);
    const header = this.getNarrativeHeader(type);

    return `${header}

Tu es le second agent de VaultedMind. Tu reçois un dossier de preuve préparé par le premier agent et ton rôle est de le transformer en insights précieux, en faits marquants personnalisés et en conseils concrets pour l'utilisateur.

Règles non négociables:
1. BANNIS LES PHRASES BANALES ET LES STATISTIQUES SIMPLES SANS VALEUR AJOUTÉE (ex: "Vous dormez en moyenne X heures"). L'utilisateur connaît déjà ses moyennes. Donne-lui plutôt des faits marquants sur sa propre personne (ex: "Votre sommeil chute drastiquement de 2h les jours précédant vos épisodes de migraine").
2. Connecte les données chiffrées aux notes quotidiennes et au contexte personnel (migraines, stress, habitudes) pour formuler des hypothèses de corrélation intelligentes et des conseils d'hygiène de vie adaptés.
3. Propose des conseils et recommandations extrêmement personnalisés, concrets et actionnables. Évite les conseils génériques évidents (comme "dormez plus" ou "buvez de l'eau").
4. N'ajoute aucune corrélation nouvelle qui n'est pas déjà soutenue par le dossier analytique ou les données fournies.
5. Si le dossier ou la corrélation est incertaine, présente-la comme une hypothèse intéressante à explorer ou à surveiller ("Il semblerait que...", "Vous pourriez observer si...").
6. Quand une durée apparaît, écris-la en format humain: 5h30, 2h15, 45 min. Jamais 5.5 h.
7. Réponds en français, avec un ton empathique, engageant et précis.

Type d'analyse: ${title}
Période: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}
${briefBlock}

Journaux quotidiens et notes de l'utilisateur :
${dailyLogsText}

Base de données consolidée:
${fieldText}

Format attendu (sans mentionner les noms des sections mais en respectant cette structure de pensée) :
- **Un titre accrocheur, personnalisé et bienveillant** (qui résume la découverte principale de la période)
- **Faits & Analyses sur vous** : Révèle des observations profondes de corrélations ou de patterns (ex: impact du sommeil sur l'humeur, lien entre les notes de migraine/maux de tête et les indicateurs physiques).
- **Ce que cela suggère** : Une lecture comportementale ou d'hygiène de vie basée sur le profil de l'utilisateur.
- **1 à 2 conseils personnalisés actionnables** : Recommandations précises basées sur les observations pour aider l'utilisateur à améliorer son quotidien.

Garde un ton qui valorise la curiosité et l'auto-observation, sans faire de diagnostic médical mais en étant un vrai compagnon analytique de son bien-être.`;
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
