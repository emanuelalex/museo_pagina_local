import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;
  if (!auth.getToken()) return router.createUrlTree(['/login']);

  return auth.comprobarSesion().pipe(
    map(sesion => sesion.rol === 'admin' ? true : router.createUrlTree(['/taquilla'])),
    catchError(() => {
      auth.logout();
      return of(router.createUrlTree(['/login']));
    })
  );
};

export const consultaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;
  if (!auth.getToken()) return router.createUrlTree(['/login']);
  return auth.comprobarSesion().pipe(
    map(sesion => ['admin', 'usuario'].includes(sesion.rol) ? true : router.createUrlTree(['/login'])),
    catchError(() => { auth.logout(); return of(router.createUrlTree(['/login'])); })
  );
};
