
import { Routes } from '@angular/router';

import { Login } from './features/login/login';
import { Home } from './features/home/home';
import { Checkout } from './features/checkout/checkout';
import { Confirmation } from './features/confirmation/confirmation';
import { Reservations } from './features/reservations/reservations';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'taquilla',
    component: Home
  },
  {
    path: 'reservaciones',
    component: Reservations
  },
  {
    path: 'reservaciones/nueva',
    component: Checkout
  },
  {
    path: 'reservaciones/confirmacion',
    component: Confirmation
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
