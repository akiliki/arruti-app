import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { RecetaService } from '../../core/services/receta.service';
import { Receta } from '../../core/models/receta.model';
import { Observable, map, switchMap, of } from 'rxjs';

@Component({
  selector: 'app-receta-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-container">
      <div *ngIf="receta$ | async as r; else loading" class="content">
        <div class="header">
          <button class="btn-back" (click)="goBack()">← Volver</button>
          <h2>Receta: {{ r.nombreProducto }}</h2>
          <div class="header-actions">
            <button class="btn-producto" [routerLink]="['/productos', r.idProducto]">
              Ir al Producto
            </button>
            <button class="btn-edit" [routerLink]="['/productos', r.idProducto, 'receta', r.id]">
              Editar Receta
            </button>
          </div>
        </div>

        <div class="main-card">
          <div class="meta-grid">
            <div class="meta-item">
              <label>Raciones</label>
              <span>{{ r.raciones }}</span>
            </div>
            <div class="meta-item">
              <label>Tiempo Total</label>
              <span class="highlight">⏱ {{ r.tiempoTotal }}</span>
            </div>
          </div>

          <section class="section">
            <h3>Ingredientes</h3>
            <table class="ing-table">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let ing of r.ingredientes">
                  <td>{{ ing.nombre }}</td>
                  <td>{{ ing.cantidad }}</td>
                  <td>{{ ing.unidad }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="section">
            <h3>Pasos de Elaboración</h3>
            <div class="steps-box">
              {{ r.pasos }}
            </div>
          </section>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando receta...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .detail-container { max-width: 900px; margin: 0 auto; padding: 2rem; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
    .btn-back { background: none; border: none; color: #64748b; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
    
    .header-actions { display: flex; gap: 0.75rem; }
    .btn-producto { background: #3b82f6; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-edit { background: white; border: 1px solid #e2e8f0; color: #64748b; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }

    .main-card { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 2rem; }
    
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; }
    .meta-item label { display: block; font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 0.25rem; }
    .meta-item span { font-size: 1.25rem; font-weight: 600; color: #1e293b; }
    .meta-item span.highlight { color: #0891b2; }

    .section { margin-bottom: 2.5rem; }
    .section h3 { font-size: 1.1rem; color: #1e293b; margin-bottom: 1rem; border-left: 4px solid #3b82f6; padding-left: 0.75rem; }

    .ing-table { width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden; }
    .ing-table th { text-align: left; padding: 0.75rem 1rem; background: #f1f5f9; color: #64748b; font-size: 0.85rem; }
    .ing-table td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; color: #475569; }

    .steps-box { white-space: pre-wrap; line-height: 1.7; color: #334155; background: #fff; border: 1px solid #f1f5f9; padding: 1.5rem; border-radius: 8px; }

    .loading-state { text-align: center; padding: 5rem; }
    .spinner { border: 4px solid #f1f5f9; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `]
})
export class RecetaDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private recetaService = inject(RecetaService);

  receta$!: Observable<Receta | undefined>;

  ngOnInit(): void {
    this.receta$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      switchMap(id => {
        if (!id) return of(undefined);
        return this.recetaService.getRecetas().pipe(
          map(recetas => recetas.find(r => r.id === id))
        );
      })
    );
  }

  goBack(): void {
    this.location.back();
  }
}
