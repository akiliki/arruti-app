import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductionService } from '../../core/services/production.service';
import { ProductoService } from '../../core/services/producto.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, combineLatest, map, startWith, BehaviorSubject, switchMap, shareReplay, tap, finalize } from 'rxjs';

@Component({
  selector: 'app-pedidos-obrador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="obrador-container">
      <div class="header">
        <h2>Producción de Obrador</h2>
        <div class="header-actions">
          <div class="threshold-wrapper">
            <span class="threshold-label">Alertas próximas:</span>
            <select class="threshold-select" [value]="upcomingThresholdHours" (change)="changeThreshold(+$any($event.target).value)">
              <option [value]="2">2h</option>
              <option [value]="4">4h</option>
              <option [value]="8">8h</option>
              <option [value]="24">24h</option>
            </select>
          </div>
          <div class="auto-refresh">
            <span class="dot" [class.active]="isRefreshing"></span>
            Auto-refresh 30s
          </div>
        </div>
      </div>

      <div class="filters-container">
        <div class="filters-header" (click)="showFilters = !showFilters">
          <div class="filters-title">
            <span class="filters-icon">🔍</span>
            <span>Filtros y Búsqueda</span>
          </div>
          <div class="filters-summary" *ngIf="!showFilters">
            <span class="badge">{{ familiaFilter.value || 'Todas las familias' }}</span>
            <span class="badge">{{ fechaFilter.value | date:'dd/MM/yyyy' }}</span>
            <span class="badge" *ngIf="timeSlotFilter.value">{{ timeSlotFilter.value }}</span>
          </div>
          <span class="chevron">{{ showFilters ? '▼' : '▶' }}</span>
        </div>

        <div class="filters" *ngIf="showFilters">
          <div class="filters-top-row">
            <div class="filter-group">
              <label>Familia</label>
              <select [formControl]="familiaFilter">
                <option value="">Todas las familias</option>
                <option *ngFor="let f of familias$ | async" [value]="f">{{f}}</option>
              </select>
            </div>
            
            <div class="filter-group">
              <label>Tramo Horario</label>
              <select [formControl]="timeSlotFilter">
                <option value="">Cualquier hora</option>
                <option value="mañana-primera">Primera hora mañana (hasta 9:30)</option>
                <option value="mañana-media">Media mañana (9:30 - 12:00)</option>
                <option value="mediodia">Medio día (12:00 - 15:00)</option>
                <option value="tarde-primera">Primera hora tarde (15:00 - 18:30)</option>
                <option value="tarde-ultima">Última hora tarde (desde 18:30)</option>
              </select>
            </div>

            <div class="filter-group date-col">
              <label>Fecha de Producción</label>
              <div class="date-controls">
                <div class="date-nav">
                  <button class="btn-nav" (click)="changeDay(-1)" title="Anterior">‹</button>
                  <input type="date" [formControl]="fechaFilter">
                  <button class="btn-nav" (click)="changeDay(1)" title="Siguiente">›</button>
                </div>
                <button class="btn-today" (click)="setToday()">HOY</button>
              </div>
            </div>
          </div>

          <div class="filter-group states-group">
            <label>Filtro por Estado</label>
            <div class="filter-chips" *ngIf="counts$ | async as counts">
              <button class="chip" [class.active]="isStatusActive('Pendiente')" (click)="toggleStatus('Pendiente')">
                <span class="chip-icon">🔴</span>
                <span class="chip-label">Pendiente</span>
                <span class="count">{{counts.falta}}</span>
              </button>
              <button class="chip" [class.active]="isStatusActive('En Proceso')" (click)="toggleStatus('En Proceso')">
                <span class="chip-icon">⏳</span>
                <span class="chip-label">En curso</span>
                <span class="count">{{counts.enCurso}}</span>
              </button>
              <button class="chip" [class.active]="isStatusActive('Terminado')" (click)="toggleStatus('Terminado')">
                <span class="chip-icon">✅</span>
                <span class="chip-label">Terminado</span>
                <span class="count">{{counts.terminado}}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ng-container *ngIf="upcomingPedidos$ | async as upcoming">
        <div class="alerts-section" *ngIf="upcoming.length > 0">
          <div class="alert-header" (click)="showUpcomingList = !showUpcomingList">
            <span class="alert-icon">⚠️</span>
            <h3>Pedidos próximos sin empezar ({{ upcoming.length }})</h3>
            <span class="chevron">{{ showUpcomingList ? '▼' : '▶' }}</span>
          </div>
          
          <div class="upcoming-scroll" *ngIf="showUpcomingList">
            <div *ngFor="let p of upcoming" class="upcoming-mini-card" (click)="setFechaToPedido(p)">
              <span class="time">{{ p.fechaEntrega | date:'HH:mm' }}</span>
              <span class="name">{{ p.producto }}</span>
              <span class="qty">{{ p.cantidad }}u.</span>
            </div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="filteredPedidos$ | async as pedidos; else loading" class="production-grid">
        <div *ngFor="let pedido of pedidos" 
             class="order-card" 
             [class.in-process]="pedido.estado === 'En Proceso'"
             [class.urgent]="isUrgent(pedido.fechaEntrega)">
          
          <div class="card-header">
            <span class="time">{{ pedido.fechaEntrega | date:'HH:mm' }}</span>
            <span class="delivery-date">{{ isToday(pedido.fechaEntrega) ? 'HOY' : (pedido.fechaEntrega | date:'dd/MM') }}</span>
          </div>

          <div class="card-body">
            <div class="quantity">{{ pedido.cantidad }}u.</div>
            <div class="product-name">
              {{ pedido.producto }}
              <span *ngIf="pedido.talla" class="obrador-talla">({{ pedido.talla }})</span>
              <div *ngIf="pedido.relleno" class="relleno-info">Relleno de: <strong>{{ pedido.relleno }}</strong></div>
            </div>
            <div *ngIf="pedido.nombreCliente" class="client-name">{{ pedido.nombreCliente }}</div>
            
            <div class="vendedor-mini" *ngIf="pedido.vendedor">
              Atendido por: <strong>{{ pedido.vendedor }}</strong>
            </div>

            <div *ngIf="pedido.notasPastelero" class="baker-notes">
              <strong>NOTA:</strong> {{ pedido.notasPastelero }}
            </div>
          </div>

          <div class="card-actions">
            <button *ngIf="pedido.estado === 'Pendiente'" 
                    class="btn-start" 
                    (click)="updateStatus(pedido.id, 'En Proceso')"
                    [disabled]="updatingId === pedido.id">
              {{ updatingId === pedido.id ? '...' : 'EMPEZAR' }}
            </button>
            <button *ngIf="pedido.estado === 'En Proceso'" 
                    class="btn-finish" 
                    (click)="updateStatus(pedido.id, 'Terminado')"
                    [disabled]="updatingId === pedido.id">
              {{ updatingId === pedido.id ? '...' : 'TERMINAR' }}
            </button>
            <span *ngIf="pedido.estado === 'Terminado'" class="badge-done">TERMINADO ✓</span>
            <span *ngIf="pedido.estado === 'Entregado'" class="badge-done">ENTREGADO ✓</span>
            <span *ngIf="pedido.estado === 'Cancelado'" class="badge-cancelled">CANCELADO</span>
            
            <button class="btn-view-order" [routerLink]="['/obrador/pedidos', pedido.id]">
              VER DETALLE
            </button>
          </div>
        </div>

        <div *ngIf="pedidos.length === 0" class="empty-state">
          No hay productos pendientes de producir.
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">Cargando producción...</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .obrador-container { padding: 20px; background: #f0f2f5; min-height: 100vh; }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 1.5rem; 
      flex-wrap: wrap; 
      gap: 1rem; 
    }
    .header h2 { margin: 0; font-size: 1.5rem; color: #1e293b; font-weight: 800; }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .threshold-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .threshold-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .threshold-select {
      border: none;
      background: transparent;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
      cursor: pointer;
      padding: 0;
      width: auto;
      height: auto;
    }
    .threshold-select:focus { outline: none; }

    .auto-refresh { 
      font-size: 0.75rem; 
      color: #64748b; 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      font-weight: 600;
      background: #f1f5f9;
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
    }
    .dot { width: 8px; height: 8px; background: #cbd5e1; border-radius: 50%; }
    .dot.active { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.6; } 100% { transform: scale(1); opacity: 1; } }

    .filters-container {
      margin-bottom: 25px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      background: white;
    }

    .filters-header {
      padding: 1rem 1.5rem;
      background: #f8fafc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: background 0.2s;
    }
    .filters-header:hover { background: #f1f5f9; }
    
    .filters-title { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; color: #1e293b; }
    .filters-icon { font-size: 1.1rem; }
    
    .filters-summary { display: flex; gap: 0.5rem; }
    .filters-summary .badge { 
      background: #e2e8f0; 
      color: #475569; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 0.75rem; 
      font-weight: 600; 
    }

    .filters { 
      padding: 1.5rem; 
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      border-top: 1px solid #e2e8f0;
    }

    .filters-top-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      align-items: flex-end;
    }

    .filter-group { 
      display: flex; 
      flex-direction: column; 
      gap: 0.6rem;
      flex: 1;
      min-width: 250px;
    }
    .filter-group label { 
      font-size: 0.85rem; 
      font-weight: 800; 
      color: #64748b; 
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .date-controls {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .date-nav {
      display: flex;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      min-width: 224px;
      overflow: hidden;
      flex-grow: 1;
      height: 44px;
    }
    input[type="date"] {
      border: none;
      padding: 0 10px;
      height: 44px;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e293b;
      outline: none;
      width: 100%;
    }
    .btn-nav {
      background: white;
      border: none;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 1.4rem;
      transition: all 0.2s;
      cursor: pointer;
    }
    .btn-nav:hover { background: #f1f5f9; color: #1e293b; }

    .btn-today {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0 16px;
      height: 44px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
    }
    .btn-today:hover { background: #2563eb; transform: translateY(-1px); }

    select { 
      padding: 0 0.8rem;
      border: 1px solid #e2e8f0; 
      border-radius: 12px; 
      width: 100%; 
      height: 44px;
      font-size: 0.95rem; 
      background: white; 
      color: #1e293b;
      cursor: pointer;
      box-sizing: border-box;
    }

    .filter-chips { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem; 
      width: 100%;
    }
    .chip { 
      padding: 1.2rem; 
      min-height: 80px;
      border: 2px solid #e2e8f0; 
      background: white; 
      border-radius: 16px; 
      cursor: pointer; 
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .chip:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .chip.active { 
      background: #1e293b; 
      color: white; 
      border-color: #1e293b;
    }
    
    .chip-icon { 
      font-size: 1.5rem;
      background: #f8fafc;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
    }
    .chip.active .chip-icon {
      background: rgba(255,255,255,0.1);
    }
    
    .chip-label { 
      flex-grow: 1;
      text-align: left;
      font-size: 1.1rem;
      font-weight: 700;
    }
    
    .chip .count { 
      background: #3b82f6; 
      color: white; 
      padding: 4px 12px; 
      border-radius: 10px; 
      font-size: 1.2rem; 
      font-weight: 900;
      min-width: 32px;
      text-align: center;
    }
    .chip.active .count { 
      background: white; 
      color: #1e293b; 
    }

    .alerts-section {
      background: #fff5f5;
      border: 1px solid #feb2b2;
      border-radius: 12px;
      margin-bottom: 25px;
      overflow: hidden;
    }
    .alert-header {
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      background: #fff5f5;
    }
    .alert-header h3 { margin: 0; font-size: 1rem; color: #c53030; flex-grow: 1; }
    .alert-icon { font-size: 1.2rem; }
    .chevron { color: #c53030; font-size: 0.8rem; }
    
    .upcoming-scroll {
      display: flex;
      gap: 12px;
      padding: 0 15px 15px;
      overflow-x: auto;
      scroll-behavior: smooth;
    }
    .upcoming-mini-card {
      background: white;
      border: 1px solid #feb2b2;
      border-left: 4px solid #f56565;
      padding: 10px 15px;
      border-radius: 8px;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .upcoming-mini-card:hover { background: #fffaf0; }
    .upcoming-mini-card .time { font-weight: 900; color: #c53030; font-size: 1.1rem; }
    .upcoming-mini-card .name { font-size: 0.9rem; font-weight: 600; color: #2d3748; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .upcoming-mini-card .qty { font-size: 0.8rem; color: #718096; }

    .production-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
      gap: 20px; 
    }

    .order-card { 
      background: white; 
      border-radius: 12px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-top: 6px solid #95a5a6;
      transition: transform 0.2s;
    }
    .order-card:hover { transform: translateY(-3px); }
    .order-card.in-process { border-top-color: #3498db; background: #ebf5fb; }
    .order-card.urgent { border-top-color: #e74c3c; }

    .card-header { 
      padding: 10px 15px; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      background: rgba(0,0,0,0.02);
      border-bottom: 1px solid #eee;
    }
    .time { font-size: 1.4rem; font-weight: bold; color: #2c3e50; }
    .delivery-date { font-weight: bold; color: #7f8c8d; font-size: 0.9rem; }

    .card-body { padding: 15px; flex-grow: 1; }
    .quantity { font-size: 1.8rem; font-weight: 800; color: #d35400; line-height: 1; margin-bottom: 5px; }
    .product-name { font-size: 1.2rem; font-weight: bold; color: #2c3e50; margin-bottom: 2px; }
    .obrador-talla { color: #d35400; font-size: 1rem; margin-left: 5px; }
    .relleno-info {
      font-size: 0.9rem;
      color: #e67e22;
      background: #fff3e0;
      padding: 4px 8px;
      border-radius: 6px;
      margin-top: 5px;
      border: 1px solid #ffeaa7;
      display: inline-block;
      font-weight: 500;
      width: 100%;
      box-sizing: border-box;
    }
    .client-name { font-size: 0.9rem; color: #7f8c8d; margin-bottom: 2px; font-style: italic; }
    
    .vendedor-mini {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 8px;
      strong { color: #64748b; }
    }
    
    .baker-notes { 
      background: #fff9c4; 
      padding: 10px; 
      border-radius: 6px; 
      font-size: 0.95rem; 
      color: #856404;
      border-left: 4px solid #fbc02d;
    }

    .card-actions { padding: 15px; border-top: 1px solid #eee; display: flex; flex-direction: column; gap: 8px; }
    button { width: 100%; padding: 14px 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; min-height: 48px; display: flex; align-items: center; justify-content: center; }
    .btn-start { background: #3498db; color: white; }
    .btn-finish { background: #2ecc71; color: white; }
    .btn-cancel { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; margin-top: 4px; }
    .btn-cancel:hover { background: #fecaca; }
    .btn-view-order { 
      background: none; 
      color: #7f8c8d; 
      border: 1px solid #ddd; 
      margin-top: 5px;
      font-size: 0.85rem;
      padding: 10px;
      min-height: 44px;
    }
    .btn-view-order:hover { background: #f9f9f9; color: #2c3e50; border-color: #bdc3c7; }
    .badge-done { color: #27ae60; font-weight: bold; display: block; text-align: center; padding: 10px; }
    .badge-cancelled { color: #dc2626; font-weight: bold; display: block; text-align: center; padding: 10px; text-transform: uppercase; background: #fee2e2; border-radius: 8px; }

    .loading-state, .empty-state { grid-column: 1 / -1; padding: 50px; text-align: center; background: white; border-radius: 12px; color: #666; }

    /* Estilos Responsivos */
    @media (max-width: 768px) {
      .obrador-container { padding: 12px; }
      .filters { 
        gap: 1rem; 
        padding: 1rem;
      }
      .filter-group { 
        min-width: 100%; 
        flex: 1 0 100%; 
      }
      .date-controls {
        flex-wrap: wrap;
      }
      .production-grid { grid-template-columns: 1fr; }
      
      .header h2 { font-size: 1.3rem; }
      .alert-header h3 { font-size: 0.9rem; }
      
      .card-header .time { font-size: 1.2rem; }
      .quantity { font-size: 1.5rem; }
      .product-name { font-size: 1.1rem; }
    }

    @media (max-width: 480px) {
      .btn-today { width: 100%; margin-top: 4px; }
      .filter-chips { grid-template-columns: 1fr; }
      .chip { 
        padding: 0.8rem; 
        min-height: 60px;
      }
      .chip-label { display: block; font-size: 0.9rem; }
      .chip-icon { font-size: 1.2rem; width: 32px; height: 32px; }
      .chip .count { font-size: 1rem; min-width: 28px; }
    }
  `]
})
export class PedidosObradorComponent implements OnInit {
  private productionService = inject(ProductionService);
  private productoService = inject(ProductoService);

  private refresh$ = new BehaviorSubject<void>(undefined);
  updatingId: string | null = null;
  isRefreshing = true;
  
  // Configuración de alertas
  upcomingThresholdHours = 4;
  showUpcomingList = true;
  showFilters = false;
  
  // Filtros de estado
  activeStatuses: EstadoPedido[] = ['Pendiente', 'En Proceso'];
  
  familiaFilter = new FormControl('');
  fechaFilter = new FormControl(this.formatDate(new Date()));
  timeSlotFilter = new FormControl('');
  
  familias$: Observable<string[]>;
  filteredPedidos$!: Observable<Pedido[]>;
  upcomingPedidos$!: Observable<Pedido[]>;
  counts$!: Observable<{ falta: number, enCurso: number, terminado: number }>;

  constructor() {
    this.familias$ = this.productoService.getProductos().pipe(
      map(prods => [...new Set(prods.map(p => p.familia))].sort())
    );
  }

  ngOnInit() {
    const pedidos$ = this.refresh$.pipe(
      tap(() => {
        // Usamos setTimeout para evitar el error ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => this.isRefreshing = true);
      }),
      switchMap(() => this.productionService.getPedidos().pipe(
        finalize(() => {
          setTimeout(() => this.isRefreshing = false);
        })
      )),
      shareReplay(1)
    );

    const baseFiltered$ = combineLatest([
      pedidos$,
      this.familiaFilter.valueChanges.pipe(startWith(this.familiaFilter.value)),
      this.fechaFilter.valueChanges.pipe(startWith(this.fechaFilter.value)),
      this.timeSlotFilter.valueChanges.pipe(startWith(this.timeSlotFilter.value)),
    ]).pipe(
      map(([pedidos, familia, fecha, timeSlot]) => {
        return pedidos
          .filter(p => !p.guardadoEnTienda || p.estado === 'Entregado') // Incluimos entregados para las estadísticas de hoy
          .filter(p => p.estado !== 'Cancelado') // Ocultar cancelados de producción
          .filter(p => !familia || p.producto.startsWith(familia) || this.belongsToFamilia(p, familia))
          .filter(p => !fecha || this.formatDate(p.fechaEntrega) === fecha)
          .filter(p => {
            if (!timeSlot) return true;
            const hour = new Date(p.fechaEntrega).getHours();
            const minutes = new Date(p.fechaEntrega).getMinutes();
            const totalMinutes = hour * 60 + minutes;

            switch (timeSlot) {
              case 'mañana-primera': return totalMinutes < (9 * 60 + 30); // Antes de 9:30
              case 'mañana-media': return totalMinutes >= (9 * 60 + 30) && totalMinutes < 12 * 60;
              case 'mediodia': return totalMinutes >= 12 * 60 && totalMinutes < 15 * 60;
              case 'tarde-primera': return totalMinutes >= 15 * 60 && totalMinutes < (18 * 60 + 30);
              case 'tarde-ultima': return totalMinutes >= (18 * 60 + 30);
              default: return true;
            }
          });
      }),
      shareReplay(1)
    );

    this.filteredPedidos$ = baseFiltered$.pipe(
      map(pedidos => {
        return pedidos
          .filter(p => {
            if (this.activeStatuses.length === 0) return true;
            if (this.activeStatuses.includes(p.estado)) return true;
            // Si el operario quiere ver terminados, incluimos también entregados
            if (this.activeStatuses.includes('Terminado') && p.estado === 'Entregado') return true;
            return false;
          })
          .sort((a, b) => {
            const dateA = new Date(a.fechaEntrega).getTime();
            const dateB = new Date(b.fechaEntrega).getTime();
            return dateA - dateB;
          });
      })
    );

    this.upcomingPedidos$ = pedidos$.pipe(
      map(pedidos => {
        const now = new Date();
        const limit = new Date(now.getTime() + (this.upcomingThresholdHours * 60 * 60 * 1000));
        return pedidos
          .filter(p => !p.guardadoEnTienda) // Ocultar lo que ya está en tienda
          .filter(p => p.estado === 'Pendiente')
          .filter(p => {
            const f = new Date(p.fechaEntrega);
            return f > now && f <= limit;
          })
          .sort((a, b) => new Date(a.fechaEntrega).getTime() - new Date(b.fechaEntrega).getTime());
      })
    );

    this.counts$ = baseFiltered$.pipe(
      map(pedidos => ({
        falta: pedidos.filter(p => p.estado === 'Pendiente').length,
        enCurso: pedidos.filter(p => p.estado === 'En Proceso').length,
        terminado: pedidos.filter(p => p.estado === 'Terminado' || p.estado === 'Entregado').length
      }))
    );

    // Auto-refresh every 30 seconds
    setInterval(() => this.refresh$.next(), 30000);
  }

  changeThreshold(hours: number) {
    this.upcomingThresholdHours = hours;
    this.refresh$.next();
  }

  belongsToFamilia(p: Pedido, familia: string): boolean {
    // Intento simple de macheo si el nombre no contiene la familia explícitamente
    return p.producto.toLowerCase().includes(familia.toLowerCase());
  }

  isStatusActive(status: EstadoPedido): boolean {
    return this.activeStatuses.includes(status);
  }

  toggleStatus(status: EstadoPedido) {
    if (this.activeStatuses.includes(status)) {
      this.activeStatuses = this.activeStatuses.filter(s => s !== status);
    } else {
      this.activeStatuses = [...this.activeStatuses, status];
    }
    this.refresh$.next();
  }

  changeDay(delta: number) {
    const currentStr = this.fechaFilter.value;
    if (!currentStr) return;
    
    const date = new Date(currentStr);
    date.setDate(date.getDate() + delta);
    this.fechaFilter.setValue(this.formatDate(date));
  }

  setToday() {
    this.fechaFilter.setValue(this.formatDate(new Date()));
  }

  setFechaToPedido(p: Pedido) {
    this.fechaFilter.setValue(this.formatDate(p.fechaEntrega));
  }

  updateStatus(id: string, estado: EstadoPedido) {
    this.updatingId = id;
    this.productionService.updatePedidoStatus(id, estado).subscribe({
      next: () => {
        this.updatingId = null;
        this.refresh$.next();
      },
      error: (err) => {
        alert(err.message);
        this.updatingId = null;
      }
    });
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  isToday(date: any): boolean {
    if (!date) return false;
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  }

  isUrgent(date: any): boolean {
    if (!date) return false;
    const d = (date instanceof Date) ? date : new Date(date);
    if (!this.isToday(d)) return false;
    
    const now = new Date();
    const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < 3; // Menos de 3 horas para la entrega
  }
}
