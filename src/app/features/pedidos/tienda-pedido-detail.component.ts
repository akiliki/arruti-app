import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido } from '../../core/models/pedido.model';
import { Observable, map, switchMap, BehaviorSubject, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-tienda-pedido-detail',
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
  styleUrl: './tienda-pedido-detail.component.scss'
})
export class TiendaPedidoDetailComponent implements OnInit {
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
