import type { AgentDto, KnowledgeSourceDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AppApiService } from '../../core/app.api';
import { AuthStore } from '../../core/auth.store';
import { WorkspaceNavComponent } from '../../shared/layout/workspace-nav/workspace-nav.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { AgentEditorComponent } from '../shell/components/agent-editor.component';

@Component({
  selector: 'app-agent-form-page',
  standalone: true,
  imports: [CommonModule, WorkspaceNavComponent, StatusBadgeComponent, AgentEditorComponent],
  templateUrl: './agent-form-page.component.html',
  styleUrl: './agent-form-page.component.css'
})
export class AgentFormPageComponent implements OnInit {
  public readonly editingAgentId = signal<string | null>(null);
  public readonly avatarPreviewUrl = signal<string | null>(null);
  public readonly loading = signal(true);
  public readonly error = signal('');
  public readonly message = signal('');
  public readonly isEditing = computed(() => this.editingAgentId() !== null);
  public readonly knowledgeSources = signal<KnowledgeSourceDto[]>([]);
  public readonly knowledgeUploading = signal(false);
  public readonly knowledgeUploadStatus = signal('');

  public agentName = '';
  public agentSystemPrompt = '';
  public agentDefaultModel = '';
  public agentRagEnabled = false;
  public agentRagTopK = 5;
  private agentAvatarFile: File | null = null;
  private knowledgeFile: File | null = null;

  public constructor(
    private readonly api: AppApiService,
    public readonly auth: AuthStore,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      void this.loadForm(params.get('agentId'));
    });
  }

  public async goBack() {
    await this.router.navigate(['/agents']);
  }

  public async openChat() {
    if (!this.editingAgentId()) {
      return;
    }

    await this.router.navigate(['/home', this.editingAgentId()]);
  }

  public onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.agentAvatarFile = input.files?.[0] ?? null;

    if (!this.agentAvatarFile) {
      return;
    }

    this.avatarPreviewUrl.set(URL.createObjectURL(this.agentAvatarFile));
  }

  public onKnowledgeFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.knowledgeFile = input.files?.[0] ?? null;

    if (this.knowledgeFile) {
      this.knowledgeUploadStatus.set(`Arquivo selecionado: ${this.knowledgeFile.name}`);
    } else {
      this.knowledgeUploadStatus.set('');
    }
  }

  public async uploadKnowledgeSource() {
    const agentId = this.editingAgentId();

    if (!agentId) {
      this.error.set('Salve o agente antes de enviar fontes de conhecimento.');
      return;
    }

    if (!this.knowledgeFile) {
      this.error.set('Selecione um arquivo antes de enviar.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.knowledgeUploading.set(true);
    this.knowledgeUploadStatus.set(`Enviando e vetorizando: ${this.knowledgeFile.name}...`);

    try {
      const uploaded = await this.api.uploadKnowledgeSource(this.requireToken(), agentId, this.knowledgeFile);
      this.knowledgeFile = null;
      await this.loadKnowledgeSources(agentId);
      this.knowledgeUploadStatus.set(`Concluido: ${uploaded.fileName} (${uploaded.chunkCount} chunks).`);
      this.message.set('Arquivo indexado no RAG com sucesso.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao enviar arquivo para o RAG');
      this.knowledgeUploadStatus.set('Falha no envio/indexacao do arquivo.');
    } finally {
      this.knowledgeUploading.set(false);
    }
  }

  public async removeKnowledgeSource(source: KnowledgeSourceDto) {
    const agentId = this.editingAgentId();

    if (!agentId || !window.confirm(`Remover a fonte "${source.fileName}"?`)) {
      return;
    }

    this.error.set('');
    this.message.set('');

    try {
      await this.api.deleteKnowledgeSource(this.requireToken(), agentId, source.id);
      await this.loadKnowledgeSources(agentId);
      this.message.set('Fonte removida com sucesso.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao remover fonte de conhecimento');
    }
  }

  public async saveAgent() {
    this.error.set('');
    this.message.set('');

    try {
      const token = this.requireToken();
      const isEditing = this.isEditing();
      let agent: AgentDto;

      if (isEditing) {
        agent = await this.api.updateAgent(token, this.editingAgentId()!, {
          name: this.agentName,
          systemPrompt: this.agentSystemPrompt,
          defaultModelSlug: this.agentDefaultModel || null,
          ragEnabled: this.agentRagEnabled,
          ragTopK: this.agentRagTopK
        });
      } else {
        agent = await this.api.createAgent(token, {
          name: this.agentName,
          systemPrompt: this.agentSystemPrompt,
          defaultModelSlug: this.agentDefaultModel || null,
          ragEnabled: this.agentRagEnabled,
          ragTopK: this.agentRagTopK
        });
      }

      if (this.agentAvatarFile) {
        agent = await this.api.uploadAgentAvatar(token, agent.id, this.agentAvatarFile);
      }

      if (!isEditing) {
        await this.router.navigate(['/agents', agent.id, 'edit']);
      }

      await this.loadForm(agent.id);
      this.message.set(isEditing ? 'Agente atualizado com sucesso.' : 'Agente criado com sucesso.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao salvar o agente');
    }
  }

  public async removeAgent() {
    const agentId = this.editingAgentId();

    if (!agentId || !window.confirm(`Excluir o agente "${this.agentName}"?`)) {
      return;
    }

    this.error.set('');
    this.message.set('');

    try {
      await this.api.deleteAgent(this.requireToken(), agentId);
      await this.router.navigate(['/agents']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao excluir o agente');
    }
  }

  private async loadForm(agentId: string | null) {
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.agentAvatarFile = null;

    try {
      if (!agentId) {
        this.resetForm();
        return;
      }

      const agents = await this.api.listAgents(this.requireToken());
      const agent = agents.find((currentAgent) => currentAgent.id === agentId);

      if (!agent) {
        this.error.set('Agente nao encontrado.');
        this.resetForm();
        return;
      }

      this.editingAgentId.set(agent.id);
      this.agentName = agent.name;
      this.agentSystemPrompt = agent.systemPrompt;
      this.agentDefaultModel = agent.defaultModelSlug ?? '';
      this.agentRagEnabled = agent.ragEnabled;
      this.agentRagTopK = agent.ragTopK;

      if (agent.avatarUrl) {
        try {
          this.avatarPreviewUrl.set(await this.api.fetchAgentAvatar(this.requireToken(), agent.id));
        } catch {
          this.avatarPreviewUrl.set(null);
        }
      } else {
        this.avatarPreviewUrl.set(null);
      }

      await this.loadKnowledgeSources(agent.id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar o agente');
      this.resetForm();
    } finally {
      this.loading.set(false);
    }
  }

  private resetForm() {
    this.editingAgentId.set(null);
    this.avatarPreviewUrl.set(null);
    this.agentName = '';
    this.agentSystemPrompt = '';
    this.agentDefaultModel = '';
    this.agentRagEnabled = false;
    this.agentRagTopK = 5;
    this.knowledgeSources.set([]);
    this.knowledgeUploadStatus.set('');
    this.knowledgeFile = null;
    this.loading.set(false);
  }

  private async loadKnowledgeSources(agentId: string) {
    this.knowledgeSources.set(await this.api.listKnowledgeSources(this.requireToken(), agentId));
  }

  private requireToken() {
    const token = this.auth.accessToken();

    if (!token) {
      throw new Error('Sessao expirada');
    }

    return token;
  }
}
