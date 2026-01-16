import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, combineLatest, map, startWith, BehaviorSubject, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="list-container">
      <div class="header">
        <h2>Lista de Pedidos</h2>
        <button class="btn-new" routerLink="/nuevo-pedido">Nuevo Pedido</button>
      </div>

      <div class="filters">
        <div class="filter-group">
          <label>Estado:</label>
          <select [formControl]="estadoFilter">
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Producto:</label>
          <input type="text" [formControl]="productoFilter" placeholder="Filtrar por producto...">
        </div>

        <div class="filter-group">
          <label>Nombre Cliente:</label>
          <input type="text" [formControl]="nombreFilter" placeholder="Filtrar por cliente...">
        </div>

        <div class="filter-group">
          <label>Fecha:</label>
          <input type="date" [formControl]="fechaFilter">
        </div>
      </div>

      <div *ngIf="filteredPedidos$ | async as pedidos; else loading" class="table-wrapper">
        <table *ngIf="pedidos.length > 0; else empty">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Notas</th>
              <th>Cantidad</th>
              <th>Fecha Entrega</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let pedido of pedidos" [attr.data-testid]="'pedido-row-' + pedido.id">
              <td>{{ pedido.id }}</td>
              <td>{{ pedido.nombreCliente || '-' }}</td>
              <td>{{ pedido.producto }}</td>
              <td>
                <div *ngIf="pedido.notasPastelero" class="note-tag pastelero">Past: {{ pedido.notasPastelero }}</div>
                <div *ngIf="pedido.notasTienda" class="note-tag tienda">Tnd: {{ pedido.notasTienda }}</div>
                <span *ngIf="!pedido.notasPastelero && !pedido.notasTienda">-</span>
              </td>
              <td>{{ pedido.cantidad }}</td>
              <td>{{ pedido.fechaEntrega | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span class="badge" [ngClass]="pedido.estado.toLowerCase().replace(' ', '-')">
                  {{ pedido.estado }}
                </span>
              </td>
              <td>
                <button class="btn-action" [routerLink]="['/pedidos', pedido.id, 'estado']">
                  Cambiar Estado
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">No se encontraron pedidos con los filtros seleccionados.</div>
        </ng-template>
      </div>

      <ng-template #loading>
        <div class="loading-state">Cargando pedidos...</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .list-container { padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .btn-new { background: #d35400; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
    
    .filters { display: flex; gap: 20px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .filter-group { display: flex; flex-direction: column; gap: 5px; }
    .filter-group label { font-size: 0.9rem; font-weight: bold; }
    .filter-group input, .filter-group select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }

    .table-wrapper { background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; background: #f4f4f4; padding: 12px; border-bottom: 2px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .timestamp { font-size: 0.8rem; color: #666; }
    
    .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .badge.pendiente { background: #fff3cd; color: #856404; }
    .badge.en-proceso { background: #cce5ff; color: #004085; }
    .badge.finalizado { background: #d4edda; color: #155724; }

    .note-tag {
      font-size: 0.75rem;
      padding: 2px 5px;
      border-radius: 4px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }
    .note-tag.pastelero { background: #fdf2f2; color: #9b1c1c; border: 1px solid #f8d7da; }
    .note-tag.tienda { background: #f0f9ff; color: #075985; border: 1px solid #bae6fd; }

    .loading-state, .empty-state { padding: 40px; text-align: center; color: #666; }
    
    .btn-action {
      background: #34495e;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .btn-action:hover {
      background: #2c3e50;
    }
  `]
})
export class PedidosListComponent implements OnInit {
  private productionService = inject(ProductionService);

  estadoFilter = new FormControl('');
  productoFilter = new FormControl('');
  fechaFilter = new FormControl('');
  nombreFilter = new FormControl('');

  private refresh$ = new BehaviorSubject<void>(undefined);
  updatingId: string | null = null;
  filteredPedidos$!: Observable<Pedido[]>;

  ngOnInit() {
    const pedidos$ = this.refresh$.pipe(
      switchMap(() => this.productionService.getPedidos())
    );
    
    const estado$ = this.estadoFilter.valueChanges.pipe(startWith(''));
    const producto$ = this.productoFilter.valueChanges.pipe(startWith(''));
    const fecha$ = this.fechaFilter.valueChanges.pipe(startWith(''));
    const nombre$ = this.nombreFilter.valueChanges.pipe(startWith(''));

    this.filteredPedidos$ = combineLatest([pedidos$, estado$, producto$, fecha$, nombre$]).pipe(
      map(([pedidos, estado, producto, fecha, nombre]) => {
        return pedidos.filter(p => {
          const matchEstado = !estado || p.estado === estado;
          const matchProducto = !producto || p.producto.toLowerCase().includes(producto.toLowerCase());
          const matchFecha = !fecha || this.formatDate(p.fechaEntrega) === fecha;
          const matchNombre = !nombre || (p.nombreCliente && p.nombreCliente.toLowerCase().includes(nombre.toLowerCase()));
          return matchEstado && matchProducto && matchFecha && matchNombre;
        });
      })
    );
  }

  onStatusChange(id: string, event: Event) {
    const nuevoEstado = (event.target as HTMLSelectElement).value as EstadoPedido;
    this.updatingId = id;
    
    this.productionService.updatePedidoStatus(id, nuevoEstado).subscribe({
      next: () => {
        this.updatingId = null;
        this.refresh$.next();
      },
      error: (err) => {
        alert(err.message);
        this.updatingId = null;
        this.refresh$.next(); // Revertir UI
      }
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
