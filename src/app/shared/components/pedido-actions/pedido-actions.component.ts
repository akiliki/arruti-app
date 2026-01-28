import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoPedido } from '../../../core/models/pedido.model';

@Component({
  selector: 'app-pedido-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="production-actions" *ngIf="mode === 'obrador'">
      <button *ngIf="estado === 'Pendiente'"
              class="btn-action start"
              (click)="start.emit()"
              [disabled]="isUpdating">
        {{ isUpdating ? 'Actualizando...' : 'COMENZAR PRODUCCIÓN' }}
      </button>

      <button *ngIf="estado === 'En Proceso'"
              class="btn-action finish"
              (click)="finish.emit()"
              [disabled]="isUpdating">
        {{ isUpdating ? 'Actualizando...' : 'TERMINAR Y LISTO PARA TIENDA' }}
      </button>

      <button *ngIf="estado === 'Pendiente' || estado === 'En Proceso'"
              class="btn-cancel-link"
              (click)="cancel.emit()"
              [disabled]="isUpdating">
        CANCELAR ESTA PIEZA
      </button>
    </div>

    <div class="actions" *ngIf="mode === 'tienda'">
      <button *ngIf="estado !== 'Entregado'"
              class="btn-deliver"
              (click)="deliver.emit()"
              [disabled]="isUpdating">
        {{ isUpdating ? 'Procesando...' : 'ENTREGAR TODO EL PEDIDO' }}
      </button>
      <ng-content></ng-content>
      <button *ngIf="estado !== 'Cancelado' && estado !== 'Entregado'"
              class="btn-cancel-secondary"
              (click)="cancel.emit()"
              [disabled]="isUpdating">
        CANCELAR PEDIDO
      </button>
    </div>
  `
})
export class PedidoActionsComponent {
  @Input({ required: true }) estado!: EstadoPedido;
  @Input() mode: 'obrador' | 'tienda' = 'obrador';
  @Input() isUpdating = false;

  @Output() start = new EventEmitter<void>();
  @Output() finish = new EventEmitter<void>();
  @Output() deliver = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
