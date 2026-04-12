import type { RagMetricsSummaryDto } from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppApiService } from '../../core/app.api';
import { AuthStore } from '../../core/auth.store';
import { WorkspaceNavComponent } from '../../shared/layout/workspace-nav/workspace-nav.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-metrics-page',
  standalone: true,
  imports: [CommonModule, RouterLink, WorkspaceNavComponent, StatusBadgeComponent],
  templateUrl: './metrics-page.component.html',
  styleUrl: './metrics-page.component.css'
})
export class MetricsPageComponent implements OnInit, OnDestroy {
  public readonly loading = signal(true);
  public readonly error = signal('');
  public readonly metrics = signal<RagMetricsSummaryDto | null>(null);
  public readonly updatedAt = signal<Date | null>(null);
  public readonly retrievalHitRatePercent = computed(() => {
    const value = this.metrics()?.retrievalHitRate ?? 0;
    return `${(value * 100).toFixed(1)}%`;
  });
  public readonly ragUsagePercent = computed(() => {
    const value = this.metrics()?.ragUsageRate ?? 0;
    return `${(value * 100).toFixed(1)}%`;
  });

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly api: AppApiService,
    public readonly auth: AuthStore
  ) {}

  public ngOnInit() {
    void this.refresh();
    this.refreshTimer = setInterval(() => {
      void this.refresh(false);
    }, 10000);
  }

  public ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  public async refresh(showLoading = true) {
    if (showLoading) {
      this.loading.set(true);
    }

    this.error.set('');

    try {
      const token = this.requireToken();
      this.metrics.set(await this.api.getRagMetricsSummary(token));
      this.updatedAt.set(new Date());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar metricas');
    } finally {
      this.loading.set(false);
    }
  }

  private requireToken() {
    const token = this.auth.accessToken();

    if (!token) {
      throw new Error('Sessao expirada');
    }

    return token;
  }
}
