import { Test, TestingModule } from '@nestjs/testing';
import { PromptService } from './prompt.service.js';
import { InsightType } from '../../domain/enums/insight-type.enum.js';

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptService],
    }).compile();

    service = module.get<PromptService>(PromptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

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

  describe('generateAnalysisBriefPrompt', () => {
    it('should embed daily entries, userContext and correlation instructions', () => {
      const params = {
        logs: {
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
          ],
        },
        userContext: 'Sujet aux migraines chroniques.',
      };

      const prompt = service.generateAnalysisBriefPrompt(
        InsightType.DAILY_SUMMARY,
        params,
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

  describe('generateInsightNarrativePrompt', () => {
    it('should embed daily entries, evidence brief and guidelines', () => {
      const params = {
        logs: {
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
          ],
        },
        userContext: 'Sujet aux migraines.',
      };

      const brief =
        'PREMIER AGENT BRIEF: Lien entre migraines et sommeil détecté.';
      const prompt = service.generateInsightNarrativePrompt(
        InsightType.DAILY_SUMMARY,
        params,
        brief,
      );

      expect(prompt).toContain('Sujet aux migraines.');
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
  });
});
