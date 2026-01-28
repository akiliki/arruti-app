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
  styleUrl: './producto-detail.component.scss'
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
