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
                    (click)="updateStatus(pedido.id, 'Producido')"
                    [disabled]="isUpdating">
              {{ isUpdating ? 'Actualizando...' : 'TERMINAR Y LISTO PARA TIENDA' }}
            </button>

            <div class="done-message" *ngIf="pedido.estado === 'Producido' || pedido.estado === 'Entregado'">
               Pedido finalizado por obrador ✓
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
  styles: [`
    .detail-container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    .header { display: flex; align-items: center; gap: 2rem; margin-bottom: 2rem; }
    .btn-back { background: #34495e; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600; }
    
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-top: 5px solid #d35400; }
    
    .status-banner { padding: 0.8rem; text-align: center; font-weight: bold; background: #f8f9fa; border-bottom: 1px solid #eee; }
    .status-banner.pendiente { color: #856404; }
    .status-banner.en-proceso { color: #004085; }
    .status-banner.producido { color: #155724; }

    .main-info { padding: 2rem; text-align: center; background: #fffcf9; }
    .qty { font-size: 3rem; font-weight: 900; color: #d35400; line-height: 1; }
    .product { font-size: 1.8rem; font-weight: bold; color: #2c3e50; margin-top: 0.5rem; }
    .talla-text { color: #e67e22; font-size: 1.5rem; margin-left: 10px; }
    .relleno-box {
      margin-top: 1rem;
      font-size: 1.2rem;
      color: #e67e22;
      background: #fff3e0;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      display: inline-block;
      border: 2px solid #ffeaa7;
      font-weight: 500;
    }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 1.5rem 2rem; border-top: 1px solid #eee; }
    .info-group label { display: block; font-size: 0.75rem; color: #7f8c8d; text-transform: uppercase; font-weight: bold; margin-bottom: 0.3rem; }
    .vendedor-badge {
      display: inline-flex; align-items: center; gap: 6px; 
      background: #f0fdf4; color: #166534; padding: 4px 10px; border-radius: 6px;
      font-size: 0.9rem; font-weight: 500;
      svg { color: #22c55e; }
    }
    .value { font-size: 1.1rem; color: #2c3e50; font-weight: 600; }
    .highlight { font-size: 1.4rem; color: #e74c3c; }

    .notes-section { padding: 0 2rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .note-box { padding: 1.2rem; border-radius: 8px; }
    .note-box label { font-size: 0.7rem; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; display: block; opacity: 0.8; }
    .note-box p { margin: 0; font-size: 1.1rem; line-height: 1.4; font-weight: 500; }
    .note-box.pastelero { background: #fff9c4; color: #856404; border: 1px dashed #fbc02d; }
    .note-box.tienda { background: #f0f2f5; color: #555; }

    .production-actions { padding: 2rem; background: #fdfdfd; border-top: 1px solid #eee; }
    .btn-action { 
      width: 100%; 
      padding: 18px; 
      border-radius: 10px; 
      border: none; 
      font-weight: 900; 
      font-size: 1.2rem; 
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: transform 0.1s;
    }
    .btn-action:active { transform: scale(0.98); }
    .btn-action.start { background: #3498db; color: white; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .btn-action.finish { background: #2ecc71; color: white; }
    .btn-action:disabled { background: #bdc3c7; cursor: not-allowed; }
    
    .done-message { text-align: center; color: #27ae60; font-weight: bold; font-size: 1.2rem; padding: 1rem; }

    .metadata { padding: 1rem 2rem; background: #f8f9fa; border-top: 1px solid #eee; display: flex; justify-content: space-between; color: #95a5a6; font-size: 0.8rem; }
    .loading-state { text-align: center; padding: 4rem; color: #666; }
  `]
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
