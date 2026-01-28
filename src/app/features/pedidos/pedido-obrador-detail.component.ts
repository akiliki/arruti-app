import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, map, switchMap, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-pedido-obrador-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-container">
      <div class="header">
        <button class="btn-back" (click)="goBack()">← Volver a Obrador</button>
        <h2>Control de Producción</h2>
      </div>

      <div *ngIf="pedido$ | async as pedido; else loading" class="content">
        <div class="card">
          <div class="status-banner" [ngClass]="pedido.estado.toLowerCase().replace(' ', '-')">
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
                <span class="vendedor-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {{ pedido.vendedor }}
                </span>
              </div>
            </div>
          </div>

          <div class="notes-section">
            <div class="note-box pastelero" *ngIf="pedido.notasPastelero">
              <label>Instrucciones de Obrador</label>
              <p>{{ pedido.notasPastelero }}</p>
            </div>
            
            <div class="note-box tienda" *ngIf="pedido.notasTienda">
              <label>Comentario de Tienda</label>
              <p>{{ pedido.notasTienda }}</p>
            </div>
          </div>

          <!-- Acciones de Obrador: Empezar / Terminar -->
          <div class="production-actions">
            <button *ngIf="pedido.estado === 'Pendiente'" 
                    class="btn-action start" 
                    (click)="updateStatus(pedido.id, 'En Proceso')"
                    [disabled]="isUpdating">
              {{ isUpdating ? 'Actualizando...' : 'COMENZAR PRODUCCIÓN' }}
            </button>
            
            <button *ngIf="pedido.estado === 'En Proceso'" 
                    class="btn-action finish" 
                    (click)="updateStatus(pedido.id, 'Terminado')"
                    [disabled]="isUpdating">
              {{ isUpdating ? 'Actualizando...' : 'TERMINAR Y LISTO PARA TIENDA' }}
            </button>

            <button *ngIf="pedido.estado === 'Pendiente' || pedido.estado === 'En Proceso'"
                    class="btn-cancel-link"
                    (click)="cancelarPedido(pedido)"
                    [disabled]="isUpdating">
              CANCELAR ESTA PIEZA
            </button>

            <div class="done-message" *ngIf="pedido.estado === 'Terminado' || pedido.estado === 'Entregado'">
               Pedido finalizado por obrador ✓
            </div>
            
            <div class="cancelled-message" *ngIf="pedido.estado === 'Cancelado'">
               ESTE PEDIDO HA SIDO CANCELADO
            </div>
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
  styleUrl: './pedido-obrador-detail.component.scss'
})
export class PedidoObradorDetailComponent implements OnInit {
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
