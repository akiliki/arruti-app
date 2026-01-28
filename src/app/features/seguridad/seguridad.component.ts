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
  styleUrl: './seguridad.component.scss'
})
export class SeguridadComponent {}
