import { Injectable } from '@nestjs/common';
import { InsightType } from '../../domain/enums/insight-type.enum.js';

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
    const contextBlock = userContext
      ? `\n[CONTEXTE PERSONNEL À PRENDRE EN COMPTE]\n${userContext}\n`
      : '';

    const title = this.getAnalysisTitle(type);
    return `Tu es le premier agent d'analyse de VaultedMind. Ton travail est de produire un dossier de preuve analytique, pas une réponse finale.

Objectif: ${title}

Règles non négociables:
1. Ne confonds jamais corrélation et causalité.
2. N'invente aucune relation statistique qui n'est pas visible dans les données fournies.
3. Si le contexte personnel mentionne une pathologie, un traitement, un trouble, une situation de vie lourde ou un facteur externe, traite-le comme un confondant possible, jamais comme une preuve.
4. Si une mesure semble être une durée ou une heure, écris toujours le format humain, par exemple 5h30, jamais 5.5 h.
5. Réponds uniquement en français.

Période: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}
Indicateurs consolidés:
${fieldText}

Produit exactement ce plan, avec des puces courtes:
## Faits observés
## Corrélations plausibles et niveau de confiance
## Facteurs de contexte / confondants à mentionner
## Ce qu'il ne faut pas conclure
## Pistes de lecture pour le second agent

Le contenu doit rester prudent, factuel, et centré sur les éléments soutenus par les données.`;
  }

  generateInsightNarrativePrompt(
    type: InsightType,
    params: PromptParams,
    evidenceBrief: string | null,
  ): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = this.formatFieldSummaries(sanitizedData.fieldSummaries);
    const contextBlock = userContext
      ? `\n[CONTEXTE PERSONNEL ET CONFIGURATION DE L'UTILISATEUR]\n${userContext}\n`
      : '';

    const briefBlock = evidenceBrief
      ? `\n[DOSSIER ANALYTIQUE DU PREMIER AGENT]\n${evidenceBrief}\n`
      : '';

    const title = this.getAnalysisTitle(type);
    const header = this.getNarrativeHeader(type);

    return `${header}

Tu es le second agent. Tu reçois un dossier de preuve et tu dois le transformer en réponse utile pour l'utilisateur.

Règles non négociables:
1. N'ajoute aucune corrélation nouvelle qui n'est pas déjà soutenue par le dossier analytique.
2. Si le dossier est incertain, reformule-le comme hypothèse, pas comme vérité.
3. Intègre le contexte personnel comme facteur de nuance, en particulier pour les pathologies, traitements, troubles ou événements de vie.
4. Quand une durée apparaît, écris-la en format humain: 5h30, 2h15, 45 min. Jamais 5.5 h.
5. Réponds en français, avec un ton empathique mais précis.

Type d'analyse: ${title}
Période: ${sanitizedData.dateRange}
Nombre d'entrées: ${sanitizedData.totalLogs}
${contextBlock}
${briefBlock}
Base de données consolidée:
${fieldText}

Format attendu:
- un titre court si pertinent
- une section d'analyse claire et concise
- une section "Ce que ça suggère" ou équivalent si utile
- 1 à 2 recommandations concrètes maximum

Si tu détectes une possible confusion liée au contexte personnel, dis-le explicitement.`;
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
