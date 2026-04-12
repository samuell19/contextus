import type { AgentDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppApiService } from '../../core/app.api';
import { AuthStore } from '../../core/auth.store';
import { WorkspaceNavComponent } from '../../shared/layout/workspace-nav/workspace-nav.component';
import { AgentCardComponent } from './components/agent-card.component';

@Component({
  selector: 'app-agent-catalog-page',
  standalone: true,
  imports: [CommonModule, WorkspaceNavComponent, AgentCardComponent],
  templateUrl: './agent-catalog-page.component.html',
  styleUrl: './agent-catalog-page.component.css'
})
export class AgentCatalogPageComponent implements OnInit {
  public readonly agents = signal<AgentDto[]>([]);
  public readonly avatarUrls = signal<Record<string, string>>({});
  public readonly menuAgentId = signal<string | null>(null);
  public readonly error = signal('');
  public readonly message = signal('');

  public constructor(
    private readonly api: AppApiService,
    public readonly auth: AuthStore,
    private readonly router: Router
  ) {}

  public ngOnInit() {
    void this.loadAgents();
  }

  @HostListener('document:click')
  public closeMenu() {
    this.menuAgentId.set(null);
  }

  public async openCreateAgent() {
    await this.router.navigate(['/agents/new']);
  }

  public async openChat(agentId: string) {
    await this.router.navigate(['/home', agentId]);
  }

  public async editAgent(agentId: string) {
    await this.router.navigate(['/agents', agentId, 'edit']);
  }

  public toggleMenu(agentId: string) {
    this.menuAgentId.set(this.menuAgentId() === agentId ? null : agentId);
  }

  public async removeAgent(agent: AgentDto) {
    if (!window.confirm(`Excluir o agente "${agent.name}"?`)) {
      return;
    }

    try {
      this.error.set('');
      this.message.set('');
      this.menuAgentId.set(null);
      await this.api.deleteAgent(this.requireToken(), agent.id);
      await this.loadAgents();
      this.message.set('Agente removido com sucesso.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao excluir o agente');
    }
  }

  public trackById = (_: number, item: { id: string }) => item.id;

  private async loadAgents() {
    try {
      const agents = await this.api.listAgents(this.requireToken());
      this.agents.set(agents);
      await this.refreshAvatars(agents);
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
      throw new Error('Sessao expirada');
    }

    return token;
  }
}
