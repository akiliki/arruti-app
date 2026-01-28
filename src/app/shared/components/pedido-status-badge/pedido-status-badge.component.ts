import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoPedido } from '../../../core/models/pedido.model';
import { PedidoStatusClassPipe } from '../../pipes/pedido-status-class.pipe';

@Component({
  selector: 'app-pedido-status-badge',
  standalone: true,
  imports: [CommonModule, PedidoStatusClassPipe],
  template: `
    <span class="status-badge" [attr.data-status]="status | pedidoStatusClass">
      {{ status }}
    </span>
  `
})
export class PedidoStatusBadgeComponent {
  @Input({ required: true }) status!: EstadoPedido;
}
