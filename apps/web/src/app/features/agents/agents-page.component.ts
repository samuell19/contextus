import type { AgentDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppApiService } from '../../core/app.api';
import { AuthStore } from '../../core/auth.store';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { WorkspaceNavComponent } from '../../shared/layout/workspace-nav/workspace-nav.component';
import { AgentEditorComponent } from '../shell/components/agent-editor.component';
import { AgentSidebarComponent } from '../shell/components/agent-sidebar.component';

@Component({
  selector: 'app-agents-page',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    WorkspaceNavComponent,
    AgentSidebarComponent,
    AgentEditorComponent
  ],
  templateUrl: './agents-page.component.html',
  styleUrl: './agents-page.component.css'
})
export class AgentsPageComponent implements OnInit {
  public readonly agents = signal<AgentDto[]>([]);
  public readonly avatarUrls = signal<Record<string, string>>({});
  public readonly selectedAgentId = signal<string | null>(null);
  public readonly editingAgentId = signal<string | null>(null);
  public readonly error = signal('');
  public readonly message = signal('');
  public readonly selectedAgent = computed(
    () => this.agents().find((agent) => agent.id === this.selectedAgentId()) ?? null
  );

  public agentName = '';
  public agentSystemPrompt = '';
  public agentDefaultModel = '';
  private agentAvatarFile: File | null = null;

  public constructor(
    private readonly api: AppApiService,
    public readonly auth: AuthStore,
    private readonly router: Router
  ) {}

  public ngOnInit() {
    void this.loadAgents();
  }

  public openCreateAgent() {
    this.message.set('');
    this.error.set('');
    this.selectedAgentId.set(null);
    this.editingAgentId.set(null);
    this.agentName = '';
    this.agentSystemPrompt = '';
    this.agentDefaultModel = '';
    this.agentAvatarFile = null;
  }

  public selectAgent(agentId: string) {
    const agent = this.agents().find((currentAgent) => currentAgent.id === agentId);

    if (!agent) {
      return;
    }

    this.message.set('');
    this.error.set('');
    this.selectedAgentId.set(agent.id);
    this.editingAgentId.set(agent.id);
    this.agentName = agent.name;
    this.agentSystemPrompt = agent.systemPrompt;
    this.agentDefaultModel = agent.defaultModelSlug ?? '';
    this.agentAvatarFile = null;
  }

  public onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.agentAvatarFile = input.files?.[0] ?? null;
  }

  public async saveAgent() {
    this.error.set('');
    this.message.set('');

    try {
      const token = this.requireToken();
      const isEditing = this.editingAgentId() !== null;
      let agent: AgentDto;

      if (isEditing) {
        agent = await this.api.updateAgent(token, this.editingAgentId()!, {
          name: this.agentName,
          systemPrompt: this.agentSystemPrompt,
          defaultModelSlug: this.agentDefaultModel || null
        });
      } else {
        agent = await this.api.createAgent(token, {
          name: this.agentName,
          systemPrompt: this.agentSystemPrompt,
          defaultModelSlug: this.agentDefaultModel || null
        });
      }

      if (this.agentAvatarFile) {
        agent = await this.api.uploadAgentAvatar(token, agent.id, this.agentAvatarFile);
      }

      await this.loadAgents(agent.id);
      this.selectAgent(agent.id);
      this.message.set(isEditing ? 'Agente atualizado com sucesso.' : 'Agente criado com sucesso.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao salvar o agente');
    }
  }

  public async removeAgent() {
    const agent = this.selectedAgent();

    if (!agent || !window.confirm(`Excluir o agente "${agent.name}"?`)) {
      return;
    }

    this.error.set('');
    this.message.set('');

    try {
      await this.api.deleteAgent(this.requireToken(), agent.id);
      await this.loadAgents();
      this.openCreateAgent();
      this.message.set('Agente removido com sucesso.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao excluir o agente');
    }
  }

  public async openChatForSelectedAgent() {
    const agent = this.selectedAgent();

    if (!agent) {
      return;
    }

    await this.router.navigate(['/home', agent.id]);
  }

  private async loadAgents(preferredAgentId?: string) {
    try {
      const agents = await this.api.listAgents(this.requireToken());
      this.agents.set(agents);
      await this.refreshAvatars(agents);

      const nextId = agents.find((agent) => agent.id === preferredAgentId)?.id ?? agents[0]?.id ?? null;

      if (nextId) {
        this.selectAgent(nextId);
      } else {
        this.openCreateAgent();
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar agentes');
    }
  }

  private async refreshAvatars(agents: AgentDto[]) {
    const token = this.requireToken();
    const nextMap: Record<string, string> = {};

    for (const agent of agents) {
      if (!agent.avatarUrl) {
        continue;
      }

      try {
        nextMap[agent.id] = await this.api.fetchAgentAvatar(token, agent.id);
      } catch {
        continue;
      }
    }

    this.avatarUrls.set(nextMap);
  }

  private requireToken() {
    const token = this.auth.accessToken();

    if (!token) {
      throw new Error('Sessão expirada');
    }

    return token;
  }
}
