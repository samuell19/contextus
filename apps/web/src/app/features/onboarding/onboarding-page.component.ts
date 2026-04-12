import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.css'
})
export class OnboardingPageComponent {
  public readonly busy = signal(false);
  public readonly error = signal('');
  public apiKey = '';

  public constructor(public readonly auth: AuthStore, private readonly router: Router) {}

  public async saveKey() {
    this.error.set('');
    this.busy.set(true);

    try {
      await this.auth.saveOpenRouterKey(this.apiKey);
      await this.router.navigate(['/home']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao salvar a chave');
    } finally {
      this.busy.set(false);
    }
  }
}
