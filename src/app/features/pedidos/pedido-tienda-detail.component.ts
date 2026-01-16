import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido } from '../../core/models/pedido.model';
import { Observable, map, switchMap, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-pedido-tienda-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-container">
      <div class="header">
        <button class="btn-back" (click)="goBack()">← Volver a Tienda</button>
        <h2>Detalle del Pedido (Tienda)</h2>
      </div>

      <div *ngIf="pedido$ | async as pedido; else loading" class="content">
        <div class="card">
          <div class="status-banner" [ngClass]="pedido.estado.toLowerCase().replace(' ', '-')">
            Estado: {{ pedido.estado }}
          </div>

          <div class="info-grid">
            <div class="info-group">
              <label>Cliente</label>
              <div class="value highlight">{{ pedido.nombreCliente || 'Sin nombre' }}</div>
            </div>
            
            <div class="info-group">
              <label>Producto</label>
              <div class="value">{{ pedido.producto }}</div>
            </div>

            <div class="info-group">
              <label>Cantidad</label>
              <div class="value">{{ pedido.cantidad }} unidades</div>
            </div>

            <div class="info-group">
              <label>Fecha de Entrega</label>
              <div class="value">{{ pedido.fechaEntrega | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
          </div>

          <div class="notes-section">
            <div class="note-box tienda" *ngIf="pedido.notasTienda">
              <label>Notas de Tienda</label>
              <p>{{ pedido.notasTienda }}</p>
            </div>
            
            <div class="note-box pastelero" *ngIf="pedido.notasPastelero">
              <label>Notas de Obrador</label>
              <p>{{ pedido.notasPastelero }}</p>
            </div>
          </div>

          <!-- Acción de Tienda: Entregar -->
          <div class="actions" *ngIf="pedido.estado !== 'Entregado'">
            <button class="btn-deliver" (click)="markAsDelivered(pedido.id)" [disabled]="isUpdating">
               {{ isUpdating ? 'Procesando...' : 'ENTREGAR' }}
            </button>
          </div>
          
          <div class="actions" *ngIf="pedido.estado === 'Entregado'">
             <span class="delivery-success">Entregado correctamente ✓</span>
          </div>

          <div class="metadata">
            <small>ID: {{ pedido.id }}</small>
            <small *ngIf="pedido.fechaActualizacion">Última actualización: {{ pedido.fechaActualizacion | date:'dd/MM/yyyy HH:mm' }}</small>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">Cargando detalle del pedido...</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .detail-container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    .header { display: flex; align-items: center; gap: 2rem; margin-bottom: 2rem; }
    .btn-back { background: #eee; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; }
    
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    
    .status-banner { padding: 1rem; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 1.1rem; }
    .status-banner.pendiente { background: #fff3cd; color: #856404; }
    .status-banner.en-proceso { background: #cce5ff; color: #004085; }
    .status-banner.producido { background: #d4edda; color: #155724; }
    .status-banner.entregado { background: #e2e3e5; color: #383d41; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 2rem; }
    .info-group label { display: block; font-size: 0.8rem; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 0.5rem; }
    .value { font-size: 1.2rem; color: #333; }
    .value.highlight { color: #d35400; font-weight: bold; font-size: 1.5rem; }

    .notes-section { padding: 0 2rem 2rem; display: flex; flex-direction: column; gap: 1rem; }
    .note-box { padding: 1rem; border-radius: 8px; }
    .note-box label { font-size: 0.75rem; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; display: block; }
    .note-box p { margin: 0; font-size: 1rem; line-height: 1.4; }
    .note-box.pastelero { background: #fffde7; border-left: 5px solid #fbc02d; color: #856404; }
    .note-box.tienda { background: #f0f9ff; border-left: 5px solid #0ea5e9; color: #075985; }

    .actions { padding: 2rem; text-align: center; border-top: 1px solid #eee; }
    .btn-deliver { 
      background: #27ae60; 
      color: white; 
      border: none; 
      padding: 15px 30px; 
      border-radius: 8px; 
      font-weight: bold; 
      font-size: 1.1rem; 
      cursor: pointer;
      width: 100%;
    }
    .btn-deliver:disabled { background: #ccc; cursor: not-allowed; }
    .delivery-success { color: #27ae60; font-weight: bold; font-size: 1.2rem; }

    .metadata { padding: 1rem 2rem; background: #f9f9f9; border-top: 1px solid #eee; display: flex; justify-content: space-between; color: #999; }
    .loading-state { text-align: center; padding: 4rem; color: #666; }
  `]
})
export class PedidoTiendaDetailComponent implements OnInit {
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

  markAsDelivered(id: string) {
    this.isUpdating = true;
    this.productionService.updatePedidoStatus(id, 'Entregado').subscribe({
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
