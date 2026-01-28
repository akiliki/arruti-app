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
          <div class="form-group">
            <label for="raciones">Tamaño / Raciones</label>
            <select id="raciones" formControlName="raciones">
              <option value="">Seleccionar tamaño...</option>
              <option *ngFor="let t of producto.tallasRaciones" [value]="t">{{ t }}</option>
              <option value="General">General (Todas las tallas)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Ingredientes</label>
            <div formArrayName="ingredientes" class="ingredients-table-wrapper">
              <table class="ingredients-table">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Cant.</th>
                    <th>Unidad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let ing of ingredientes.controls; let i = index" [formGroupName]="i">
                    <td>
                      <input type="text" formControlName="nombre" placeholder="Harina, Azúcar...">
                    </td>
                    <td>
                      <input type="text" formControlName="cantidad" placeholder="500">
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
                      <button type="button" class="btn-remove-ing" (click)="removeIngrediente(i)">×</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn-add-ing" (click)="addIngrediente()">+ Añadir Ingrediente</button>
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
  styleUrls: ['./receta-form.component.scss']
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
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.recetaForm = this.fb.group({
      raciones: ['', Validators.required],
      ingredientes: this.fb.array([]),
      pasos: ['', Validators.required],
      tiempoTotal: ['', Validators.required]
    });
  }

  get ingredientes() {
    return this.recetaForm.get('ingredientes') as FormArray;
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

  ngOnInit() {
    const idProducto = this.route.snapshot.paramMap.get('id');
    const idReceta = this.route.snapshot.paramMap.get('idReceta');

    if (!idProducto) {
      this.error.set('No se proporcionó el ID del producto.');
      this.loading.set(false);
      return;
    }

    if (this.ingredientes.length === 0) {
      this.addIngrediente();
    }

    // Cargar producto
    this.productoService.getProductos().subscribe(productos => {
      this.producto = productos.find(p => p.id === idProducto);
      
      if (!this.producto) {
        this.error.set('Producto no encontrado.');
        this.loading.set(false);
        return;
      }

      if (idReceta) {
        this.isEditMode = true;
        this.loadReceta(idReceta);
      } else {
        this.loading.set(false);
      }
    });
  }

  private loadReceta(idReceta: string) {
    this.recetaService.getRecetas().subscribe(recetas => {
      const receta = recetas.find(r => r.id === idReceta);
      if (receta) {
        this.recetaForm.patchValue({
          raciones: receta.raciones,
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

      } else {
        this.error.set('Receta no encontrada.');
      }
      this.loading.set(false);
    });
  }

  onSubmit() {
    if (this.recetaForm.invalid || !this.producto) return;

    this.saving.set(true);
    const formValue = this.recetaForm.value;
    
    const receta: Receta = {
      id: this.isEditMode ? this.route.snapshot.paramMap.get('idReceta')! : crypto.randomUUID(),
      idProducto: this.producto.id,
      nombreProducto: this.producto.producto,
      raciones: formValue.raciones,
      ingredientes: formValue.ingredientes,
      pasos: formValue.pasos,
      tiempoTotal: formValue.tiempoTotal
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
