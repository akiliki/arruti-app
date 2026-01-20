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

      <div class="stats-grid" *ngIf="stats$ | async as stats">
        <div class="stat-card pending">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{stats.pendientesEntrega}}</span>
            <span class="stat-label">Pendientes</span>
          </div>
        </div>
        <div class="stat-card urgent">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{stats.hoy}}</span>
            <span class="stat-label">Para Hoy</span>
          </div>
        </div>
        <div class="stat-card manufacturing">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/>
              <path d="M12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{stats.enObrador}}</span>
            <span class="stat-label">En Obrador</span>
          </div>
        </div>
        <div class="stat-card delivered">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.47 10 10 10 10-4.47 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{stats.entregados}}</span>
            <span class="stat-label">Entregados</span>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="filter-group">
          <label>Estado</label>
          <select [formControl]="estadoFilter">
            <option value="">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Producido">Producido</option>
            <option value="Entregado">Entregado</option>
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
                        <button *ngIf="pedido.estado === 'Producido'" 
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
                  <button *ngIf="pedido.estado === 'Producido'" 
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
  styles: [`
    :host {
      --primary: #2c3e50;
      --accent: #d35400;
      --success: #27ae60;
      --warning: #f39c12;
      --danger: #e74c3c;
      --gray-light: #f8f9fa;
      --gray-border: #e9ecef;
      --text-main: #2d3436;
      --text-muted: #636e72;
    }

    .page-container {
      padding: 1rem;
      max-width: 1200px;
      margin: 0 auto;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    h1 {
      margin: 0;
      font-size: 1.75rem;
      color: var(--primary);
      font-weight: 700;
    }

    .btn-new {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: transform 0.1s, background 0.2s;
      box-shadow: 0 4px 6px rgba(211, 84, 0, 0.2);
    }
    .btn-new:active { transform: scale(0.98); }
    .btn-new:hover { background: #ba4a00; }

    /* Stats Grid */
    .stats-grid {
      display: none;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.25rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid var(--gray-border);
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .stat-icon {
      padding: 0.75rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pending .stat-icon { background: #fff3e0; color: #ff9800; }
    .urgent .stat-icon { background: #ffebee; color: #f44336; }
    .manufacturing .stat-icon { background: #e3f2fd; color: #2196f3; }
    .delivered .stat-icon { background: #e8f5e9; color: #4caf50; }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Filters Bar */
    .filters-bar {
      background: white;
      padding: 1.25rem;
      border-radius: 12px;
      border: 1px solid var(--gray-border);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .filter-group label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .filter-group input, .filter-group select {
      padding: 0.6rem 0.8rem;
      border: 1.5px solid var(--gray-border);
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .filter-group input:focus, .filter-group select:focus {
      border-color: var(--accent);
    }

    /* Desktop Table */
    .desktop-table {
      display: none;
      background: white;
      border-radius: 12px;
      border: 1px solid var(--gray-border);
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: var(--gray-light);
      padding: 1rem;
      text-align: left;
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--text-muted);
      letter-spacing: 1px;
      border-bottom: 2px solid var(--gray-border);
    }

    td {
      padding: 1.25rem 1rem;
      border-bottom: 1px solid var(--gray-border);
      vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }

    tr.is-today { background-color: #fffaf0; }
    tr.urgent { border-left: 4px solid var(--danger); }

    .client-name {
      font-weight: 700;
      color: var(--primary);
      display: block;
    }

    .mini-note {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
      margin-right: 4px;
    }
    .mini-note.pastel { background: #fdf2f2; color: #9b1c1c; border: 1px solid #f8d7da; }
    .mini-note.tienda { background: #f0f9ff; color: #075985; border: 1px solid #bae6fd; }

    .product-name { font-weight: 500; }
    .talla-badge {
      background: #f1f2f6;
      color: #2f3542;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      margin-left: 8px;
      border: 1px solid #dfe4ea;
    }
    .relleno-tag {
      background: #fff3e0;
      color: #e67e22;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      margin-left: 8px;
      border: 1px solid #ffeaa7;
      text-transform: uppercase;
    }

    .vendedor-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f0fdf4;
      color: #166534;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      svg { color: #22c55e; }
    }

    .vendedor-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 0.85rem;
      color: var(--text-muted);
      strong { color: var(--primary); }
      svg { color: #94a3b8; }
    }

    .qty-cell { font-weight: 700; color: var(--accent); }
    
    .date-cell .time { display: block; font-weight: 700; font-size: 1rem; }
    .date-cell .full-date { font-size: 0.8rem; color: var(--text-muted); }

    /* Status Badges */
    .status-badge {
      padding: 0.4rem 0.825rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      display: inline-block;
    }

    .status-badge[data-status="pendiente"] { background: #fef9c3; color: #854d0e; }
    .status-badge[data-status="en-proceso"] { background: #dbeafe; color: #1e40af; }
    .status-badge[data-status="producido"] { background: #dcfce7; color: #166534; }
    .status-badge[data-status="entregado"] { background: #f3f4f6; color: #374151; }

    .actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    
    .btn-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-icon.view { background: #f1f2f6; color: var(--primary); }
    .btn-icon.edit { background: #e3f2fd; color: #1e88e5; }
    .btn-icon.deliver { background: var(--success); color: white; }
    .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Mobile Grid */
    .mobile-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .order-card {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--gray-border);
      padding: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      position: relative;
    }

    .order-card.is-today { background: #fffcf5; border-color: #ffeaa7; }
    .order-card.urgent { border-left: 5px solid var(--danger); shadow: 0 4px 12px rgba(231, 76, 60, 0.1); }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .card-header .info { display: flex; flex-direction: column; }
    .card-header .client { font-weight: 800; font-size: 1.1rem; color: var(--primary); }
    .card-header .delivery-time { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }

    .card-body { margin-bottom: 1.25rem; }
    .product-info { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem; }
    .product-info .qty { font-weight: 800; color: var(--accent); font-size: 1.1rem; }
    .product-info .product { font-weight: 600; font-size: 1rem; }

    .card-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .btn-mobile-primary, .btn-mobile-secondary {
      padding: 0.85rem;
      border-radius: 10px;
      font-weight: 800;
      font-size: 0.8rem;
      border: none;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
    }

    .btn-mobile-primary { background: var(--success); color: white; }
    .btn-mobile-secondary { background: #f1f2f6; color: var(--primary); }
    .btn-mobile-primary:disabled { opacity: 0.6; }

    /* Responsive */
    @media (min-width: 768px) {
      .desktop-table { display: block; }
      .mobile-grid { display: none; }
      .page-container { padding: 2rem; }
      .stats-grid { 
        display: grid;
        grid-template-columns: repeat(4, 1fr); 
      }
    }

    /* States */
    .empty-state, .loading-state {
      padding: 4rem 2rem;
      text-align: center;
      background: white;
      border-radius: 12px;
      color: var(--text-muted);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
    // Escuchamos el flujo continuo de pedidos del servicio
    const rawPedidos$ = this.productionService.getPedidos();
    
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
          .sort((a, b) => {
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
    this.productionService.updatePedidoStatus(id, 'Producido').subscribe({
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
