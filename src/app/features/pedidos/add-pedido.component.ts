import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { ProductoService } from '../../core/services/producto.service';
import { Producto } from '../../core/models/producto.model';
import { Observable, tap, BehaviorSubject, combineLatest, map, startWith } from 'rxjs';

@Component({
  selector: 'app-add-pedido',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="page-container">
      <div class="header-section">
        <button class="back-btn" routerLink="/pedidos" title="Volver">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2>Nuevo Pedido</h2>
      </div>

      <form [formGroup]="pedidoForm" (ngSubmit)="onSubmit()" class="responsive-grid">
        <!-- Columna Izquierda: Producto y Cantidad -->
        <div class="column">
          <div class="form-card">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              Selección de Producto
            </h3>
            
            <div class="form-group">
              <label>Familia (Acceso Rápido)</label>
              <div class="quick-chips">
                <div 
                  *ngFor="let f of familias$ | async" 
                  class="chip" 
                  [class.active]="(selectedFamilia$ | async) === f"
                  (click)="selectFamilia(f)"
                >
                  {{f}}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="productoSearch">Buscar o seleccionar producto</label>
              <div class="search-wrapper">
                <input 
                  id="productoSearch" 
                  type="text" 
                  [formControl]="searchControl" 
                  placeholder="Escribe para buscar..."
                  autocomplete="off"
                  (focus)="showResults = true"
                >
                <div class="product-results shadow-lg" *ngIf="!selectedProducto && (showResults || (selectedFamilia$ | async) || searchControl.value)">
                  <div class="products-header" *ngIf="selectedFamilia$ | async as fam">
                    Familia: <strong>{{fam}}</strong>
                    <button type="button" class="btn-clear-inline" (click)="selectFamilia(null)">quitar filtro</button>
                  </div>
                  <div class="products-container" [class.grid-layout]="selectedFamilia$ | async">
                    <div 
                      *ngFor="let p of filteredProductos$ | async" 
                      class="product-item"
                      (click)="selectProducto(p)"
                    >
                      <span class="family-tag" *ngIf="!(selectedFamilia$ | async)">{{p.familia}}</span>
                      <span class="name">{{p.producto}}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="selected-badge" *ngIf="selectedProducto">
                <div class="badge-content">
                  <span class="label">Producto:</span>
                  <strong>{{selectedProducto.producto}}</strong>
                </div>
                <button type="button" class="btn-clear" (click)="selectedProducto = null; pedidoForm.get('productoBase')?.setValue(''); searchControl.setValue('')">×</button>
              </div>
            </div>

            <div class="form-group" *ngIf="selectedProducto && selectedProducto.tallasRaciones && selectedProducto.tallasRaciones.length > 0">
              <label>Talla / Raciones</label>
              <div class="quick-chips">
                <div 
                  *ngFor="let t of selectedProducto.tallasRaciones" 
                  class="chip" 
                  [class.active]="pedidoForm.get('talla')?.value === t"
                  (click)="pedidoForm.get('talla')?.setValue(t)"
                >
                  {{t}}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Cantidad</label>
              <div class="cantidad-control">
                <button type="button" (click)="adjustQuantity(-1)" [disabled]="(pedidoForm.get('cantidad')?.value ?? 0) <= 1">-</button>
                <input type="number" formControlName="cantidad" readonly>
                <button type="button" (click)="adjustQuantity(1)">+</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Entrega y Cliente -->
        <div class="column">
          <div class="form-card">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Datos de Entrega
            </h3>

            <div class="form-group">
              <label>Día de Entrega</label>
              <div class="quick-chips">
                <div class="chip" (click)="setQuickDate(0)">Hoy</div>
                <div class="chip" (click)="setQuickDate(1)">Mañana</div>
                <div class="chip" (click)="setNextDay(6)">Sábado</div>
                <div class="chip" (click)="setNextDay(0)">Domingo</div>
              </div>
            </div>

            <div class="form-group">
              <label>Hora de Entrega</label>
              <div class="quick-chips">
                <ng-container *ngFor="let t of availableHours">
                  <div 
                    *ngIf="isTimeVisible(t)"
                    class="chip" 
                    [class.active]="isTimeSelected(t)"
                    (click)="setQuickTime(t)"
                  >
                    {{t}}
                  </div>
                </ng-container>
              </div>
              <input style="margin-top: 0.75rem" type="datetime-local" formControlName="fechaEntrega">
            </div>

            <div class="form-group">
              <label for="nombreCliente">Nombre del Cliente</label>
              <input id="nombreCliente" type="text" formControlName="nombreCliente" placeholder="Nombre y apellidos">
            </div>

            <div class="form-group">
              <label for="notasPastelero">Notas para Obrador</label>
              <textarea id="notasPastelero" formControlName="notasPastelero" placeholder="Detalles de elaboración..."></textarea>
            </div>

            <div class="form-group">
              <label for="notasTienda">Notas para Tienda / Encargos</label>
              <textarea id="notasTienda" formControlName="notasTienda" placeholder="Detalles de recogida, contacto..."></textarea>
            </div>
          </div>

          <div class="submit-container">
            <button type="submit" class="main-submit" [disabled]="pedidoForm.invalid || submitting">
              <span *ngIf="!submitting">GUARDAR PEDIDO</span>
              <span *ngIf="submitting">GUARDANDO...</span>
            </button>
          </div>
        </div>
      </form>

      <div class="alerts">
        <div *ngIf="successMessage" class="alert success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="alert error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ errorMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 1rem;
      max-width: 1100px;
      margin: 0 auto;
      background: #f8fafc;
      min-height: calc(100vh - 64px);
    }

    .header-section {
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;

      h2 { margin: 0; font-size: 1.5rem; color: #1e293b; }
      .back-btn {
        background: white; border: 1px solid #e2e8f0; padding: 0.5rem; border-radius: 10px;
        display: flex; cursor: pointer; color: #64748b;
        &:active { transform: scale(0.95); }
      }
    }

    .responsive-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      align-items: start;
      
      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .form-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
      margin-bottom: 1rem;

      h3 {
        margin-top: 0; margin-bottom: 1.25rem; font-size: 0.9rem;
        color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;
        display: flex; align-items: center; gap: 0.5rem;
      }
    }

    .form-group {
      margin-bottom: 1.25rem;
      label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #334155; font-size: 0.95rem; }
      input, select, textarea {
        width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 12px;
        font-size: 1rem; background-color: #fcfcfd;
        &:focus { outline: none; border-color: #3b82f6; background-color: white; }
      }
      textarea { min-height: 80px; }
    }

    .quick-chips {
      display: flex; flex-wrap: wrap; gap: 0.5rem;
      .chip {
        padding: 0.6rem 0.8rem; background: #f1f5f9; border: 1px solid #e2e8f0;
        border-radius: 8px; font-size: 0.85rem; font-weight: 500; color: #475569;
        cursor: pointer; transition: all 0.2s;
        &:active { background: #e2e8f0; }
        &.active { background: #3b82f6; color: white; border-color: #3b82f6; }
      }
    }

    .search-wrapper { position: relative; }
    .product-results {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      margin-top: 4px; max-height: 350px; overflow-y: auto;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      
      .products-container.grid-layout {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 0.5rem;
        padding: 0.75rem;

        .product-item {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.75rem 0.5rem;
          text-align: center;
          background: #f8fafc;
          min-height: 70px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          font-size: 0.9rem;
          line-height: 1.2;
          border-bottom: 1px solid #e2e8f0;

          &:hover { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
          .family-tag { margin-bottom: 4px; margin-right: 0; }
        }
      }

      .products-header {
        padding: 0.75rem 1rem;
        background: #f1f5f9;
        border-bottom: 1px solid #e2e8f0;
        font-size: 0.85rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #475569;

        .btn-clear-inline {
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 0.75rem;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
      }

      .product-item {
        padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid #f1f5f9;
        display: flex; align-items: center;
        &:last-child { border-bottom: none; }
        &:hover { background: #f8fafc; }
        .family-tag { font-size: 0.7rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-right: 8px; color: #64748b; }
        .name { flex: 1; }
      }
    }

    .selected-badge {
      margin-top: 0.75rem; padding: 0.75rem 1rem; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 12px; display: flex;
      justify-content: space-between; align-items: center;
      .badge-content { font-size: 0.9rem; .label { color: #1e40af; margin-right: 0.5rem; } }
      .btn-clear { background: none; border: none; font-size: 1.5rem; color: #ef4444; cursor: pointer; }
    }

    .cantidad-control {
      display: flex; align-items: center; gap: 1rem;
      button {
        width: 48px; height: 48px; border-radius: 12px; border: none;
        background: #3b82f6; color: white; font-size: 1.5rem;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        &:active { transform: scale(0.95); }
        &:disabled { background: #cbd5e1; }
      }
      input { flex: 1; text-align: center; font-size: 1.25rem; font-weight: bold; }
    }

    .submit-container {
      .main-submit {
        width: 100%; padding: 1rem; background: #059669; color: white;
        border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 700;
        cursor: pointer; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.4);
        &:active { transform: scale(0.98); }
        &:disabled { background: #9ca3af; box-shadow: none; }
      }
    }

    .alerts {
      position: fixed; bottom: 1.5rem; left: 1.5rem; right: 1.5rem; z-index: 100;
      .alert {
        padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); margin-top: 0.5rem;
        &.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        &.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
      }
    }
  `]
})
export class AddPedidoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productionService = inject(ProductionService);
  private productoService = inject(ProductoService);
  private router = inject(Router);

  submitting = false;
  successMessage = '';
  errorMessage = '';
  showResults = false;

  productos$!: Observable<Producto[]>;
  familias$!: Observable<string[]>;
  filteredProductos$!: Observable<Producto[]>;
  allProductos: Producto[] = [];
  selectedProducto: Producto | null = null;
  private selectedFamiliaBS = new BehaviorSubject<string | null>(null);
  selectedFamilia$ = this.selectedFamiliaBS.asObservable();
  searchControl = new FormControl('');

  availableHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:30', '17:00', '18:30', '19:30'];
  leadTimeMinutes = 120; // 2 horas de margen mínimo para preparación

  pedidoForm = this.fb.group({
    productoBase: ['', Validators.required],
    talla: [''],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    fechaEntrega: [this.getDefaultDate(), Validators.required],
    estado: ['Pendiente'],
    nombreCliente: ['', Validators.required],
    notasPastelero: [''],
    notasTienda: ['']
  });

  private getDefaultDate(): string {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    
    // Si ya es tarde para hoy (> 18:00), sugerimos mañana por la mañana
    // Pero por defecto el código anterior usaba mañana 09:30, lo cual es seguro.
    return `${tomorrow.toISOString().split('T')[0]}T09:30`;
  }

  ngOnInit() {
    this.productos$ = this.productoService.getProductos().pipe(
      tap(prods => this.allProductos = prods)
    );

    this.familias$ = this.productos$.pipe(
      map(prods => [...new Set(prods.map(p => p.familia))].sort())
    );

    this.filteredProductos$ = combineLatest([
      this.productos$,
      this.searchControl.valueChanges.pipe(startWith('')),
      this.selectedFamilia$
    ]).pipe(
      map(([prods, search, familia]: [Producto[], string | null, string | null]) => {
        const s = (search || '').toLowerCase();
        return prods.filter((p: Producto) => {
          const matchesSearch = p.producto.toLowerCase().includes(s) || p.familia.toLowerCase().includes(s);
          const matchesFamilia = !familia || p.familia === familia;
          return matchesSearch && matchesFamilia;
        });
      })
    );
  }

  selectFamilia(f: string | null) {
    if (this.selectedFamiliaBS.value === f) {
      this.selectedFamiliaBS.next(null);
    } else {
      this.selectedFamiliaBS.next(f);
    }
    
    if (!this.selectedProducto) {
      this.searchControl.setValue('', { emitEvent: true }); // Trigger search filter
    }
  }

  selectProducto(p: Producto) {
    console.log('Producto seleccionado:', p);
    this.selectedProducto = p;
    this.showResults = false;
    this.pedidoForm.get('productoBase')?.setValue(p.id);
    this.searchControl.setValue(p.producto, { emitEvent: false });
    
    // Si solo hay una talla, la seleccionamos automáticamente
    if (this.selectedProducto?.tallasRaciones?.length === 1) {
      this.pedidoForm.get('talla')?.setValue(this.selectedProducto.tallasRaciones[0]);
    } else {
      this.pedidoForm.get('talla')?.setValue('');
    }

    if (this.selectedProducto?.tallasRaciones?.length && this.selectedProducto.tallasRaciones.length > 1) {
      this.pedidoForm.get('talla')?.setValidators(Validators.required);
    } else {
      this.pedidoForm.get('talla')?.clearValidators();
    }
    this.pedidoForm.get('talla')?.updateValueAndValidity();
  }

  onProductoChange() {
    const id = this.pedidoForm.get('productoBase')?.value;
    this.selectedProducto = this.allProductos.find(p => p.id === id) || null;
    
    if (this.selectedProducto?.tallasRaciones?.length === 1) {
      this.pedidoForm.get('talla')?.setValue(this.selectedProducto.tallasRaciones[0]);
    }

    if (this.selectedProducto?.tallasRaciones?.length && this.selectedProducto.tallasRaciones.length > 1) {
      this.pedidoForm.get('talla')?.setValidators(Validators.required);
    } else {
      this.pedidoForm.get('talla')?.clearValidators();
      if (!this.selectedProducto?.tallasRaciones?.length) {
        this.pedidoForm.get('talla')?.setValue('');
      }
    }
    this.pedidoForm.get('talla')?.updateValueAndValidity();
  }

  adjustQuantity(delta: number) {
    const current = this.pedidoForm.get('cantidad')?.value || 0;
    const newVal = Math.max(1, current + delta);
    this.pedidoForm.get('cantidad')?.setValue(newVal);
  }

  isTimeVisible(time: string): boolean {
    const deliveryDateVal = this.pedidoForm.get('fechaEntrega')?.value;
    if (!deliveryDateVal) return true;

    const [datePart] = deliveryDateVal.split('T');
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (datePart !== today) return true;

    const [hours, minutes] = time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours, minutes, 0, 0);

    const minTime = new Date(now.getTime() + this.leadTimeMinutes * 60000);
    return timeDate > minTime;
  }

  isTimeSelected(time: string): boolean {
    const val = this.pedidoForm.get('fechaEntrega')?.value;
    return val ? val.endsWith(time) : false;
  }

  setQuickDate(daysToAdd: number) {
    const currentVal = this.pedidoForm.get('fechaEntrega')?.value || '';
    let timePart = currentVal.includes('T') ? currentVal.split('T')[1] : '09:30';
    
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    const datePart = date.toISOString().split('T')[0];

    // Si es hoy, nos aseguramos de que la hora seleccionada sea visible/válida
    if (daysToAdd === 0 && !this.isTimeVisible(timePart)) {
      const firstAvailable = this.availableHours.find(h => this.isTimeVisible(h));
      timePart = firstAvailable || '19:30';
    }
    
    this.pedidoForm.get('fechaEntrega')?.setValue(`${datePart}T${timePart}`);
  }

  setNextDay(targetDay: number) {
    const currentVal = this.pedidoForm.get('fechaEntrega')?.value || '';
    let timePart = currentVal.includes('T') ? currentVal.split('T')[1] : '09:30';
    
    const date = new Date();
    const currentDay = date.getDay();
    const daysToAdd = (targetDay - currentDay + 7) % 7;
    
    date.setDate(date.getDate() + daysToAdd);
    const datePart = date.toISOString().split('T')[0];

    if (daysToAdd === 0 && !this.isTimeVisible(timePart)) {
      const firstAvailable = this.availableHours.find(h => this.isTimeVisible(h));
      timePart = firstAvailable || '19:30';
    }

    this.pedidoForm.get('fechaEntrega')?.setValue(`${datePart}T${timePart}`);
  }

  setQuickTime(time: string) {
    const currentVal = this.pedidoForm.get('fechaEntrega')?.value || '';
    const datePart = currentVal.includes('T') ? currentVal.split('T')[0] : new Date().toISOString().split('T')[0];
    
    this.pedidoForm.get('fechaEntrega')?.setValue(`${datePart}T${time}`);
  }

  onSubmit() {
    if (this.pedidoForm.invalid || !this.selectedProducto) return;

    this.submitting = true;
    this.errorMessage = '';
    
    const formValue = this.pedidoForm.value;

    // Validación extra para horas de hoy
    if (formValue.fechaEntrega) {
      const [d, t] = formValue.fechaEntrega.split('T');
      if (d === new Date().toISOString().split('T')[0] && !this.isTimeVisible(t)) {
        this.errorMessage = 'La hora de entrega no es válida (es hoy y ya ha pasado o es muy próxima).';
        this.submitting = false;
        return;
      }
    }

    const productName = this.selectedProducto.producto + (formValue.talla ? ` (${formValue.talla})` : '');

    const nuevoPedido = {
      producto: productName,
      cantidad: formValue.cantidad,
      fechaEntrega: formValue.fechaEntrega,
      estado: formValue.estado,
      nombreCliente: formValue.nombreCliente,
      notasPastelero: formValue.notasPastelero,
      notasTienda: formValue.notasTienda
    };
    
    this.productionService.addPedido(nuevoPedido as any).subscribe({
      next: () => {
        this.successMessage = 'Pedido guardado correctamente. Redirigiendo...';
        setTimeout(() => this.router.navigate(['/pedidos']), 2000);
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.submitting = false;
      }
    });
  }
}
