import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { RecetaService } from '../../core/services/receta.service';
import { Producto } from '../../core/models/producto.model';
import { Receta } from '../../core/models/receta.model';
import { RecetasListComponent } from './recetas-list.component';
import { Observable, switchMap, of, catchError, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-producto-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, RecetasListComponent],
  template: `
    <div class="detail-container">
      <div class="header">
        <button class="btn-back" (click)="goBack()">← Volver</button>
        <h2>Detalle del Producto</h2>
      </div>

      <div *ngIf="data$ | async as data; else loadingOrError" class="content">
        <div class="card">
          <div class="info-group">
            <label>ID:</label>
            <span class="value code">{{ data.producto.id }}</span>
          </div>
          <div class="info-group">
            <label>Nombre:</label>
            <span class="value highlight">{{ data.producto.producto }}</span>
          </div>
          <div class="info-group">
            <label>Familia:</label>
            <span class="badge">{{ data.producto.familia }}</span>
          </div>
          <div class="info-group">
            <label>Raciones / Tallas:</label>
            <div class="tallas-list">
              <span *ngFor="let tallas of data.producto.tallasRaciones" class="talla-tag">
                {{ tallas }}
              </span>
              <span *ngIf="data.producto.tallasRaciones.length === 0" class="empty">
                Sin tallas especificadas
              </span>
            </div>
          </div>
          <div class="info-group">
            <label>Rellenos disponibles:</label>
            <div class="tallas-list">
              <span *ngFor="let rel of data.producto.rellenos" class="talla-tag relleno">
                {{ rel }}
              </span>
              <span *ngIf="data.producto.rellenos.length === 0" class="empty">
                Sin rellenos (producto simple)
              </span>
            </div>
          </div>
        </div>

        <div class="recetas-section">
          <div class="section-header">
            <h3>Recetas / Producción</h3>
            <button class="btn-add-receta" [routerLink]="['/productos', data.producto.id, 'receta', 'nueva']">
              + Añadir Receta
            </button>
          </div>

          <app-recetas-list [recetas]="data.recetas" [showProductColumn]="false"></app-recetas-list>
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
  private location = inject(Location);
  private productoService = inject(ProductoService);
  private recetaService = inject(RecetaService);

  data$!: Observable<{ producto: Producto, recetas: Receta[] } | undefined>;
  error: string | null = null;

  ngOnInit(): void {
    this.loadProducto();
  }

  loadProducto() {
    this.error = null;
    this.data$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(undefined);
        
        return combineLatest({
          producto: this.productoService.getProductoById(id),
          recetas: this.recetaService.getRecetasByProducto(id)
        }).pipe(
          map(res => {
            if (!res.producto) return undefined;
            return {
              producto: res.producto,
              recetas: res.recetas
            };
          })
        );
      }),
      catchError(err => {
        this.error = 'No se pudo cargar el detalle del producto.';
        return of(undefined);
      })
    );
  }

  goBack() {
    this.location.back();
  }
}
