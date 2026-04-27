import type { OpenRouterKeyStatusDto } from '@multiagent/shared';
import { Injectable, computed, signal } from '@angular/core';

import { AppApiService } from './app.api';

type UserSummary = {
  id: string;
  email: string;
};

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly storageKey = 'ma_access_token';
  private initializationPromise: Promise<void> | null = null;

  public readonly user = signal<UserSummary | null>(null);
  public readonly accessToken = signal<string | null>(localStorage.getItem(this.storageKey));
  public readonly keyStatus = signal<OpenRouterKeyStatusDto | null>(null);
  public readonly initialized = signal(false);
  public readonly isAuthenticated = computed(() => this.user() !== null);
  public readonly hasConfiguredKey = computed(() => this.keyStatus()?.configured ?? false);

  public constructor(private readonly api: AppApiService) {}

  public async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const currentToken = this.accessToken();

        if (currentToken) {
          const me = await this.api.me(currentToken);
          this.user.set(me.user);
          await this.loadKeyStatus();
          return;
        }

        await this.refreshSession();
      } catch {
        this.clearSession();
      } finally {
        this.initialized.set(true);
      }
    })();

    return this.initializationPromise;
  }

  public async register(email: string, password: string) {
    const result = await this.api.register({ email, password });
    await this.applyAuthPayload(result);
  }

  public async login(email: string, password: string) {
    const result = await this.api.login({ email, password });
    await this.applyAuthPayload(result);
  }

  public async refreshSession() {
    const result = await this.api.refresh();
    await this.applyAuthPayload(result);
  }

  public async logout() {
    try {
      await this.api.logout();
    } finally {
      this.clearSession();
    }
  }

  public async saveOpenRouterKey(apiKey: string) {
    const status = await this.withFreshToken((token) => this.api.saveOpenRouterKey(token, apiKey));
    this.keyStatus.set(status);
  }

  public async deleteOpenRouterKey() {
    await this.withFreshToken((token) => this.api.deleteOpenRouterKey(token));
    await this.loadKeyStatus();
  }

  public async loadKeyStatus() {
    const status = await this.withFreshToken((token) => this.api.getOpenRouterKeyStatus(token));
    this.keyStatus.set(status);
  }

  private async applyAuthPayload(payload: {
    user: UserSummary;
    tokens: { accessToken: string };
  }) {
    this.user.set(payload.user);
    this.accessToken.set(payload.tokens.accessToken);
    localStorage.setItem(this.storageKey, payload.tokens.accessToken);
    await this.loadKeyStatus();
  }

  private requireToken() {
    const token = this.accessToken();

    if (!token) {
      throw new Error('Sessao expirada');
    }

    return token;
  }

  private async withFreshToken<T>(operation: (token: string) => Promise<T>) {
    try {
      return await operation(this.requireToken());
    } catch (error) {
      if (!this.shouldRetryWithRefresh(error)) {
        throw error;
      }

      try {
        await this.refreshSession();
      } catch (refreshError) {
        this.clearSession();
        throw refreshError;
      }

      return operation(this.requireToken());
    }
  }

  private shouldRetryWithRefresh(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    return (
      message.includes('token de acesso invalido') ||
      message.includes('token de acesso ausente') ||
      message.includes('sessao expirada')
    );
  }

  private clearSession() {
    this.user.set(null);
    this.accessToken.set(null);
    this.keyStatus.set(null);
    localStorage.removeItem(this.storageKey);
  }
}
