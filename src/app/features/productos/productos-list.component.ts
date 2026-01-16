import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { Producto } from '../../core/models/producto.model';
import { Observable, combineLatest, map, startWith } from 'rxjs';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="list-container">
      <div class="header">
        <h2>Catálogo de Productos</h2>
        <button class="btn-new" routerLink="/nuevo-producto">Nuevo Producto</button>
      </div>

      <div class="filters">
        <div class="filter-group">
          <label>Familia:</label>
          <select [formControl]="familiaFilter">
            <option value="">Todas</option>
            <option *ngFor="let f of familias$ | async" [value]="f">{{f}}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Buscar Producto:</label>
          <input type="text" [formControl]="nombreFilter" placeholder="Filtrar por nombre...">
        </div>
      </div>

      <div *ngIf="filteredProductos$ | async as productos; else loading" class="table-wrapper">
        <table *ngIf="productos.length > 0; else empty">
          <thead>
            <tr>
              <th>Familia</th>
              <th>Producto</th>
              <th>Raciones/Tallas</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of productos">
              <td><span class="badge">{{p.familia}}</span></td>
              <td><strong>{{p.producto}}</strong></td>
              <td>{{p.tallasRaciones.join(', ') || '-'}}</td>
            </tr>
          </tbody>
        </table>

        <ng-template #empty>
          <div class="empty-state">
            <p>No se encontraron productos con los filtros seleccionados.</p>
          </div>
        </ng-template>
      </div>

      <ng-template #loading>
        <div class="loading">Cargando catálogo...</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .list-container { padding: 1rem; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; background: #f9f9f9; padding: 1rem; border-radius: 8px; }
    .filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .filter-group select, .filter-group input { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
    
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f4f4f4; font-weight: 600; color: #666; }
    
    .badge { background: #e3f2fd; color: #1976d2; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }
    .btn-new { background: #4caf50; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: 600; text-decoration: none; }
    .btn-new:hover { background: #45a049; }
    
    .empty-state, .loading { text-align: center; padding: 3rem; color: #666; }
  `]
})
export class ProductosListComponent implements OnInit {
  private productoService = inject(ProductoService);

  familiaFilter = new FormControl('');
  nombreFilter = new FormControl('');
  
  productos$!: Observable<Producto[]>;
  filteredProductos$!: Observable<Producto[]>;
  familias$!: Observable<string[]>;

  ngOnInit(): void {
    this.productos$ = this.productoService.getProductos();

    this.familias$ = this.productos$.pipe(
      map(prods => Array.from(new Set(prods.map(p => p.familia))).sort())
    );

    this.filteredProductos$ = combineLatest([
      this.productos$,
      this.familiaFilter.valueChanges.pipe(startWith('')),
      this.nombreFilter.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([productos, familia, nombre]) => {
        return productos.filter(p => {
          const matchFamilia = !familia || p.familia === familia;
          const matchNombre = !nombre || p.producto.toLowerCase().includes(nombre.toLowerCase());
          return matchFamilia && matchNombre;
        });
      })
    );
  }
}
