import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { Producto } from '../../core/models/producto.model';
import { Observable, switchMap, of, catchError } from 'rxjs';

@Component({
  selector: 'app-producto-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="detail-container">
      <div class="header">
        <button class="btn-back" (click)="goBack()">← Volver al catálogo</button>
        <h2>Detalle del Producto</h2>
      </div>

      <div *ngIf="producto$ | async as producto; else loadingOrError" class="content">
        <div class="card">
          <div class="info-group">
            <label>ID:</label>
            <span class="value code">{{ producto.id }}</span>
          </div>
          <div class="info-group">
            <label>Nombre:</label>
            <span class="value highlight">{{ producto.producto }}</span>
          </div>
          <div class="info-group">
            <label>Familia:</label>
            <span class="badge">{{ producto.familia }}</span>
          </div>
          <div class="info-group">
            <label>Raciones / Tallas:</label>
            <div class="tallas-list">
              <span *ngFor="let tallas of producto.tallasRaciones" class="talla-tag">
                {{ tallas }}
              </span>
              <span *ngIf="producto.tallasRaciones.length === 0" class="empty">
                Sin tallas especificadas
              </span>
            </div>
          </div>
        </div>

        <div class="actions">
          <p class="hint">Nota: Para modificar este producto, contacta con administración.</p>
        </div>
      </div>

      <ng-template #loadingOrError>
        <div *ngIf="error" class="error-state">
          <p>{{ error }}</p>
          <button class="btn-retry" (click)="loadProducto()">Reintentar</button>
        </div>
        <div *ngIf="!error" class="loading-state">
          <div class="spinner"></div>
          <p>Buscando producto...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .detail-container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    .header { display: flex; align-items: center; gap: 2rem; margin-bottom: 2rem; }
    .btn-back { background: none; border: none; color: #4a90e2; cursor: pointer; font-weight: 600; font-size: 1rem; }
    .btn-back:hover { text-decoration: underline; }

    .card { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .info-group { display: flex; flex-direction: column; gap: 0.5rem; border-bottom: 1px solid #f0f0f0; padding-bottom: 1rem; }
    .info-group:last-child { border-bottom: none; }
    .info-group label { font-weight: bold; color: #666; font-size: 0.9rem; text-transform: uppercase; }
    .value { font-size: 1.25rem; color: #333; }
    .value.highlight { color: #d35400; font-weight: 800; font-size: 1.8rem; }
    .value.code { font-family: monospace; font-size: 0.9rem; color: #888; }

    .badge { align-self: flex-start; background: #e3f2fd; color: #1976d2; padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold; font-size: 1rem; }
    
    .tallas-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .talla-tag { background: #f5f5f5; border: 1px solid #ddd; padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 600; color: #444; }
    .empty { color: #999; font-style: italic; }

    .actions { margin-top: 2rem; padding: 1rem; background: #fff9c4; border-radius: 8px; border-left: 5px solid #fbc02d; }
    .hint { margin: 0; color: #856404; font-size: 0.9rem; }

    .error-state, .loading-state { text-align: center; padding: 3rem; background: #fff; border-radius: 12px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `]
})
export class ProductoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productoService = inject(ProductoService);

  producto$!: Observable<Producto | undefined>;
  error: string | null = null;

  ngOnInit(): void {
    this.loadProducto();
  }

  loadProducto() {
    this.error = null;
    this.producto$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(undefined);
        return this.productoService.getProductoById(id);
      }),
      catchError(err => {
        this.error = 'No se pudo cargar el detalle del producto.';
        return of(undefined);
      })
    );
  }

  goBack() {
    this.router.navigate(['/productos']);
  }
}
