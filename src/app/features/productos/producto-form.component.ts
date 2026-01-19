import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { Producto } from '../../core/models/producto.model';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="form-container">
      <div class="header">
        <h2>{{ isEditMode ? 'Editar Producto' : 'Añadir Nuevo Producto' }}</h2>
        <button class="btn-back" routerLink="/productos">Volver</button>
      </div>

      <form [formGroup]="productForm" (ngSubmit)="onSubmit()" class="card">
        <div class="field">
          <label>Familia</label>
          <input type="text" formControlName="familia" placeholder="Ej: Bollería, Pastelería, Panes...">
          <div *ngIf="productForm.get('familia')?.touched && productForm.get('familia')?.invalid" class="error">
            La familia es obligatoria.
          </div>
        </div>

        <div class="field">
          <label>Nombre del Producto</label>
          <input type="text" formControlName="producto" placeholder="Ej: Croissant de Mantequilla">
          <div *ngIf="productForm.get('producto')?.touched && productForm.get('producto')?.invalid" class="error">
            El nombre es obligatorio.
          </div>
        </div>

        <div class="field">
          <label>Raciones / Tamaños (opcional)</label>
          <input type="text" formControlName="tallasRaciones" placeholder="Ej: Individual, 4p, 6p (separados por comas)">
          <small>Si hay varios, sepárelos por comas.</small>
        </div>

        <div class="actions">
          <button type="submit" [disabled]="productForm.invalid || isSubmitting" class="btn-save">
            {{ isSubmitting ? 'Guardando...' : (isEditMode ? 'Actualizar Producto' : 'Guardar Producto') }}
          </button>
        </div>

        <div *ngIf="errorMessage" class="error-box">
          {{errorMessage}}
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-container { padding: 1rem; max-width: 600px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .field { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .field label { font-weight: 600; color: #444; }
    .field input { padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; }
    .field small { color: #888; font-size: 0.8rem; }
    
    .error { color: #d32f2f; font-size: 0.8rem; }
    .error-box { margin-top: 1rem; padding: 1rem; background: #ffebee; color: #c62828; border-radius: 4px; }
    
    .actions { margin-top: 2rem; }
    .btn-save { width: 100%; background: #2196f3; color: white; border: none; padding: 1rem; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 1rem; }
    .btn-save:disabled { background: #ccc; cursor: not-allowed; }
    .btn-back { background: transparent; border: 1px solid #ddd; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
  `]
})
export class ProductoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isSubmitting = false;
  isEditMode = false;
  productId: string | null = null;
  errorMessage = '';

  productForm = this.fb.group({
    familia: ['', Validators.required],
    producto: ['', Validators.required],
    tallasRaciones: ['']
  });

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode = true;
      this.loadProducto(this.productId);
    }
  }

  loadProducto(id: string) {
    this.productoService.getProductoById(id).subscribe(producto => {
      if (producto) {
        this.productForm.patchValue({
          familia: producto.familia,
          producto: producto.producto,
          tallasRaciones: producto.tallasRaciones.join(', ')
        });
      } else {
        this.errorMessage = 'Producto no encontrado.';
      }
    });
  }

  onSubmit() {
    if (this.productForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.productForm.value;
    const tallas = formValue.tallasRaciones 
      ? formValue.tallasRaciones.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];

    if (this.isEditMode && this.productId) {
      const productoActualizado: Producto = {
        id: this.productId,
        familia: formValue.familia || '',
        producto: formValue.producto || '',
        tallasRaciones: tallas
      };

      this.productoService.updateProducto(productoActualizado).subscribe({
        next: () => this.router.navigate(['/productos']),
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.message || 'Error al actualizar el producto.';
        }
      });
    } else {
      const nuevoProducto = {
        familia: formValue.familia || '',
        producto: formValue.producto || '',
        tallasRaciones: tallas
      };

      this.productoService.addProducto(nuevoProducto).subscribe({
        next: () => this.router.navigate(['/productos']),
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err.message || 'Error al guardar el producto.';
        }
      });
    }
  }
}
