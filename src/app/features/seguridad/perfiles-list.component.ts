import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Perfil } from '../../core/models/perfil.model';

@Component({
  selector: 'app-perfiles-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2>Perfiles</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let perfil of perfiles">
            <td>{{ perfil.nombre }}</td>
            <td>{{ perfil.descripcion }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .container { padding: 2rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; border: 1px solid #ddd; text-align: left; }
    th { background-color: #f5f5f5; }
  `]
})
export class PerfilesListComponent {
  perfiles: Perfil[] = [
    { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total', permisos: ['*'] },
    { id: 'obrador', nombre: 'Obrador', descripcion: 'Gestión de producción', permisos: ['pedidos.view', 'pedidos.update'] },
    { id: 'tienda', nombre: 'Tienda', descripcion: 'Gestión de pedidos en tienda', permisos: ['pedidos.create', 'pedidos.update'] }
  ];
}
