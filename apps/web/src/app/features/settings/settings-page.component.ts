import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import { WorkspaceNavComponent } from '../../shared/layout/workspace-nav/workspace-nav.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, WorkspaceNavComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css'
})
export class SettingsPageComponent {
  public readonly error = signal('');
  public readonly message = signal('');
  public apiKey = '';

  public constructor(public readonly auth: AuthStore, private readonly router: Router) {}

  public async saveKey() {
    this.error.set('');
    this.message.set('');

    try {
      await this.auth.saveOpenRouterKey(this.apiKey);
      this.message.set('Chave atualizada com sucesso.');
      this.apiKey = '';
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao atualizar a chave');
    }
  }

  public async removeKey() {
    this.error.set('');
    this.message.set('');

    try {
      await this.auth.deleteOpenRouterKey();
      this.message.set('Chave removida. O chat ficara bloqueado ate cadastrar uma nova.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao remover a chave');
    }
  }

  public async logout() {
    await this.auth.logout();
    await this.router.navigate(['/auth']);
  }
}
