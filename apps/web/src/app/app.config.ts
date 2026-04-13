import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, RouteReuseStrategy, provideRouter } from '@angular/router';

import { routes } from './app.routes';

export class AppRouteReuseStrategy extends BaseRouteReuseStrategy {
  public override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (future.data && curr.data && future.data['reuseComponent'] && future.data['reuseComponent'] === curr.data['reuseComponent']) {
      return true;
    }
    return super.shouldReuseRoute(future, curr);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: AppRouteReuseStrategy }
  ]
};
