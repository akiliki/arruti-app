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
                                  >
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
  styleUrl: './pedidos-obrador.component.scss'
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
