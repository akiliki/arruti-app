import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar" *ngIf="authService.currentUser$ | async as user">
      <div class="navbar-brand">
        <a routerLink="/pedidos" class="logo">Pastelería Arruti</a>
      </div>
      <ul class="navbar-nav">
        <li><a routerLink="/pedidos" routerLinkActive="active">Tienda</a></li>
        <li><a routerLink="/obrador" routerLinkActive="active">Obrador</a></li>
        <li><a routerLink="/productos" routerLinkActive="active">Catálogo</a></li>
        <li><a routerLink="/seguridad" routerLinkActive="active">Seguridad</a></li>
        <li class="user-info">
          <span>{{ user.nombre }}</span>
          <button (click)="logout()" class="btn-logout">Salir</button>
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #3f51b5;
      color: white;
      padding: 0 1rem;
      height: 64px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: white;
      text-decoration: none;
    }
    .navbar-nav {
      list-style: none;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin: 0;
      padding: 0;
    }
    .navbar-nav li a {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 0;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .navbar-nav li a:hover {
      color: white;
    }
    .navbar-nav li a.active {
      color: white;
      border-bottom-color: white;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-left: 1rem;
      border-left: 1px solid rgba(255,255,255,0.3);
      padding-left: 1rem;
    }
    .btn-logout {
      background: none;
      border: 1px solid white;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-logout:hover {
      background: rgba(255,255,255,0.1);
    }
  `]
})
export class NavbarComponent {
  constructor(public authService: AuthService, private router: Router) {}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
