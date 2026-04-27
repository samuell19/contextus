import type {
  EvalBenchmarkModeSummaryDto,
  EvalBenchmarkResponseDto,
  EvalLabOverviewDto,
  EvalModeId,
  EvalRunModeResultDto,
  EvalRunResponseDto,
  EvalScenarioDto
} from '@multiagent/shared';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AppApiService } from '../../core/app.api';
import { AuthStore } from '../../core/auth.store';
import { WorkspaceNavComponent } from '../../shared/layout/workspace-nav/workspace-nav.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-eval-lab-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkspaceNavComponent, StatusBadgeComponent],
  templateUrl: './eval-lab-page.component.html',
  styleUrl: './eval-lab-page.component.css'
})
export class EvalLabPageComponent implements OnInit {
  public readonly loading = signal(true);
  public readonly running = signal(false);
  public readonly error = signal('');
  public readonly overview = signal<EvalLabOverviewDto | null>(null);
  public readonly selectedScenarioId = signal<string | null>(null);
  public readonly result = signal<EvalRunResponseDto | null>(null);
  public readonly benchmark = signal<EvalBenchmarkResponseDto | null>(null);
  public readonly modeState = signal<Record<EvalModeId, boolean>>({
    llm_puro: true,
    memoria_resumida: false,
    rag_enxuto: true,
    rag_memoria: true
  });
  public readonly selectedScenario = computed<EvalScenarioDto | null>(() => {
    const overview = this.overview();
    const selectedId = this.selectedScenarioId();

    if (!overview || !selectedId) {
      return null;
    }

    return overview.scenarios.find((scenario) => scenario.id === selectedId) ?? null;
  });
  public readonly selectedModes = computed(() =>
    this.overview()?.modes.filter((mode) => this.modeState()[mode.id]) ?? []
  );

  public constructor(
    private readonly api: AppApiService,
    public readonly auth: AuthStore
  ) {}

  public ngOnInit() {
    void this.loadOverview();
  }

