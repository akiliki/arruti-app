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
              <th>Rellenos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of productos">
              <td><span class="badge">{{p.familia}}</span></td>
              <td><strong>{{p.producto}}</strong></td>
              <td>{{p.tallasRaciones.join(', ') || '-'}}</td>
              <td>{{p.rellenos.join(', ') || '-'}}</td>
              <td class="actions-cell">
                <button class="btn-detail" [routerLink]="['/productos', p.id]">
                  Ver
                </button>
                <button class="btn-edit" [routerLink]="['/productos/editar', p.id]">
                  Editar
                </button>
              </td>
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
  styleUrl: './productos-list.component.scss'
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
