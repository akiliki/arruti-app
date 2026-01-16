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
    <div class="form-container">
      <h2>Añadir Nuevo Pedido</h2>
      
      <form [formGroup]="pedidoForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>Familias de Productos</label>
          <div class="family-shortcuts">
            <button 
              type="button" 
              class="btn-shortcut" 
              [class.active]="(selectedFamilia$ | async) === null"
              (click)="selectFamilia(null)"
            >TODOS</button>
            <button 
              *ngFor="let f of familias$ | async" 
              type="button" 
              class="btn-shortcut" 
              [class.active]="(selectedFamilia$ | async) === f"
              (click)="selectFamilia(f)"
            >{{f}}</button>
          </div>
        </div>

        <div class="form-group">
          <label for="productoSearch">Buscar Producto</label>
          <div class="search-container">
            <input 
              id="productoSearch" 
              type="text" 
              [formControl]="searchControl" 
              placeholder="Escribe para buscar (ej: tarta, pan...)"
              autocomplete="off"
            >
            <div class="product-results" *ngIf="((searchControl.value) || (selectedFamilia$ | async)) && !selectedProducto">
              <div 
                *ngFor="let p of filteredProductos$ | async" 
                class="product-item"
                (click)="selectProducto(p)"
              >
                <span class="family-tag">{{p.familia}}</span> {{p.producto}}
              </div>
            </div>
          </div>
          <div class="selected-badge" *ngIf="selectedProducto">
            Seleccionado: <strong>{{selectedProducto.familia}} - {{selectedProducto.producto}}</strong>
            <button type="button" class="btn-clear" (click)="selectedProducto = null; pedidoForm.get('productoBase')?.setValue(''); searchControl.setValue('')">×</button>
          </div>
          <div *ngIf="pedidoForm.get('productoBase')?.invalid && pedidoForm.get('productoBase')?.touched" class="error">
            Debe seleccionar un producto del catálogo.
          </div>
        </div>

        <div class="form-group" *ngIf="selectedProducto?.tallasRaciones?.length">
          <label for="talla">Talla / Raciones</label>
          <select id="talla" formControlName="talla">
            <option value="">Seleccione tamaño...</option>
            <option *ngFor="let t of selectedProducto?.tallasRaciones" [value]="t">{{t}}</option>
          </select>
          <div *ngIf="pedidoForm.get('talla')?.invalid && pedidoForm.get('talla')?.touched" class="error">
            Debe seleccionar una talla/ración.
          </div>
        </div>

        <div class="form-group">
          <label for="cantidad">Cantidad</label>
          <div class="quantity-controls">
            <button type="button" class="btn-qty" (click)="adjustQuantity(-1)">-</button>
            <input id="cantidad" type="number" formControlName="cantidad">
            <button type="button" class="btn-qty" (click)="adjustQuantity(1)">+</button>
          </div>
          <div *ngIf="pedidoForm.get('cantidad')?.invalid && pedidoForm.get('cantidad')?.touched" class="error">
            Ingrese una cantidad válida (mínimo 1).
          </div>
        </div>

        <div class="form-group">
          <label for="fechaEntrega">Fecha de Entrega</label>
          <div class="date-shortcuts">
            <button type="button" class="btn-shortcut" (click)="setQuickDate(0)">Hoy</button>
            <button type="button" class="btn-shortcut" (click)="setQuickDate(1)">Mañana</button>
            <button type="button" class="btn-shortcut" (click)="setNextDay(6)">Sábado</button>
            <button type="button" class="btn-shortcut" (click)="setNextDay(0)">Domingo</button>
          </div>
          <div class="time-shortcuts">
            <button type="button" class="btn-shortcut" (click)="setQuickTime('08:00')" title="Primera hora">08:00</button>
            <button type="button" class="btn-shortcut" (click)="setQuickTime('11:00')" title="Media mañana">11:00</button>
            <button type="button" class="btn-shortcut" (click)="setQuickTime('13:00')" title="Mediodía">13:00</button>
            <button type="button" class="btn-shortcut" (click)="setQuickTime('16:30')" title="1ª Tarde">16:30</button>
            <button type="button" class="btn-shortcut" (click)="setQuickTime('19:00')" title="2ª Tarde">19:00</button>
          </div>
          <input id="fechaEntrega" type="datetime-local" formControlName="fechaEntrega">
          <div *ngIf="pedidoForm.get('fechaEntrega')?.invalid && pedidoForm.get('fechaEntrega')?.touched" class="error">
            La fecha y hora de entrega son obligatorias.
          </div>
        </div>

        <div class="form-group">
          <label for="nombreCliente">Nombre Cliente</label>
          <input id="nombreCliente" type="text" formControlName="nombreCliente" placeholder="Ej: Juan Pérez">
          <div *ngIf="pedidoForm.get('nombreCliente')?.invalid && pedidoForm.get('nombreCliente')?.touched" class="error">
            El nombre del cliente es obligatorio.
          </div>
        </div>

        <div class="form-group">
          <label for="notasPastelero">Notas para Pastelero (Opcional)</label>
          <textarea id="notasPastelero" formControlName="notasPastelero" placeholder="Ej: Sin lactosa, mensaje 'Felicidades'..."></textarea>
        </div>

        <div class="form-group">
          <label for="notasTienda">Notas para Tienda (Opcional)</label>
          <textarea id="notasTienda" formControlName="notasTienda" placeholder="Ej: Paga al recoger..."></textarea>
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
    input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 1rem; }
    
    .search-container { position: relative; }
    .product-results { 
      position: absolute; 
      top: 100%; 
      left: 0; 
      right: 0; 
      background: white; 
      border: 1px solid #ddd; 
      border-top: none; 
      z-index: 10; 
      max-height: 200px; 
      overflow-y: auto; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .product-item { padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; }
    .product-item:hover { background: #f8f9fa; }
    .family-tag { font-size: 0.7rem; background: #eee; padding: 2px 5px; border-radius: 4px; margin-right: 5px; text-transform: uppercase; color: #666; }
    
    .family-shortcuts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 5px; }
    .family-shortcuts .btn-shortcut.active { background: #d35400; color: white; border-color: #d35400; }

    .selected-badge { 
      margin-top: 5px; 
      padding: 8px 12px; 
      background: #e8f4fd; 
      border: 1px solid #b8daff; 
      border-radius: 4px; 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      font-size: 0.9rem;
    }
    .btn-clear { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #dc3545; }

    .quantity-controls { display: flex; gap: 10px; align-items: center; }
    .quantity-controls input { text-align: center; font-size: 1.2rem; font-weight: bold; }
    .btn-qty { 
      background: #34495e; 
      color: white; 
      border: none; 
      width: 40px; 
      height: 40px; 
      border-radius: 4px; 
      font-size: 1.5rem; 
      cursor: pointer; 
      display: flex;
      align-items: center;
      justify-content: center;
    }

    textarea { min-height: 80px; resize: vertical; }
    .error { color: red; font-size: 0.8rem; margin-top: 4px; }
    .actions { display: flex; gap: 10px; margin-top: 20px; }
    button { padding: 10px 20px; border-radius: 4px; cursor: pointer; border: none; }
    .btn-primary { background: #d35400; color: white; }
    .btn-primary:disabled { background: #ccc; }
    .btn-secondary { background: #eee; }
    
    .date-shortcuts, .time-shortcuts { display: flex; gap: 5px; margin-bottom: 5px; overflow-x: auto; padding-bottom: 5px; }
    .btn-shortcut { 
      background: #f4f4f4; 
      border: 1px solid #ddd; 
      padding: 5px 10px; 
      border-radius: 4px; 
      font-size: 0.85rem; 
      white-space: nowrap;
      cursor: pointer;
    }
    .btn-shortcut:hover { background: #e9ecef; }
    .btn-shortcut:active { background: #dee2e6; }

    .success-alert { margin-top: 15px; padding: 10px; background: #d4edda; color: #155724; border-radius: 4px; }
    .error-alert { margin-top: 15px; padding: 10px; background: #f8d7da; color: #721c24; border-radius: 4px; }
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

  productos$!: Observable<Producto[]>;
  familias$!: Observable<string[]>;
  filteredProductos$!: Observable<Producto[]>;
  allProductos: Producto[] = [];
  selectedProducto: Producto | null = null;
  private selectedFamiliaBS = new BehaviorSubject<string | null>(null);
  selectedFamilia$ = this.selectedFamiliaBS.asObservable();
  searchControl = new FormControl('');

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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
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
    this.selectedFamiliaBS.next(f);
    if (!this.selectedProducto) {
      this.searchControl.setValue('', { emitEvent: true }); // Trigger search filter
    }
  }

  selectProducto(p: Producto) {
    this.selectedProducto = p;
    this.pedidoForm.get('productoBase')?.setValue(p.id);
    this.searchControl.setValue(p.producto, { emitEvent: false });
    
    if (this.selectedProducto?.tallasRaciones?.length) {
      this.pedidoForm.get('talla')?.setValidators(Validators.required);
    } else {
      this.pedidoForm.get('talla')?.clearValidators();
      this.pedidoForm.get('talla')?.setValue('');
    }
    this.pedidoForm.get('talla')?.updateValueAndValidity();
  }

  onProductoChange() {
    const id = this.pedidoForm.get('productoBase')?.value;
    this.selectedProducto = this.allProductos.find(p => p.id === id) || null;
    
    if (this.selectedProducto?.tallasRaciones?.length) {
      this.pedidoForm.get('talla')?.setValidators(Validators.required);
    } else {
      this.pedidoForm.get('talla')?.clearValidators();
      this.pedidoForm.get('talla')?.setValue('');
    }
    this.pedidoForm.get('talla')?.updateValueAndValidity();
  }

  adjustQuantity(delta: number) {
    const current = this.pedidoForm.get('cantidad')?.value || 0;
    const newVal = Math.max(1, current + delta);
    this.pedidoForm.get('cantidad')?.setValue(newVal);
  }

  setQuickDate(daysToAdd: number) {
    const currentVal = this.pedidoForm.get('fechaEntrega')?.value || '';
    const timePart = currentVal.includes('T') ? currentVal.split('T')[1] : '09:30';
    
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    
    const datePart = date.toISOString().split('T')[0];
    this.pedidoForm.get('fechaEntrega')?.setValue(`${datePart}T${timePart}`);
  }

  setNextDay(targetDay: number) {
    const currentVal = this.pedidoForm.get('fechaEntrega')?.value || '';
    const timePart = currentVal.includes('T') ? currentVal.split('T')[1] : '09:30';
    
    const date = new Date();
    const currentDay = date.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    
    date.setDate(date.getDate() + daysToAdd);
    const datePart = date.toISOString().split('T')[0];
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
        setTimeout(() => this.router.navigate(['/']), 2000);
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.submitting = false;
      }
    });
  }
}
