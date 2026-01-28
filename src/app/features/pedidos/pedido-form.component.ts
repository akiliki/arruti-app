import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ProductionService } from '../../core/services/production.service';
import { ProductoService } from '../../core/services/producto.service';
import { EmpleadoService } from '../../core/services/empleado.service';
import { Producto } from '../../core/models/producto.model';
import { Empleado } from '../../core/models/empleado.model';
import { Pedido } from '../../core/models/pedido.model';
import { Observable, tap, BehaviorSubject, combineLatest, map, startWith, of, take } from 'rxjs';

@Component({
  selector: 'app-pedido-form',
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
        <h2>{{ isEditMode ? 'Editar Pedido' : 'Nuevo Pedido' }}</h2>
      </div>

      <form [formGroup]="pedidoForm" (ngSubmit)="onSubmit()" class="responsive-grid">
        <!-- Empleado - AHORA LO PRIMERO -->
        <div class="form-card employee-card" *ngIf="!pedidoForm.get('vendedor')?.value">
          <div class="form-group">
            <label>¿Quién recoge el pedido? (Empleado)</label>
            <div class="quick-chips">
              <div 
                *ngFor="let e of empleados$ | async" 
                class="chip" 
                [class.active]="pedidoForm.get('vendedor')?.value === e.nombre"
                (click)="pedidoForm.get('vendedor')?.setValue(e.nombre); saveVendedor(e.nombre)"
              >
                {{e.nombre}}
              </div>
            </div>
          </div>
        </div>

        <div class="selected-vendedor-info" *ngIf="pedidoForm.get('vendedor')?.value" (click)="pedidoForm.get('vendedor')?.setValue('')">
          Atendido por: <strong>{{ pedidoForm.get('vendedor')?.value }}</strong>
          <span class="change-link">(Cambiar)</span>
        </div>

        <!-- Resumen de Productos (Table) - AHORA ARRIBA -->
        <div class="form-card summary-card-top" *ngIf="hasConfirmedItems() || isEditMode">
          <div class="items-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              Resumen de Productos
            </h3>
          </div>

          <!-- Tabla de productos confirmados -->
          <div class="table-container" *ngIf="hasConfirmedItems()">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Detalles</th>
                  <th>Cant.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let item of items.controls; let i = index">
                  <tr *ngIf="confirmedLines[i]">
                    <td>
                      <div class="table-product-name">{{ item.get('productoNombre')?.value }}</div>
                      <span class="table-shop-badge" *ngIf="item.get('guardadoEnTienda')?.value">YA EN TIENDA</span>
                    </td>
                    <td>
                      <div class="table-details">
                        <span *ngIf="item.get('talla')?.value">Talla: {{ item.get('talla')?.value }}</span>
                        <span *ngIf="item.get('relleno')?.value">Relleno: {{ item.get('relleno')?.value }}</span>
                        <span *ngIf="item.get('notasPastelero')?.value" class="table-note">
                          <strong>Obs:</strong> {{ item.get('notasPastelero')?.value }}
                        </span>
                      </div>
                    </td>
                    <td class="table-qty">{{ item.get('cantidad')?.value }}</td>
                    <td class="table-actions">
                      <button type="button" class="btn-mini-action" (click)="editLine(i)" title="Editar">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" class="btn-mini-action del" (click)="removeItem(i)" title="Eliminar">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

           <div class="no-items-placeholder" *ngIf="!hasConfirmedItems()">
             <svg class="placeholder-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
             </svg>
             <div>No hay productos confirmados en el pedido todavía.</div>
          </div>

          <button type="button" class="btn-add-line" (click)="addNewItem()" *ngIf="allLinesConfirmed()">
            + Añadir otra línea de producto
          </button>
        </div>

        <!-- Columna Izquierda: Entrada de Productos -->
        <div class="column">
          <div formArrayName="items" class="active-items-list">
            <div *ngFor="let item of items.controls; let i = index" [formGroupName]="i">
              <div class="product-item-row" *ngIf="!confirmedLines[i]">
                <div class="item-number-header">
                  <span>{{ isEditMode ? 'Editando línea' : 'Nueva línea de producto' }}</span>
                  <button type="button" class="btn-cancel-line" (click)="removeItem(i)" *ngIf="items.length > 1 && !confirmedLines[i]">
                    No añadir nuevo
                  </button>
                </div>

                <div class="form-group family-filter-group" *ngIf="!selectedProductos[i]">
                  <label>Filtro por familia</label>
                  <div class="quick-chips">
                    <div 
                      *ngFor="let f of familias$ | async" 
                      class="chip" 
                      [class.active]="selectedFamilies[i] === f"
                      (click)="selectFamilia(i, f)"
                    >
                      {{f}}
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label [for]="'productoSearch-' + i" *ngIf="!selectedProductos[i]">Buscar o seleccionar producto</label>
                  <div class="search-wrapper" *ngIf="!selectedProductos[i]">
                    <input 
                      [id]="'productoSearch-' + i" 
                      type="text" 
                      [formControl]="searchControls[i]" 
                      placeholder="Escribe para buscar..."
                      autocomplete="off"
                      (focus)="showResultsForItem[i] = true"
                    >
                    <div class="product-results shadow-lg" *ngIf="!selectedProductos[i] && (showResultsForItem[i] || selectedFamilies[i] || searchControls[i].value)">
                      <div class="products-header" *ngIf="selectedFamilies[i] as fam">
                        Familia: <strong>{{fam}}</strong>
                      </div>
                      <div class="products-container" [class.grid-layout]="selectedFamilies[i]">
                        <div 
                          *ngFor="let p of getFilteredProductos(i, searchControls[i].value) | async" 
                          class="product-item"
                          (click)="selectProducto(p, i)"
                        >
                          <span class="family-tag" *ngIf="!selectedFamilies[i]">{{p.familia}}</span>
                          <span class="name">{{p.producto}}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="selected-badge" *ngIf="selectedProductos[i] as sel">
                    <div class="badge-content">
                      <span class="label">Seleccionado:</span>
                      <strong>{{sel.producto}}</strong>
                    </div>
                    <button type="button" class="btn-clear" (click)="clearProducto(i)">×</button>
                  </div>
                </div>

                <div class="options-grid" *ngIf="selectedProductos[i] as sel">
                  <div class="form-group" *ngIf="sel.tallasRaciones && sel.tallasRaciones.length > 0">
                    <label>Talla / Raciones</label>
                    <div class="quick-chips">
                      <div 
                        *ngFor="let t of sel.tallasRaciones" 
                        class="chip" 
                        [class.active]="item.get('talla')?.value === t"
                        (click)="item.get('talla')?.setValue(t)"
                      >
                        {{t}}
                      </div>
                    </div>
                  </div>

                  <div class="form-group" *ngIf="sel.rellenos && sel.rellenos.length > 0">
                    <label>Relleno</label>
                    <div class="quick-chips">
                      <div 
                        *ngFor="let r of sel.rellenos" 
                        class="chip" 
                        [class.active]="item.get('relleno')?.value === r"
                        (click)="item.get('relleno')?.setValue(r)"
                      >
                        {{r}}
                      </div>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Cantidad</label>
                    <div class="cantidad-control">
                      <button type="button" (click)="adjustQuantity(i, -1)" [disabled]="(item.get('cantidad')?.value ?? 0) <= 1">-</button>
                      <input type="number" formControlName="cantidad" readonly>
                      <button type="button" (click)="adjustQuantity(i, 1)">+</button>
                    </div>
                  </div>

                  <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                      <input type="checkbox" formControlName="guardadoEnTienda">
                      <span>¿Ya está en tienda?</span>
                    </label>
                  </div>

                  <div class="form-group wide-group">
                    <label>Notas para Obrador (específicas de este producto)</label>
                    <textarea formControlName="notasPastelero" placeholder="Ej: Escribir Feliz Cumpleaños, sin nata..."></textarea>
                  </div>
                </div>

                <div class="line-actions" *ngIf="selectedProductos[i] && !isEditMode">
                  <div class="grid-buttons">
                    <button type="button" class="btn-confirm-add" (click)="confirmAndAdd(i)">
                      Añadir otro
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <button type="button" class="btn-continue" (click)="confirmLineAndContinue(i)">
                      Seguir
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </div>

                <div class="line-actions edit-confirm" *ngIf="isEditMode">
                  <div class="grid-buttons">
                    <button type="button" class="btn-continue span-2" (click)="confirmLine(i)">
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Entrega y Cliente -->
        <div class="column" *ngIf="showDeliveryFields || isEditMode">
          <div class="form-card" id="delivery-section">
            <h3 class="delivery-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Datos de Entrega y Cliente
            </h3>

            <div class="form-group">
              <label>Día de Entrega</label>
              <div class="quick-chips">
                <div class="chip date-chip" *ngIf="isHoyPossible()" [class.active]="isSpecificDateSelected(getTodayStr())" (click)="setQuickDate(0)">
                  <span class="day-name">Hoy</span>
                  <span class="day-date">{{ formatDateShort(getTodayStr()) }}</span>
                </div>
                <div class="chip date-chip" [class.active]="isSpecificDateSelected(getTomorrowStr())" (click)="setQuickDate(1)">
                  <span class="day-name">Mañana</span>
                  <span class="day-date">{{ formatDateShort(getTomorrowStr()) }}</span>
                </div>
                <div class="chip date-chip" [class.active]="isSpecificDateSelected(getNextDayDate(6))" (click)="setNextDay(6)">
                  <span class="day-name">Sábado</span>
                  <span class="day-date">{{ formatDateShort(getNextDayDate(6)) }}</span>
                </div>
                <div class="chip date-chip" [class.active]="isSpecificDateSelected(getNextDayDate(0))" (click)="setNextDay(0)">
                  <span class="day-name">Domingo</span>
                  <span class="day-date">{{ formatDateShort(getNextDayDate(0)) }}</span>
                </div>
              </div>
              <input 
                class="mt-12" 
                type="date" 
                formControlName="diaEntrega"
                [min]="minDate"
              >
            </div>

            <div class="form-group">
              <label>Hora de Entrega</label>
              <div class="quick-chips" *ngIf="isDateSelected()">
                <ng-container *ngFor="let t of availableHours">
                  <div 
                    *ngIf="isTimePossible(t)"
                    class="chip" 
                    [class.active]="isTimeSelected(t)"
                    (click)="setQuickTime(t)"
                  >
                    {{t}}
                  </div>
                </ng-container>
              </div>
              <div *ngIf="!isDateSelected()" class="info-inline">
                Primero selecciona un día para ver las horas disponibles.
              </div>
              <input 
                *ngIf="isDateSelected()"
                class="mt-12" 
                type="time" 
                formControlName="horaEntrega"
              >
            </div>

            <div class="form-group">
              <label for="nombreCliente">Nombre del Cliente</label>
              <input id="nombreCliente" type="text" formControlName="nombreCliente" placeholder="Nombre y apellidos">
            </div>

            <div class="form-group">
              <label for="notasTienda">Notas para Tienda / Encargos</label>
              <textarea id="notasTienda" formControlName="notasTienda" placeholder="Detalles de recogida, contacto..."></textarea>
            </div>
          </div>
        </div>

        <div class="submit-container" *ngIf="showDeliveryFields || isEditMode">
          <button type="submit" class="main-submit" [disabled]="pedidoForm.invalid || submitting">
            <span *ngIf="!submitting">{{ isEditMode ? 'ACTUALIZAR PEDIDO' : 'GUARDAR PEDIDO' }}</span>
            <span *ngIf="submitting">GUARDANDO...</span>
          </button>
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
  styleUrl: './pedido-form.component.scss'
})
export class PedidoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productionService = inject(ProductionService);
  private productoService = inject(ProductoService);
  private empleadoService = inject(EmpleadoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  submitting = false;
  isEditMode = false;
  pedidoId: string | null = null;
  currentGrupoId: string | null = null;
  successMessage = '';
  errorMessage = '';
  showResults = false;
  showDeliveryFields = false;

  productos$!: Observable<Producto[]>;
  familias$!: Observable<string[]>;
  empleados$!: Observable<Empleado[]>;
  filteredProductos$!: Observable<Producto[]>;
  allProductos: Producto[] = [];
  
  // Mapeo selectivo para cada item en el FormArray
  selectedProductos: (Producto | null)[] = [];
  selectedFamilies: (string | null)[] = [];
  showResultsForItem: boolean[] = [];
  searchControls: FormControl[] = [];
  confirmedLines: boolean[] = [];

  availableHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:30', '17:00', '18:30', '19:30'];
  leadTimeMinutes = 120; // 2 horas de margen mínimo para preparación

  pedidoForm = this.fb.group({
    diaEntrega: ['', Validators.required],
    horaEntrega: ['', Validators.required],
    vendedor: ['', Validators.required],
    estado: ['Pendiente'],
    nombreCliente: ['', Validators.required],
    notasTienda: [''],
    items: this.fb.array([], Validators.required)
  });

  get items(): FormArray {
    return this.pedidoForm.get('items') as FormArray;
  }

  private getDefaultDate(): string {
    return '';
  }

  ngOnInit() {
    this.pedidoId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.pedidoId;

    if (this.isEditMode && this.pedidoId) {
      this.showDeliveryFields = true;
    }

    if (!this.isEditMode) {
      this.addNewItem(); // Al menos un item al inicio
      const lastVendedor = localStorage.getItem('lastVendedor');
      if (lastVendedor) {
        this.pedidoForm.get('vendedor')?.setValue(lastVendedor);
      }
    }

    // Cargamos productos y si estamos en edición, cargamos el pedido
    this.productoService.getProductos().subscribe(prods => {
      this.allProductos = prods;
      if (this.isEditMode && this.pedidoId) {
        this.loadPedido(this.pedidoId);
      }
    });

    this.productos$ = this.productoService.getProductos();

    this.familias$ = this.productos$.pipe(
      map(prods => [...new Set(prods.map(p => p.familia))].sort())
    );

    this.empleados$ = this.empleadoService.getEmpleados().pipe(
      map(emps => emps.filter(e => e.activo))
    );
  }

  addNewItem(id?: string, guardadoEnTienda: boolean = false, keepDeliveryFields: boolean = false) {
    if (!keepDeliveryFields) {
      this.showDeliveryFields = false; // Ocultar datos de entrega al añadir producto
    }
    const itemGroup = this.fb.group({
      id: [id || crypto.randomUUID()],
      productoBase: ['', Validators.required],
      productoNombre: [''],
      talla: [''],
      relleno: [''],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      guardadoEnTienda: [guardadoEnTienda],
      notasPastelero: ['']
    });

    this.items.push(itemGroup);
    this.selectedProductos.push(null);
    this.selectedFamilies.push(null);
    this.showResultsForItem.push(false);
    
    const sControl = new FormControl('');
    this.searchControls.push(sControl);
    this.confirmedLines.push(false);
  }

  removeItem(index: number) {
    const wasConfirmed = this.confirmedLines[index];
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.selectedProductos.splice(index, 1);
      this.selectedFamilies.splice(index, 1);
      this.showResultsForItem.splice(index, 1);
      this.searchControls.splice(index, 1);
      this.confirmedLines.splice(index, 1);
    }

    // Si cancelamos una línea nueva y ya hay otras confirmadas, volvemos a mostrar la entrega
    if (!wasConfirmed && this.hasConfirmedItems()) {
      this.showDeliveryFields = true;
    }
  }

  loadPedido(id: string) {
    this.productionService.getPedidos().pipe(
      take(1),
      map(allPedidos => {
        const target = allPedidos.find(p => p.id === id);
        if (!target) return [];
        
        if (target.idGrupo) {
          return allPedidos.filter(p => p.idGrupo === target.idGrupo);
        }
        return [target];
      })
    ).subscribe(pedidos => {
      if (pedidos.length > 0) {
        // Limpiamos los items que haya
        this.items.clear();
        this.selectedProductos = [];
        this.selectedFamilies = [];
        this.showResultsForItem = [];
        this.searchControls = [];
        this.confirmedLines = [];

        const first = pedidos[0];
        this.currentGrupoId = first.idGrupo || null;
        
        // Seteamos valores comunes
        let diaStr = '';
        let horaStr = '';
        
        try {
          const date = new Date(first.fechaEntrega);
          if (!isNaN(date.getTime())) {
            diaStr = date.toISOString().split('T')[0];
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            horaStr = `${hours}:${minutes}`;
          }
        } catch (e) {
          console.error('Error parsing date:', e);
        }

        this.pedidoForm.patchValue({
          diaEntrega: diaStr,
          horaEntrega: horaStr,
          vendedor: first.vendedor || '',
          estado: first.estado,
          nombreCliente: first.nombreCliente,
          notasTienda: first.notasTienda
        });

        // Añadimos cada ítem al FormArray
        pedidos.forEach((p, i) => {
          this.addNewItem(p.id, p.guardadoEnTienda, true);
          
          const foundProduct = this.allProductos.find(prod => prod.producto === p.producto) || null;
          if (foundProduct) {
            this.selectProducto(foundProduct, i);
          }

          this.getItemGroup(i).patchValue({
            talla: p.talla || '',
            relleno: p.relleno || '',
            cantidad: p.cantidad,
            notasPastelero: p.notasPastelero || ''
          });
          this.confirmedLines[i] = true;
        });
        
        this.showDeliveryFields = true;
      } else {
        this.errorMessage = 'No se encontró el pedido a editar.';
      }
    });
  }

  getItemGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  selectFamilia(index: number, f: string | null) {
    if (this.selectedFamilies[index] === f) {
      this.selectedFamilies[index] = null;
    } else {
      this.selectedFamilies[index] = f;
    }
  }

  getFilteredProductos(index: number, searchTerm: string | null): Observable<Producto[]> {
    const s = (searchTerm || '').toLowerCase();
    const familia = this.selectedFamilies[index];
    
    return of(this.allProductos.filter(p => {
      const matchesSearch = p.producto.toLowerCase().includes(s) || p.familia.toLowerCase().includes(s);
      const matchesFamilia = !familia || p.familia === familia;
      return matchesSearch && matchesFamilia;
    }));
  }

  selectProducto(p: Producto, index: number) {
    this.selectedProductos[index] = p;
    this.showResultsForItem[index] = false;
    const group = this.getItemGroup(index);
    group.get('productoBase')?.setValue(p.id);
    group.get('productoNombre')?.setValue(p.producto);
    this.searchControls[index].setValue(p.producto, { emitEvent: false });
    
    if (p.tallasRaciones?.length === 1) {
      group.get('talla')?.setValue(p.tallasRaciones[0]);
    } else {
      group.get('talla')?.setValue('');
    }

    if (p.rellenos?.length === 1) {
      group.get('relleno')?.setValue(p.rellenos[0]);
    } else {
      group.get('relleno')?.setValue('');
    }

    if (p.tallasRaciones?.length && p.tallasRaciones.length > 1) {
      group.get('talla')?.setValidators(Validators.required);
    } else {
      group.get('talla')?.clearValidators();
    }
    group.get('talla')?.updateValueAndValidity();
  }

  clearProducto(index: number) {
    this.selectedProductos[index] = null;
    const group = this.getItemGroup(index);
    group.get('productoBase')?.setValue('');
    group.get('productoNombre')?.setValue('');
    this.searchControls[index].setValue('');
  }

  adjustQuantity(index: number, delta: number) {
    const group = this.getItemGroup(index);
    const current = group.get('cantidad')?.value || 0;
    const newVal = Math.max(1, current + delta);
    group.get('cantidad')?.setValue(newVal);
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  isHoyPossible(): boolean {
    return this.availableHours.some(h => this.isTimePossible(h, this.getTodayStr()));
  }

  isDateHoy(): boolean {
    return this.pedidoForm.get('diaEntrega')?.value === this.getTodayStr();
  }

  isDateSelected(): boolean {
    return !!this.pedidoForm.get('diaEntrega')?.value;
  }

  isDateTomorrow(): boolean {
    const val = this.pedidoForm.get('diaEntrega')?.value;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return val === tomorrowStr;
  }

  isTimePossible(time: string, customDate?: string): boolean {
    const deliveryDateVal = customDate || this.pedidoForm.get('diaEntrega')?.value;
    if (!deliveryDateVal) return true;

    const [hours, minutes] = time.split(':').map(Number);
    const [y, m, d] = deliveryDateVal.split('-').map(Number);
    
    const timeDate = new Date(y, m - 1, d, hours, minutes, 0, 0);
    const now = new Date();
    
    // Si todos los productos están en tienda, solo exigimos que la hora sea en el futuro (desde ahora)
    // Si no, exigimos el margen de preparación (habitualmente 2 horas)
    const margin = this.allProductsInShop() ? 0 : this.leadTimeMinutes;
    const minLimit = new Date(now.getTime() + (margin * 60000));

    return timeDate > minLimit;
  }

  isTimeSelected(time: string): boolean {
    return this.pedidoForm.get('horaEntrega')?.value === time;
  }

  setQuickDate(daysToAdd: number) {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    const datePart = date.toISOString().split('T')[0];
    this.pedidoForm.get('diaEntrega')?.setValue(datePart);

    // Si la hora actual ya no es posible para el nuevo día, la reseteamos
    const currentHora = this.pedidoForm.get('horaEntrega')?.value;
    if (currentHora && !this.isTimePossible(currentHora, datePart)) {
      this.pedidoForm.get('horaEntrega')?.setValue('');
    }
  }

  setNextDay(targetDay: number) {
    const date = new Date();
    const currentDay = date.getDay();
    const daysToAdd = (targetDay - currentDay + 7) % 7 || 7; 
    
    date.setDate(date.getDate() + daysToAdd);
    const datePart = date.toISOString().split('T')[0];
    this.pedidoForm.get('diaEntrega')?.setValue(datePart);

    // Si la hora actual ya no es posible para el nuevo día, la reseteamos
    const currentHora = this.pedidoForm.get('horaEntrega')?.value;
    if (currentHora && !this.isTimePossible(currentHora, datePart)) {
      this.pedidoForm.get('horaEntrega')?.setValue('');
    }
  }

  setQuickTime(time: string) {
    this.pedidoForm.get('horaEntrega')?.setValue(time);
  }

  getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  getTomorrowStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  getNextDayDate(targetDay: number): string {
    const date = new Date();
    const currentDay = date.getDay();
    const daysToAdd = (targetDay - currentDay + 7) % 7 || 7; 
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  }

  isSpecificDateSelected(dateStr: string): boolean {
    return this.pedidoForm.get('diaEntrega')?.value === dateStr;
  }

  private formatDateForInput(date: any): string {
    if (!date) return '';
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  saveVendedor(nombre: string) {
    localStorage.setItem('lastVendedor', nombre);
  }

  confirmLineAndContinue(index: number) {
    if (this.getItemGroup(index).valid) {
      this.confirmedLines[index] = true;
      this.continueToDelivery();
    } else {
      this.errorMessage = 'Por favor, completa los datos de esta línea.';
      setTimeout(() => this.errorMessage = '', 3000);
    }
  }

  confirmLine(index: number) {
    if (this.getItemGroup(index).valid) {
      this.confirmedLines[index] = true;
      this.successMessage = `Línea #${index + 1} confirmada.`;
      setTimeout(() => this.successMessage = '', 2000);
      
      if (this.allLinesConfirmed()) {
        this.showDeliveryFields = true;
      }
    } else {
      this.errorMessage = 'Por favor, completa los datos de esta línea.';
      setTimeout(() => this.errorMessage = '', 3000);
    }
  }

  editLine(index: number) {
    this.confirmedLines[index] = false;
    this.showDeliveryFields = false;
  }

  confirmAndAdd(index: number) {
    if (this.getItemGroup(index).valid) {
      this.confirmedLines[index] = true;
      this.addNewItem();
      setTimeout(() => {
        const nextIdx = this.items.length - 1;
        const nextElement = document.getElementById(`productoSearch-${nextIdx}`);
        nextElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      this.errorMessage = 'Completa la línea actual antes de añadir otra.';
      setTimeout(() => this.errorMessage = '', 3000);
    }
  }

  continueToDelivery() {
    this.showDeliveryFields = true;
    setTimeout(() => {
      const section = document.getElementById('delivery-section');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  hasConfirmedItems(): boolean {
    return this.confirmedLines.some(c => c);
  }

  allLinesConfirmed(): boolean {
    return this.items.length === 0 || this.confirmedLines.every(c => c);
  }

  allProductsInShop(): boolean {
    if (this.items.length === 0) return false;
    return this.items.getRawValue().every((item: any) => item.guardadoEnTienda);
  }

  onSubmit() {
    if (this.pedidoForm.invalid || this.items.length === 0) return;

    this.submitting = true;
    this.errorMessage = '';
    
    const formValue = this.pedidoForm.value;

    if (formValue.diaEntrega && formValue.horaEntrega) {
      if (!this.isTimePossible(formValue.horaEntrega, formValue.diaEntrega)) {
        this.errorMessage = this.allProductsInShop()
          ? 'La hora de entrega debe ser posterior a la hora actual.'
          : 'La fecha/hora de entrega no es válida (mínimo 2 horas de antelación).';
        this.submitting = false;
        return;
      }
    }

    const fullFechaEntrega = `${formValue.diaEntrega}T${formValue.horaEntrega}`;
    const idGrupo = this.isEditMode ? (this.currentGrupoId || crypto.randomUUID()) : crypto.randomUUID();
    const nombreClienteUpper = (formValue.nombreCliente as string || '').toUpperCase();

    const pedidosData: Pedido[] = (formValue.items as any[]).map(item => ({
      id: item.id || crypto.randomUUID(),
      idGrupo: idGrupo,
      producto: item.productoNombre,
      talla: item.talla || '',
      relleno: item.relleno || '',
      vendedor: formValue.vendedor || '',
      cantidad: item.cantidad,
      fechaEntrega: new Date(fullFechaEntrega),
      estado: item.guardadoEnTienda ? 'Terminado' : ((formValue.estado as any) || 'Pendiente'),
      nombreCliente: nombreClienteUpper,
      notasPastelero: item.notasPastelero || '',
      notasTienda: formValue.notasTienda || '',
      guardadoEnTienda: item.guardadoEnTienda || false,
      fechaActualizacion: new Date()
    } as Pedido));
    
    const operation = this.isEditMode 
      ? this.productionService.updatePedidos(pedidosData)
      : this.productionService.addPedidos(pedidosData);

    operation.subscribe({
      next: () => {
        if (formValue.vendedor) {
          localStorage.setItem('lastVendedor', formValue.vendedor);
        }
        
        this.successMessage = `Pedido ${this.isEditMode ? 'actualizado' : 'guardado'} correctamente. Redirigiendo...`;
        setTimeout(() => this.router.navigate(['/pedidos']), 2000);
      },
      error: (err: any) => {
        this.errorMessage = err.message;
        this.submitting = false;
      }
    });
  }
}
