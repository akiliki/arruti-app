import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';

@Component({
  selector: 'app-add-pedido',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="form-container">
      <h2>Añadir Nuevo Pedido</h2>
      
      <form [formGroup]="pedidoForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="producto">Producto</label>
          <input id="producto" type="text" formControlName="producto" placeholder="Ej: Tarta de Queso">
          <div *ngIf="pedidoForm.get('producto')?.invalid && pedidoForm.get('producto')?.touched" class="error">
            El nombre del producto es obligatorio.
          </div>
        </div>

        <div class="form-group">
          <label for="cantidad">Cantidad</label>
          <input id="cantidad" type="number" formControlName="cantidad">
          <div *ngIf="pedidoForm.get('cantidad')?.invalid && pedidoForm.get('cantidad')?.touched" class="error">
            Ingrese una cantidad válida (mínimo 1).
          </div>
        </div>

        <div class="form-group">
          <label for="fechaEntrega">Fecha de Entrega</label>
          <input id="fechaEntrega" type="date" formControlName="fechaEntrega">
          <div *ngIf="pedidoForm.get('fechaEntrega')?.invalid && pedidoForm.get('fechaEntrega')?.touched" class="error">
            La fecha de entrega es obligatoria.
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn-secondary" routerLink="/">Cancelar</button>
          <button type="submit" class="btn-primary" [disabled]="pedidoForm.invalid || submitting">
            {{ submitting ? 'Guardando...' : 'Guardar Pedido' }}
          </button>
        </div>
      </form>

      <div *ngIf="successMessage" class="success-alert">
        {{ successMessage }}
      </div>
      
      <div *ngIf="errorMessage" class="error-alert">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .form-container { max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    .error { color: red; font-size: 0.8rem; margin-top: 4px; }
    .actions { display: flex; gap: 10px; margin-top: 20px; }
    button { padding: 10px 20px; border-radius: 4px; cursor: pointer; border: none; }
    .btn-primary { background: #d35400; color: white; }
    .btn-primary:disabled { background: #ccc; }
    .btn-secondary { background: #eee; }
    .success-alert { margin-top: 15px; padding: 10px; background: #d4edda; color: #155724; border-radius: 4px; }
    .error-alert { margin-top: 15px; padding: 10px; background: #f8d7da; color: #721c24; border-radius: 4px; }
  `]
})
export class AddPedidoComponent {
  private fb = inject(FormBuilder);
  private productionService = inject(ProductionService);
  private router = inject(Router);

  submitting = false;
  successMessage = '';
  errorMessage = '';

  pedidoForm = this.fb.group({
    producto: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    fechaEntrega: [new Date().toISOString().split('T')[0], Validators.required],
    estado: ['Pendiente']
  });

  onSubmit() {
    if (this.pedidoForm.invalid) return;

    this.submitting = true;
    this.errorMessage = '';
    
    const nuevoPedido = this.pedidoForm.value;
    
    this.productionService.addPedido(nuevoPedido as any).subscribe({
      next: () => {
        this.successMessage = 'Pedido guardado correctamente. Redirigiendo...';
        setTimeout(() => this.router.navigate(['/']), 2000);
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.submitting = false;
      }
    });
  }
}
