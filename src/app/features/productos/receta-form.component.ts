import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { RecetaService } from '../../core/services/receta.service';
import { ProductoService } from '../../core/services/producto.service';
import { Receta, IngredienteReceta } from '../../core/models/receta.model';
import { Producto } from '../../core/models/producto.model';
import { catchError, of, take } from 'rxjs';

@Component({
  selector: 'app-receta-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="header">
        <button class="btn-back" (click)="goBack()">← Volver</button>
        <h2>{{ isEditMode ? 'Editar Receta' : 'Nueva Receta' }}</h2>
      </div>

      <div *ngIf="loading()" class="loading">
        Cargando datos del producto...
      </div>

      <div *ngIf="error()" class="error">
        <p class="error-text">Error: {{ error() }}</p>
        <button class="btn-back" (click)="goBack()">Volver</button>
      </div>

      <div *ngIf="!loading() && !error() && producto" class="card">
        <div class="product-info">
          <h3>Producto: {{ producto.producto }}</h3>
          <p class="subtitle">Familia: {{ producto.familia }}</p>
        </div>

        <form [formGroup]="recetaForm" (ngSubmit)="onSubmit()">
          <div class="main-fields">
            <div class="form-group">
              <label for="nombre">Nombre de la Receta</label>
              <input id="nombre" type="text" formControlName="nombre" placeholder="Ej: Masa de Bizcocho">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="cantidadPesada">Cantidad Pesada</label>
                <input id="cantidadPesada" type="number" formControlName="cantidadPesada" placeholder="500">
              </div>
              <div class="form-group">
                <label for="unidadPesada">Unidad</label>
                <select id="unidadPesada" formControlName="unidadPesada">
                  <option value="gr">gr</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="ud">ud</option>
                </select>
              </div>
            </div>
          </div>

          <div class="section-container">
            <h3 class="section-title">Productos Relacionados</h3>
            <p class="section-desc">Indica qué productos se elaboran con esta receta y raciones estimadas.</p>
            
            <div formArrayName="productosAsociados" class="table-card">
              <table class="form-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Raciones que produce</th>
                    <th class="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let pAsoc of productosAsociados.controls; let i = index" [formGroupName]="i">
                    <td>
                      <select formControlName="idProducto" (change)="onProductoAsociadoChange(i)">
                        <option value="" disabled>Seleccionar producto...</option>
                        <option *ngFor="let p of allProductos" [value]="p.id">{{ p.producto }} ({{ p.familia }})</option>
                      </select>
                    </td>
                    <td>
                      <input type="text" formControlName="raciones" placeholder="Ej: 12 individuales, 2 de 8p...">
                    </td>
                    <td>
                      <button type="button" class="btn-icon-remove" (click)="removeProductoAsociado(i)" title="Eliminar asociación">×</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn-add-row" (click)="addProductoAsociado()">
                <span class="plus">+</span> Asociar otro producto
              </button>
            </div>
          </div>

          <div class="section-container">
            <h3 class="section-title">Ingredientes</h3>
            
            <div formArrayName="ingredientes" class="table-card">
              <table class="form-table">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th style="width: 15%">Cant.</th>
                    <th style="width: 20%">Unidad</th>
                    <th class="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let ing of ingredientes.controls; let i = index" [formGroupName]="i">
                    <td>
                      <input type="text" formControlName="nombre" placeholder="Nombre ingrediente...">
                    </td>
                    <td>
                      <input type="text" formControlName="cantidad" placeholder="0">
                    </td>
                    <td>
                      <select formControlName="unidad">
                        <option value="gr">gr</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="ud">ud</option>
                        <option value="pizca">pizca</option>
                      </select>
                    </td>
                    <td>
                      <button type="button" class="btn-icon-remove" (click)="removeIngrediente(i)" title="Eliminar ingrediente">×</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn-add-row" (click)="addIngrediente()">
                <span class="plus">+</span> Añadir Ingrediente
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="pasos">Pasos a seguir</label>
            <textarea id="pasos" formControlName="pasos" placeholder="Instrucciones paso a paso..."></textarea>
          </div>

          <div class="form-group">
            <label for="tiempoTotal">Tiempo de elaboración total</label>
            <input type="text" id="tiempoTotal" formControlName="tiempoTotal" placeholder="Ej: 45 min, 2h 30min...">
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="goBack()">Cancelar</button>
            <button type="submit" class="btn-save" [disabled]="recetaForm.invalid || saving()">
              {{ saving() ? 'Guardando...' : (isEditMode ? 'Actualizar Receta' : 'Guardar Receta') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrl: './receta-form.component.scss'
})
export class RecetaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private recetaService = inject(RecetaService);
  private productoService = inject(ProductoService);

  recetaForm: FormGroup;
  isEditMode = false;
  producto?: Producto;
  allProductos: Producto[] = [];
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.recetaForm = this.fb.group({
      nombre: ['', Validators.required],
      cantidadPesada: [null, [Validators.required, Validators.min(0)]],
      unidadPesada: ['gr', Validators.required],
      productosAsociados: this.fb.array([]),
      ingredientes: this.fb.array([]),
      pasos: ['', Validators.required],
      tiempoTotal: ['', Validators.required]
    });
  }

  get ingredientes() {
    return this.recetaForm.get('ingredientes') as FormArray;
  }

  get productosAsociados() {
    return this.recetaForm.get('productosAsociados') as FormArray;
  }

  addIngrediente() {
    const ingForm = this.fb.group({
      nombre: ['', Validators.required],
      cantidad: [''],
      unidad: ['gr']
    });
    this.ingredientes.push(ingForm);
  }

  removeIngrediente(index: number) {
    this.ingredientes.removeAt(index);
  }

  addProductoAsociado(idProducto: string = '', nombreProducto: string = '', raciones: string = '') {
    const pForm = this.fb.group({
      idProducto: [idProducto, Validators.required],
      nombreProducto: [nombreProducto],
      raciones: [raciones]
    });
    this.productosAsociados.push(pForm);
  }

  removeProductoAsociado(index: number) {
    this.productosAsociados.removeAt(index);
  }

  onProductoAsociadoChange(index: number) {
    const group = this.productosAsociados.at(index) as FormGroup;
    const id = group.get('idProducto')?.value;
    const prod = this.allProductos.find(p => p.id === id);
    if (prod) {
      group.get('nombreProducto')?.setValue(prod.producto);
    }
  }

  ngOnInit() {
    const idProducto = this.route.snapshot.paramMap.get('id');
    const idReceta = this.route.snapshot.paramMap.get('idReceta');

    if (this.ingredientes.length === 0) {
      this.addIngrediente();
    }

    // Cargar todos los productos para el selector
    this.productoService.getProductos().subscribe(productos => {
      this.allProductos = productos;
      this.producto = productos.find(p => p.id === idProducto);
      
      if (!this.producto && idProducto !== 'all') { // 'all' context for general recipes
        this.error.set('Producto context not found.');
        // No salimos del todo, permitimos crear si es necesario
      }

      if (idReceta) {
        this.isEditMode = true;
        this.loadReceta(idReceta);
      } else {
        if (this.producto && this.productosAsociados.length === 0) {
          this.addProductoAsociado(this.producto.id, this.producto.producto);
        }
        this.loading.set(false);
      }
    });
  }

  private loadReceta(idReceta: string) {
    this.recetaService.getRecetas().subscribe(recetas => {
      const receta = recetas.find(r => r.id === idReceta);
      if (receta) {
        this.recetaForm.patchValue({
          nombre: receta.nombre || receta.nombreProducto,
          cantidadPesada: receta.cantidadPesada,
          unidadPesada: receta.unidadPesada,
          pasos: receta.pasos,
          tiempoTotal: receta.tiempoTotal
        });

        // Limpiar y cargar ingredientes
        this.ingredientes.clear();
        receta.ingredientes.forEach(ing => {
          const ingForm = this.fb.group({
            nombre: [ing.nombre, Validators.required],
            cantidad: [ing.cantidad],
            unidad: [ing.unidad]
          });
          this.ingredientes.push(ingForm);
        });

        // Cargar productos asociados
        this.productosAsociados.clear();
        if (receta.productosAsociados && receta.productosAsociados.length > 0) {
          receta.productosAsociados.forEach(p => {
            this.addProductoAsociado(p.idProducto, p.nombreProducto, p.raciones);
          });
        } else if (receta.idProducto) {
          // Retrocompatibilidad
          this.addProductoAsociado(receta.idProducto, receta.nombreProducto || '', receta.raciones || '');
        }

      } else {
        this.error.set('Receta no encontrada.');
      }
      this.loading.set(false);
    });
  }

  onSubmit() {
    if (this.recetaForm.invalid) return;

    this.saving.set(true);
    const formValue = this.recetaForm.value;
    
    const receta: Receta = {
      id: this.isEditMode ? this.route.snapshot.paramMap.get('idReceta')! : crypto.randomUUID(),
      nombre: formValue.nombre,
      cantidadPesada: formValue.cantidadPesada,
      unidadPesada: formValue.unidadPesada,
      ingredientes: formValue.ingredientes,
      pasos: formValue.pasos,
      tiempoTotal: formValue.tiempoTotal,
      productosAsociados: formValue.productosAsociados
    };

    const action = this.isEditMode 
      ? this.recetaService.updateReceta(receta)
      : this.recetaService.saveReceta(receta);

    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.goBack();
      },
      error: (err) => {
        console.error('Error saving receta:', err);
        this.error.set('Error al guardar la receta. Inténtelo de nuevo.');
        this.saving.set(false);
      }
    });
  }

  goBack() {
    this.location.back();
  }
}
