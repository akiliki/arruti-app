import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, map, switchMap, catchError, of, take } from 'rxjs';
import { PedidosHeaderComponent } from '../../shared/components/pedidos-header/pedidos-header.component';
import { PedidoStatusClassPipe } from '../../shared/pipes/pedido-status-class.pipe';

@Component({
  selector: 'app-tienda-update-status',
  standalone: true,
  imports: [CommonModule, RouterModule, PedidosHeaderComponent, PedidoStatusClassPipe],
  template: `
    <div class="status-container" *ngIf="pedido$ | async as pedido; else loading">
      <app-pedidos-header [title]="'Pedido: ' + pedido.id" backText="← Volver" [backLink]="['/pedidos']"></app-pedidos-header>

      <div class="order-card">
        <div class="detail">
          <label>Producto:</label>
          <span>{{ pedido.producto }}</span>
        </div>
        <div class="detail">
          <label>Cantidad:</label>
          <span>{{ pedido.cantidad }}</span>
        </div>
        <div class="detail">
          <label>Fecha de Entrega:</label>
          <span>{{ pedido.fechaEntrega | date:'dd/MM/yyyy' }}</span>
        </div>
        <div class="detail" *ngIf="pedido.vendedor">
          <label>Atendido por:</label>
          <strong>{{ pedido.vendedor }}</strong>
        </div>
        <div class="detail">
          <label>Estado Actual:</label>
          <span class="badge" [ngClass]="pedido.estado | pedidoStatusClass">
            {{ pedido.estado }}
          </span>
        </div>
      </div>

      <div class="status-actions">
        <h3>Cambiar Estado a:</h3>
        <div class="btn-group">
          <button 
            *ngFor="let estado of estados" 
            [class]="'btn-status ' + (estado | pedidoStatusClass)"
            [class.active]="pedido.estado === estado"
            [disabled]="updating || pedido.estado === estado"
            (click)="updateStatus(pedido.id, estado)"
          >
            {{ estado }}
          </button>
        </div>
      </div>

      <div *ngIf="errorMessage" class="error-alert">
        {{ errorMessage }}
      </div>
    </div>

    <ng-template #loading>
      <div class="loading-state" *ngIf="!error">Cargando pedido...</div>
      <div class="error-state" *ngIf="error">
        <p>{{ error }}</p>
        <button routerLink="/pedidos">Volver a la lista</button>
      </div>
    </ng-template>
  `,
  styleUrl: './tienda-update-status.component.scss'
})
export class TiendaUpdateStatusComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productionService = inject(ProductionService);

  pedido$!: Observable<Pedido>;
  estados: EstadoPedido[] = ['Pendiente', 'En Proceso', 'Terminado', 'Entregado', 'Cancelado'];
  updating = false;
  error: string | null = null;
  errorMessage: string | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'No se proporcionó un ID de pedido.';
      return;
    }

    this.pedido$ = this.productionService.getPedidos().pipe(
      map(pedidos => {
        const p = pedidos.find(x => x.id === id);
        if (!p) throw new Error('Pedido no encontrado.');
        return p;
      }),
      catchError(err => {
        this.error = err.message;
        return of() as Observable<Pedido>;
      })
    );
  }

  updateStatus(id: string, nuevoEstado: EstadoPedido) {
    this.updating = true;
    this.errorMessage = null;

    this.productionService.updatePedidoStatus(id, nuevoEstado).subscribe({
      next: () => {
        this.updating = false;
        // Redirigimos a la lista después de actualizar
        this.router.navigate(['/pedidos']);
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.updating = false;
      }
    });
  }
}
