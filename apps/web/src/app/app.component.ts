import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthStore } from './core/auth.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <ng-container *ngIf="auth.initialized(); else loading">
      <router-outlet></router-outlet>
    </ng-container>

    <ng-template #loading>
      <main class="loading-shell">
        <div class="loading-card">
          <p class="eyebrow">Multiagent Platform</p>
          <h1>Preparando o workspace</h1>
          <p>Conferindo sua sessao e carregando o contexto inicial.</p>
        </div>
      </main>
    </ng-template>
  `,
  styles: [
    `
      .loading-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .loading-card {
        width: min(520px, 100%);
        border: 1px solid var(--stroke);
        background: var(--surface);
        box-shadow: var(--shadow);
        border-radius: var(--radius);
        padding: 32px;
      }

      .eyebrow {
        margin: 0 0 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.78rem;
        color: var(--accent-strong);
      }

      h1 {
        margin: 0 0 10px;
      }

      p {
        margin: 0;
        color: var(--muted);
      }
    `
  ]
})
export class AppComponent implements OnInit {
  protected readonly auth = inject(AuthStore);

  public ngOnInit() {
    void this.auth.initialize();
  }
}
