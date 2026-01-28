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
    <div class="page-container">
      <div class="header-section">
        <h1>Pedidos</h1>
        <button class="btn-new" routerLink="/nuevo-pedido">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          NUEVO PEDIDO
        </button>
      </div>

      <div class="filters-bar">
        <div class="filter-group">
          <label>Estado</label>
          <select [formControl]="estadoFilter">
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Terminado">Terminado</option>
            <option value="Entregado">Entregado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Producto</label>
          <input type="text" [formControl]="productoFilter" placeholder="Ej: Croissant">
        </div>
        <div class="filter-group">
          <label>Cliente</label>
          <input type="text" [formControl]="nombreFilter" placeholder="Nombre cliente">
        </div>
        <div class="filter-group">
          <label>Fecha Entrega</label>
          <input type="date" [formControl]="fechaFilter">
        </div>
      </div>

      <div class="orders-list">
        <ng-container *ngIf="filteredPedidos$ | async as pedidos; else loading">
          <div *ngIf="pedidos.length > 0; else empty">
            
            <!-- Desktop Table (MD+) -->
            <div class="desktop-table">
              <table>
                <thead>
                  <tr>
                    <th>CLIENTE</th>
                    <th>PRODUCTO</th>
                    <th>CANT.</th>
                    <th>FECHA</th>
                    <th>VENDEDOR</th>
                    <th>ESTADO</th>
                    <th class="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let pedido of pedidos" 
                      [class.is-today]="isToday(pedido.fechaEntrega)"
                      [class.urgent]="isToday(pedido.fechaEntrega) && pedido.estado === 'Pendiente'">
                    <td>
                      <div class="client-cell">
                        <span class="client-name">{{ pedido.nombreCliente || 'Anónimo' }}</span>
                        <div class="notes-container">
                          <span *ngIf="pedido.notasPastelero" class="mini-note pastel">{{ pedido.notasPastelero }}</span>
                          <span *ngIf="pedido.notasTienda" class="mini-note tienda">{{ pedido.notasTienda }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="product-name">
                      {{ pedido.producto }}
                      <span *ngIf="pedido.talla" class="talla-badge">{{ pedido.talla }}</span>
                      <span *ngIf="pedido.relleno" class="relleno-tag">{{ pedido.relleno }}</span>
                      <span *ngIf="pedido.guardadoEnTienda" class="already-in-shop-chip">Tienda</span>
                    </td>
                    <td class="qty-cell">{{ pedido.cantidad }}</td>
                    <td class="date-cell">
                      <span class="time">{{ pedido.fechaEntrega | date:'HH:mm' }}</span>
                      <span class="full-date">{{ pedido.fechaEntrega | date:'dd/MM' }}</span>
                    </td>
                    <td class="vendedor-cell">
                      <span class="vendedor-badge" *ngIf="pedido.vendedor">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {{ pedido.vendedor }}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge" [attr.data-status]="pedido.estado.toLowerCase().replace(' ', '-')">
                        {{ pedido.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="actions">
                        <button class="btn-icon view" [routerLink]="['/pedidos', pedido.id]" title="Ver detalle">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                        </button>
                        <button class="btn-icon edit" [routerLink]="['/pedidos/editar', pedido.id]" title="Editar">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button *ngIf="pedido.estado === 'Terminado' || pedido.guardadoEnTienda" 
                                class="btn-icon deliver" 
                                (click)="markAsDelivered(pedido.id)"
                                [disabled]="updatingId === pedido.id"
                                title="Entregar">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zm-1.5 8.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards (SM) -->
            <div class="mobile-grid">
              <div *ngFor="let pedido of pedidos" 
                   class="order-card"
                   [class.is-today]="isToday(pedido.fechaEntrega)"
                   [class.urgent]="isToday(pedido.fechaEntrega) && pedido.estado === 'Pendiente'">
                
                <div class="card-header">
                  <div class="info">
                    <span class="client">{{ pedido.nombreCliente || 'Anónimo' }}</span>
                    <span class="delivery-time">{{ pedido.fechaEntrega | date:'HH:mm' }} • {{ pedido.fechaEntrega | date:'dd/MM' }}</span>
                  </div>
                  <span class="status-badge" [attr.data-status]="pedido.estado.toLowerCase().replace(' ', '-')">
                    {{ pedido.estado }}
                  </span>
                </div>

                <div class="card-body">
                  <div class="product-info">
                    <span class="qty">{{ pedido.cantidad }}x</span>
                    <span class="product">
                      {{ pedido.producto }}
                      <span *ngIf="pedido.relleno" class="relleno-tag">{{ pedido.relleno }}</span>
                      <span *ngIf="pedido.guardadoEnTienda" class="already-in-shop-chip">Tienda</span>
                    </span>
                  </div>
                  <div class="vendedor-info" *ngIf="pedido.vendedor">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Atendido por: <strong>{{ pedido.vendedor }}</strong></span>
                  </div>
                  <div class="card-notes" *ngIf="pedido.notasPastelero || pedido.notasTienda">
                    <div *ngIf="pedido.notasPastelero" class="mini-note pastel">P: {{ pedido.notasPastelero }}</div>
                    <div *ngIf="pedido.notasTienda" class="mini-note tienda">T: {{ pedido.notasTienda }}</div>
                  </div>
                </div>

                <div class="card-footer">
                  <button class="btn-mobile-secondary" [routerLink]="['/pedidos', pedido.id]">
                    VER DETALLE
                  </button>
                  <button class="btn-mobile-secondary" [routerLink]="['/pedidos/editar', pedido.id]">
                    EDITAR
                  </button>
                  <button *ngIf="pedido.estado === 'Terminado' || pedido.guardadoEnTienda" 
                          class="btn-mobile-primary"
                          (click)="markAsDelivered(pedido.id)"
                          [disabled]="updatingId === pedido.id">
                    {{ updatingId === pedido.id ? '...' : 'ENTREGAR' }}
                  </button>
                </div>
              </div>
            </div>

          </div>
          <ng-template #empty>
            <div class="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="#ccc">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 12H7v-2h10v2z"/>
              </svg>
              <p>No se encontraron pedidos.</p>
            </div>
          </ng-template>
        </ng-container>

        <ng-template #loading>
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Cargando pedidos...</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styleUrl: './pedidos-list.component.scss'
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

  ngOnInit() {
    // Escuchamos el flujo continuo de pedidos del servicio
    const rawPedidos$ = this.productionService.getPedidos();

    const estado$ = this.estadoFilter.valueChanges.pipe(startWith(this.estadoFilter.value));
    const producto$ = this.productoFilter.valueChanges.pipe(startWith(this.productoFilter.value));
    const fecha$ = this.fechaFilter.valueChanges.pipe(startWith(this.fechaFilter.value));
    const nombre$ = this.nombreFilter.valueChanges.pipe(startWith(this.nombreFilter.value));

    this.filteredPedidos$ = combineLatest([rawPedidos$, estado$, producto$, fecha$, nombre$]).pipe(
      map(([pedidos, estado, producto, fecha, nombre]) => {
        const filtered = pedidos
          .filter(p => {
            let matchEstado = true;
            if (estado === 'Pendiente') {
              matchEstado = p.estado !== 'Entregado' && p.estado !== 'Cancelado';
            } else if (estado) {
              matchEstado = p.estado === estado;
            } else {
              matchEstado = p.estado !== 'Entregado' && p.estado !== 'Cancelado'; // Default: activos
            }

            const matchProducto = !producto || p.producto.toLowerCase().includes(producto.toLowerCase());
            const matchFecha = !fecha || this.formatDate(p.fechaEntrega) === fecha;
            const matchNombre = !nombre || (p.nombreCliente && p.nombreCliente.toLowerCase().includes(nombre.toLowerCase()));
            return matchEstado && matchProducto && matchFecha && matchNombre;
          });

        // Agrupar por idGrupo
        const groups = new Map<string, Pedido[]>();
        filtered.forEach(p => {
          const key = p.idGrupo || p.id;
          if (!groups.has(key)) {
            groups.set(key, []);
          }
          groups.get(key)!.push(p);
        });

        const result: Pedido[] = [];
        groups.forEach((items) => {
          if (items.length === 1) {
            result.push(items[0]);
          } else {
            const base = items[0];
            const extraCount = items.length - 1;
            result.push({
              ...base,
              producto: `${base.producto} + ${extraCount} más`,
              // El estado del grupo será el del primero, o podrías calcular el "mínimo"
            });
          }
        });

        return result.sort((a, b) => {
          const dateA = new Date(a.fechaEntrega).getTime();
          const dateB = new Date(b.fechaEntrega).getTime();
          return dateA - dateB;
        });
      })
    );
  }

  isToday(date: Date | string): boolean {
    if (!date) return false;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return dateObj.getDate() === today.getDate() &&
           dateObj.getMonth() === today.getMonth() &&
           dateObj.getFullYear() === today.getFullYear();
  }

  markAsReady(id: string) {
    this.updatingId = id;
    this.productionService.updatePedidoStatus(id, 'Terminado').subscribe({
      next: () => {
        this.updatingId = null;
        // No hace falta refresh$ porque el servicio ya es reactivo y optimista
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
      },
      error: (err) => {
        alert(err.message);
        this.updatingId = null;
      }
    });
  }

  private formatDate(date: Date | string): string {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    try {
      return dateObj.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  }
}
