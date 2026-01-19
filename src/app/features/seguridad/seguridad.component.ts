import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="seguridad-container">
      <nav class="sub-nav">
        <a routerLink="usuarios" routerLinkActive="active">Usuarios</a>
        <a routerLink="perfiles" routerLinkActive="active">Perfiles</a>
      </nav>
      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .seguridad-container { padding: 1rem; }
    .sub-nav {
      display: flex;
      gap: 1rem;
      border-bottom: 1px solid #ccc;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
    }
    .sub-nav a {
      text-decoration: none;
      color: #666;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 4px;
    }
    .sub-nav a:hover { background-color: #f0f0f0; }
    .sub-nav a.active {
      color: white;
      background-color: #3f51b5;
    }
    .content { background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  `]
})
export class SeguridadComponent {}
