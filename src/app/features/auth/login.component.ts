import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Pastelería Arruti</h2>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" formControlName="email">
            <div *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid" class="error">
              Email válido requerido
            </div>
          </div>
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" formControlName="password">
          </div>
          <div *ngIf="error" class="error-message">
            {{ error }}
          </div>
          <button type="submit" [disabled]="loginForm.invalid">Iniciar Sesión</button>
        </form>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe(success => {
        if (success) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const defaultRoute = this.authService.getDefaultRoute(user.perfilId);
          this.router.navigate([defaultRoute]);
        } else {
          this.error = 'Credenciales incorrectas';
        }
      });
    }
  }
}
