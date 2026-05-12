import { Injectable } from '@nestjs/common';
import { InsightType } from '../../domain/enums/insight-type.enum.js';

interface SanitizedData {
  dateRange: string;
  totalLogs: number;
  fieldSummaries: Array<{
    fieldName: string;
    fieldType: string;
    avgValue?: number;
    trend?: string;
    values?: string[];
  }>;
  lastEntryDate?: string;
}

@Injectable()
export class PromptService {
  generateDailySummaryPrompt(sanitizedData: SanitizedData): string {
    const fieldText = sanitizedData.fieldSummaries
      .map((f) => {
        let desc = `- ${f.fieldName} (${f.fieldType})`;
        if (f.avgValue !== undefined) {
          desc += `: average ${f.avgValue}`;
          if (f.trend) desc += ` (trend: ${f.trend})`;
        } else if (f.values) {
          desc += `: ${f.values.join(', ')}`;
        }
        return desc;
      })
      .join('\n');

    return `Analyse les données suivantes de journal de bord personnel et fournis un résumé bref et pertinent sur les habitudes récentes et le bien-être de la personne. Sois concis (2-3 phrases). RÉPONDS IMPÉRATIVEMENT EN FRANÇAIS.

Période des données : ${sanitizedData.dateRange}
Nombre d'entrées : ${sanitizedData.totalLogs}

Résumé des champs :
${fieldText}

Fournis des informations exploitables sur :
1. Les modèles globaux de bien-être
2. Toute tendance notable
3. Une recommandation douce pour s'améliorer

Garde un ton chaleureux, encourageant et non-jugeant. Évite de répéter les données brutes, concentre-toi sur l'analyse.`;
  }

  generateWeeklyTrendPrompt(sanitizedData: SanitizedData): string {
    const fieldText = sanitizedData.fieldSummaries
      .map((f) => {
        let desc = `- ${f.fieldName}`;
        if (f.avgValue !== undefined) {
          desc += ` (avg: ${f.avgValue})`;
          if (f.trend) desc += `, trend: ${f.trend}`;
        } else if (f.values) {
          desc += `: ${f.values.join(', ')}`;
        }
        return desc;
      })
      .join('\n');

    return `Analyse les données de bien-être de la semaine et identifie les tendances clés : RÉPONDS IMPÉRATIVEMENT EN FRANÇAIS.

Période : ${sanitizedData.dateRange}
Entrées cette semaine : ${sanitizedData.totalLogs}

Données hebdomadaires :
${fieldText}

Fournis :
1. Les 3 principales tendances de bien-être (positives ou préoccupantes)
2. Une comparaison avec les habitudes habituelles si elles sont évidentes
3. Une analyse sur la trajectoire de la semaine

Sois concis (3-4 phrases). Concentre-toi sur les modèles, pas sur les points de données individuels.`;
  }

  generateAnomalyPrompt(sanitizedData: SanitizedData): string {
    return `Recherche tout modèle inhabituel ou anomalie dans ces données personnelles : RÉPONDS IMPÉRATIVEMENT EN FRANÇAIS.

Période : ${sanitizedData.dateRange}
Entrées récentes : ${sanitizedData.totalLogs}

Données :
${sanitizedData.fieldSummaries.map((f) => `- ${f.fieldName}: ${f.avgValue || f.values?.join(', ') || 'N/A'}`).join('\n')}

Si des anomalies sont détectées :
1. Décris ce qui semble inhabituel
2. Suggère des causes possibles
3. Recommande un point de contrôle en douceur

Si tout semble normal, affirme-le brièvement. Garde la réponse sous les 100 mots.`;
  }

  generatePrompt(type: InsightType, sanitizedData: SanitizedData): string {
    switch (type) {
      case InsightType.DAILY_SUMMARY:
        return this.generateDailySummaryPrompt(sanitizedData);
      case InsightType.WEEKLY_TREND:
        return this.generateWeeklyTrendPrompt(sanitizedData);
      case InsightType.ANOMALY:
        return this.generateAnomalyPrompt(sanitizedData);
      default:
        return this.generateDailySummaryPrompt(sanitizedData);
    }
  }
}
