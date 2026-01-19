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
  styles: [`
    .form-container { padding: 1.5rem; max-width: 600px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; }
    .header h2 { margin: 0; font-size: 1.5rem; color: #1e293b; font-weight: 800; }
    
    .card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .field { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .field label { font-weight: 800; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .field input { 
      padding: 0.75rem 1rem; 
      border: 1px solid #e2e8f0; 
      border-radius: 12px; 
      background: #f8fafc;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }
    .field input:focus { border-color: #3b82f6; background: white; }
    .field small { color: #94a3b8; font-size: 0.8rem; }
    
    .error { color: #ef4444; font-size: 0.8rem; font-weight: 600; margin-top: 0.25rem; }
    .error-box { margin-top: 1.5rem; padding: 1rem; background: #fef2f2; color: #991b1b; border-radius: 12px; border: 1px solid #fee2e2; font-size: 0.9rem; font-weight: 500; }
    
    .actions { margin-top: 2.5rem; }
    .btn-save { 
      width: 100%; 
      background: #3b82f6; 
      color: white; 
      border: none; 
      padding: 1rem; 
      border-radius: 12px; 
      cursor: pointer; 
      font-weight: 700; 
      font-size: 1rem; 
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
    }
    .btn-save:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
    .btn-save:disabled { background: #94a3b8; cursor: not-allowed; opacity: 0.7; }
    
    .btn-back { 
      background: white; 
      border: 1px solid #e2e8f0; 
      padding: 0.6rem 1.2rem; 
      border-radius: 10px; 
      cursor: pointer; 
      font-weight: 700; 
      color: #64748b;
      transition: all 0.2s;
    }
    .btn-back:hover { background: #f8fafc; border-color: #cbd5e1; }

    /* Responsive */
    @media (max-width: 640px) {
      .form-container { padding: 1rem; }
      .header { flex-direction: column; align-items: stretch; text-align: center; }
      .card { padding: 1.5rem; }
    }
  `]
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