  public async loadOverview() {
    this.loading.set(true);
    this.error.set('');

    try {
      const overview = await this.api.getEvalLabOverview(this.requireToken());
      this.overview.set(overview);

      if (!this.selectedScenarioId()) {
        this.selectedScenarioId.set(overview.scenarios[0]?.id ?? null);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar o lab');
    } finally {
      this.loading.set(false);
    }
  }

  public selectScenario(scenarioId: string) {
    this.selectedScenarioId.set(scenarioId);
    this.result.set(null);
    this.error.set('');
  }

  public toggleMode(modeId: EvalModeId, checked: boolean) {
    this.modeState.update((current) => ({
      ...current,
      [modeId]: checked
    }));
    this.benchmark.set(null);
  }

  public isModeChecked(modeId: EvalModeId) {
    return this.modeState()[modeId];
  }

  public async runSelectedScenario() {
    const scenario = this.selectedScenario();
    const modes = this.selectedModes();

    if (!scenario || modes.length === 0) {
      this.error.set('Selecione ao menos um modo para executar o teste.');
      return;
    }

    this.running.set(true);
    this.error.set('');

    try {
      this.result.set(
        await this.api.runEvalScenario(this.requireToken(), {
          scenarioId: scenario.id,
          modes: modes.map((mode) => mode.id)
        })
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao executar o teste');
    } finally {
      this.running.set(false);
    }
  }

  public async runBenchmark() {
    const overview = this.overview();
    const modes = this.selectedModes();

    if (!overview || modes.length === 0) {
      this.error.set('Selecione ao menos um modo para executar o benchmark.');
      return;
    }

    this.running.set(true);
    this.error.set('');

    try {
      this.benchmark.set(
        await this.api.runEvalBenchmark(this.requireToken(), {
          modes: modes.map((mode) => mode.id),
          scenarioIds: overview.scenarios.map((scenario) => scenario.id)
        })
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao executar o benchmark');
    } finally {
      this.running.set(false);
    }
  }

  public trackById = (_index: number, item: { id: string }) => item.id;

  public benchmarkCalls() {
    return (this.overview()?.scenarios.length ?? 0) * this.selectedModes().length;
  }

  public formatPercent(value: number | null) {
    if (value === null) {
      return 'n/a';
    }

    return `${Math.round(value * 100)}%`;
  }

  public getBenchmarkWinner(benchmark: EvalBenchmarkResponseDto | null) {
    if (!benchmark || benchmark.modeSummaries.length === 0) {
      return null;
    }

    return [...benchmark.modeSummaries].sort((left, right) => {
      if (left.accuracyRate !== right.accuracyRate) {
        return right.accuracyRate - left.accuracyRate;
      }

      if ((left.correctAbstentionRate ?? -1) !== (right.correctAbstentionRate ?? -1)) {
        return (right.correctAbstentionRate ?? -1) - (left.correctAbstentionRate ?? -1);
      }

      if (left.hallucinationRate !== right.hallucinationRate) {
        return left.hallucinationRate - right.hallucinationRate;
      }

      if (left.avgPromptTokens !== right.avgPromptTokens) {
        return left.avgPromptTokens - right.avgPromptTokens;
      }

      return left.avgLatencyMs - right.avgLatencyMs;
    })[0] ?? null;
  }

  public describeBenchmark(summary: EvalBenchmarkModeSummaryDto) {
    const parts = [
      `acerto de ${this.formatPercent(summary.accuracyRate)}`,
      `alucinacao em ${this.formatPercent(summary.hallucinationRate)} dos cenarios`,
      `media de ${summary.avgPromptTokens} tokens de prompt`
    ];

    if (summary.correctAbstentionRate !== null) {
      parts.splice(1, 0, `abstencao correta de ${this.formatPercent(summary.correctAbstentionRate)}`);
    }

    return `Este modo terminou o benchmark com ${parts.join(', ')}.`;
  }

  public benchmarkScenarioCountCopy(summary: EvalBenchmarkModeSummaryDto) {
    return `${summary.passedScenarios} de ${summary.scenariosRun} cenarios`;
  }

  public categoryLabel(category: string) {
    const labels: Record<string, string> = {
      factual: 'Factual',
      conflicting: 'Conflitante',
      unanswerable: 'Sem resposta',
      multi_document: 'Multi-documento',
      long_session: 'Sessao longa'
    };

    return labels[category] ?? category;
  }

  public getBestResult(run: EvalRunResponseDto | null) {
    if (!run) {
      return null;
    }

    const passed = run.results.filter((result) => result.score.passed);

    if (passed.length === 0) {
      return run.results[0] ?? null;
    }

    return [...passed].sort((left, right) => {
      if (left.estimatedPromptTokens !== right.estimatedPromptTokens) {
        return left.estimatedPromptTokens - right.estimatedPromptTokens;
      }

      return left.latencyMs - right.latencyMs;
    })[0] ?? null;
  }

  public getComparisonHeadline(run: EvalRunResponseDto | null) {
    if (!run || run.results.length === 0) {
      return 'Nenhum resultado ainda';
    }

    const passedCount = run.results.filter((result) => result.score.passed).length;

    if (passedCount === run.results.length) {
      return 'Todos os modos selecionados passaram neste cenário.';
    }

    if (passedCount === 0) {
      return 'Nenhum dos modos selecionados conseguiu passar neste cenário.';
    }

    return `${passedCount} de ${run.results.length} modo(s) passaram neste cenário.`;
  }

  public getComparisonNarrative(run: EvalRunResponseDto | null) {
    if (!run || run.results.length === 0) {
      return '';
    }

    const pure = run.results.find((result) => result.mode === 'llm_puro');
    const rag = run.results.find((result) => result.mode === 'rag_enxuto');
    const ragMemory = run.results.find((result) => result.mode === 'rag_memoria');
    const memory = run.results.find((result) => result.mode === 'memoria_resumida');

    if (pure && !pure.score.passed && (rag?.score.passed || ragMemory?.score.passed)) {
      return 'Sem contexto extra, o modelo nao conseguiu responder bem. Quando recebeu trechos curtos da base, encontrou o fato esperado e ficou ancorado.';
    }

    if (memory?.score.passed && pure && !pure.score.passed) {
      return 'O resumo curto da sessao ja foi suficiente para recuperar o contexto sem reenviar toda a conversa.';
    }

    if (pure?.score.passed && !rag?.score.passed && !ragMemory?.score.passed) {
      return 'Neste caso, o modelo ja acertava sozinho e o contexto extra nao trouxe ganho claro.';
    }

    const best = this.getBestResult(run);

    if (best) {
      return `${best.label} entregou o melhor equilibrio entre acerto e custo entre os modos executados.`;
    }

    return 'Compare as respostas abaixo para ver quando o contexto externo realmente ajudou.';
  }

  public describeModeSetup(result: EvalRunModeResultDto) {
    switch (result.mode) {
      case 'llm_puro':
        return 'Rodou sem resumo e sem trechos externos da base.';
      case 'memoria_resumida':
        return 'Rodou com resumo curto da sessao e poucos turnos recentes.';
      case 'rag_enxuto':
        return 'Rodou com poucos trechos relevantes da base, sem levar a conversa inteira.';
      case 'rag_memoria':
        return 'Rodou com resumo da sessao e trechos da base dentro do mesmo limite curto de contexto.';
      default:
        return 'Rodou com contexto controlado.';
    }
  }

  public describeModeOutcome(result: EvalRunModeResultDto) {
    if (result.score.label === 'Resposta ancorada') {
      return 'Encontrou base suficiente e respondeu com os fatos esperados.';
    }

    if (result.score.label === 'Abstencao correta') {
      return 'Percebeu que faltava base e evitou inventar uma resposta.';
    }

    if (result.score.label === 'Absteve quando deveria responder') {
      return 'Ficou conservador demais e nao conseguiu aproveitar o contexto curto para responder.';
    }

    if (result.score.label === 'Citou base errada') {
      return 'Chegou perto, mas se apoiou no trecho errado da base.';
    }

    if (result.score.label === 'Resposta fora do gabarito') {
      return 'Respondeu, mas deixou fatos importantes de fora ou desviou do esperado.';
    }

    return result.score.details;
  }

  public getReadableAnswer(result: EvalRunModeResultDto) {
    const answer = result.answer.trim();

    if (!answer || answer === 'canAnswer=false') {
      return result.canAnswer
        ? 'O modelo nao retornou um texto util para exibir.'
        : 'O modelo preferiu nao responder com o contexto disponivel.';
    }

    return answer;
  }

  private requireToken() {
    const token = this.auth.accessToken();

    if (!token) {
      throw new Error('Sessao expirada');
    }

    return token;
  }
}
