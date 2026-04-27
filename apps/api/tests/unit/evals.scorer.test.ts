import { describe, expect, it } from 'vitest';

import { parseEvalAnswer, scoreEvalAnswer } from '../../src/modules/evals/evals.scorer.js';

describe('evals.scorer', () => {
  it('parses fenced json responses', () => {
    const parsed = parseEvalAnswer(
      '```json\n{"answer":"Backup as 02:00 BRT","canAnswer":true,"citations":["backup_policy_v3#1"]}\n```'
    );

    expect(parsed.answer).toContain('02:00');
    expect(parsed.canAnswer).toBe(true);
    expect(parsed.citations).toEqual(['backup_policy_v3#1']);
  });

  it('flags hallucination on unanswerable scenario when model answers confidently', () => {
    const score = scoreEvalAnswer({
      answer: 'O diretor financeiro e Carlos Mendes.',
      canAnswer: true,
      citations: [],
      shouldAnswer: false,
      requiredPhrases: [],
      abstainMarkers: ['nao encontrei', 'nao ha informacao'],
      preferredCitationIds: ['leadership_directory_v1#1'],
      requirePreferredCitation: false
    });

    expect(score.passed).toBe(false);
    expect(score.hallucinationRisk).toBe(true);
  });

  it('accepts grounded answer without forcing citations when mode has no rag chunk', () => {
    const score = scoreEvalAnswer({
      answer: 'O publico principal sao pequenas clinicas e o prazo final e 30 de junho.',
      canAnswer: true,
      citations: [],
      shouldAnswer: true,
      requiredPhrases: ['pequenas clinicas', '30 de junho'],
      abstainMarkers: ['nao encontrei'],
      preferredCitationIds: ['atlas_launch_brief#1'],
      requirePreferredCitation: false
    });

    expect(score.passed).toBe(true);
    expect(score.hallucinationRisk).toBe(false);
  });
});
