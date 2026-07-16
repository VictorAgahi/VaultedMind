import { Test, TestingModule } from '@nestjs/testing';
import { PromptService, AgentEvidenceBundle } from './prompt.service.js';
import { InsightType } from '../../domain/enums/insight-type.enum.js';

describe('PromptService', () => {
  let service: PromptService;

  const baseSanitizedData = {
    dateRange: '10/06/2026 au 11/06/2026',
    totalLogs: 2,
    fieldSummaries: [
      { fieldName: 'Sommeil', fieldType: 'NUMBER', avgValue: 7 },
    ],
    dailyEntries: [
      {
        date: '10/06/2026',
        notes: 'Mal de tête',
        fieldValues: [
          { fieldName: 'Sommeil', value: '6h', fieldType: 'NUMBER' },
        ],
      },
      {
        date: '11/06/2026',
        fieldValues: [
          { fieldName: 'Sommeil', value: '8h', fieldType: 'NUMBER' },
        ],
      },
    ],
  };

  const baseParams = {
    logs: baseSanitizedData,
    userContext: 'Sujet aux migraines chroniques.',
  };

  const baseEvidence: AgentEvidenceBundle = {
    analysisBrief: 'AGENT 1: Sommeil en baisse les jours de migraine.',
    correlationBrief:
      'AGENT 2: Corrélation forte négative entre sommeil et migraines.',
    contextBrief:
      'AGENT 3: Notes mentionnent maux de tête récurrents les lundis.',
    predictionBrief: 'AGENT 4: Scénario réaliste: sommeil stable autour de 7h.',
    qualityReview:
      'AGENT 5: Score global 8/10. Corrélation sommeil-migraine fiable.',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptService],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── formatDailyEntries ──────────────────────────────────────────────────

  describe('formatDailyEntries', () => {
    it('should return default message if list is empty or missing', () => {
      expect(service.formatDailyEntries([])).toBe(
        'Aucun journal quotidien disponible.',
      );
      expect(service.formatDailyEntries(undefined)).toBe(
        'Aucun journal quotidien disponible.',
      );
    });

    it('should format entries correctly with notes and field values', () => {
      const dailyEntries = [
        {
          date: '10/06/2026',
          notes: 'Mal à la tête',
          fieldValues: [
            { fieldName: 'Sommeil', value: '6h', fieldType: 'NUMBER' },
            { fieldName: 'Migraine', value: 'Oui', fieldType: 'BOOLEAN' },
          ],
        },
        {
          date: '11/06/2026',
          fieldValues: [
            { fieldName: 'Sommeil', value: '8h', fieldType: 'NUMBER' },
          ],
        },
      ];

      const formatted = service.formatDailyEntries(dailyEntries);
      expect(formatted).toContain(
        '- 10/06/2026 : [Sommeil = 6h, Migraine = Oui] | Note de l\'utilisateur : "Mal à la tête"',
      );
      expect(formatted).toContain('- 11/06/2026 : [Sommeil = 8h]');
    });
  });

  // ── Agent 1 — generateAnalysisBriefPrompt ─────────────────────────────

  describe('generateAnalysisBriefPrompt', () => {
    it('should embed daily entries, userContext and correlation instructions', () => {
      const prompt = service.generateAnalysisBriefPrompt(
        InsightType.DAILY_SUMMARY,
        baseParams,
      );

      expect(prompt).toContain('10/06/2026 au 11/06/2026');
      expect(prompt).toContain('Sujet aux migraines chroniques.');
      expect(prompt).toContain(
        '- 10/06/2026 : [Sommeil = 6h] | Note de l\'utilisateur : "Mal de tête"',
      );
      // Verify instructions about not doing simple averages
      expect(prompt).toContain(
        'NE TE LIMITE PAS à faire des calculs de moyennes arithmétiques simples',
      );
      expect(prompt).toContain('cherche des corrélations');
    });
  });

  // ── Agent 2 — generateCorrelationPrompt ───────────────────────────────

  describe('generateCorrelationPrompt', () => {
    it('should produce a correlation-focused prompt with matrix instructions', () => {
      const prompt = service.generateCorrelationPrompt(baseParams);

      expect(prompt).toContain('CORRÉLATION DE DONNÉES');
      expect(prompt).toContain('MATRICE DE CORRÉLATION');
      expect(prompt).toContain('CORRÉLATIONS TEMPORELLES DÉCALÉES');
      expect(prompt).toContain('CLUSTERS');
      expect(prompt).toContain('NIVEAU DE CONFIANCE');
      expect(prompt).toContain('10/06/2026 au 11/06/2026');
      expect(prompt).toContain('Sujet aux migraines chroniques.');
    });
  });

  // ── Agent 3 — generateContextInterpretationPrompt ─────────────────────

  describe('generateContextInterpretationPrompt', () => {
    it('should produce a context interpretation prompt with NLP focus', () => {
      const prompt = service.generateContextInterpretationPrompt(baseParams);

      expect(prompt).toContain('INTERPRÈTE DE CONTEXTE');
      expect(prompt).toContain('ANALYSE SÉMANTIQUE DES NOTES');
      expect(prompt).toContain('SIGNAUX FAIBLES');
      expect(prompt).toContain('CROISEMENT PROFIL');
      expect(prompt).toContain('CHRONOLOGIE NARRATIVE');
      expect(prompt).toContain('Sujet aux migraines chroniques.');
    });
  });

  // ── Agent 4 — generatePredictionPrompt ────────────────────────────────

  describe('generatePredictionPrompt', () => {
    it('should include evidence from agents 1-3 and prediction structure', () => {
      const prompt = service.generatePredictionPrompt(baseParams, baseEvidence);

      expect(prompt).toContain('STRATÈGE DE PRÉDICTION');
      expect(prompt).toContain('SCÉNARIOS COURT TERME');
      expect(prompt).toContain('SCÉNARIOS LONG TERME');
      expect(prompt).toContain('ALERTES PRÉVENTIVES');
      // Evidence from previous agents
      expect(prompt).toContain('AGENT 1: Sommeil en baisse');
      expect(prompt).toContain('AGENT 2: Corrélation forte négative');
      expect(prompt).toContain('AGENT 3: Notes mentionnent maux de tête');
    });
  });

  // ── Agent 5 — generateQualityGatePrompt ───────────────────────────────

  describe('generateQualityGatePrompt', () => {
    it('should include evidence from all 4 agents and validation instructions', () => {
      const prompt = service.generateQualityGatePrompt(
        baseParams,
        baseEvidence,
      );

      expect(prompt).toContain('QUALITY GATE');
      expect(prompt).toContain('ANTI-HALLUCINATION');
      expect(prompt).toContain('SCORING DE CONFIANCE GLOBAL');
      expect(prompt).toContain('AGENT 1: Sommeil en baisse');
      expect(prompt).toContain('AGENT 4: Scénario réaliste');
    });
  });

  // ── Agent 6 — generateInsightNarrativePrompt (multi-agent) ────────────

  describe('generateInsightNarrativePrompt', () => {
    it('should embed daily entries, evidence brief and guidelines (legacy)', () => {
      const brief =
        'PREMIER AGENT BRIEF: Lien entre migraines et sommeil détecté.';
      const prompt = service.generateInsightNarrativePrompt(
        InsightType.DAILY_SUMMARY,
        baseParams,
        brief,
      );

      expect(prompt).toContain('Sujet aux migraines chroniques.');
      expect(prompt).toContain('PREMIER AGENT BRIEF');
      expect(prompt).toContain(
        '- 10/06/2026 : [Sommeil = 6h] | Note de l\'utilisateur : "Mal de tête"',
      );
      // Verify instructions banning simple averages and asking for deep facts
      expect(prompt).toContain(
        'BANNIS LES PHRASES BANALES ET LES STATISTIQUES SIMPLES',
      );
      expect(prompt).toContain(
        'Donne-lui plutôt des faits marquants sur sa propre personne',
      );
    });

    it('should embed full multi-agent evidence bundle when provided', () => {
      const prompt = service.generateInsightNarrativePrompt(
        InsightType.WEEKLY_TREND,
        baseParams,
        null,
        baseEvidence,
      );

      // All 5 agent dossiers should be embedded
      expect(prompt).toContain('DOSSIER AGENT 1');
      expect(prompt).toContain('DOSSIER AGENT 2');
      expect(prompt).toContain('DOSSIER AGENT 3');
      expect(prompt).toContain('DOSSIER AGENT 4');
      expect(prompt).toContain('DOSSIER AGENT 5');
      // New features
      expect(prompt).toContain('INTÈGRE LES PRÉDICTIONS');
      expect(prompt).toContain('INTÈGRE LES CORRÉLATIONS');
      expect(prompt).toContain('RESPECTE LE QUALITY GATE');
      expect(prompt).toContain('Ce que cela prédit pour vous');
    });
  });
});
