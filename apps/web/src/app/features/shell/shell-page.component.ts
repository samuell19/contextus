import type { AgentDto, ContextBudgetDto, MessageDto, SessionDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AppApiService } from '../../core/app.api';
import { AuthStore } from '../../core/auth.store';
import { ChatStreamService } from '../../core/chat-stream.service';
import { ChatPanelComponent } from './components/chat-panel.component';
import { SessionSidebarComponent } from './components/session-sidebar.component';

export interface UIMessage extends MessageDto {
  transientLogs?: { event: string; data?: any }[];
}

@Component({
  selector: 'app-shell-page',
  standalone: true,
  imports: [CommonModule, SessionSidebarComponent, ChatPanelComponent],
  templateUrl: './shell-page.component.html',
  styleUrl: './shell-page.component.css'
})
export class ShellPageComponent implements OnInit {
  public readonly agents = signal<AgentDto[]>([]);
  public readonly sessions = signal<SessionDto[]>([]);
  public readonly messages = signal<UIMessage[]>([]);
  public readonly selectedAgentId = signal<string | null>(null);
  public readonly selectedSessionId = signal<string | null>(null);
  public readonly streaming = signal(false);
  public readonly error = signal('');
  public readonly selectedAgent = computed(
    () => this.agents().find((agent) => agent.id === this.selectedAgentId()) ?? null
  );
  public readonly selectedSession = computed(
    () => this.sessions().find((session) => session.id === this.selectedSessionId()) ?? null
  );
  public readonly contextBudget = signal<ContextBudgetDto | null>(null);
  public readonly chatStatusLabel = computed(() => {
    if (!this.auth.hasConfiguredKey()) {
      return 'Sem API key';
    }

    if (this.streaming()) {
      return 'Respondendo';
    }

    if (this.selectedSessionId()) {
      return 'Sessão ativa';
    }

    if (this.selectedAgentId()) {
      return 'Pronto para conversar';
    }

    return 'Selecione um agente';
  });
  public readonly chatStatusTone = computed<'success' | 'info' | 'warning' | 'neutral'>(() => {
    if (!this.auth.hasConfiguredKey()) {
      return 'warning';
    }

    if (this.streaming()) {
      return 'info';
    }

    if (this.selectedSessionId()) {
      return 'success';
    }

    return 'neutral';
  });

  public messageDraft = '';
  private sessionsLoadVersion = 0;
  private messagesLoadVersion = 0;

