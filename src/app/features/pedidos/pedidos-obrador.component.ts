import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductionService } from '../../core/services/production.service';
import { ProductoService } from '../../core/services/producto.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, combineLatest, map, startWith, BehaviorSubject, switchMap } from 'rxjs';

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

      <div class="filters">
        <div class="filter-group">
          <label>Familia</label>
          <select [formControl]="familiaFilter">
            <option value="">Todas las familias</option>
            <option *ngFor="let f of familias$ | async" [value]="f">{{f}}</option>
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
        <div class="filter-group states-group">
          <label>Filtro por Estado</label>
          <div class="filter-chips" *ngIf="counts$ | async as counts">
            <button class="chip" [class.active]="isStatusActive('Pendiente')" (click)="toggleStatus('Pendiente')">
              <span class="chip-label">Falta</span>
              <span class="chip-icon">🔴</span>
              <span class="count">{{counts.falta}}</span>
            </button>
            <button class="chip" [class.active]="isStatusActive('En Proceso')" (click)="toggleStatus('En Proceso')">
              <span class="chip-label">En curso</span>
              <span class="chip-icon">⏳</span>
              <span class="count">{{counts.enCurso}}</span>
            </button>
            <button class="chip" [class.active]="isStatusActive('Producido')" (click)="toggleStatus('Producido')">
              <span class="chip-label">Terminado</span>
              <span class="chip-icon">✅</span>
              <span class="count">{{counts.terminado}}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="alerts-section" *ngIf="upcomingPedidos$ | async as upcoming">
        <div class="alert-header" (click)="showUpcomingList = !showUpcomingList">
          <span class="alert-icon">⚠️</span>
          <h3>Pedidos próximos sin empezar ({{ upcoming.length }})</h3>
          <span class="chevron">{{ showUpcomingList ? '▼' : '▶' }}</span>
        </div>
        
        <div class="upcoming-scroll" *ngIf="showUpcomingList && upcoming.length > 0">
          <div *ngFor="let p of upcoming" class="upcoming-mini-card" (click)="setFechaToPedido(p)">
            <span class="time">{{ p.fechaEntrega | date:'HH:mm' }}</span>
            <span class="name">{{ p.producto }}</span>
            <span class="qty">{{ p.cantidad }}u.</span>
          </div>
        </div>
      </div>

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
                    (click)="updateStatus(pedido.id, 'Producido')"
                    [disabled]="updatingId === pedido.id">
              {{ updatingId === pedido.id ? '...' : 'TERMINAR' }}
            </button>
            <span *ngIf="pedido.estado === 'Producido'" class="badge-done">PRODUCIDO ✓</span>
            <span *ngIf="pedido.estado === 'Entregado'" class="badge-done">ENTREGADO ✓</span>
            
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

  .filters { 
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem; 
    margin-bottom: 2rem; 
    background: white; 
    padding: 1.5rem; 
    border-radius: 16px; 
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
    align-items: flex-end;
  }

  .filter-group { 
    display: flex; 
    flex-direction: column; 
    gap: 0.6rem; 
    flex: 0 1 auto;
  }

  .filter-group.date-col {
    flex: 1 1 auto;
  }

  .filter-group.states-group {
    flex: 1 1 auto;
  }

  @media (min-width: 992px) {
    .filter-group.date-col {
      min-width: 380px;
    }
    .filter-group.states-group {
      flex: 1 1 400px;
    }
  }
    .filter-group label { 
      font-weight: 800; 
      font-size: 0.75rem; 
      color: #64748b; 
      text-transform: uppercase; 
      letter-spacing: 0.1em; 
    }
    
    .date-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .date-nav {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      height: 44px;
      overflow: hidden;
      flex: 1;
      min-width: 210px;
    }
    .date-nav input { 
      border: none; 
      background: white;
      padding: 0 8px; 
      font-weight: 700; 
      outline: none; 
      flex: 1;
      height: 100%;
      min-width: 140px;
      font-size: 1rem;
      color: #1e293b;
      text-align: center;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
    }
    .btn-nav {
      background: #f8fafc;
      border: none;
      width: 44px;
      height: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 1.4rem;
      transition: all 0.2s;
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
    .btn-today:active { transform: translateY(0); }

    select { 
      padding: 0 0.8rem;
      border: 1px solid #e2e8f0; 
      border-radius: 12px; 
      width: 100%; 
      height: 44px;
      font-size: 0.95rem; 
      background: #f8fafc; 
      color: #1e293b;
      cursor: pointer;
      box-sizing: border-box;
    }

    @media (min-width: 992px) {
      select {
        max-width: 280px;
      }
    }

    .filter-chips { 
      display: flex; 
      flex-wrap: wrap;
      gap: 0.75rem; 
    }
    .chip { 
      padding: 0 1rem; 
      height: 42px;
      border: 1px solid #e2e8f0; 
      background: white; 
      border-radius: 10px; 
      cursor: pointer; 
      font-size: 0.9rem;
      font-weight: 700;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .chip-icon { display: none; }
    .chip:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .chip.active { 
      background: #1e293b; 
      color: white; 
      border-color: #1e293b;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      transform: translateY(-1px);
    }
    .chip .count { 
      background: #f1f5f9; 
      color: #475569; 
      padding: 1px 8px; 
      border-radius: 6px; 
      font-size: 0.75rem; 
      font-weight: 800;
      min-width: 20px;
      text-align: center;
    }
    .chip.active .count { 
      background: rgba(255,255,255,0.2); 
      color: white; 
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
      .filter-chips { gap: 0.4rem; justify-content: space-between; }
      .chip { 
        padding: 0 0.4rem; 
        height: 38px;
        font-size: 0.8rem;
        flex: 1;
        justify-content: center;
        gap: 0.3rem;
      }
      .chip-label { display: none; }
      .chip-icon { display: block; font-size: 1.1rem; }
      .chip .count { padding: 1px 4px; min-width: 16px; font-size: 0.7rem; }
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
  
  // Filtros de estado
  activeStatuses: EstadoPedido[] = ['Pendiente', 'En Proceso'];
  
  familiaFilter = new FormControl('');
  fechaFilter = new FormControl(this.formatDate(new Date()));
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
      switchMap(() => this.productionService.getPedidos())
    );

    const baseFiltered$ = combineLatest([
      pedidos$,
      this.familiaFilter.valueChanges.pipe(startWith(this.familiaFilter.value)),
      this.fechaFilter.valueChanges.pipe(startWith(this.fechaFilter.value)),
    ]).pipe(
      map(([pedidos, familia, fecha]) => {
        return pedidos
          .filter(p => !familia || p.producto.startsWith(familia) || this.belongsToFamilia(p, familia))
          .filter(p => !fecha || this.formatDate(p.fechaEntrega) === fecha);
      })
    );

    this.filteredPedidos$ = baseFiltered$.pipe(
      map(pedidos => {
        return pedidos
          .filter(p => this.activeStatuses.length === 0 || this.activeStatuses.includes(p.estado))
          .sort((a, b) => new Date(a.fechaEntrega).getTime() - new Date(b.fechaEntrega).getTime());
      })
    );

    this.upcomingPedidos$ = pedidos$.pipe(
      map(pedidos => {
        const now = new Date();
        const limit = new Date(now.getTime() + (this.upcomingThresholdHours * 60 * 60 * 1000));
        return pedidos
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
        terminado: pedidos.filter(p => p.estado === 'Producido').length
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
