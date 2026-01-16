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

      <div class="summary-cards" *ngIf="stats$ | async as stats">
        <div class="card pending">
          <span class="count">{{stats.pendientesEntrega}}</span>
          <span class="label">Pendientes de Entregar</span>
        </div>
        <div class="card today">
          <span class="count">{{stats.hoy}}</span>
          <span class="label">Para Hoy</span>
        </div>
        <div class="card manufacturing">
          <span class="count">{{stats.enObrador}}</span>
          <span class="label">En Obrador</span>
        </div>
        <div class="card delivered">
          <span class="count">{{stats.entregados}}</span>
          <span class="label">Entregados Hoy</span>
        </div>
      </div>

      <div class="filters">
        <div class="filter-group">
          <label>Estado:</label>
          <select [formControl]="estadoFilter">
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Producido">Producido</option>
            <option value="Entregado">Entregado</option>
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
            <tr *ngFor="let pedido of pedidos" 
                [attr.data-testid]="'pedido-row-' + pedido.id"
                [class.is-today]="isToday(pedido.fechaEntrega)"
                [class.is-urgent]="isToday(pedido.fechaEntrega) && pedido.estado === 'Pendiente'">
              <td class="client-name">{{ pedido.nombreCliente || '-' }}</td>
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
                <div class="action-buttons">
                  <button class="btn-action" [routerLink]="['/pedidos', pedido.id]">
                    VER
                  </button>
                  <button *ngIf="pedido.estado === 'Producido'" 
                          class="btn-quick-ready" 
                          (click)="markAsDelivered(pedido.id)"
                          [disabled]="updatingId === pedido.id">
                    {{ updatingId === pedido.id ? '...' : 'ENTREGAR' }}
                  </button>
                </div>
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
    
    .summary-cards { display: flex; gap: 15px; margin-bottom: 20px; }
    .card { flex: 1; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; background: #fff; border: 1px solid #ddd; }
    .card.pending { border-left: 5px solid #2ecc71; background: #f0fff4; }
    .card.today { border-left: 5px solid #e74c3c; background: #fff5f5; }
    .card.manufacturing { border-left: 5px solid #3498db; }
    .card.delivered { border-left: 5px solid #95a5a6; }
    .card .count { font-size: 1.5rem; font-weight: bold; }
    .card .label { font-size: 0.8rem; color: #666; text-transform: uppercase; }

    .filters { display: flex; gap: 20px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .filter-group { display: flex; flex-direction: column; gap: 5px; }
    .filter-group label { font-size: 0.9rem; font-weight: bold; }
    .filter-group input, .filter-group select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }

    .table-wrapper { background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; background: #f4f4f4; padding: 12px; border-bottom: 2px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    
    tr.is-today { background-color: #fff9f0; }
    tr.is-today td { border-bottom: 1px solid #ffeeba; }
    tr.is-urgent { border-left: 5px solid #e74c3c; }
    .client-name { font-weight: bold; color: #2c3e50; }

    .timestamp { font-size: 0.8rem; color: #666; }
    
    .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .badge.pendiente { background: #fff3cd; color: #856404; }
    .badge.en-proceso { background: #cce5ff; color: #004085; }
    .badge.producido { background: #d4edda; color: #155724; }
    .badge.entregado { background: #e2e3e5; color: #383d41; }

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
    .btn-action:hover { background: #2c3e50; }

    .action-buttons { display: flex; gap: 5px; }
    .btn-quick-ready {
      background: #27ae60;
      color: white;
      border: none;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: bold;
    }
    .btn-quick-ready:disabled { background: #ccc; }
    .btn-quick-ready:hover:not(:disabled) { background: #219150; }

  `]
})
export class PedidosListComponent implements OnInit {
  private productionService = inject(ProductionService);

  estadoFilter = new FormControl('');
  productoFilter = new FormControl('');
  fechaFilter = new FormControl(this.formatDate(new Date()));
  nombreFilter = new FormControl('');

  private refresh$ = new BehaviorSubject<void>(undefined);
  updatingId: string | null = null;
  filteredPedidos$!: Observable<Pedido[]>;
  stats$!: Observable<{ pendientesEntrega: number, hoy: number, enObrador: number, entregados: number }>;

  ngOnInit() {
    const rawPedidos$ = this.refresh$.pipe(
      switchMap(() => this.productionService.getPedidos())
    );
    
    this.stats$ = rawPedidos$.pipe(
      map(pedidos => ({
        pendientesEntrega: pedidos.filter(p => p.estado !== 'Entregado').length,
        hoy: pedidos.filter(p => this.isToday(p.fechaEntrega)).length,
        enObrador: pedidos.filter(p => p.estado === 'Pendiente' || p.estado === 'En Proceso').length,
        entregados: pedidos.filter(p => p.estado === 'Entregado' && this.isToday(p.fechaActualizacion || new Date())).length
      }))
    );

    const estado$ = this.estadoFilter.valueChanges.pipe(startWith(this.estadoFilter.value));
    const producto$ = this.productoFilter.valueChanges.pipe(startWith(this.productoFilter.value));
    const fecha$ = this.fechaFilter.valueChanges.pipe(startWith(this.fechaFilter.value));
    const nombre$ = this.nombreFilter.valueChanges.pipe(startWith(this.nombreFilter.value));

    this.filteredPedidos$ = combineLatest([rawPedidos$, estado$, producto$, fecha$, nombre$]).pipe(
      map(([pedidos, estado, producto, fecha, nombre]) => {
        return pedidos
          .filter(p => {
            let matchEstado = true;
            if (estado === 'Pendiente') {
              matchEstado = p.estado !== 'Entregado';
            } else if (estado) {
              matchEstado = p.estado === estado;
            } else {
              matchEstado = p.estado !== 'Entregado'; // Default: no entregados
            }

            const matchProducto = !producto || p.producto.toLowerCase().includes(producto.toLowerCase());
            const matchFecha = !fecha || this.formatDate(p.fechaEntrega) === fecha;
            const matchNombre = !nombre || (p.nombreCliente && p.nombreCliente.toLowerCase().includes(nombre.toLowerCase()));
            return matchEstado && matchProducto && matchFecha && matchNombre;
          })
          .sort((a, b) => a.fechaEntrega.getTime() - b.fechaEntrega.getTime());
      })
    );
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  markAsReady(id: string) {
    this.updatingId = id;
    this.productionService.updatePedidoStatus(id, 'Producido').subscribe({
      next: () => {
        this.updatingId = null;
        this.refresh$.next();
      },
      error: (err) => {
        alert('No se pudo actualizar: ' + err.message);
        this.updatingId = null;
      }
    });
  }

  markAsDelivered(id: string) {
    this.updatingId = id;
    this.productionService.updatePedidoStatus(id, 'Entregado').subscribe({
      next: () => {
        this.updatingId = null;
        this.refresh$.next();
      },
      error: (err) => {
        alert('No se pudo actualizar: ' + err.message);
        this.updatingId = null;
      }
    });
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
