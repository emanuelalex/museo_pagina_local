import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  mostrarPassword = false;
  cargando = false;
  errorMensaje = '';

  perfilSeleccionado: 'taquilla' | 'admin' = 'taquilla';

  loginForm = this.fb.nonNullable.group({
    usuario: ['', Validators.required],
    password: ['', Validators.required]
  });

  seleccionarPerfil(perfil: 'taquilla' | 'admin'): void {
    this.perfilSeleccionado = perfil;
    this.errorMensaje = '';
  }

  alternarPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (this.cargando) return;

    this.cargando = true;
    this.errorMensaje = '';

    const { usuario, password } =
      this.loginForm.getRawValue();

    this.authService.login(usuario, password).subscribe({
      next: (respuesta) => {
        this.cargando = false;

        if (respuesta.rol !== this.perfilSeleccionado) {
          this.authService.logout();
          this.errorMensaje =
            'Tu cuenta no corresponde al perfil seleccionado.';
          return;
        }

        if (respuesta.rol === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/taquilla']);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;

        this.errorMensaje =
          typeof error.error?.mensaje === 'string'
            ? error.error.mensaje
            : 'No fue posible iniciar sesión. Intenta nuevamente.';
      }
    });
  }
}

