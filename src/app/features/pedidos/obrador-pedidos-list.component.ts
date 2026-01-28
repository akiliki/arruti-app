import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProductionService } from '../../core/services/production.service';
import { ProductoService } from '../../core/services/producto.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, combineLatest, map, startWith, BehaviorSubject, switchMap, shareReplay, tap, finalize } from 'rxjs';
import { ObradorTimeSlotGroup, ObradorTallaGroup } from './obrador-pedidos.model';
import { belongsToFamilia, countByStatus, groupPedidosByTimeSlot, hasInProcess, hasPending, isUrgent } from './obrador-pedidos.utils';
import { formatDate, isToday } from './pedidos-date.utils';

@Component({
  selector: 'app-obrador-pedidos-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './obrador-pedidos-list.component.html',
  styleUrl: './obrador-pedidos-list.component.scss'
})
export class ObradorPedidosListComponent implements OnInit {
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
  groupedPedidos$!: Observable<ObradorTimeSlotGroup[]>;
  upcomingPedidos$!: Observable<Pedido[]>;
  counts$!: Observable<{ falta: number, enCurso: number, terminado: number }>;

  readonly formatDate = formatDate;
  readonly isToday = isToday;
  readonly isUrgent = isUrgent;
  readonly hasPending = hasPending;
  readonly hasInProcess = hasInProcess;
  readonly countByStatus = countByStatus;

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
          .filter(p => !familia || p.producto.startsWith(familia) || belongsToFamilia(p, familia))
          .filter(p => !producto || p.producto.toLowerCase().includes(producto.toLowerCase()))
          .filter(p => !fecha || formatDate(p.fechaEntrega) === fecha)
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
      map(([pedidos, groupEnabled]) => groupPedidosByTimeSlot(pedidos, !!groupEnabled))
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
    this.fechaFilter.setValue(formatDate(date));
  }

  setToday() {
    this.fechaFilter.setValue(formatDate(new Date()));
  }

  setFechaToPedido(p: Pedido) {
    this.fechaFilter.setValue(formatDate(p.fechaEntrega));
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

  updateGroupStatus(group: ObradorTallaGroup, estado: EstadoPedido) {
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

}
