import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { Pedido, EstadoPedido } from '../../core/models/pedido.model';
import { Observable, map, switchMap, catchError, of, take } from 'rxjs';

@Component({
  selector: 'app-update-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="status-container" *ngIf="pedido$ | async as pedido; else loading">
      <div class="header">
        <button class="btn-back" routerLink="/pedidos">← Volver</button>
        <h2>Pedido: {{ pedido.id }}</h2>
      </div>

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
        <div class="detail">
          <label>Estado Actual:</label>
          <span class="badge" [ngClass]="pedido.estado.toLowerCase().replace(' ', '-')">
            {{ pedido.estado }}
          </span>
        </div>
      </div>

      <div class="status-actions">
        <h3>Cambiar Estado a:</h3>
        <div class="btn-group">
          <button 
            *ngFor="let estado of estados" 
            [class]="'btn-status ' + estado.toLowerCase().replace(' ', '-')"
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
  styles: [`
    .status-container { max-width: 600px; margin: 20px auto; padding: 20px; }
    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
    .btn-back { background: none; border: none; color: #d35400; cursor: pointer; font-weight: bold; }
    
    .order-card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .detail { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail:last-child { border-bottom: none; }
    .detail label { font-weight: bold; color: #666; }
    
    .badge { padding: 4px 12px; border-radius: 12px; font-size: 0.9rem; font-weight: bold; }
    .badge.pendiente { background: #fff3cd; color: #856404; }
    .badge.en-proceso { background: #cce5ff; color: #004085; }
    .badge.finalizado { background: #d4edda; color: #155724; }

    .status-actions { text-align: center; }
    .btn-group { display: flex; justify-content: center; gap: 10px; margin-top: 15px; }
    .btn-status { padding: 12px 20px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; font-weight: bold; transition: all 0.2s; }
    
    .btn-status.pendiente { border-color: #ffe69c; color: #856404; }
    .btn-status.pendiente:hover:not(:disabled) { background: #fff3cd; }
    .btn-status.pendiente.active { background: #fff3cd; border-color: #856404; }

    .btn-status.en-proceso { border-color: #b8daff; color: #004085; }
    .btn-status.en-proceso:hover:not(:disabled) { background: #cce5ff; }
    .btn-status.en-proceso.active { background: #cce5ff; border-color: #004085; }

    .btn-status.finalizado { border-color: #c3e6cb; color: #155724; }
    .btn-status.finalizado:hover:not(:disabled) { background: #d4edda; }
    .btn-status.finalizado.active { background: #d4edda; border-color: #155724; }

    .btn-status:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading-state, .error-state { padding: 40px; text-align: center; }
    .error-alert { margin-top: 20px; padding: 15px; background: #f8d7da; color: #721c24; border-radius: 4px; text-align: center; }
  `]
})
export class UpdateStatusComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productionService = inject(ProductionService);

  pedido$!: Observable<Pedido>;
  estados: EstadoPedido[] = ['Pendiente', 'En Proceso', 'Finalizado'];
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
