import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';

@Component({
  selector: 'app-add-producto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="form-container">
      <div class="header">
        <h2>Añadir Nuevo Producto</h2>
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
            {{ isSubmitting ? 'Guardando...' : 'Guardar Producto' }}
          </button>
        </div>

        <div *ngIf="errorMessage" class="error-box">
          {{errorMessage}}
        </div>
      </form>
    </div>
  `,
  styleUrl: './add-producto.component.scss'
})
export class AddProductoComponent {
  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);
  private router = inject(Router);

  isSubmitting = false;
  errorMessage = '';

  productForm = this.fb.group({
    familia: ['', Validators.required],
    producto: ['', Validators.required],
    tallasRaciones: ['']
  });

  onSubmit() {
    if (this.productForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.productForm.value;
    const tallas = formValue.tallasRaciones 
      ? formValue.tallasRaciones.split(',').map(s => s.trim()).filter(s => s !== '')
      : [];

    const nuevoProducto = {
      familia: formValue.familia || '',
      producto: formValue.producto || '',
      tallasRaciones: tallas
    };

    this.productoService.addProducto(nuevoProducto).subscribe({
      next: () => {
        this.router.navigate(['/productos']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.message || 'Error al guardar el producto.';
      }
    });
  }
}
