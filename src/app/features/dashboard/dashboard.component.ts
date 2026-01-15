import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { ProduccionStats } from '../../core/models/pedido.model';
import { Observable, catchError, map, of, startWith } from 'rxjs';

interface DashboardState {
  loading: boolean;
  data: ProduccionStats | null;
  error: string | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <div class="header">
        <h1>Panel de Producción - Pastelería Arruti</h1>
        <div class="actions">
          <button class="btn-secondary" routerLink="/pedidos">Ver Todos los Pedidos</button>
          <button class="btn-new" routerLink="/nuevo-pedido">Crear Nuevo Pedido</button>
        </div>
      </div>
      
      <ng-container *ngIf="state$ | async as state">
        <!-- Estado de Carga -->
        <div *ngIf="state.loading" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando datos de producción...</p>
        </div>

        <!-- Estado de Error -->
        <div *ngIf="state.error" class="error-state">
          {{ state.error }}
          <button (click)="loadStats()">Reintentar</button>
        </div>

        <!-- Estado de Éxito -->
        <div class="stats-grid" *ngIf="state.data">
          <div class="stat-card">
            <h3>Pendientes</h3>
            <p class="value">{{ state.data.totalPendientes }}</p>
          </div>
          <div class="stat-card">
            <h3>En Horno</h3>
            <p class="value">{{ state.data.enHorno }}</p>
          </div>
          <div class="stat-card">
            <h3>Finalizados Hoy</h3>
            <p class="value">{{ state.data.finalizadosHoy }}</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 20px; font-family: sans-serif; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .actions { display: flex; gap: 10px; }
    .btn-new { background: #d35400; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
    .btn-new:hover { background: #e67e22; }
    .btn-secondary { background: #eee; color: #333; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold; }
    .btn-secondary:hover { background: #ddd; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
    .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; background: #fff; }
    .value { font-size: 2rem; font-weight: bold; color: #d35400; }
    .loading-state { padding: 40px; text-align: center; color: #666; }
    .spinner { 
      border: 4px solid #f3f3f3; 
      border-top: 4px solid #d35400; 
      border-radius: 50%; 
      width: 30px; 
      height: 30px; 
      animation: spin 1s linear infinite; 
      margin: 0 auto 10px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-state { padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border-radius: 8px; border: 1px solid #f5c6cb; margin-top: 20px; }
    button { margin-top: 10px; padding: 8px 16px; cursor: pointer; background: #d35400; color: white; border: none; border-radius: 4px; }
    button:hover { background: #e67e22; }
  `]
})
export class DashboardComponent implements OnInit {
  private productionService = inject(ProductionService);
  state$!: Observable<DashboardState>;

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.state$ = this.productionService.getDashboardStats().pipe(
      map(data => ({ loading: false, data, error: null })),
      startWith({ loading: true, data: null, error: null }),
      catchError(err => of({ loading: false, data: null, error: err.message }))
    );
  }
}
