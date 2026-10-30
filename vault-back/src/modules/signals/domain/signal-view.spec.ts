import { buildSignalViews } from './signal-view.js';
import type { SignalPayload } from './signal-payload.js';
import type { Person } from './person.js';

const people: Person[] = [{ id: 'p1', alias: 'Compagne', variants: ['Marie'] }];
const markers = { wordCount: 10, absolutistRatio: 0, firstPersonRatio: 0 };

const payloadOf = (answers: SignalPayload['answers']): SignalPayload => ({
  model: 'jev-1.14.0',
  answers,
  markers,
});

const find = (views: ReturnType<typeof buildSignalViews>, key: string) =>
  views.find((view) => view.key === key);

describe('buildSignalViews', () => {
  it('should display a noul only from 0.7', () => {
    // Arrange
    const payload = payloadOf({
      physical_activity: { value: 0.7 },
      alcohol: { value: 0.69 },
    });

    // Act
    const views = buildSignalViews(payload, {}, []);

    // Assert
    expect(find(views, 'physical_activity')?.displayed).toBe(true);
    expect(find(views, 'alcohol')?.displayed).toBe(false);
  });

  it('should display theme and state scores from level 3 with enough confidence', () => {
    // Arrange
    const payload = payloadOf({
      work_studies: { value: 3.4, confidence: 0.6 },
      family: { value: 3.4, confidence: 0.4 },
      friends: { value: 2.4, confidence: 0.9 },
      rumination: { value: 4, confidence: 0.9 },
    });

    // Act
    const views = buildSignalViews(payload, {}, []);

    // Assert
    expect(find(views, 'work_studies')?.displayed).toBe(true);
    expect(find(views, 'work_studies')?.levelLabel).toBe('Important');
    expect(find(views, 'family')?.displayed).toBe(false);
    expect(find(views, 'friends')?.displayed).toBe(false);
    expect(find(views, 'rumination')?.levelLabel).toBe('Très forte');
  });

  it('should display the low end for sense_of_control and overall_tone only', () => {
    // Arrange
    const payload = payloadOf({
      sense_of_control: { value: 0.8, confidence: 0.9 },
      overall_tone: { value: 4, confidence: 0.9 },
    });

    // Act
    const views = buildSignalViews(payload, {}, []);

    // Assert
    expect(find(views, 'sense_of_control')?.displayed).toBe(true);
    expect(find(views, 'sense_of_control')?.dismissValue).toBe(2);
    expect(find(views, 'overall_tone')?.displayed).toBe(false);
  });

  it('should let corrections override the model value', () => {
    // Arrange
    const payload = payloadOf({
      alcohol: { value: 0.1 },
      conflict: { value: 0.95 },
      rumination: { value: 4, confidence: 0.9 },
    });

    // Act
    const views = buildSignalViews(
      payload,
      { alcohol: 1, conflict: 0, rumination: 1 },
      [],
    );

    // Assert
    expect(find(views, 'alcohol')).toMatchObject({
      displayed: true,
      corrected: true,
    });
    expect(find(views, 'conflict')).toMatchObject({
      displayed: false,
      corrected: true,
    });
    expect(find(views, 'rumination')).toMatchObject({
      displayed: false,
      levelLabel: 'Légère',
    });
  });

  it('should show a person with the tone only when present and the tone is reliable', () => {
    // Arrange
    const reliable = payloadOf({
      person_p1_present: { value: 0.9 },
      person_p1_tone: { value: 2, confidence: 0.8 },
    });
    const unreliable = payloadOf({
      person_p1_present: { value: 0.9 },
      person_p1_tone: { value: 2, confidence: 0.3 },
    });
    const absent = payloadOf({
      person_p1_present: { value: 0.2 },
      person_p1_tone: { value: 2, confidence: 0.9 },
    });

    // Act
    const reliableViews = buildSignalViews(reliable, {}, people);
    const unreliableViews = buildSignalViews(unreliable, {}, people);
    const absentViews = buildSignalViews(absent, {}, people);

    // Assert
    expect(find(reliableViews, 'person_p1_present')).toMatchObject({
      displayed: true,
      label: 'Compagne',
      toneLabel: 'agréable',
    });
    expect(find(reliableViews, 'person_p1_tone')?.displayed).toBe(false);
    expect(find(unreliableViews, 'person_p1_present')?.toneLabel).toBeNull();
    expect(find(absentViews, 'person_p1_present')?.displayed).toBe(false);
  });

  it('should skip questions without an answer', () => {
    // Act
    const views = buildSignalViews(payloadOf({}), {}, []);

    // Assert
    expect(views).toEqual([]);
  });
});
