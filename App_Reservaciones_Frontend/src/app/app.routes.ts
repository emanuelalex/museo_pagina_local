import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Home } from './features/home/home';
import { Checkout } from './features/checkout/checkout';
import { Confirmation } from './features/confirmation/confirmation';
import { Reservations } from './features/reservations/reservations';
import { adminGuard, consultaGuard } from './core/services/auth.guard';
import { SalasHorarios } from './features/salas-horarios/salas-horarios';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'taquilla', component: Home, canActivate: [consultaGuard] },
  { path: 'reservaciones', component: Reservations, canActivate: [consultaGuard] },
  { path: 'salas-horarios', component: SalasHorarios, canActivate: [consultaGuard] },
  { path: 'reservaciones/nueva', component: Checkout, canActivate: [adminGuard] },
  { path: 'reservaciones/confirmacion', component: Confirmation, canActivate: [adminGuard] },
  { path: '**', redirectTo: 'login' }
];
