import { inject } from '@angular/core';
import { type CanActivateFn, Router, Routes } from '@angular/router';

import { AuthStore } from './core/auth.store';
import { AgentCatalogPageComponent } from './features/agents/agent-catalog-page.component';
import { AgentFormPageComponent } from './features/agents/agent-form-page.component';
import { AuthPageComponent } from './features/auth/auth-page.component';
import { EvalLabPageComponent } from './features/evals/eval-lab-page.component';
import { MetricsPageComponent } from './features/metrics/metrics-page.component';
import { OnboardingPageComponent } from './features/onboarding/onboarding-page.component';
import { SettingsPageComponent } from './features/settings/settings-page.component';
import { ShellPageComponent } from './features/shell/shell-page.component';

const guestOnlyGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  await store.initialize();

  if (!store.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([store.hasConfiguredKey() ? '/home' : '/onboarding']);
};

const onboardingGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  await store.initialize();

  if (!store.isAuthenticated()) {
    return router.createUrlTree(['/auth']);
  }

  if (store.hasConfiguredKey()) {
    return router.createUrlTree(['/home']);
  }

  return true;
};

const readyGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  await store.initialize();

  if (!store.isAuthenticated()) {
    return router.createUrlTree(['/auth']);
  }

  if (!store.hasConfiguredKey()) {
    return router.createUrlTree(['/onboarding']);
  }

  return true;
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'auth', component: AuthPageComponent, canActivate: [guestOnlyGuard] },
  { path: 'onboarding', component: OnboardingPageComponent, canActivate: [onboardingGuard] },
  { path: 'settings', component: SettingsPageComponent, canActivate: [readyGuard] },
  { path: 'evals', component: EvalLabPageComponent, canActivate: [readyGuard] },
  { path: 'metrics', component: MetricsPageComponent, canActivate: [readyGuard] },
  { path: 'agents', component: AgentCatalogPageComponent, canActivate: [readyGuard] },
  { path: 'agents/new', component: AgentFormPageComponent, canActivate: [readyGuard] },
  { path: 'agents/:agentId/edit', component: AgentFormPageComponent, canActivate: [readyGuard] },
  { path: 'home', component: ShellPageComponent, canActivate: [readyGuard], data: { reuseComponent: 'shell' } },
  { path: 'home/:agentId', component: ShellPageComponent, canActivate: [readyGuard], data: { reuseComponent: 'shell' } },
  { path: 'home/:agentId/:sessionId', component: ShellPageComponent, canActivate: [readyGuard], data: { reuseComponent: 'shell' } },
  { path: '**', redirectTo: 'home' }
];
