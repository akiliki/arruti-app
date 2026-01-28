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
  styleUrl: './usuarios-list.component.scss'
})
export class UsuariosListComponent {
  usuarios: Usuario[] = [
    { id: '1', nombre: 'Admin', email: 'admin@arruti.com', perfilId: 'admin', activo: true },
    { id: '2', nombre: 'Joxe', email: 'joxe@arruti.eus', perfilId: 'obrador', activo: true },
    { id: '3', nombre: 'Sonia', email: 'sonia@arruti.eus', perfilId: 'tienda', activo: true }
  ];
}
