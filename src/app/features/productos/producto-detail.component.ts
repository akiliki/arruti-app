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
          <div class="info-group">
            <label>Rellenos disponibles:</label>
            <div class="tallas-list">
              <span *ngFor="let rel of producto.rellenos" class="talla-tag relleno">
                {{ rel }}
              </span>
              <span *ngIf="producto.rellenos.length === 0" class="empty">
                Sin rellenos (producto simple)
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
    .btn-back { background: none; border: none; color: #3b82f6; cursor: pointer; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .btn-back:hover { color: #2563eb; }

    .card { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 2.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .info-group { display: flex; flex-direction: column; gap: 0.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1.25rem; }
    .info-group:last-child { border-bottom: none; }
    .info-group label { font-weight: 800; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 1.25rem; color: #1e293b; font-weight: 500; }
    .value.highlight { color: #1e293b; font-weight: 800; font-size: 2rem; }
    .value.code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85rem; color: #94a3b8; }

    .badge { align-self: flex-start; background: #e0f2fe; color: #0369a1; padding: 0.5rem 1rem; border-radius: 12px; font-weight: 800; font-size: 0.9rem; }
    
    .tallas-list { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .talla-tag { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.5rem 1rem; border-radius: 10px; font-weight: 700; color: #475569; }
    .talla-tag.relleno { background: #fff7ed; border-color: #ffedd5; color: #9a3412; }
    .empty { color: #94a3b8; font-style: italic; }

    .actions { margin-top: 2rem; padding: 1.25rem; background: #fefce8; border-radius: 12px; border: 1px solid #fef08a; display: flex; align-items: center; gap: 0.75rem; }
    .hint { margin: 0; color: #854d0e; font-size: 0.9rem; font-weight: 500; }

    .error-state, .loading-state { text-align: center; padding: 4rem; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .spinner { border: 4px solid #f1f5f9; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Responsive */
    @media (max-width: 640px) {
      .detail-container { padding: 1rem; }
      .header { flex-direction: column; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
      .header h2 { font-size: 1.5rem; margin: 0; }
      .card { padding: 1.5rem; gap: 1.25rem; }
      .value.highlight { font-size: 1.5rem; }
      .badge { font-size: 0.8rem; }
      .talla-tag { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
    }
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
