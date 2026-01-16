import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar">
      <div class="navbar-brand">
        <a routerLink="/" class="logo">Pastelería Arruti</a>
      </div>
      <ul class="navbar-nav">
        <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Dashboard</a></li>
        <li><a routerLink="/pedidos" routerLinkActive="active">Pedidos</a></li>
        <li><a routerLink="/productos" routerLinkActive="active">Catálogo</a></li>
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
  `]
})
export class NavbarComponent {}
