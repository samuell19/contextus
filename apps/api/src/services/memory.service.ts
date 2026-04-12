import { env } from '../config/env.js';
import type { MemoryServiceContract, ModelGateway } from '../contracts/services.js';
import { Agent, MemorySnapshot, Message, Session } from '../models/index.js';

export class MemoryService implements MemoryServiceContract {
  public constructor(private readonly gateway: ModelGateway) {}

  public async updateAfterTurn(input: {
    userId: string;
    agentId: string;
    sessionId: string;
    apiKey: string;
    updatedFromMessageId: string;
  }) {
    const [agent, session] = await Promise.all([
      Agent.findOne({ where: { id: input.agentId, userId: input.userId } }),
      Session.findOne({ where: { id: input.sessionId, userId: input.userId } })
    ]);

    if (!agent || !session) {
      return;
    }

    const recentMessagesDesc = await Message.findAll({
      where: { sessionId: session.id },
      order: [['createdAt', 'DESC']],
      limit: 12
    });
    const recentMessages = [...recentMessagesDesc].reverse();

    const transcript = recentMessages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');

    await Promise.all([
      this.updateSnapshot({
        ownerType: 'session',
        ownerId: session.id,
        apiKey: input.apiKey,
        updatedFromMessageId: input.updatedFromMessageId,
        transcript,
        contextLabel: `Sessao "${session.title}"`
      }),
      this.updateSnapshot({
        ownerType: 'agent',
        ownerId: agent.id,
        apiKey: input.apiKey,
        updatedFromMessageId: input.updatedFromMessageId,
        transcript,
        contextLabel: `Agente "${agent.name}"`
      })
    ]);
  }

  private async updateSnapshot(input: {
    ownerType: 'agent' | 'session';
    ownerId: string;
    apiKey: string;
    updatedFromMessageId: string;
    transcript: string;
    contextLabel: string;
  }) {
    const existing = await MemorySnapshot.findOne({
      where: { ownerType: input.ownerType, ownerId: input.ownerId }
    });

    const summary = await this.gateway.completeText({
      apiKey: input.apiKey,
      model: env.OPENROUTER_SUMMARY_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Voce atualiza uma memoria persistente curta e objetiva para um sistema multiagente. ' +
            'Resuma preferencias, contexto recorrente, fatos estaveis e objetivos do usuario em ate 10 linhas.'
        },
        {
          role: 'user',
          content: [
            `Contexto atual: ${input.contextLabel}`,
            `Resumo anterior:\n${existing?.summary ?? '(vazio)'}`,
            `Trecho recente da conversa:\n${input.transcript || '(sem mensagens)'}`,
            'Retorne apenas o novo resumo.'
          ].join('\n\n')
        }
      ]
    });

    if (existing) {
      existing.summary = summary;
      existing.updatedFromMessageId = input.updatedFromMessageId;
      await existing.save();
      return;
    }

    await MemorySnapshot.create({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      summary,
      updatedFromMessageId: input.updatedFromMessageId
    });
  }
}
