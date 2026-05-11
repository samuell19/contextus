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
      <main class="min-h-screen flex items-center justify-center p-6">
        <div class="glass-panel p-8 max-w-md w-full animate-rise text-center space-y-4 relative overflow-hidden">
          <p class="text-xs font-extrabold tracking-[0.14em] text-brand-300 uppercase mb-2">Contextus</p>
          <h1 class="text-3xl font-semibold text-ui-50 tracking-normal">Preparando workspace</h1>
          <p class="text-ui-400 text-sm">Conferindo sessao, chave e contexto inicial.</p>

          <div class="flex justify-center pt-5 pb-1">
            <div class="flex gap-2">
              <div class="w-2.5 h-2.5 rounded-full bg-brand-300 animate-soft-pulse"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-cyan-300 animate-soft-pulse" style="animation-delay: 0.18s;"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-amber-300 animate-soft-pulse" style="animation-delay: 0.36s;"></div>
            </div>
          </div>
        </div>
      </main>
    </ng-template>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  protected readonly auth = inject(AuthStore);

  public ngOnInit() {
    void this.auth.initialize();
  }
}
