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

interface PromptParams {
  logs: SanitizedData;
  userContext?: string;
}

@Injectable()
export class PromptService {
  generateDailySummaryPrompt(params: PromptParams): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = sanitizedData.fieldSummaries
      .map((f) => {
        let desc = `- ${f.fieldName} (${f.fieldType})`;
        if (f.avgValue !== undefined) {
          desc += `: moyenne de ${f.avgValue}`;
          if (f.trend) desc += ` (tendance : ${f.trend})`;
        } else if (f.values) {
          desc += `: ${f.values.join(', ')}`;
        }
        return desc;
      })
      .join('\n');

    return `Agis en tant que coach de bien-être expert, ingénieur en sciences du comportement et analyste de données de santé de pointe.
Analyse les données du journal de bord personnel de l'utilisateur ci-dessous et fournis un rapport d'analyse quotidien ultra-poussé, structuré, bienveillant et perspicace.

⚠️ DIRECTIVES IMPORTANTES DE TON ET DE STYLE :
1. TUTOIER L'UTILISATEUR ABSOLUMENT : Adresse-toi directement à lui en utilisant exclusivement le tutoiement ("tu", "toi", "ton", "ta"). Ne dis jamais "vous".
2. RESPECT DU CONTEXTE : Basse-toi impérativement sur le contexte de vie et les objectifs personnels de l'utilisateur ci-dessous pour personnaliser tes retours et analyses de manière pertinente.
3. ANALYSE PROFONDE ET CROISÉE : Ne te contente pas de redire les chiffres. Mets en relation les différentes variables pour identifier des corrélations sous-jacentes (ex: l'impact d'une habitude sur le sommeil, le niveau de stress ou l'humeur).
4. FORMAT : Rédige une analyse détaillée, structurée avec des paragraphes aérés (environ 150-250 mots). RÉPONDS IMPÉRATIVEMENT EN FRANÇAIS.

Période des données : ${sanitizedData.dateRange}
Nombre d'entrées analysées : ${sanitizedData.totalLogs}

${userContext ? `[CONTEXTE PERSONNEL ET CONFIGURATION DE L'UTILISATEUR] :\n${userContext}\n` : ''}

Résumé des indicateurs suivis :
${fieldText}

Structure ton retour ainsi :
- 🔍 Analyse comportementale & Observations croisées : Analyse de manière poussée ce que révèlent ses indicateurs, en faisant des liens malins avec son contexte de vie.
- 💡 Recommandations concrètes : Suggère 1 ou 2 pistes d'action immédiates, actionnables et bienveillantes, en phase avec ses objectifs.`;
  }

  generateWeeklyTrendPrompt(params: PromptParams): string {
    const { logs: sanitizedData, userContext } = params;
    const fieldText = sanitizedData.fieldSummaries
      .map((f) => {
        let desc = `- ${f.fieldName}`;
        if (f.avgValue !== undefined) {
          desc += ` (moyenne : ${f.avgValue})`;
          if (f.trend) desc += `, tendance : ${f.trend}`;
        } else if (f.values) {
          desc += `: ${f.values.join(', ')}`;
        }
        return desc;
      })
      .join('\n');

    return `Agis en tant que data analyste et coach comportemental personnel.
Analyse les données de bien-être de la semaine et fournis un bilan hebdomadaire complet, profond et structuré.

⚠️ DIRECTIVES IMPORTANTES DE TON ET DE STYLE :
1. TUTOIER L'UTILISATEUR ABSOLUMENT : Adresse-toi directement à lui en utilisant exclusivement le tutoiement ("tu", "toi", "ton", "ta"). Ne dis jamais "vous".
2. RESPECT DU CONTEXTE : Oriente l'analyse hebdomadaire pour l'aider à atteindre les objectifs décrits dans son contexte personnel.
3. FORMAT : Structure ton analyse de manière claire avec des sections lisibles en français.

Période : ${sanitizedData.dateRange}
Entrées cette semaine : ${sanitizedData.totalLogs}

${userContext ? `[CONTEXTE PERSONNEL ET CONFIGURATION DE L'UTILISATEUR] :\n${userContext}\n` : ''}

Données hebdomadaires consolidées :
${fieldText}

Fournis :
- 📈 Les 3 principales tendances marquantes observées cette semaine (bonnes habitudes à fêter ou alertes sur lesquelles être vigilant)
- 🎯 L'adéquation avec ses objectifs personnels formulés dans son contexte de vie
- 🚀 Un plan d'action ou un défi stimulant pour la semaine à venir`;
  }

  generateAnomalyPrompt(params: PromptParams): string {
    const { logs: sanitizedData, userContext } = params;
    return `Agis en tant que détective comportemental de bien-être personnel.
Recherche tout modèle inhabituel, dérive ou anomalie dans ces données personnelles de santé et de rituel.

⚠️ DIRECTIVES IMPORTANTES DE TON ET DE STYLE :
1. TUTOIER L'UTILISATEUR ABSOLUMENT : Adresse-toi directement à lui en utilisant exclusivement le tutoiement ("tu", "toi", "ton", "ta"). Ne dis jamais "vous".
2. RESPECT DU CONTEXTE : Évalue les anomalies à l'aune de ses objectifs de son contexte.
3. FORMAT : Sois direct et réponds en français sous forme de constat analytique.

Période : ${sanitizedData.dateRange}
Entrées récentes : ${sanitizedData.totalLogs}

${userContext ? `[CONTEXTE PERSONNEL ET CONFIGURATION DE L'UTILISATEUR] :\n${userContext}\n` : ''}

Données récoltées :
${sanitizedData.fieldSummaries.map((f) => `- ${f.fieldName} : ${f.avgValue || f.values?.join(', ') || 'N/A'}`).join('\n')}

Si tu détectes des anomalies ou signaux faibles :
1. Décris précisément ce qui semble inhabituel ou incohérent d'après ses indicateurs
2. Propose des explications potentielles en lien avec ses contraintes
3. Recommande un petit réajustement ou point de vigilance amical

Si tout semble parfaitement aligné et sain, félicite-le chaleureusement et brièvement.`;
  }

  generatePrompt(type: InsightType, params: PromptParams): string {
    switch (type) {
      case InsightType.DAILY_SUMMARY:
        return this.generateDailySummaryPrompt(params);
      case InsightType.WEEKLY_TREND:
        return this.generateWeeklyTrendPrompt(params);
      case InsightType.ANOMALY:
        return this.generateAnomalyPrompt(params);
      default:
        return this.generateDailySummaryPrompt(params);
    }
  }
}
