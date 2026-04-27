import type {
  EvalContextPolicyDto,
  EvalDocPreviewDto,
  EvalModeDto,
  EvalModeId,
  EvalScenarioCategoryDto,
  EvalScenarioDto
} from '@multiagent/shared';
import type { LlmChatMessage } from '../../contracts/services.js';

export type EvalKnowledgeChunk = {
  id: string;
  title: string;
  documentId: string;
  documentTitle: string;
  summary: string;
  content: string;
};

export type EvalScenarioRecord = EvalScenarioDto & {
  contextChunkIds: string[];
  expected: {
    shouldAnswer: boolean;
    requiredPhrases: string[];
    abstainMarkers: string[];
    preferredCitationIds: string[];
  };
  conversationSeed?: {
    turns: LlmChatMessage[];
    summary: string;
  };
};

export const evalContextPolicy: EvalContextPolicyDto = {
  approxCharsPerToken: 4,
  maxRecentTurns: 4,
  maxSummaryChars: 700,
  maxRagChunks: 3,
  maxChunkChars: 420,
  maxTotalContextChars: 2400
};

export const evalModes: EvalModeDto[] = [
  {
    id: 'llm_puro',
    label: 'LLM puro',
    description: 'Pergunta sem contexto externo e sem resumo de sessao.'
  },
  {
    id: 'memoria_resumida',
    label: 'Memoria resumida',
    description: 'Usa resumo compacto da sessao e poucas mensagens recentes.'
  },
  {
    id: 'rag_enxuto',
    label: 'RAG enxuto',
    description: 'Injeta poucos chunks relevantes, respeitando um teto pequeno de contexto.'
  },
  {
    id: 'rag_memoria',
    label: 'RAG + memoria',
    description: 'Combina resumo, mensagens recentes e chunks relevantes sob o mesmo orcamento.'
  }
];

export const evalKnowledgeChunks: EvalKnowledgeChunk[] = [
  {
    id: 'backup_policy_v3#1',
    title: 'Janela oficial de backup',
    documentId: 'backup_policy_v3',
    documentTitle: 'backup_policy_v3',
    summary: 'Define horario oficial do backup diario do banco transacional.',
    content:
      'Desde janeiro de 2026, o backup diario do banco transacional da CliniFlow ocorre as 02:00 BRT. ' +
      'A rotina principal roda em infraestrutura separada do cluster de aplicacao.'
  },
  {
    id: 'support_sla_v2#1',
    title: 'SLA de primeira resposta',
    documentId: 'support_sla_v2',
    documentTitle: 'support_sla_v2',
    summary: 'Mostra tempos de primeira resposta por plano de suporte.',
    content:
      'No plano Enterprise, chamados criticos tem primeira resposta em ate 15 minutos. ' +
      'No plano Pro, o mesmo tipo de chamado tem primeira resposta em ate 4 horas uteis.'
  },
  {
    id: 'pricing_legacy_2025#1',
    title: 'Tabela legada 2025',
    documentId: 'pricing_legacy_2025',
    documentTitle: 'pricing_legacy_2025',
    summary: 'Tabela antiga usada ate dezembro de 2025.',
    content:
      'Tabela comercial encerrada em dezembro de 2025. O plano Pro custava R$ 99 por mes antes da revisao de 2026.'
  },
  {
    id: 'pricing_current_2026#1',
    title: 'Tabela comercial atual 2026',
    documentId: 'pricing_current_2026',
    documentTitle: 'pricing_current_2026',
    summary: 'Tabela atual aprovada em 2026.',
    content:
      'Tabela comercial vigente desde marco de 2026. O plano Pro custa R$ 129 por mes e o plano Business custa R$ 249 por mes.'
  },
  {
    id: 'deploy_playbook_v4#1',
    title: 'Aprovacao de deploy',
    documentId: 'deploy_playbook_v4',
    documentTitle: 'deploy_playbook_v4',
    summary: 'Explica quem aprova o deploy em producao.',
    content:
      'Todo deploy em producao exige aprovacao explicita do time de Plataforma antes do inicio da janela de release.'
  },
  {
    id: 'deploy_playbook_v4#2',
    title: 'Registro operacional do deploy',
    documentId: 'deploy_playbook_v4',
    documentTitle: 'deploy_playbook_v4',
    summary: 'Explica onde a aprovacao fica registrada e qual e a janela oficial.',
    content:
      'A aprovacao do deploy deve ser registrada no painel interno Orion. ' +
      'A janela oficial de release em producao acontece de terca a quinta, entre 20:00 e 22:00 BRT.'
  },
  {
    id: 'leadership_directory_v1#1',
    title: 'Diretorio de lideranca',
    documentId: 'leadership_directory_v1',
    documentTitle: 'leadership_directory_v1',
    summary: 'Lista lideres principais sem trazer diretor financeiro.',
    content:
      'Diretorio interno de lideranca: CEO Marina Valente, COO Diego Torres e CTO Rafael Mota. ' +
      'Nenhuma informacao adicional de diretor financeiro aparece nesta base.'
  },
  {
    id: 'atlas_launch_brief#1',
    title: 'Brief do lancamento Atlas Clinicas',
    documentId: 'atlas_launch_brief',
    documentTitle: 'atlas_launch_brief',
    summary: 'Resume o briefing do projeto Atlas Clinicas.',
    content:
      'Brief Atlas Clinicas: publico principal formado por pequenas clinicas com ate 15 medicos, ' +
      'orcamento maximo de R$ 40 mil e prazo final em 30 de junho.'
  }
];