  public constructor(
    private readonly api: AppApiService,
    public readonly auth: AuthStore,
    private readonly chatStream: ChatStreamService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  public ngOnInit() {
    void this.loadAgents();
    this.route.paramMap.subscribe((params) => {
      const agentId = params.get('agentId');
      const sessionId = params.get('sessionId');

      this.selectedAgentId.set(agentId);
      this.selectedSessionId.set(sessionId);

      if (agentId) {
        void this.loadSessions(agentId);
      } else {
        this.sessions.set([]);
      }

      if (sessionId) {
        if (!this.streaming()) void this.loadMessages(sessionId);
      } else {
        if (!this.streaming()) this.messages.set([]);
        this.contextBudget.set(null);
      }
    });
  }

  public updateDraft(value: string) {
    this.messageDraft = value;
  }

  public async openProfileSettings() {
    await this.router.navigate(['/settings']);
  }

  public async openApiKeySettings() {
    await this.router.navigate(['/settings']);
  }

  public async logout() {
    await this.auth.logout();
    await this.router.navigate(['/auth']);
  }

  public async goToSession(session: SessionDto) {
    await this.router.navigate(['/home', session.agentId, session.id]);
  }

  public async createSession() {
    const agentId = this.selectedAgentId();

    if (!agentId) {
      return;
    }

    try {
      const session = await this.api.createSession(this.requireToken(), agentId);
      await this.loadSessions(agentId);
      await this.router.navigate(['/home', agentId, session.id]);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao criar a sessao');
    }
  }

  public async renameSession(session: SessionDto) {
    const title = window.prompt('Novo titulo da sessao', session.title);

    if (!title?.trim()) {
      return;
    }

    try {
      await this.api.updateSession(this.requireToken(), session.id, title.trim());
      await this.loadSessions(session.agentId);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao renomear a sessao');
    }
  }

  public async deleteSession(session: SessionDto) {
    if (!window.confirm(`Excluir a sessao "${session.title}"?`)) {
      return;
    }

    try {
      await this.api.deleteSession(this.requireToken(), session.id);
      await this.loadSessions(session.agentId);

      if (this.selectedSessionId() === session.id) {
        await this.router.navigate(['/home', session.agentId]);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao excluir a sessao');
    }
  }

  public async sendMessage() {
    const content = this.messageDraft.trim();
    const agentId = this.selectedAgentId();

    if (!content || !agentId) {
      return;
    }

    this.error.set('');
    this.streaming.set(true);
    this.messageDraft = '';

    try {
      const token = this.requireToken();
      let sessionId = this.selectedSessionId();

      if (!sessionId) {
        const session = await this.api.createSession(token, agentId);
        sessionId = session.id;
        await this.loadSessions(agentId);
        await this.router.navigate(['/home', agentId, sessionId]);
      }

      const optimisticTimestamp = new Date().toISOString();
      const tempUserId = `temp-user-${Date.now()}`;
      const tempAssistantId = `temp-assistant-${Date.now()}`;

      // Increment load version to invalidate any pending loadMessages 
      // from the initial session creation before it wipes our optimistic update
      this.messagesLoadVersion++;

      this.messages.update((current) => [
        ...current,
        { id: tempUserId, sessionId, role: 'user', content, createdAt: optimisticTimestamp },
        { id: tempAssistantId, sessionId, role: 'assistant', content: '', createdAt: optimisticTimestamp }
      ]);

      await this.chatStream.streamChat({
        accessToken: token,
        sessionId,
        content,
        onEvent: (payload) => {
          if (payload.event === 'context_budget') {
            this.contextBudget.set(payload.data as ContextBudgetDto);
            return;
          }

          this.messages.update((current) =>
            current.map((msg) => {
              if (msg.id === tempAssistantId) {
                const logs = msg.transientLogs || [];
                return { ...msg, transientLogs: [...logs, payload] };
              }
              return msg;
            })
          );
        },
        onChunk: (payload) => {
          this.messages.update((current) =>
            current.map((message) =>
              message.id === tempAssistantId ? { ...message, content: payload.accumulated } : message
            )
          );
        },
        onDone: () => {
          void this.loadMessages(sessionId!);
          void this.loadSessions(agentId);
        },
        onError: (message) => {
          this.error.set(message);
          void this.loadMessages(sessionId!);
          void this.loadSessions(agentId);
        }
      });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao enviar a mensagem');
    } finally {
      this.streaming.set(false);
    }
  }

  private async loadAgents(preferredAgentId?: string) {
    try {
      const agents = await this.api.listAgents(this.requireToken());
      this.agents.set(agents);

      const routeAgentId = this.route.snapshot.paramMap.get('agentId');
      const nextAgentId = agents.find((agent) => agent.id === preferredAgentId)?.id
        ?? agents.find((agent) => agent.id === routeAgentId)?.id
        ?? agents[0]?.id;

      if (nextAgentId && routeAgentId !== nextAgentId) {
        await this.router.navigate(['/home', nextAgentId]);
      } else if (!nextAgentId && routeAgentId) {
        await this.router.navigate(['/home']);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar agentes');
    }
  }

  private async loadSessions(agentId: string) {
    const version = ++this.sessionsLoadVersion;

    try {
      const sessions = await this.api.listSessions(this.requireToken(), agentId);

      if (version !== this.sessionsLoadVersion) {
        return;
      }

      this.sessions.set(sessions);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar sessoes');
    }
  }

  private async loadMessages(sessionId: string) {
    const version = ++this.messagesLoadVersion;

    try {
      const messages = await this.api.listMessages(this.requireToken(), sessionId);

      if (version !== this.messagesLoadVersion) {
        return;
      }

      this.messages.set(messages);
      this.contextBudget.set(this.extractLatestContextBudget(messages));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar mensagens');
    }
  }

  private requireToken() {
    const token = this.auth.accessToken();

    if (!token) {
      throw new Error('Sessao expirada');
    }

    return token;
  }

  private extractLatestContextBudget(messages: MessageDto[]) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const contextBudget = message?.metadata?.['contextBudget'];

      if (message?.role === 'assistant' && contextBudget) {
        return contextBudget as ContextBudgetDto;
      }
    }

    return null;
  }
}
