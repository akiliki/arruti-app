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
  templateUrl: './productos-list.component.html',
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
