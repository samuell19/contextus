import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css'
})
export class AuthPageComponent {
  public readonly mode = signal<'login' | 'register'>('login');
  public readonly busy = signal(false);
  public readonly error = signal('');

  public email = '';
  public password = '';

  public constructor(private readonly auth: AuthStore, private readonly router: Router) {}

  public async submit() {
    this.error.set('');
    this.busy.set(true);

    try {
      if (this.mode() === 'login') {
        await this.auth.login(this.email, this.password);
      } else {
        await this.auth.register(this.email, this.password);
      }

      await this.router.navigate([this.auth.hasConfiguredKey() ? '/home' : '/onboarding']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao autenticar');
    } finally {
      this.busy.set(false);
    }
  }
}
