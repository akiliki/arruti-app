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
              <td>{{p.rellenos?.join(', ') || '-'}}</td>
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
  styles: [`
    .list-container { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 2rem; 
      gap: 1rem;
    }
    .header h2 { margin: 0; font-size: 1.8rem; color: #1e293b; font-weight: 800; }

    .btn-new { 
      background: #3b82f6; 
      color: white; 
      border: none; 
      padding: 0.75rem 1.5rem; 
      border-radius: 12px; 
      cursor: pointer; 
      font-weight: 700; 
      text-decoration: none; 
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
    }
    .btn-new:hover { background: #2563eb; transform: translateY(-1px); }

    .filters { 
      display: flex; 
      gap: 1.5rem; 
      margin-bottom: 2rem; 
      background: white; 
      padding: 1.5rem; 
      border-radius: 16px; 
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .filter-group { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
    .filter-group label { font-weight: 800; font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .filter-group select, .filter-group input { 
      padding: 0.75rem; 
      border: 1px solid #e2e8f0; 
      border-radius: 10px; 
      background: #f8fafc;
      font-size: 0.95rem;
      outline: none;
    }
    .filter-group select:focus, .filter-group input:focus { border-color: #3b82f6; background: white; }
    
    .table-wrapper { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; padding: 1rem 1.5rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 800; border-bottom: 2px solid #e2e8f0; }
    td { padding: 1.25rem 1.5rem; text-align: left; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    
    .badge { background: #e0f2fe; color: #0369a1; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }
    
    .actions-cell { display: flex; gap: 0.5rem; }
    .btn-detail, .btn-edit {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 700;
      border: none;
      transition: all 0.2s;
    }
    .btn-detail { background: #f1f5f9; color: #475569; }
    .btn-detail:hover { background: #e2e8f0; }
    .btn-edit { background: #eff6ff; color: #3b82f6; }
    .btn-edit:hover { background: #dbeafe; }
    
    .empty-state, .loading { text-align: center; padding: 4rem; color: #64748b; font-weight: 500; }

    /* Responsive */
    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: stretch; text-align: center; }
      .header h2 { font-size: 1.5rem; }
      
      .filters { flex-direction: column; gap: 1rem; padding: 1.25rem; }
      
      .table-wrapper { background: transparent; box-shadow: none; border-radius: 0; }
      table, thead, tbody, th, td, tr { display: block; }
      thead { display: none; }
      
      tr { 
        background: white; 
        border-radius: 16px; 
        margin-bottom: 1rem; 
        padding: 1.25rem; 
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        position: relative;
      }
      
      td { 
        border: none; 
        padding: 0.5rem 0; 
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      td:first-child { margin-bottom: 0.5rem; }
      td:nth-child(2) { font-size: 1.2rem; margin-bottom: 0.25rem; }
      td:nth-child(3) { color: #64748b; font-size: 0.9rem; margin-bottom: 0.25rem; }
      td:nth-child(4) { color: #64748b; font-size: 0.9rem; margin-bottom: 1rem; }
      
      /* Add labels for mobile */
      td:nth-child(3)::before { content: 'Tallas: '; font-weight: 700; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; }
      td:nth-child(4)::before { content: 'Rellenos: '; font-weight: 700; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; }
      
      .actions-cell {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #f1f5f9;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      .actions-cell button { width: 100%; padding: 0.75rem; }
    }

    @media (max-width: 480px) {
      .list-container { padding: 1rem; }
    }
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
