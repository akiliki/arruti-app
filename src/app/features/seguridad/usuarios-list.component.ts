import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2>Usuarios</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let usuario of usuarios">
            <td>{{ usuario.nombre }}</td>
            <td>{{ usuario.email }}</td>
            <td>{{ usuario.activo ? 'Activo' : 'Inactivo' }}</td>
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
export class UsuariosListComponent {
  usuarios: Usuario[] = [
    { id: '1', nombre: 'Admin', email: 'admin@arruti.com', perfilId: 'admin', activo: true },
    { id: '2', nombre: 'Obrador 1', email: 'obrador1@arruti.com', perfilId: 'obrador', activo: true }
  ];
}
