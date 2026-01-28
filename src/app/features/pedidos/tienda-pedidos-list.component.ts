import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, combineLatest, map, startWith } from 'rxjs';
import { formatDate, isToday } from './pedidos-date.utils';
import { filterAndGroupTiendaPedidos } from './tienda-pedidos-list.utils';
import { PedidosHeaderComponent } from '../../shared/components/pedidos-header/pedidos-header.component';
import { PedidoStatusBadgeComponent } from '../../shared/components/pedido-status-badge/pedido-status-badge.component';
import { VendedorBadgeComponent } from '../../shared/components/vendedor-badge/vendedor-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-tienda-pedidos-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    PedidosHeaderComponent,
    PedidoStatusBadgeComponent,
    VendedorBadgeComponent,
    EmptyStateComponent,
    LoadingStateComponent
  ],
  templateUrl: './tienda-pedidos-list.component.html',
  styleUrl: './tienda-pedidos-list.component.scss'
})
export class TiendaPedidosListComponent implements OnInit {
  private productionService = inject(ProductionService);

  estadoFilter = new FormControl<EstadoPedido | ''>('', { nonNullable: true });
  productoFilter = new FormControl('');
  fechaFilter = new FormControl(formatDate(new Date()));
  nombreFilter = new FormControl('');

  updatingId: string | null = null;
  filteredPedidos$!: Observable<Pedido[]>;

  readonly isToday = isToday;

  ngOnInit() {
    // Escuchamos el flujo continuo de pedidos del servicio
    const rawPedidos$ = this.productionService.getPedidos();

    const estado$ = this.estadoFilter.valueChanges.pipe(startWith(this.estadoFilter.value));
    const producto$ = this.productoFilter.valueChanges.pipe(startWith(this.productoFilter.value));
    const fecha$ = this.fechaFilter.valueChanges.pipe(startWith(this.fechaFilter.value));
    const nombre$ = this.nombreFilter.valueChanges.pipe(startWith(this.nombreFilter.value));

    this.filteredPedidos$ = combineLatest([rawPedidos$, estado$, producto$, fecha$, nombre$]).pipe(
      map(([pedidos, estado, producto, fecha, nombre]) => {
        return filterAndGroupTiendaPedidos(pedidos, {
          estado,
          producto,
          fecha,
          nombre
        });
      })
    );
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

}
