import type { EvalRunScoreDto } from '@multiagent/shared';

export type ParsedEvalAnswer = {
  answer: string;
  canAnswer: boolean;
  citations: string[];
};

export function estimateTokensFromChars(charCount: number) {
  return charCount <= 0 ? 0 : Math.ceil(charCount / 4);
}

export function normalizeText(input: string) {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractJsonObject(rawText: string) {
  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed) as ParsedEvalAnswer;
  } catch {
    const fenced = trimmed.match(/```json\s*([\s\S]+?)\s*```/i)?.[1] ?? trimmed.match(/```([\s\S]+?)```/i)?.[1];

    if (fenced) {
      return JSON.parse(fenced) as ParsedEvalAnswer;
    }

    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

    if (jsonMatch?.[0]) {
      return JSON.parse(jsonMatch[0]) as ParsedEvalAnswer;
    }

    throw new Error('Nao foi possivel extrair JSON da resposta do modelo');
  }
}

export function parseEvalAnswer(rawText: string): ParsedEvalAnswer {
  try {
    const parsed = extractJsonObject(rawText);

    return {
      answer: String(parsed.answer ?? '').trim(),
      canAnswer: Boolean(parsed.canAnswer),
      citations: Array.isArray(parsed.citations)
        ? parsed.citations.map((citation) => String(citation).trim()).filter(Boolean)
        : []
    };
  } catch {
    return {
      answer: rawText.trim(),
      canAnswer: !looksLikeAbstention(rawText),
      citations: []
    };
  }
}

export function looksLikeAbstention(text: string, markers: string[] = []) {
  const normalized = normalizeText(text);
  const defaultMarkers = ['nao encontrei', 'nao ha informacao', 'nao tenho base', 'base suficiente'];

  return [...defaultMarkers, ...markers].some((marker) => normalized.includes(normalizeText(marker)));
}

export function scoreEvalAnswer(input: {
  answer: string;
  canAnswer: boolean;
  citations: string[];
  shouldAnswer: boolean;
  requiredPhrases: string[];
  abstainMarkers: string[];
  preferredCitationIds: string[];
  requirePreferredCitation: boolean;
}): EvalRunScoreDto {
  const normalizedAnswer = normalizeText(input.answer);
  const hasRequiredPhrases = input.requiredPhrases.every((phrase) =>
    normalizedAnswer.includes(normalizeText(phrase))
  );
  const abstained = !input.canAnswer || looksLikeAbstention(input.answer, input.abstainMarkers);
  const hasPreferredCitation =
    !input.requirePreferredCitation ||
    input.preferredCitationIds.length === 0 ||
    input.citations.some((citation) =>
      input.preferredCitationIds.some((preferred) => normalizeText(citation) === normalizeText(preferred))
    );

  if (!input.shouldAnswer) {
    if (abstained) {
      return {
        passed: true,
        label: 'Abstencao correta',
        details: 'O modelo reconheceu que a base nao traz suporte suficiente para responder.',
        hallucinationRisk: false
      };
    }

    return {
      passed: false,
      label: 'Risco de alucinacao',
      details: 'O modelo respondeu com confianca em um caso onde a base deveria levar a abstencao.',
      hallucinationRisk: true
    };
  }

  if (!input.canAnswer) {
    return {
      passed: false,
      label: 'Absteve quando deveria responder',
      details: 'O modo testado nao conseguiu transformar o contexto curto em resposta util.',
      hallucinationRisk: false
    };
  }

  if (!hasRequiredPhrases) {
    return {
      passed: false,
      label: 'Resposta fora do gabarito',
      details: 'A resposta nao cobriu todos os fatos essenciais esperados para o cenario.',
      hallucinationRisk: true
    };
  }

  if (!hasPreferredCitation) {
    return {
      passed: false,
      label: 'Citou base errada',
      details: 'A resposta ficou proxima do gabarito, mas nao apontou o trecho principal esperado.',
      hallucinationRisk: true
    };
  }

  return {
    passed: true,
    label: 'Resposta ancorada',
    details: 'O modo respondeu com os fatos esperados e manteve a resposta ancorada no contexto fornecido.',
    hallucinationRisk: false
  };
}