export const evalDocuments: EvalDocPreviewDto[] = [
  {
    id: 'backup_policy_v3',
    title: 'backup_policy_v3',
    summary: 'Politica oficial de backup e contingencia.'
  },
  {
    id: 'support_sla_v2',
    title: 'support_sla_v2',
    summary: 'Tempos de resposta por plano de suporte.'
  },
  {
    id: 'pricing_legacy_2025',
    title: 'pricing_legacy_2025',
    summary: 'Tabela comercial antiga para comparar informacao desatualizada.'
  },
  {
    id: 'pricing_current_2026',
    title: 'pricing_current_2026',
    summary: 'Tabela comercial vigente com informacao atualizada.'
  },
  {
    id: 'deploy_playbook_v4',
    title: 'deploy_playbook_v4',
    summary: 'Fluxo de aprovacao e janela de release em producao.'
  },
  {
    id: 'leadership_directory_v1',
    title: 'leadership_directory_v1',
    summary: 'Diretorio interno propositalmente incompleto para testes de abstencao.'
  },
  {
    id: 'atlas_launch_brief',
    title: 'atlas_launch_brief',
    summary: 'Resumo do projeto usado para teste de memoria comprimida.'
  }
];

export const evalScenarios: EvalScenarioRecord[] = [
  {
    id: 'backup_window',
    title: 'Horario oficial do backup',
    category: 'factual',
    goal: 'Ver se o sistema encontra um fato operacional simples sem precisar abrir uma sessao enorme.',
    prompt: 'Qual e o horario padrao do backup diario do banco transacional da CliniFlow?',
    whyItMatters: 'Mostra ganho direto de precisao com contexto curto e controlado.',
    expectedBehavior: 'Com RAG, a resposta deve trazer 02:00 BRT. Sem contexto, o ideal e admitir falta de base.',
    recommendedModes: ['llm_puro', 'rag_enxuto', 'rag_memoria'],
    documentIds: ['backup_policy_v3'],
    hasConversationSeed: false,
    contextChunkIds: ['backup_policy_v3#1'],
    expected: {
      shouldAnswer: true,
      requiredPhrases: ['02:00', 'BRT'],
      abstainMarkers: ['nao encontrei', 'base suficiente', 'nao tenho base'],
      preferredCitationIds: ['backup_policy_v3#1']
    }
  },
  {
    id: 'pricing_current',
    title: 'Preco atual com documento antigo conflitante',
    category: 'conflicting',
    goal: 'Demonstrar que o contexto certo evita responder com dado desatualizado.',
    prompt: 'Qual e o preco atual do plano Pro da CliniFlow?',
    whyItMatters: 'Esse caso simula informacao antiga e nova convivendo na base.',
    expectedBehavior: 'A resposta correta precisa priorizar a tabela de 2026 e citar o chunk atual.',
    recommendedModes: ['llm_puro', 'rag_enxuto', 'rag_memoria'],
    documentIds: ['pricing_legacy_2025', 'pricing_current_2026'],
    hasConversationSeed: false,
    contextChunkIds: ['pricing_legacy_2025#1', 'pricing_current_2026#1'],
    expected: {
      shouldAnswer: true,
      requiredPhrases: ['129'],
      abstainMarkers: ['nao encontrei', 'base suficiente', 'nao tenho base'],
      preferredCitationIds: ['pricing_current_2026#1']
    }
  },
  {
    id: 'finance_director',
    title: 'Pergunta sem resposta na base',
    category: 'unanswerable',
    goal: 'Ver se o sistema sabe dizer nao sei em vez de inventar um nome plausivel.',
    prompt: 'Qual e o nome do diretor financeiro da CliniFlow?',
    whyItMatters: 'Este e o caso mais demonstrativo para discutir alucinacao e abstencao correta.',
    expectedBehavior: 'A resposta ideal admite que a base nao traz esse dado.',
    recommendedModes: ['llm_puro', 'rag_enxuto', 'rag_memoria'],
    documentIds: ['leadership_directory_v1'],
    hasConversationSeed: false,
    contextChunkIds: ['leadership_directory_v1#1'],
    expected: {
      shouldAnswer: false,
      requiredPhrases: [],
      abstainMarkers: ['nao encontrei', 'nao ha informacao', 'base suficiente', 'nao tenho base'],
      preferredCitationIds: ['leadership_directory_v1#1']
    }
  },
  {
    id: 'deploy_flow',
    title: 'Fluxo de deploy em producao',
    category: 'multi_document',
    goal: 'Mostrar resposta que junta duas partes complementares da base.',
    prompt: 'Como funciona o processo de deploy em producao da CliniFlow?',
    whyItMatters: 'Esse caso evidencia sintese de multiplos trechos, nao apenas busca literal.',
    expectedBehavior: 'A resposta deve mencionar aprovacao do time de Plataforma e registro no Orion.',
    recommendedModes: ['llm_puro', 'rag_enxuto', 'rag_memoria'],
    documentIds: ['deploy_playbook_v4'],
    hasConversationSeed: false,
    contextChunkIds: ['deploy_playbook_v4#1', 'deploy_playbook_v4#2'],
    expected: {
      shouldAnswer: true,
      requiredPhrases: ['Plataforma', 'Orion'],
      abstainMarkers: ['nao encontrei', 'base suficiente', 'nao tenho base'],
      preferredCitationIds: ['deploy_playbook_v4#1', 'deploy_playbook_v4#2']
    }
  },
  {
    id: 'atlas_memory',
    title: 'Sessao longa comprimida',
    category: 'long_session',
    goal: 'Simular uma conversa longa sem reenviar todo o historico para a API.',
    prompt: 'Retome o publico principal, o orcamento maximo e o prazo final do lancamento Atlas Clinicas.',
    whyItMatters: 'Serve para demonstrar economia de contexto e coerencia com memoria resumida.',
    expectedBehavior: 'Com resumo e/ou contexto recuperado, a resposta deve recuperar publico, orcamento e prazo.',
    recommendedModes: ['llm_puro', 'memoria_resumida', 'rag_enxuto', 'rag_memoria'],
    documentIds: ['atlas_launch_brief'],
    hasConversationSeed: true,
    contextChunkIds: ['atlas_launch_brief#1'],
    expected: {
      shouldAnswer: true,
      requiredPhrases: ['pequenas clinicas', '40 mil', '30 de junho'],
      abstainMarkers: ['nao encontrei', 'base suficiente', 'nao tenho base'],
      preferredCitationIds: ['atlas_launch_brief#1']
    },
    conversationSeed: {
      turns: [
        { role: 'user', content: 'Quero planejar o lancamento do modulo Atlas Clinicas.' },
        { role: 'assistant', content: 'Perfeito. Vamos tratar publico, prazo, verba e estrategia de entrada.' },
        { role: 'user', content: 'O publico principal sao pequenas clinicas com ate 15 medicos.' },
        { role: 'assistant', content: 'Anotado. Vou considerar ticket menor e decisao centralizada na gestao da clinica.' },
        { role: 'user', content: 'O orcamento maximo e R$ 40 mil.' },
        { role: 'assistant', content: 'Perfeito. Isso pede priorizacao forte de onboarding e marketing de desempenho.' },
        { role: 'user', content: 'O prazo final de lancamento e 30 de junho.' },
        { role: 'assistant', content: 'Prazo registrado. Vou pensar a entrega com foco em ativacao e baixa friccao.' },
        { role: 'user', content: 'Nas ultimas mensagens falamos mais sobre criativos e pagina de captura.' },
        { role: 'assistant', content: 'Certo. Vamos manter o ultimo bloco mais operacional, com foco em campanha e landing page.' }
      ],
      summary:
        'Projeto Atlas Clinicas: publico principal de pequenas clinicas com ate 15 medicos, ' +
        'orcamento maximo de R$ 40 mil, prazo final em 30 de junho. ' +
        'A conversa recente desviou para criativos, landing page e onboarding.'
    }
  }
];

export function getEvalScenarioById(scenarioId: string) {
  return evalScenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function getEvalChunkById(chunkId: string) {
  return evalKnowledgeChunks.find((chunk) => chunk.id === chunkId) ?? null;
}

export function getEvalModeById(modeId: EvalModeId) {
  return evalModes.find((mode) => mode.id === modeId) ?? null;
}

export function categoryLabel(category: EvalScenarioCategoryDto) {
  const labels: Record<EvalScenarioCategoryDto, string> = {
    factual: 'Factual',
    unanswerable: 'Sem resposta na base',
    conflicting: 'Informacao conflitante',
    multi_document: 'Multi-documento',
    long_session: 'Sessao longa comprimida'
  };

  return labels[category];
}
