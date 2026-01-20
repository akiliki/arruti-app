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
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f5f5f5;
    }
    .login-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }
    h2 { text-align: center; color: #3f51b5; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1.5rem; }
    label { display: block; margin-bottom: 0.5rem; }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background-color: #3f51b5;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    button:disabled { background-color: #ccc; }
    .error { color: red; font-size: 0.8rem; margin-top: 0.25rem; }
    .error-message { color: red; margin-bottom: 1rem; text-align: center; }
  `]
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
