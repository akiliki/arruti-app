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
        <div class="auto-refresh">
          <span class="dot" [class.active]="isRefreshing"></span>
          Auto-actualizando cada 30s
        </div>
      </div>

      <div class="filters">
        <div class="filter-group">
          <label>Familia:</label>
          <select [formControl]="familiaFilter">
            <option value="">Todas las familias</option>
            <option *ngFor="let f of familias$ | async" [value]="f">{{f}}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Fecha:</label>
          <div class="date-nav">
            <button class="btn-nav" (click)="changeDay(-1)" title="Día Anterior">‹</button>
            <input type="date" [formControl]="fechaFilter">
            <button class="btn-nav" (click)="changeDay(1)" title="Día Siguiente">›</button>
            <button class="btn-today" (click)="setToday()">HOY</button>
          </div>
        </div>
        <div class="filter-group">
          <label>Estados:</label>
          <div class="filter-chips" *ngIf="counts$ | async as counts">
            <button class="chip" [class.active]="isStatusActive('Pendiente')" (click)="toggleStatus('Pendiente')">
              Falta <span class="count">{{counts.falta}}</span>
            </button>
            <button class="chip" [class.active]="isStatusActive('En Proceso')" (click)="toggleStatus('En Proceso')">
              En curso <span class="count">{{counts.enCurso}}</span>
            </button>
            <button class="chip" [class.active]="isStatusActive('Producido')" (click)="toggleStatus('Producido')">
              Terminado <span class="count">{{counts.terminado}}</span>
            </button>
          </div>
        </div>
        <div class="filter-group settings">
          <label>Alerta Próximos:</label>
          <select [value]="upcomingThresholdHours" (change)="changeThreshold(+$any($event.target).value)">
            <option [value]="2">Siguientes 2h</option>
            <option [value]="4">Siguientes 4h</option>
            <option [value]="8">Siguientes 8h</option>
            <option [value]="24">Mañana (24h)</option>
          </select>
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
            <div class="product-name">{{ pedido.producto }}</div>
            <div *ngIf="pedido.nombreCliente" class="client-name">{{ pedido.nombreCliente }}</div>
            
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
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    
    .auto-refresh { font-size: 0.8rem; color: #666; display: flex; align-items: center; gap: 8px; }
    .dot { width: 8px; height: 8px; background: #ccc; border-radius: 50%; }
    .dot.active { background: #2ecc71; box-shadow: 0 0 5px #2ecc71; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

    .filters { display: flex; gap: 20px; margin-bottom: 25px; align-items: flex-end; }
    .filter-group { display: flex; flex-direction: column; gap: 5px; }
    .filter-group label { font-weight: bold; font-size: 0.9rem; }
    
    .date-nav {
      display: flex;
      align-items: center;
      gap: 5px;
      background: white;
      padding: 4px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    .date-nav input { border: none; padding: 6px; font-weight: bold; outline: none; }
    .btn-nav {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 4px 12px;
      cursor: pointer;
      font-size: 1.2rem;
      color: #495057;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-nav:hover { background: #e9ecef; }
    .btn-today {
      background: #e3f2fd;
      color: #1976d2;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.8rem;
      cursor: pointer;
      margin-left: 5px;
    }
    .btn-today:hover { background: #bbdefb; }

    select { padding: 10px; border-radius: 6px; border: 1px solid #ddd; min-width: 150px; }
    
    .filter-chips { display: flex; gap: 8px; }
    .chip { 
      padding: 8px 16px; 
      border: 1px solid #ddd; 
      background: white; 
      border-radius: 20px; 
      cursor: pointer; 
      font-size: 0.9rem;
      color: #666;
      transition: all 0.2s;
      width: auto;
    }
    .chip:hover { background: #f8f9fa; }
    .chip.active { background: #34495e; color: white; border-color: #34495e; }
    .chip .count { 
      background: #eee; 
      color: #777; 
      padding: 1px 6px; 
      border-radius: 10px; 
      font-size: 0.75rem; 
      margin-left: 5px; 
      font-weight: bold;
    }
    .chip.active .count { background: rgba(255,255,255,0.2); color: white; }

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
    .client-name { font-size: 0.9rem; color: #7f8c8d; margin-bottom: 10px; font-style: italic; }
    
    .baker-notes { 
      background: #fff9c4; 
      padding: 10px; 
      border-radius: 6px; 
      font-size: 0.95rem; 
      color: #856404;
      border-left: 4px solid #fbc02d;
    }

    .card-actions { padding: 15px; border-top: 1px solid #eee; }
    button { width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; }
    .btn-start { background: #3498db; color: white; }
    .btn-finish { background: #2ecc71; color: white; }
    .btn-view-order { 
      background: none; 
      color: #7f8c8d; 
      border: 1px solid #ddd; 
      margin-top: 10px;
      font-size: 0.8rem;
      padding: 8px;
    }
    .btn-view-order:hover { background: #f9f9f9; color: #2c3e50; border-color: #bdc3c7; }
    .badge-done { color: #27ae60; font-weight: bold; display: block; text-align: center; }

    .loading-state, .empty-state { grid-column: 1 / -1; padding: 50px; text-align: center; background: white; border-radius: 12px; color: #666; }
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
          .sort((a, b) => a.fechaEntrega.getTime() - b.fechaEntrega.getTime());
      })
    );

    this.upcomingPedidos$ = pedidos$.pipe(
      map(pedidos => {
        const now = new Date();
        const limit = new Date(now.getTime() + (this.upcomingThresholdHours * 60 * 60 * 1000));
        return pedidos
          .filter(p => p.estado === 'Pendiente')
          .filter(p => p.fechaEntrega > now && p.fechaEntrega <= limit)
          .sort((a, b) => a.fechaEntrega.getTime() - b.fechaEntrega.getTime());
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

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isUrgent(date: Date): boolean {
    if (!this.isToday(date)) return false;
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < 3; // Menos de 3 horas para la entrega
  }
}
