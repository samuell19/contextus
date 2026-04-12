import { describe, expect, it } from 'vitest';

import { DefaultContextAssembler } from '../../src/services/context-assembler.service.js';

describe('DefaultContextAssembler', () => {
  it('prepends prompt and memory summaries before chat history', () => {
    const assembler = new DefaultContextAssembler();
    const result = assembler.assemble({
      agentPrompt: 'Seja objetivo.',
      agentMemorySummary: 'Usuario prefere respostas curtas.',
      sessionMemorySummary: 'Estamos planejando um MVP.',
      history: [{ role: 'user', content: 'Ola' }]
    });

    expect(result).toEqual([
      { role: 'system', content: 'Seja objetivo.' },
      {
        role: 'system',
        content: 'Memoria persistente do agente:\nUsuario prefere respostas curtas.'
      },
      {
        role: 'system',
        content: 'Memoria persistente da sessao:\nEstamos planejando um MVP.'
      },
      { role: 'user', content: 'Ola' }
    ]);
  });
});
