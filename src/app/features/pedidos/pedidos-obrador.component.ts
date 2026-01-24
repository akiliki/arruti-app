import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductionService } from '../../core/services/production.service';
import { ProductoService } from '../../core/services/producto.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, combineLatest, map, startWith, BehaviorSubject, switchMap, shareReplay, tap, finalize } from 'rxjs';

export interface TallaGroup {
  talla?: string;
  totalCantidad: number;
  rellenoSummary: { relleno?: string, cantidad: number, hasNotes: boolean }[];
  pedidos: Pedido[];
  estadoGlobal: EstadoPedido;
  hasAnyNotes: boolean;
  expanded?: boolean; // Para mostrar/ocultar notas
}

export interface ProductSummary {
  producto: string;
  tallaGroups: TallaGroup[];
  totalCantidad: number;
  estadoGlobal: EstadoPedido;
  isUrgent: boolean;
}

export interface TimeSlotGroup {
  label: string;
  productGroups: ProductSummary[];
}

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

      <div class="quick-filters">
        <div class="main-filter-row">
          <div class="date-navigator">
            <button class="btn-nav" (click)="changeDay(-1)">‹</button>
            <div class="calendar-wrapper">
              <input type="date" [formControl]="fechaFilter">
              <span class="date-display">{{ isToday(fechaFilter.value) ? 'HOY' : (fechaFilter.value | date:'dd/MM') }}</span>
            </div>
            <button class="btn-nav" (click)="changeDay(1)">›</button>
          </div>

          <div class="timeslot-quick-nav">
            <button class="ts-chip" [class.active]="selectedTimeSlots.length === 0" (click)="toggleTimeSlot('')">
              Todo
            </button>
            <button class="ts-chip" [class.active]="selectedTimeSlots.includes('mañana-primera')" (click)="toggleTimeSlot('mañana-primera')">
              -11h
            </button>
            <button class="ts-chip" [class.active]="selectedTimeSlots.includes('mediodia')" (click)="toggleTimeSlot('mediodia')">
              -14h
            </button>
            <button class="ts-chip" [class.active]="selectedTimeSlots.includes('tarde-primera')" (click)="toggleTimeSlot('tarde-primera')">
              -16h
            </button>
            <button class="ts-chip" [class.active]="selectedTimeSlots.includes('tarde-ultima')" (click)="toggleTimeSlot('tarde-ultima')">
              -24h
            </button>
          </div>

          <div class="toggle-group-wrapper">
            <button class="toggle-btn" 
                    [class.active]="groupByTimeSlot.value" 
                    (click)="groupByTimeSlot.setValue(!groupByTimeSlot.value)">
              {{ groupByTimeSlot.value ? '📂 POR FRANJAS' : '📄 LISTA ÚNICA' }}
            </button>
          </div>

          <button class="btn-more-filters" (click)="showFilters = !showFilters" [class.active]="showFilters">
            <span>{{ showFilters ? '✖' : '🔍' }}</span>
          </button>
        </div>

        <div class="extra-filters" *ngIf="showFilters">
          <div class="filter-group">
            <label>Nombre del producto</label>
            <input type="text" [formControl]="productoFilter" placeholder="Ej: Croissant, Tarta...">
          </div>

          <div class="filter-group">
            <label>Familia de productos</label>
            <select [formControl]="familiaFilter">
              <option value="">Todas las familias</option>
              <option *ngFor="let f of familias$ | async" [value]="f">{{f}}</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Filtrar por Estado</label>
            <div class="mini-status-chips" *ngIf="counts$ | async as counts">
              <button class="mini-chip" [class.active]="isStatusActive('Pendiente')" (click)="toggleStatus('Pendiente')">
                <span class="dot red"></span> Pendiente ({{counts.falta}})
              </button>
              <button class="mini-chip" [class.active]="isStatusActive('En Proceso')" (click)="toggleStatus('En Proceso')">
                <span class="dot blue"></span> En curso ({{counts.enCurso}})
              </button>
              <button class="mini-chip" [class.active]="isStatusActive('Terminado')" (click)="toggleStatus('Terminado')">
                <span class="dot green"></span> Terminado ({{counts.terminado}})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="status-summary-bar" *ngIf="!showFilters">
        <div class="status-chips-inline" *ngIf="counts$ | async as counts">
          <div class="status-item" [class.active]="isStatusActive('Pendiente')" (click)="toggleStatus('Pendiente')">
            <span class="indicator red"></span>
            <strong>{{counts.falta}}</strong> Pendientes
          </div>
          <div class="status-item" [class.active]="isStatusActive('En Proceso')" (click)="toggleStatus('En Proceso')">
            <span class="indicator blue"></span>
            <strong>{{counts.enCurso}}</strong> En curso
          </div>
          <div class="status-item" [class.active]="isStatusActive('Terminado')" (click)="toggleStatus('Terminado')">
            <span class="indicator green"></span>
            <strong>{{counts.terminado}}</strong> hechos
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

      <div *ngIf="groupedPedidos$ | async as groups; else loading" class="production-groups">
        
        <!-- VISTA POR FRANJAS (CARDS) -->
        <ng-container *ngIf="groupByTimeSlot.value">
          <div *ngFor="let group of groups" class="timeslot-group">
            <div class="timeslot-header">
              <h3>{{ group.label }}</h3>
              <span class="badge">{{ group.productGroups.length }} tipos de prod.</span>
            </div>
            
            <div class="production-grid">
              <div *ngFor="let productGroup of group.productGroups" 
                   class="product-group-card" 
                   [class.in-process]="productGroup.estadoGlobal === 'En Proceso'"
                   [class.urgent]="productGroup.isUrgent"
                   [class.finished]="productGroup.estadoGlobal === 'Terminado'">
                
                <div class="product-group-header">
                  <div class="total-badge">
                    <span class="qty">{{ productGroup.totalCantidad }}</span>
                    <span class="unit">u.</span>
                  </div>
                  <div class="product-info">
                    <div class="name">{{ productGroup.producto }}</div>
                  </div>
                </div>

                <div class="talla-groups-container">
                  <div *ngFor="let tg of productGroup.tallaGroups" class="talla-subgroup" 
                       [class.in-process]="tg.estadoGlobal === 'En Proceso'"
                       [class.finished]="tg.estadoGlobal === 'Terminado'">
                    
                    <div class="talla-header">
                      <div class="talla-info">
                        <span class="talla-label">
                          {{ tg.talla }}
                        </span>
                        <div class="rellenos-breakdown">
                          <ng-container *ngFor="let r of tg.rellenoSummary">
                            <span *ngIf="r.relleno" class="relleno-tag" [class.with-note]="r.hasNotes">
                              {{ r.relleno }}: <strong>{{ r.cantidad }}</strong>
                              <span *ngIf="r.hasNotes" class="mini-note-dot">●</span>
                            </span>
                          </ng-container>
                        </div>
                      </div>
                      <div class="talla-qty-badge">{{ tg.totalCantidad }} ud. total</div>
                    </div>

                    <div class="orders-container">
                      <div *ngFor="let pedido of tg.pedidos" class="order-item" [class.urgent]="isUrgent(pedido.fechaEntrega)">
                        <div class="order-main">
                          <span class="time">{{ pedido.fechaEntrega | date:'HH:mm' }}</span>
                          <span class="qty">{{ pedido.cantidad }}u.</span>
                          <span class="client">{{ pedido.nombreCliente || 'Mostrador' }}</span>
                          
                          <div class="actions">
                            <!-- Botón de detalle individual (talla group expanded) -->
                            <button (click)="tg.expanded = !tg.expanded" 
                                    class="btn-detail-toggle"
                                    [class.active]="tg.expanded"
                                    style="margin-right: 5px;">
                              {{ tg.expanded ? 'Ocultar' : 'Ver' }} detalle 📄
                            </button>

                            <button *ngIf="pedido.estado === 'Pendiente'" 
                                    class="btn-action start" 
                                    (click)="updateStatus(pedido.id, 'En Proceso')"
                                    [disabled]="updatingId === pedido.id">
                              EMPEZAR
                            </button>
                            <button *ngIf="pedido.estado === 'En Proceso'" 
                                    class="btn-action finish" 
                                    (click)="updateStatus(pedido.id, 'Terminado')"
                                    [disabled]="updatingId === pedido.id">
                              TERMINAR
                            </button>
                            <span *ngIf="pedido.estado === 'Terminado' || pedido.estado === 'Entregado'" class="done-mark">✓</span>
                          </div>
                        </div>
                        <div class="notes" *ngIf="tg.expanded && (pedido.notasPastelero || pedido.relleno)">
                          <div *ngIf="pedido.relleno" class="detail-relleno-text"><strong>RELLENO:</strong> {{ pedido.relleno }}</div>
                          <div *ngIf="pedido.notasPastelero"><strong>NOTA:</strong> {{ pedido.notasPastelero }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- VISTA LISTA ÚNICA (TABLA AGREGADA) -->
        <ng-container *ngIf="!groupByTimeSlot.value && groups.length > 0">
          <div class="table-view-container">
            <table class="production-table">
              <thead>
                <tr>
                  <th>PRODUCTO</th>
                  <th>RACIONES</th>
                  <th class="text-center">UD.</th>
                  <th>DETALLE RELLENOS</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let pg of groups[0].productGroups">
                  <ng-container *ngFor="let tg of pg.tallaGroups; let i = index">
                    <!-- Fila Principal de Talla -->
                    <tr [class.tr-urgent]="pg.isUrgent" 
                        [class.tr-finished]="tg.estadoGlobal === 'Terminado'">
                      <td class="td-product">
                        {{ pg.producto }}
                      </td>
                      <td class="td-talla">
                        <div class="talla-main">
                          {{ tg.talla }}
                          <span *ngIf="tg.hasAnyNotes && !tg.expanded" class="note-warning-dot" title="Tiene notas">📝</span>
                        </div>
                      </td>
                      <td class="td-total text-center">
                        <strong>{{ tg.totalCantidad }}</strong>
                      </td>
                      <td class="td-relleno">
                        <div class="table-rellenos">
                          <ng-container *ngFor="let r of tg.rellenoSummary">
                            <span *ngIf="r.relleno" class="table-r-badge" [class.r-note]="r.hasNotes">
                              {{ r.relleno }}: <strong>{{ r.cantidad }}</strong>
                            </span>
                          </ng-container>
                        </div>
                      </td>
                      <td class="td-actions">
                        <div class="table-group-actions">
                          <!-- Botón de detalle -->
                          <button (click)="tg.expanded = !tg.expanded" 
                                  class="btn-toggle-notes"
                                  [class.active]="tg.expanded"
                                  title="Ver desglose de pedidos">
                            {{ tg.expanded ? 'Ocultar' : 'Ver' }} detalle 📄
                          </button>

                          <!-- Botón Empezar: Si hay alguno pendiente -->
                          <button *ngIf="hasPending(tg)" 
                                  (click)="updateGroupStatus(tg, 'En Proceso')" 
                                  class="btn-t-action start">
                            EMPEZAR ({{ countByStatus(tg, 'Pendiente') }})
                          </button>
                          
                          <!-- Botón Terminar: Si hay alguno en proceso -->
                          <button *ngIf="hasInProcess(tg)" 
                                  (click)="updateGroupStatus(tg, 'Terminado')" 
                                  class="btn-t-action finish">
                            TERMINAR ({{ countByStatus(tg, 'En Proceso') }})
                          </button>

                          <span *ngIf="tg.estadoGlobal === 'Terminado'" class="done-check">
                            ✓ TODO HECHO
                            <button (click)="updateGroupStatus(tg, 'Pendiente')" class="btn-undo" title="Revertir a pendiente">↩</button>
                          </span>
                        </div>
                      </td>
                    </tr>

                    <!-- Filas Detalle (Desplegadas) -->
                    <ng-container *ngIf="tg.expanded">
                      <tr *ngFor="let p of tg.pedidos" class="tr-order-detail" [class.urgent]="isUrgent(p.fechaEntrega)">
                        <td colspan="5">
                          <div class="order-detail-content">
                            <!-- Fila 1: Producto, Raciones, Relleno, Unidades -->
                            <div class="d-header-row">
                              <span class="d-p-name">{{ pg.producto }}</span>
                              <span class="d-p-talla">{{ tg.talla }}</span>
                              <span class="d-p-relleno" *ngIf="p.relleno">{{ p.relleno }}</span>
                              <span class="d-p-qty">{{ p.cantidad }}u</span>
                            </div>

                            <!-- Fila 2: Nota (si existe) -->
                            <div class="d-note-row" *ngIf="p.notasPastelero">
                              <span class="d-note-text">📝 {{ p.notasPastelero }}</span>
                            </div>

                            <!-- Fila 3: Hora, Nombre, Botón -->
                            <div class="d-footer-row">
                              <div class="d-client-info">
                                <span class="d-p-time">{{ p.fechaEntrega | date:'HH:mm' }}</span>
                                <span class="d-p-client">{{ p.nombreCliente || 'Mostrador' }}</span>
                              </div>
                              <div class="d-p-actions">
                                <button *ngIf="p.estado === 'Pendiente'" 
                                        class="btn-mini-action start" 
                                        (click)="updateStatus(p.id, 'En Proceso')">
                                  EMPEZAR
                                </button>
                                <button *ngIf="p.estado === 'En Proceso'" 
                                        class="btn-mini-action finish" 
                                        (click)="updateStatus(p.id, 'Terminado')">
                                  TERMINAR
                                </button>
                                <span *ngIf="p.estado === 'Terminado' || p.estado === 'Entregado'" class="done-mark-mini">✓ HECHO</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </ng-container>
                  </ng-container>
                </ng-container>
              </tbody>
            </table>
          </div>
        </ng-container>

        <div *ngIf="groups.length === 0" class="empty-state">
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

    .quick-filters {
      background: white;
      padding: 16px;
      border-radius: 16px;
      margin-bottom: 25px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
      border: 1px solid #e2e8f0;
    }

    .main-filter-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .date-navigator {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border-radius: 12px;
      padding: 4px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    .date-navigator:hover {
      border-color: #cbd5e1;
      background: #f1f5f9;
    }

    .calendar-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 100px;
      padding: 0 10px;
    }

    .calendar-wrapper input[type="date"] {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }

    .date-display {
      font-weight: 800;
      color: #1e293b;
      font-size: 1rem;
      text-transform: uppercase;
    }

    .timeslot-quick-nav {
      display: flex;
      gap: 6px;
      flex-grow: 1;
      overflow-x: auto;
      padding-bottom: 4px; /* Para el scroll móvil */
    }

    .ts-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ts-chip:hover {
      background: #e2e8f0;
      color: #1e293b;
    }
    .ts-chip.active {
      background: #1e293b;
      color: white;
      border-color: #1e293b;
      box-shadow: 0 8px 15px -3px rgba(30, 41, 59, 0.3);
      transform: translateY(-1px);
    }

    .toggle-group-wrapper {
      margin: 0 5px;
    }
    .toggle-btn {
      background: white;
      border: 1px solid #e2e8f0;
      padding: 8px 16px;
      border-radius: 50px;
      font-size: 0.8rem;
      font-weight: 800;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toggle-btn:hover { 
      background: #f8fafc; 
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }
    .toggle-btn.active {
      background: #f1f5f9;
      color: #1e293b;
      border-color: #cbd5e1;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }

    .btn-more-filters {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.2rem;
    }
    .btn-more-filters.active {
      background: #fee2e2;
      color: #ef4444;
      border-color: #fecaca;
    }

    .extra-filters {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px dashed #e2e8f0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .filter-group label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .filter-group select, .filter-group input {
      width: 100%;
      padding: 10px 15px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 0.9rem;
      font-weight: 600;
      color: #1e293b;
      box-sizing: border-box;
    }
    .filter-group select:focus, .filter-group input:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
    }

    .mini-status-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mini-chip {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      width: auto;
      min-height: unset;
    }

    .mini-chip.active {
      background: white;
      border-color: #3b82f6;
      box-shadow: 0 0 0 1px #3b82f6;
    }

    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.red { background: #ef4444; }
    .dot.blue { background: #3b82f6; }
    .dot.green { background: #22c55e; }

    .status-summary-bar {
      margin-bottom: 25px;
    }

    .status-chips-inline {
      display: flex;
      gap: 24px;
      background: #1e293b;
      padding: 12px 24px;
      border-radius: 16px;
      color: white;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
      opacity: 0.7;
      cursor: pointer;
      transition: all 0.2s;
    }
    .status-item:hover { opacity: 0.9; }
    .status-item.active {
      opacity: 1;
      transform: scale(1.05);
    }
    .status-item strong { font-size: 1.2rem; font-family: 'JetBrains Mono', monospace; }

    .indicator { width: 12px; height: 12px; border-radius: 4px; }
    .indicator.red { background: #e11d48; }
    .indicator.blue { background: #3b82f6; }
    .indicator.green { background: #10b981; }

    /* Estilos Tabla Producción */
    .table-view-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
      border: 1px solid #eef2f6;
    }
    .production-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }
    .production-table th {
      background: #f8fafc;
      padding: 16px 20px;
      text-align: left;
      font-weight: 800;
      color: #94a3b8;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      border-bottom: 1px solid #f1f5f9;
      white-space: nowrap;
    }
    .production-table td {
      padding: 24px 20px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      transition: all 0.2s;
    }
    
    .tr-urgent { background: #fff1f2; }
    .tr-finished { opacity: 0.6; }
    
    .td-product { 
      font-weight: 800; 
      color: #0f172a; 
      font-size: 1.25rem; 
      border-left: 4px solid #3b82f6;
      width: 180px;
    }
    .td-talla { font-weight: 800; color: #1e293b; font-size: 1rem; width: 140px; }
    .td-total { 
      font-size: 2.5rem; 
      color: #c2410c; 
      font-weight: 700;
      width: 100px;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .table-rellenos { display: flex; flex-wrap: wrap; gap: 10px; }
    .table-r-badge {
      background: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      border: 1.5px solid #fed7aa;
      color: #7c2d12;
    }
    .table-r-badge strong { color: #f97316; margin-left: 4px; }
    
    .talla-main { font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .note-warning-dot {
      font-size: 1.1rem;
      animation: nudge 2s linear infinite;
      display: inline-block;
    }
    @keyframes nudge {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    
    .btn-toggle-notes, .btn-detail-toggle {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      padding: 12px 24px;
      border-radius: 50px;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
      min-height: 46px;
      min-width: 160px;
    }
    .btn-toggle-notes:hover {
      background: #e2e8f0;
      transform: translateY(-1px);
    }
    .btn-toggle-notes.active { 
      background: #475569; 
      color: white; 
      border-color: #475569;
    }

    /* Nuevos Estilos Desplegado */
    .tr-order-detail {
        background: #f8fbff;
    }
    .tr-order-detail td {
        padding: 0 !important;
        border-bottom: 2px solid #e2e8f0;
    }
    .order-detail-content {
        padding: 15px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .d-header-row {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
    }
    .d-p-name { font-weight: 700; color: #64748b; font-size: 0.9rem; text-transform: uppercase; }
    .d-p-talla { font-weight: 800; color: #1e293b; font-size: 1rem; }
    .d-p-relleno { 
        background: #fff; 
        border: 1px solid #fed7aa; 
        color: #c2410c; 
        padding: 4px 12px; 
        border-radius: 20px; 
        font-weight: 700; 
        font-size: 0.85rem; 
    }
    .d-p-qty { 
        background: #be185d; 
        color: white; 
        padding: 4px 12px; 
        border-radius: 8px; 
        font-weight: 900; 
        font-size: 1.1rem; 
        font-family: 'JetBrains Mono', monospace;
    }

    .d-note-row {
        background: #fffbeb;
        border-left: 4px solid #f59e0b;
        padding: 8px 15px;
        border-radius: 4px;
    }
    .d-note-text { color: #92400e; font-weight: 600; font-size: 0.9rem; }

    .d-footer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px dashed #e2e8f0;
        padding-top: 10px;
    }
    .d-client-info { display: flex; align-items: center; gap: 12px; }
    .d-p-time { font-weight: 900; color: #64748b; font-size: 1.1rem; font-family: 'JetBrains Mono', monospace; }
    .d-p-client { font-weight: 700; color: #1e293b; font-size: 1rem; }

    .d-p-actions { display: flex; align-items: center; gap: 10px; }

    .btn-mini-action {
      padding: 6px 14px;
      border-radius: 50px;
      font-weight: 800;
      font-size: 0.65rem;
      border: none;
      cursor: pointer;
      text-transform: uppercase;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .btn-mini-action.start { 
      background: #3b82f6;
    }
    .btn-mini-action.start:hover {
      background: #2563eb;
      transform: scale(1.05);
    }
    .btn-mini-action.finish { 
      background: #10b981;
    }
    .btn-mini-action.finish:hover {
      background: #059669;
      transform: scale(1.05);
    }
    .done-mark-mini { 
      color: #16a34a; 
      font-weight: 950; 
      font-size: 1.1rem; 
      margin-right: 10px;
    }

    .table-group-actions { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
    .btn-t-action {
      padding: 12px 24px;
      border-radius: 50px;
      border: none;
      font-weight: 800;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      min-width: 160px;
      min-height: 46px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-t-action.start {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
    }
    .btn-t-action.start:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
    }
    .btn-t-action.finish {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
    }
    .btn-t-action.finish:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
    }

    .btn-undo { 
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
      color: #64748b; 
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 0.8rem;
      margin-left: 10px;
      transition: all 0.2s;
    }
    .btn-undo:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }

    .done-check { 
      color: #15803d; 
      font-weight: 900; 
      font-size: 0.85rem; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      gap: 6px; 
      background: #f0fdf4;
      padding: 8px;
      border-radius: 10px;
    }
    
    .text-center { text-align: center; }

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

    .timeslot-group {
      margin-bottom: 2rem;
    }
    .timeslot-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
    }
    .timeslot-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .timeslot-header .badge {
      background: #3b82f6;
      color: white;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .production-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
      gap: 20px; 
    }

    .product-group-card {
      background: white; 
      border-radius: 12px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-top: 6px solid #95a5a6;
      transition: transform 0.2s;
    }
    .product-group-card.in-process { border-top-color: #3498db; }
    .product-group-card.urgent { border-top-color: #e74c3c; animation: border-pulse 2s infinite; }
    .product-group-card.finished { border-top-color: #2ecc71; opacity: 0.8; }

    @keyframes border-pulse {
      0% { border-top-color: #e74c3c; }
      50% { border-top-color: #ff7675; }
      100% { border-top-color: #e74c3c; }
    }

    .product-group-header {
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 15px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .total-badge {
      background: #d35400;
      color: white;
      min-width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(211, 84, 0, 0.2);
    }
    .total-badge .qty { font-size: 1.8rem; font-weight: 800; line-height: 1; }
    .total-badge .unit { font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }

    .product-info .name { font-size: 1.2rem; font-weight: 800; color: #1e293b; line-height: 1.2; }
    
    .talla-groups-container {
      background: #fff;
    }
    .talla-subgroup {
      border-bottom: 2px solid #f1f5f9;
    }
    .talla-subgroup:last-child { border-bottom: none; }
    .talla-subgroup.in-process { background: #eff6ff; }
    .talla-subgroup.finished { background: #f0fdf4; opacity: 0.8; }

    .talla-header {
      padding: 10px 15px;
      background: #fdfcfb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
    }
    .talla-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .talla-label {
      font-size: 0.95rem;
      font-weight: 800;
      color: #7c2d12;
      text-transform: uppercase;
    }
    .note-indicator {
      color: #d97706;
      font-size: 0.8rem;
      margin-left: 4px;
      vertical-align: middle;
    }
    .rellenos-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 2px;
    }
    .relleno-tag {
      font-size: 0.75rem;
      color: #9a3412;
      background: #fff;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid #ffedd5;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .relleno-tag.with-note {
      border-color: #fbbf24;
      background: #fffbeb;
    }
    .mini-note-dot {
      color: #d97706;
      font-size: 0.6rem;
    }
    .talla-qty-badge {
      background: #fff;
      color: #9a3412;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 800;
      border: 1px solid #ffedd5;
    }

    .orders-container {
      padding: 10px;
      background: white;
      max-height: 400px;
      overflow-y: auto;
    }

    .order-item {
      padding: 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .order-item:last-child { border-bottom: none; }
    .order-item.urgent { background: #fff5f5; border-left: 4px solid #ef4444; border-radius: 4px; }

    .order-main {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .order-main .time { font-weight: 800; color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
    .order-main .qty { font-size: 1.1rem; font-weight: 800; color: #d35400; background: #fff7ed; padding: 2px 8px; border-radius: 6px; border: 1px solid #ffedd5; }
    .order-main .client { font-weight: 700; color: #1e293b; font-size: 0.95rem; flex-grow: 1; }

    .actions { display: flex; gap: 8px; margin-left: auto; }
    .btn-action {
      padding: 6px 12px;
      font-size: 0.75rem;
      border-radius: 6px;
      min-height: 32px;
      width: auto;
    }
    .btn-action.start { background: #3498db; color: white; }
    .btn-action.finish { background: #2ecc71; color: white; }
    .done-mark { color: #2ecc71; font-weight: bold; font-size: 1.2rem; }

    .order-item .notes {
      margin-top: 5px;
      padding: 6px 10px;
      background: #fef9c3;
      border-radius: 6px;
      font-size: 0.85rem;
      color: #854d0e;
      border-left: 3px solid #facc15;
    }
    .detail-relleno-text {
      color: #9d174d;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .loading-state, .empty-state { grid-column: 1 / -1; padding: 50px; text-align: center; background: white; border-radius: 12px; color: #666; }

    /* Estilos Responsivos */
    @media (max-width: 992px) {
      .td-total { font-size: 1.8rem; width: 80px; }
      .talla-notes { min-width: 350px; }
    }

    @media (max-width: 768px) {
      .obrador-container { padding: 8px; }
      .header { flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 1rem; }
      .header h2 { font-size: 1.25rem; }
      .header-actions { width: 100%; justify-content: space-between; gap: 8px; }
      
      .quick-filters { padding: 10px; margin-bottom: 15px; border-radius: 12px; }
      .main-filter-row { gap: 8px; }
      .date-navigator { padding: 2px; }
      .ts-chip { padding: 5px 10px; font-size: 0.75rem; }
      .toggle-btn { padding: 5px 10px; font-size: 0.7rem; min-height: 38px; }

      .status-chips-inline {
        padding: 8px 12px;
        gap: 12px;
        border-radius: 12px;
      }
      .status-item { font-size: 0.8rem; gap: 6px; }
      .status-item strong { font-size: 0.95rem; }

      /* Transformación de Tabla a Cards para Móvil */
      .production-table, .production-table thead, .production-table tbody, .production-table th, .production-table td { 
        display: block; 
      }
      .production-table thead { display: none; } /* Ocultamos cabecera */
      
      .production-table tr:not(.tr-order-detail) {
        margin-bottom: 12px;
        border: 1px solid #eef2f6;
        border-radius: 12px;
        background: white;
        padding: 12px;
        display: flex !important;
        flex-wrap: wrap;
        align-items: center;
        position: relative;
      }

      .production-table td {
        border: none !important;
        padding: 4px 0 !important;
        width: auto !important;
        background: transparent !important;
      }
      
      .td-product {
        font-size: 1.15rem;
        font-weight: 800;
        color: #0f172a;
        margin-right: 8px !important;
        padding: 0 !important;
      }
      .td-product::before { display: none; }
      
      .td-talla {
        font-size: 1.15rem;
        font-weight: 800;
        color: #1e293b;
        margin-right: 0 !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center;
      }
      
      .td-total {
        margin-left: auto !important;
        font-size: 1.8rem !important;
        width: auto !important;
        text-align: right;
        color: #c2410c;
        padding: 0 !important;
        font-family: 'JetBrains Mono', monospace;
      }
      
      .td-relleno {
        flex: 0 0 100%;
        margin: 8px 0 !important;
      }
      .table-r-badge {
        padding: 4px 10px;
        font-size: 0.75rem;
      }

      .td-actions {
        flex: 0 0 100%;
        border-top: 1px solid #f1f5f9 !important;
        margin-top: 8px !important;
        padding: 12px 0 0 0 !important;
        width: 100% !important;
        display: block !important;
      }
      .table-group-actions {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        width: 100%;
        display: flex !important;
      }
      .btn-toggle-notes, .btn-t-action {
        flex: 1;
        min-width: 0; /* Permite que el flex-grow funcione bien */
        padding: 12px 10px !important;
        font-size: 0.75rem !important;
        height: 48px; /* Altura fija para ambos */
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      /* Estilo filas detalle en móvil */
      .tr-order-detail {
        margin-top: 5px;
        margin-left: 0;
        margin-right: 0;
        margin-bottom: 12px;
        border-radius: 12px;
        border: 1px solid #eef2f6;
        padding: 0;
        background: white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.03);
        display: block !important;
        width: 100% !important;
      }
      .order-detail-content {
        padding: 16px;
        gap: 12px;
      }
      .d-header-row {
        gap: 10px;
      }
      .d-p-qty {
        font-size: 1rem;
        padding: 2px 8px;
      }
      .d-footer-row {
        padding-top: 8px;
      }
      .d-p-time { font-size: 0.95rem; }
      .d-p-client { font-size: 0.9rem; }
      
      .talla-notes {
        min-width: 100%;
        margin-top: 10px;
        padding: 10px;
      }
    }

    @media (max-width: 480px) {
      .header h2 { font-size: 1.2rem; }
      .date-navigator { width: 100%; justify-content: space-between; }
      .calendar-wrapper { flex-grow: 1; }
      
      .btn-more-filters { width: 100%; height: 40px; border-radius: 8px; margin-top: 5px; }
      
      .chip-label { display: block; font-size: 0.9rem; }
      .chip-icon { font-size: 1.2rem; width: 32px; height: 32px; }
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
  productoFilter = new FormControl('');
  fechaFilter = new FormControl(this.formatDate(new Date()));
  selectedTimeSlots: string[] = []; // Array para selección múltiple
  groupByTimeSlot = new FormControl(true);
  
  familias$: Observable<string[]>;
  filteredPedidos$!: Observable<Pedido[]>;
  groupedPedidos$!: Observable<TimeSlotGroup[]>;
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
      this.refresh$.pipe(map(() => this.selectedTimeSlots), startWith(this.selectedTimeSlots)), // Escuchar cambios en slots
      this.productoFilter.valueChanges.pipe(startWith(this.productoFilter.value)),
    ]).pipe(
      map(([pedidos, familia, fecha, timeSlots, producto]) => {
        return pedidos
          .filter(p => !p.guardadoEnTienda || p.estado === 'Entregado') // Incluimos entregados para las estadísticas de hoy
          .filter(p => p.estado !== 'Cancelado') // Ocultar cancelados de producción
          .filter(p => !familia || p.producto.startsWith(familia) || this.belongsToFamilia(p, familia))
          .filter(p => !producto || p.producto.toLowerCase().includes(producto.toLowerCase()))
          .filter(p => !fecha || this.formatDate(p.fechaEntrega) === fecha)
          .filter(p => {
            if (!timeSlots || timeSlots.length === 0) return true;
            const hour = new Date(p.fechaEntrega).getHours();
            const minutes = new Date(p.fechaEntrega).getMinutes();
            const totalMinutes = hour * 60 + minutes;

            return timeSlots.some(slot => {
              switch (slot) {
                case 'mañana-primera': return totalMinutes < (11 * 60); // Hasta 11:00
                case 'mediodia': return totalMinutes >= (11 * 60) && totalMinutes < (14 * 60); // Hasta 14:00
                case 'tarde-primera': return totalMinutes >= (14 * 60) && totalMinutes < (16 * 60); // Hasta 16:00
                case 'tarde-ultima': return totalMinutes >= (16 * 60); // Hasta 24:00
                default: return true;
              }
            });
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

    this.groupedPedidos$ = combineLatest([
      this.filteredPedidos$,
      this.groupByTimeSlot.valueChanges.pipe(startWith(this.groupByTimeSlot.value))
    ]).pipe(
      map(([pedidos, groupEnabled]) => this.groupPedidosByTimeSlot(pedidos, !!groupEnabled))
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

  private groupPedidosByTimeSlot(pedidos: Pedido[], useSlots: boolean): TimeSlotGroup[] {
    const getProductGroups = (list: Pedido[]) => {
      const productMap = new Map<string, ProductSummary>();
      
      list.forEach(p => {
        if (!productMap.has(p.producto)) {
          productMap.set(p.producto, {
            producto: p.producto,
            tallaGroups: [],
            totalCantidad: 0,
            estadoGlobal: 'Pendiente',
            isUrgent: false
          });
        }
        
        const pg = productMap.get(p.producto)!;
        pg.totalCantidad += p.cantidad;
        if (this.isUrgent(p.fechaEntrega)) pg.isUrgent = true;

        let tg = pg.tallaGroups.find(g => g.talla === p.talla);
        if (!tg) {
          tg = { talla: p.talla, totalCantidad: 0, rellenoSummary: [], pedidos: [], estadoGlobal: 'Pendiente', hasAnyNotes: false };
          pg.tallaGroups.push(tg);
        }
        tg.totalCantidad += p.cantidad;
        tg.pedidos.push(p);
        if (p.notasPastelero) tg.hasAnyNotes = true;

        // Agregamos al resumen de rellenos
        let rg = tg.rellenoSummary.find(r => r.relleno === p.relleno);
        if (!rg) {
          rg = { relleno: p.relleno, cantidad: 0, hasNotes: false };
          tg.rellenoSummary.push(rg);
        }
        rg.cantidad += p.cantidad;
        if (p.notasPastelero) rg.hasNotes = true;
      });

      productMap.forEach(pg => {
        pg.tallaGroups.forEach(tg => {
          if (tg.pedidos.every(p => p.estado === 'Terminado' || p.estado === 'Entregado')) {
            tg.estadoGlobal = 'Terminado';
          } else if (tg.pedidos.some(p => p.estado === 'En Proceso')) {
            tg.estadoGlobal = 'En Proceso';
          }
        });
        
        if (pg.tallaGroups.every(tg => tg.estadoGlobal === 'Terminado')) {
          pg.estadoGlobal = 'Terminado';
        } else if (pg.tallaGroups.some(tg => tg.estadoGlobal === 'En Proceso')) {
          pg.estadoGlobal = 'En Proceso';
        }
      });
      return Array.from(productMap.values());
    };

    if (!useSlots) {
      if (pedidos.length === 0) return [];
      return [{
        label: 'Toda la producción',
        productGroups: getProductGroups(pedidos)
      }];
    }

    const slots = [
      { label: 'Primera Hora Mañana (Hasta 11:00)', maxMinutes: 11 * 60 },
      { label: 'Medio Día (Hasta 14:00)', maxMinutes: 14 * 60 },
      { label: 'Primera Hora Tarde (Hasta 16:00)', maxMinutes: 16 * 60 },
      { label: 'Última Hora Tarde (Hasta 24:00)', maxMinutes: 24 * 60 },
    ];

    const grouped: TimeSlotGroup[] = [];
    slots.forEach((slot, index) => {
      const prevMax = index === 0 ? 0 : slots[index - 1].maxMinutes;
      const slotPedidos = pedidos.filter(p => {
        const date = new Date(p.fechaEntrega);
        const totalMinutes = date.getHours() * 60 + date.getMinutes();
        return totalMinutes >= prevMax && totalMinutes < slot.maxMinutes;
      });

      if (slotPedidos.length > 0) {
        grouped.push({
          label: slot.label,
          productGroups: getProductGroups(slotPedidos)
        });
      }
    });

    return grouped;
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

  toggleTimeSlot(slot: string) {
    if (slot === '') {
      this.selectedTimeSlots = [];
    } else {
      if (this.selectedTimeSlots.includes(slot)) {
        this.selectedTimeSlots = this.selectedTimeSlots.filter(s => s !== slot);
      } else {
        this.selectedTimeSlots = [...this.selectedTimeSlots, slot];
      }
    }
    this.refresh$.next();
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

  getTimeSlotLabel(value: string | null): string {
    switch (value) {
      case 'mañana-primera': return 'Hasta 11h';
      case 'mediodia': return 'Hasta 14h';
      case 'tarde-primera': return 'Hasta 16h';
      case 'tarde-ultima': return 'Hasta 24h';
      default: return 'Cualquier hora';
    }
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

  hasPending(tg: TallaGroup): boolean {
    return tg.pedidos.some(p => p.estado === 'Pendiente');
  }

  hasInProcess(tg: TallaGroup): boolean {
    return tg.pedidos.some(p => p.estado === 'En Proceso');
  }

  countByStatus(tg: TallaGroup, status: EstadoPedido): number {
    return tg.pedidos.filter(p => p.estado === status).length;
  }

  updateGroupStatus(group: TallaGroup, estado: EstadoPedido) {
    let targetPedidos: Pedido[] = [];

    if (estado === 'En Proceso') {
      targetPedidos = group.pedidos.filter(p => p.estado === 'Pendiente');
    } else if (estado === 'Terminado') {
      targetPedidos = group.pedidos.filter(p => p.estado === 'En Proceso');
      if (targetPedidos.length === 0) {
        targetPedidos = group.pedidos.filter(p => p.estado === 'Pendiente');
      }
    } else if (estado === 'Pendiente') {
      targetPedidos = group.pedidos.filter(p => p.estado !== 'Pendiente');
    }

    if (targetPedidos.length === 0) return;

    this.isRefreshing = true;
    const requests = targetPedidos.map(p => this.productionService.updatePedidoStatus(p.id, estado));
    
    combineLatest(requests).pipe(
      finalize(() => this.isRefreshing = false)
    ).subscribe({
      next: () => this.refresh$.next(),
      error: (err) => alert('Error al actualizar el grupo: ' + err.message)
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
