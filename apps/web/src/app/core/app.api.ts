import type {
  AgentDto,
  AuthResponseDto,
  CreateAgentRequestDto,
  CreateSessionRequestDto,
  EvalLabOverviewDto,
  EvalBenchmarkRequestDto,
  EvalBenchmarkResponseDto,
  EvalRunRequestDto,
  EvalRunResponseDto,
  KnowledgeSourceDto,
  MessageDto,
  OpenRouterKeyStatusDto,
  RagMetricsSummaryDto,
  SessionDto,
  UpdateAgentRequestDto
} from '@multiagent/shared';
import { Injectable } from '@angular/core';

type UserSummary = {
  id: string;
  email: string;
};

type AuthPayload = {
  user: UserSummary;
  tokens: AuthResponseDto['tokens'];
};

@Injectable({ providedIn: 'root' })
export class AppApiService {
  private readonly apiBaseUrl = String(
    (window as Window & { __APP_CONFIG__?: { apiBaseUrl?: string } }).__APP_CONFIG__?.apiBaseUrl ??
      'http://localhost:3000/api'
  ).replace(/\/$/, '');

  public register(input: { email: string; password: string }) {
    return this.request<AuthPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  public login(input: { email: string; password: string }) {
    return this.request<AuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  public refresh() {
    return this.request<AuthPayload>('/auth/refresh', {
      method: 'POST'
    });
  }

  public logout() {
    return this.request<void>('/auth/logout', {
      method: 'POST'
    });
  }

  public me(accessToken: string) {
    return this.request<{ user: UserSummary }>('/auth/me', {
      method: 'GET'
    }, accessToken);
  }

  public getOpenRouterKeyStatus(accessToken: string) {
    return this.request<OpenRouterKeyStatusDto>('/me/openrouter-key/status', {
      method: 'GET'
    }, accessToken);
  }

  public saveOpenRouterKey(accessToken: string, apiKey: string) {
    return this.request<OpenRouterKeyStatusDto>('/me/openrouter-key', {
      method: 'PUT',
      body: JSON.stringify({ apiKey })
    }, accessToken);
  }

  public deleteOpenRouterKey(accessToken: string) {
    return this.request<void>('/me/openrouter-key', {
      method: 'DELETE'
    }, accessToken);
  }

  public listAgents(accessToken: string) {
    return this.request<AgentDto[]>('/agents', { method: 'GET' }, accessToken);
  }

  public createAgent(accessToken: string, payload: CreateAgentRequestDto) {
    return this.request<AgentDto>('/agents', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, accessToken);
  }

  public updateAgent(accessToken: string, agentId: string, payload: UpdateAgentRequestDto) {
    return this.request<AgentDto>(`/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }, accessToken);
  }

  public deleteAgent(accessToken: string, agentId: string) {
    return this.request<void>(`/agents/${agentId}`, {
      method: 'DELETE'
    }, accessToken);
  }

  public async uploadAgentAvatar(accessToken: string, agentId: string, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.request<AgentDto>(`/agents/${agentId}/avatar`, {
      method: 'POST',
      body: formData
    }, accessToken, false);
  }

  public async fetchAgentAvatar(accessToken: string, agentId: string) {
    const response = await fetch(`${this.apiBaseUrl}/agents/${agentId}/avatar`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Nao foi possivel carregar o avatar');
    }

    return URL.createObjectURL(await response.blob());
  }

  public listKnowledgeSources(accessToken: string, agentId: string) {
    return this.request<KnowledgeSourceDto[]>(`/agents/${agentId}/knowledge/sources`, { method: 'GET' }, accessToken);
  }

  public uploadKnowledgeSource(accessToken: string, agentId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<KnowledgeSourceDto>(`/agents/${agentId}/knowledge/sources/upload`, {
      method: 'POST',
      body: formData
    }, accessToken, false);
  }

  public deleteKnowledgeSource(accessToken: string, agentId: string, sourceId: string) {
    return this.request<void>(`/agents/${agentId}/knowledge/sources/${sourceId}`, { method: 'DELETE' }, accessToken);
  }

  public getRagMetricsSummary(accessToken: string) {
    return this.request<RagMetricsSummaryDto>('/metrics/rag-summary', { method: 'GET' }, accessToken);
  }

  public getEvalLabOverview(accessToken: string) {
    return this.request<EvalLabOverviewDto>('/evals/overview', { method: 'GET' }, accessToken);
  }

  public runEvalScenario(accessToken: string, payload: EvalRunRequestDto) {
    return this.request<EvalRunResponseDto>('/evals/run', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, accessToken);
  }

  public runEvalBenchmark(accessToken: string, payload: EvalBenchmarkRequestDto) {
    return this.request<EvalBenchmarkResponseDto>('/evals/benchmark', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, accessToken);
  }

  public listSessions(accessToken: string, agentId: string) {
    return this.request<SessionDto[]>(`/agents/${agentId}/sessions`, { method: 'GET' }, accessToken);
  }

  public createSession(accessToken: string, agentId: string, payload: CreateSessionRequestDto = {}) {
    return this.request<SessionDto>(`/agents/${agentId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, accessToken);
  }

  public updateSession(accessToken: string, sessionId: string, title: string) {
    return this.request<SessionDto>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    }, accessToken);
  }

  public deleteSession(accessToken: string, sessionId: string) {
    return this.request<void>(`/sessions/${sessionId}`, {
      method: 'DELETE'
    }, accessToken);
  }

  public listMessages(accessToken: string, sessionId: string) {
    return this.request<MessageDto[]>(`/sessions/${sessionId}/messages`, { method: 'GET' }, accessToken);
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    accessToken?: string,
    isJson = true
  ): Promise<T> {
    const headers = new Headers(init.headers);

    if (!(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const message = await this.extractErrorMessage(response);
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return isJson ? ((await response.json()) as T) : ((await response.json()) as T);
  }

  private async extractErrorMessage(response: Response) {
    try {
      const payload = (await response.json()) as { message?: string };
      return payload.message ?? 'Falha na requisicao';
    } catch {
      return response.statusText || 'Falha na requisicao';
    }
  }
}
