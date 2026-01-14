import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductionService } from '../../core/services/production.service';
import { ProduccionStats } from '../../core/models/pedido.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h1>Panel de Producción - Pastelería Arruti</h1>
      
      <div class="stats-grid" *ngIf="stats$ | async as stats">
        <div class="stat-card">
          <h3>Pendientes</h3>
          <p class="value">{{ stats.totalPendientes }}</p>
        </div>
        <div class="stat-card">
          <h3>En Horno</h3>
          <p class="value">{{ stats.enHorno }}</p>
        </div>
        <div class="stat-card">
          <h3>Finalizados Hoy</h3>
          <p class="value">{{ stats.finalizadosHoy }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 20px; font-family: sans-serif; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
    .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
    .value { font-size: 2rem; font-weight: bold; color: #d35400; }
  `]
})
export class DashboardComponent implements OnInit {
  private productionService = inject(ProductionService);
  stats$!: Observable<ProduccionStats>;

  ngOnInit(): void {
    this.stats$ = this.productionService.getDashboardStats();
  }
}
