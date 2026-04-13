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
        <div class="glass-panel p-8 max-w-lg w-full animate-slide-up text-center space-y-4 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-blue-500"></div>
          <p class="text-xs font-bold tracking-widest text-brand-400 uppercase mb-2">Multiagent Platform</p>
          <h1 class="text-3xl font-semibold text-ui-50 tracking-tight">Preparando o workspace</h1>
          <p class="text-ui-400 text-sm">Conferindo sua sessão e carregando o contexto inicial...</p>
          
          <div class="flex justify-center pt-6 pb-2">
            <div class="flex space-x-2">
              <div class="w-3 h-3 rounded-full bg-brand-500/80 animate-bounce" style="animation-duration: 0.8s;"></div>
              <div class="w-3 h-3 rounded-full bg-blue-500/80 animate-bounce" style="animation-delay: 0.15s; animation-duration: 0.8s;"></div>
              <div class="w-3 h-3 rounded-full bg-cyan-500/80 animate-bounce" style="animation-delay: 0.3s; animation-duration: 0.8s;"></div>
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
