import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, map, switchMap, BehaviorSubject } from 'rxjs';
import { PedidosHeaderComponent } from '../../shared/components/pedidos-header/pedidos-header.component';
import { VendedorBadgeComponent } from '../../shared/components/vendedor-badge/vendedor-badge.component';
import { PedidoNotesComponent } from '../../shared/components/pedido-notes/pedido-notes.component';
import { PedidoActionsComponent } from '../../shared/components/pedido-actions/pedido-actions.component';
import { PedidoStatusClassPipe } from '../../shared/pipes/pedido-status-class.pipe';

@Component({
  selector: 'app-obrador-pedido-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PedidosHeaderComponent,
    VendedorBadgeComponent,
    PedidoNotesComponent,
    PedidoActionsComponent,
    PedidoStatusClassPipe
  ],
  template: `
    <div class="detail-container">
      <app-pedidos-header title="Control de Producción" backText="← Volver a Obrador" (back)="goBack()"></app-pedidos-header>

      <div *ngIf="pedido$ | async as pedido; else loading" class="content">
        <div class="card">
          <div class="status-banner" [ngClass]="pedido.estado | pedidoStatusClass">
            Estado Actual: {{ pedido.estado }}
          </div>

          <div class="main-info">
             <div class="qty">{{ pedido.cantidad }}u.</div>
             <div class="product">
               {{ pedido.producto }}
               <span *ngIf="pedido.talla" class="talla-text">({{ pedido.talla }})</span>
             </div>
             <div class="relleno-box" *ngIf="pedido.relleno">
               RELLENO: <strong>{{ pedido.relleno }}</strong>
             </div>
          </div>

          <div class="info-grid">
            <div class="info-group">
              <label>Cliente</label>
              <div class="value">{{ pedido.nombreCliente || '-' }}</div>
            </div>
            <div class="info-group">
              <label>Hora de Entrega</label>
              <div class="value highlight">{{ pedido.fechaEntrega | date:'HH:mm' }}</div>
            </div>
            <div class="info-group" *ngIf="pedido.vendedor">
              <label>Atendido por</label>
              <div class="value">
                <app-vendedor-badge [vendedor]="pedido.vendedor"></app-vendedor-badge>
              </div>
            </div>
          </div>
          <app-pedido-notes
            [notasPastelero]="pedido.notasPastelero"
            [notasTienda]="pedido.notasTienda"
            mode="dual"
            pasteleroLabel="Instrucciones de Obrador"
            tiendaLabel="Comentario de Tienda"
          ></app-pedido-notes>

          <!-- Acciones de Obrador: Empezar / Terminar -->
          <app-pedido-actions
            [estado]="pedido.estado"
            mode="obrador"
            [isUpdating]="isUpdating"
            (start)="updateStatus(pedido.id, 'En Proceso')"
            (finish)="updateStatus(pedido.id, 'Terminado')"
            (cancel)="cancelarPedido(pedido)"
          ></app-pedido-actions>

          <div class="done-message" *ngIf="pedido.estado === 'Terminado' || pedido.estado === 'Entregado'">
             Pedido finalizado por obrador ✓
          </div>
          
          <div class="cancelled-message" *ngIf="pedido.estado === 'Cancelado'">
             ESTE PEDIDO HA SIDO CANCELADO
          </div>

          <div class="metadata">
            <small>ID: {{ pedido.id }}</small>
            <small>Entrega: {{ pedido.fechaEntrega | date:'dd/MM/yyyy' }}</small>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">Cargando datos de producción...</div>
      </ng-template>
    </div>
  `,
  styleUrl: './obrador-pedido-detail.component.scss'
})
export class ObradorPedidoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private productionService = inject(ProductionService);

  private refresh$ = new BehaviorSubject<void>(undefined);
  pedido$!: Observable<Pedido | undefined>;
  isUpdating = false;

  ngOnInit() {
    this.pedido$ = this.refresh$.pipe(
      switchMap(() => this.route.paramMap),
      map(params => params.get('id')),
      switchMap(id => {
        if (!id) return [undefined];
        return this.productionService.getPedidos().pipe(
          map(pedidos => pedidos.find(p => p.id === id))
        );
      })
    );
  }

  cancelarPedido(p: Pedido) {
    if (confirm(`¿Estás seguro de que deseas CANCELAR este producto (${p.cantidad} ${p.producto})?`)) {
      this.updateStatus(p.id, 'Cancelado');
    }
  }

  updateStatus(id: string, nuevoEstado: EstadoPedido) {
    this.isUpdating = true;
    this.productionService.updatePedidoStatus(id, nuevoEstado).subscribe({
      next: () => {
        this.isUpdating = false;
        this.refresh$.next();
      },
      error: (err) => {
        alert(err.message);
        this.isUpdating = false;
      }
    });
  }

  goBack() {
    this.location.back();
  }
}
