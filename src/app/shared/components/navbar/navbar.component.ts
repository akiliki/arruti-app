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
        <a [routerLink]="authService.getDefaultRoute(user.perfilId)" class="logo">Pastelería Arruti</a>
        <button class="navbar-toggle" (click)="toggleMenu()" aria-label="Toggle navigation">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </button>
      </div>
      <ul class="navbar-nav" [class.open]="isMenuOpen">
        <li *ngIf="authService.hasPermission(user.perfilId, 'tienda')">
          <a routerLink="/pedidos" routerLinkActive="active" (click)="isMenuOpen = false">Tienda</a>
        </li>
        <li *ngIf="authService.hasPermission(user.perfilId, 'obrador')">
          <a routerLink="/obrador" routerLinkActive="active" (click)="isMenuOpen = false">Obrador</a>
        </li>
        <li *ngIf="authService.hasPermission(user.perfilId, 'obrador') || authService.hasPermission(user.perfilId, 'catalogo')">
          <a routerLink="/recetas" routerLinkActive="active" (click)="isMenuOpen = false">Recetas</a>
        </li>
        <li *ngIf="authService.hasPermission(user.perfilId, 'catalogo')">
          <a routerLink="/productos" routerLinkActive="active" (click)="isMenuOpen = false">Catálogo</a>
        </li>
        <li *ngIf="authService.hasPermission(user.perfilId, 'seguridad')">
          <a routerLink="/seguridad" routerLinkActive="active" (click)="isMenuOpen = false">Seguridad</a>
        </li>
        <li class="user-info">
          <span class="user-name">{{ user.nombre }}</span>
          <button (click)="logout()" class="btn-logout">Salir</button>
        </li>
      </ul>
    </nav>
  `,
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  isMenuOpen = false;

  constructor(public authService: AuthService, private router: Router) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout() {
    this.isMenuOpen = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
