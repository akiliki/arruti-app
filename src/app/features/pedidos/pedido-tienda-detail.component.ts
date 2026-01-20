import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido } from '../../core/models/pedido.model';
import { Observable, map, switchMap, BehaviorSubject, of, forkJoin } from 'rxjs';

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

      <div *ngIf="pedidoGroup$ | async as items; else loading" class="content">
        <div class="card" *ngIf="items.length > 0; else noOrder">
          <div class="status-banner" [ngClass]="items[0].estado.toLowerCase().replace(' ', '-')">
            Estado: {{ items[0].estado }}
          </div>

          <div class="info-grid">
            <div class="info-group wide">
              <label>Cliente</label>
              <div class="value highlight">{{ items[0].nombreCliente || 'Sin nombre' }}</div>
            </div>

            <div class="info-group">
              <label>Fecha de Entrega</label>
              <div class="value">{{ items[0].fechaEntrega | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>

            <div class="info-group" *ngIf="items[0].vendedor">
              <label>Atendido por</label>
              <div class="value">
                <span class="vendedor-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {{ items[0].vendedor }}
                </span>
              </div>
            </div>
          </div>

          <div class="products-list-section">
            <h3 class="section-title">Productos en este pedido</h3>
            <div class="product-entry" *ngFor="let item of items">
              <div class="product-main">
                <span class="qty">{{ item.cantidad }}x</span>
                <span class="name">{{ item.producto }}</span>
                <span class="shop-badge" *ngIf="item.guardadoEnTienda">YA EN TIENDA</span>
              </div>
              <div class="product-details">
                <span class="talla" *ngIf="item.talla">Ración: {{ item.talla }}</span>
                <span class="relleno" *ngIf="item.relleno">Relleno de: <strong>{{ item.relleno }}</strong></span>
              </div>
            </div>
          </div>

          <div class="notes-section">
            <div class="note-box tienda" *ngIf="items[0].notasTienda">
              <label>Notas de Tienda</label>
              <p>{{ items[0].notasTienda }}</p>
            </div>
            
            <div class="note-box pastelero" *ngIf="items[0].notasPastelero">
              <label>Notas de Obrador</label>
              <p>{{ items[0].notasPastelero }}</p>
            </div>
          </div>

          <!-- Acción de Tienda: Entregar -->
          <div class="actions">
            <button 
              *ngIf="items[0].estado !== 'Entregado'"
              class="btn-deliver" 
              (click)="markAsDeliveredGroup(items)" 
              [disabled]="isUpdating"
            >
               {{ isUpdating ? 'Procesando...' : 'ENTREGAR TODO EL PEDIDO' }}
            </button>
            <button 
              class="btn-edit-secondary" 
              [routerLink]="['/pedidos/editar', items[0].id]"
            >
              EDITAR PEDIDO
            </button>
            <button 
              *ngIf="items[0].estado !== 'Cancelado' && items[0].estado !== 'Entregado'"
              class="btn-cancel-secondary" 
              (click)="cancelOrderGroup(items)"
            >
              CANCELAR PEDIDO
            </button>
          </div>
          
          <div class="actions" *ngIf="items[0].estado === 'Entregado'">
             <span class="delivery-success">Entregado correctamente ✓</span>
          </div>

          <div class="metadata">
            <small>ID Grupo: {{ items[0].idGrupo || items[0].id }}</small>
            <small *ngIf="items[0].fechaActualizacion">Última actualización: {{ items[0].fechaActualizacion | date:'dd/MM/yyyy HH:mm' }}</small>
          </div>
        </div>
        <ng-template #noOrder>
          <div class="error-state">No se encontró el pedido.</div>
        </ng-template>
      </div>

      <ng-template #loading>
        <div class="loading-state">Cargando detalle del pedido...</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .detail-container { max-width: 800px; margin: 0 auto; padding: 1rem; }
    .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .btn-back { background: #eee; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    
    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    
    .status-banner { padding: 1rem; text-align: center; font-weight: 800; text-transform: uppercase; font-size: 1rem; letter-spacing: 0.5px; }
    .status-banner.pendiente { background: #fff7ed; color: #c2410c; }
    .status-banner.en-proceso { background: #eff6ff; color: #1d4ed8; }
    .status-banner.producido { background: #f0fdf4; color: #15803d; }
    .status-banner.entregado { background: #f8fafc; color: #64748b; }
    .status-banner.cancelado { background: #fef2f2; color: #991b1b; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; padding: 1.5rem; }
    .info-group.wide { grid-column: span 2; }
    .info-group label { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 0.25rem; }
    .value { font-size: 1.1rem; color: #1e293b; font-weight: 600; }
    .value.highlight { color: #d35400; font-weight: 800; font-size: 1.5rem; }

    .section-title { font-size: 0.9rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 1rem; }
    .products-list-section { padding: 1.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    .product-entry { padding: 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 0.75rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
    .product-main { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; }
    .product-main .qty { font-weight: 800; color: #d35400; font-size: 1.2rem; }
    .product-main .name { font-weight: 700; font-size: 1.1rem; color: #0f172a; }
    .shop-badge { background: #dcfce7; color: #166534; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: auto; border: 1px solid #bbf7d0; }
    .product-details { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.9rem; }
    .product-details .talla { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-weight: 600; }
    .product-details .relleno { color: #d97706; }

    .notes-section { padding: 1.5rem; display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media (min-width: 640px) { .notes-section { grid-template-columns: 1fr 1fr; } }
    
    .note-box { padding: 1rem; border-radius: 12px; }
    .note-box label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; display: block; }
    .note-box p { margin: 0; font-size: 0.95rem; line-height: 1.5; }
    .note-box.pastelero { background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; }
    .note-box.tienda { background: #f0f9ff; border: 1px solid #e0f2fe; color: #075985; }

    .actions { padding: 1.5rem; text-align: center; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    .btn-deliver { 
      background: #059669; color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 700; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; width: 100%; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.4);
      &:active { transform: scale(0.98); }
    }
    .btn-deliver:disabled { background: #9ca3af; cursor: not-allowed; box-shadow: none; }
    .btn-edit-secondary { 
      background: white; color: #475569; border: 1px solid #e2e8f0; padding: 0.85rem 2rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; width: 100%; margin-top: 0.75rem;
      &:hover { background: #f8fafc; border-color: #cbd5e1; }
    }
    .btn-cancel-secondary { 
      background: #fef2f2; color: #991b1b; border: 1px solid #fee2e2; padding: 0.85rem 2rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; width: 100%; margin-top: 0.75rem;
      &:hover { background: #fee2e2; }
    }
    .delivery-success { color: #059669; font-weight: 800; font-size: 1.25rem; }

    .metadata { padding: 0.75rem 1.5rem; background: #f1f5f9; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 0.7rem; }
    .vendedor-badge { display: inline-flex; align-items: center; gap: 6px; background: #ecfdf5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; }
    .loading-state, .error-state { text-align: center; padding: 4rem; color: #64748b; }
  `]
})
export class PedidoTiendaDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productionService = inject(ProductionService);
  private location = inject(Location);

  pedidoGroup$!: Observable<Pedido[]>;
  isUpdating = false;

  ngOnInit() {
    this.pedidoGroup$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      switchMap(id => {
        if (!id) return of([]);
        return this.productionService.getPedidos().pipe(
          map(pedidos => {
            const target = pedidos.find(p => p.id === id);
            if (!target) return [];
            
            if (target.idGrupo) {
              return pedidos.filter(p => p.idGrupo === target.idGrupo);
            }
            return [target];
          })
        );
      })
    );
  }

  markAsDeliveredGroup(items: Pedido[]) {
    if (confirm(`¿Marcar como entregados los ${items.length} productos de este pedido?`)) {
      this.isUpdating = true;
      
      // Actualizamos todos los ítems del grupo a 'Entregado'
      const updates = items.map(item => this.productionService.updatePedidoStatus(item.id, 'Entregado'));
      
      forkJoin(updates).subscribe({
        next: () => {
          this.isUpdating = false;
          this.router.navigate(['/pedidos']);
        },
        error: (err) => {
          alert('Error al actualizar: ' + err.message);
          this.isUpdating = false;
        }
      });
    }
  }

  cancelOrderGroup(items: Pedido[]) {
    if (confirm(`¿Estás seguro de que deseas CANCELAR este pedido completo (${items.length} productos)?`)) {
      this.isUpdating = true;
      const updates = items.map(item => this.productionService.updatePedidoStatus(item.id, 'Cancelado'));
      
      forkJoin(updates).subscribe({
        next: () => {
          this.isUpdating = false;
          this.router.navigate(['/pedidos']);
        },
        error: (err) => {
          alert('Error al cancelar: ' + err.message);
          this.isUpdating = false;
        }
      });
    }
  }

  goBack() {
    this.location.back();
  }
}
